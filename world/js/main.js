// ============================================================
// main.js — boot, environment engine, beat state machine
// ============================================================
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { CHAPTERS } from './chapters.js';
import { Hud } from './hud.js';
import { CameraRig } from './rig.js';
import { AudioEngine } from './audio.js';
import { charStore } from './charassets.js';
import { createSky, createCloudSea, createDistantPeaks } from './sky.js';
import { clamp, damp, TEX } from './util.js';
import { zone1 } from './zones/z1.js';
import { zone2 } from './zones/z2.js';
import { zone3 } from './zones/z3.js';
import { zone4 } from './zones/z4.js';
import { zone5 } from './zones/z5.js';

/* ---------------- environment defaults ---------------- */
const ENV_BASE = {
  top: 0x0a1428, mid: 0x54324a, bot: 0xc46a34,
  sunDir: [-1, 0.12, -0.35], sunColor: 0xffc48a, sunSize: 0.05, sunI: 1.0,
  stars: 0.0, fogColor: 0x1a1b24, fogDensity: 0.012,
  hemiSky: 0x8fa3c0, hemiGround: 0x3a3226, hemiI: 0.55,
  dirColor: 0xffd0a0, dirI: 1.6, ambientI: 0.25,
  exposure: 1.0, bloomS: 0.55, bloomR: 0.55, bloomT: 0.82,
  cloudLit: 0x9fb0cc, vignette: 0.9,
};

/* ---------------- boot ---------------- */
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x1a1b24, 0.012);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 4000);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.55, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ---------------- adaptive quality ----------------
   Weak GPUs drop resolution, then bloom, to keep the
   experience fluid instead of turning into a slideshow. */
let qLevel = 0;
function applyQuality(l) {
  const base = Math.min(window.devicePixelRatio || 1, 2);
  const ratios = [base, 1.0, 0.75, 0.6];
  const r = ratios[Math.min(l, ratios.length - 1)];
  renderer.setPixelRatio(r);
  composer.setPixelRatio(r);
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  bloom.enabled = l < 3;
}
let fpsAcc = 0, fpsN = 0;
function sampleQuality(dt) {
  if (!window.__ready || window.__hq) return;  // __hq pins full quality (screenshot harness)
  fpsAcc += dt; fpsN++;
  if (fpsAcc < 2.5) return;
  const fps = fpsN / fpsAcc;
  fpsAcc = 0; fpsN = 0;
  if (fps < 26 && qLevel < 3) { qLevel++; applyQuality(qLevel); }
}
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  if (!document.getElementById('booterr')) {
    const b = document.createElement('div');
    b.id = 'booterr';
    b.textContent = 'Graphics context was lost (GPU reset) — please reload the page.';
    document.body.appendChild(b);
  }
});

/* ---------------- lights ---------------- */
const hemi = new THREE.HemisphereLight(0x8fa3c0, 0x3a3226, 0.55);
scene.add(hemi);
const amb = new THREE.AmbientLight(0xffffff, 0.25);
scene.add(amb);
const dir = new THREE.DirectionalLight(0xffd0a0, 1.6);
dir.castShadow = true;
dir.shadow.mapSize.set(2048, 2048);
dir.shadow.camera.near = 5;
dir.shadow.camera.far = 500;
const S = 70;
dir.shadow.camera.left = -S; dir.shadow.camera.right = S;
dir.shadow.camera.top = S; dir.shadow.camera.bottom = -S;
dir.shadow.bias = -0.0018;
dir.shadow.normalBias = 0.03;
scene.add(dir);
scene.add(dir.target);

/* ---------------- backdrop ---------------- */
const sky = createSky();
scene.add(sky.mesh);
const clouds = createCloudSea(110, 460, -30);
scene.add(clouds);
const peaks = createDistantPeaks(24, 520);
scene.add(peaks);
// moon for night menus/voids
const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: 0xdfe8ff, transparent: true, opacity: 0 }));
moon.scale.setScalar(90);
scene.add(moon);

/* ---------------- systems ---------------- */
const audio = new AudioEngine();
let rig = null;
const params = new URLSearchParams(location.search);

const hud = new Hud({
  pick: (id) => goToZone(id),
  menu: () => toMenu(),
  mute: () => { audio.setMuted(!audio.muted); hud.setMuteIcon(audio.muted); },
  music: () => { const on = audio.toggleMusicTrack(); hud.setMusicIcon(on); },
  prev: () => gotoBeat(state.beat - 1),
  next: () => gotoBeat(state.beat + 1),
  nextzone: () => nextZone(),
  goBeat: (i) => gotoBeat(i),
});

/* ---------------- env engine ---------------- */
function envPair(src = ENV_BASE) {
  return {
    top: new THREE.Color(src.top), mid: new THREE.Color(src.mid), bot: new THREE.Color(src.bot),
    sunDir: new THREE.Vector3(...src.sunDir).normalize(),
    sunColor: new THREE.Color(src.sunColor), sunSize: src.sunSize, sunI: src.sunI,
    stars: src.stars, fogColor: new THREE.Color(src.fogColor), fogDensity: src.fogDensity,
    hemiSky: new THREE.Color(src.hemiSky), hemiGround: new THREE.Color(src.hemiGround), hemiI: src.hemiI,
    dirColor: new THREE.Color(src.dirColor), dirI: src.dirI, ambientI: src.ambientI,
    exposure: src.exposure, bloomS: src.bloomS, bloomR: src.bloomR, bloomT: src.bloomT,
    cloudLit: new THREE.Color(src.cloudLit), vignette: src.vignette,
  };
}
const envCur = envPair();
const envTgt = envPair();
const NUMS = ['sunSize', 'sunI', 'stars', 'fogDensity', 'hemiI', 'dirI', 'ambientI', 'exposure', 'bloomS', 'bloomR', 'bloomT', 'vignette'];
const COLS = ['top', 'mid', 'bot', 'sunColor', 'fogColor', 'hemiSky', 'hemiGround', 'dirColor', 'cloudLit'];

function setEnv(partial) {
  const e = { ...ENV_BASE, ...(partial || {}) };
  envTgt.top.set(e.top); envTgt.mid.set(e.mid); envTgt.bot.set(e.bot);
  envTgt.sunDir.set(...e.sunDir).normalize();
  envTgt.sunColor.set(e.sunColor); envTgt.fogColor.set(e.fogColor);
  envTgt.hemiSky.set(e.hemiSky); envTgt.hemiGround.set(e.hemiGround);
  envTgt.dirColor.set(e.dirColor); envTgt.cloudLit.set(e.cloudLit);
  NUMS.forEach(k => { envTgt[k] = e[k]; });
  moon.material.opacity = clamp(e.stars * 0.9, 0, 0.9);
}
function snapEnv(partial) {
  setEnv(partial);
  COLS.forEach(k => envCur[k].copy(envTgt[k]));
  envCur.sunDir.copy(envTgt.sunDir);
  NUMS.forEach(k => { envCur[k] = envTgt[k]; });
  applyEnv(1);
}
let _lastDt = 0.016;
const SNAP = params.get('snap') === '1';
function applyEnv(k) {
  const kf = SNAP ? 1 : 1 - Math.exp(-2.2 * _lastDt);   // frame-rate independent colour damping
  COLS.forEach(c => envCur[c].lerp(envTgt[c], kf));
  envCur.sunDir.lerp(envTgt.sunDir, kf).normalize();
  NUMS.forEach(n => { envCur[n] = SNAP ? envTgt[n] : damp(envCur[n], envTgt[n], 2.4, _lastDt); });

  sky.uniforms.uTop.value.copy(envCur.top);
  sky.uniforms.uMid.value.copy(envCur.mid);
  sky.uniforms.uBot.value.copy(envCur.bot);
  sky.uniforms.uSunDir.value.copy(envCur.sunDir);
  sky.uniforms.uSunColor.value.copy(envCur.sunColor);
  sky.uniforms.uSunSize.value = envCur.sunSize;
  sky.uniforms.uSunI.value = envCur.sunI;
  sky.uniforms.uStars.value = envCur.stars;

  scene.fog.color.copy(envCur.fogColor);
  scene.fog.density = envCur.fogDensity;
  hemi.color.copy(envCur.hemiSky);
  hemi.groundColor.copy(envCur.hemiGround);
  hemi.intensity = envCur.hemiI;
  amb.intensity = envCur.ambientI;
  dir.color.copy(envCur.dirColor);
  dir.intensity = envCur.dirI;

  renderer.toneMappingExposure = envCur.exposure;
  bloom.strength = envCur.bloomS;
  bloom.radius = envCur.bloomR;
  bloom.threshold = envCur.bloomT;
  clouds.children.forEach(s => s.material.color.lerp(envCur.cloudLit, 0.08));
  hud.setVignette(envCur.vignette);
}

/* ---------------- zones ---------------- */
const ZONES = [zone1, zone2, zone3, zone4, zone5];
const byId = Object.fromEntries(ZONES.map(z => [z.id, z]));

const state = {
  mode: 'loading', // loading | menu | zone
  zone: null,
  beat: 0,
  beatT: 0,
  lastDt: 0.016,
  seen: new Set(),
};

const ctx = { THREE, scene, camera, renderer, composer, bloom, hud, audio, sky, dir, hemi, amb, state, params };

/* loader progress */
const fill = document.getElementById('loader-fill');
const pct = document.getElementById('loader-pct');
const nextFrame = () => new Promise(r => requestAnimationFrame(r));

async function boot() {
  rig = new CameraRig(camera, canvas);
  ctx.rig = rig;
  rig.enabled = false;

  const steps = ZONES.length + 1;
  for (let i = 0; i < ZONES.length; i++) {
    const z = ZONES[i];
    try { z.build(ctx); } catch (err) { console.error('build failed', z.id, err); }
    z.group && (z.group.visible = false);
    const p = ((i + 1) / steps) * 100;
    fill.style.width = p + '%';
    pct.textContent = Math.round(p) + '%';
    await nextFrame();
  }
  snapEnv(ENV_BASE);
  fill.style.width = '100%'; pct.textContent = '100%';

  await nextFrame();
  document.getElementById('loader').classList.add('done');
  setTimeout(() => document.getElementById('loader').classList.add('hidden'), 900);

  try {
    if (params.get('z') && byId[params.get('z')]) {
      goToZone(params.get('z'), { instant: true, beat: parseInt(params.get('b') || '0', 10) });
    } else {
      toMenu();
    }
  } catch (e) { console.error('boot entry failed', e); }
  charStore.init();
  window.__ready = true;
}

/* ---------------- menu ---------------- */
function toMenu() {
  hud.fade(1, 340);
  setTimeout(() => { try { _toMenuInner(); } catch (e) { console.error('menu entry failed', e); } finally { hud.fade(0, 550); } }, 350);
}
function _toMenuInner() {
  state.mode = 'menu';
  state.zone = null;
  ZONES.forEach(z => z.group && (z.group.visible = false));
  hud.showMenu(); hud.hideHud(); hud.clearLabels();
  moon.position.set(-160, 150, -420);
  setEnv({ // moonlit cloud sea
    top: 0x060a18, mid: 0x101b33, bot: 0x1c2742,
    sunDir: [0.4, 0.5, -0.7], sunColor: 0xbfd0ff, sunSize: 0.03, sunI: 0.55,
    stars: 1.0, fogColor: 0x0b1020, fogDensity: 0.0045,
    hemiSky: 0x35507e, hemiGround: 0x131722, hemiI: 0.5,
    dirColor: 0x9db4e8, dirI: 0.9, ambientI: 0.18,
    exposure: 1.0, bloomS: 0.5, bloomR: 0.6, bloomT: 0.75,
    cloudLit: 0x3d5580, vignette: 0.95,
  });
  rig.enabled = false;
  rig.yaw = 0; rig.pitch = 0; rig.dist = 1;
  rig.setAnchor({ pos: [40, 34, 95], look: [0, 6, -30], fov: 60 }, true);
  moon.position.set(-160, 150, -420);
  audio.setZoneMusic(null);
  audio.setBed({ wind: 0.5, shimmer: 0.4 });
  hud.buildMenu();
}

function pickChapterCard(id) {
  document.querySelectorAll('.card').forEach(c => c.style.pointerEvents = 'none');
}

/* ---------------- zone transitions ---------------- */
let transitioning = false;
function goToZone(id, { instant = false, beat = 0 } = {}) {
  const z = byId[id];
  if (!z || transitioning) return;
  transitioning = true;
  const ch = CHAPTERS.find(c => c.id === id);

  const doEnter = () => {
    ZONES.forEach(o => { if (o.group) o.group.visible = o === z; });
    state.mode = 'zone';
    state.zone = z;
    audio.setZoneMusic(z.id);
    hud.hideMenu();
    hud.showHud();
    hud.setChapter(ch);
    hud.setBeats(z.beats.length);
    peaks.position.set(...(z.center || [0, 0, 0]));
    clouds.position.set(...(z.center || [0, 0, 0]));
    dir.target.position.set(...(z.center || [0, 0, 0]));
    dir.position.set(
      z.center[0] + envCur.sunDir.x * 160,
      z.center[1] + envCur.sunDir.y * 160 + 60,
      z.center[2] + envCur.sunDir.z * 160,
    );
    rig.enabled = true;
    hud.showSteps(false);
    transitioning = false;      // must be clear before gotoBeat (it guards on this flag)
    gotoBeat(beat, true);
    hud.titleCard(ch.cn, ch.title, ch.hook, 3400);
    hud.fade(0, 700);
  };

  audio.sfx('whoosh2');
  if (instant) { doEnter(); return; }
  hud.fade(1, 500);
  setTimeout(doEnter, 540);
}

function nextZone() {
  const ids = ZONES.map(z => z.id);
  const i = ids.indexOf(state.zone?.id);
  if (i >= 0 && i < ids.length - 1) goToZone(ids[i + 1]);
  else toMenu();
}

/* ---------------- beats ---------------- */
function gotoBeat(i, force = false) {
  const z = state.zone;
  if (!z || transitioning) return;
  i = clamp(i, 0, z.beats.length - 1);
  if (i === state.beat && !force) return;
  const prev = z.beats[state.beat];
  if (prev && prev.onExit) prev.onExit(z, ctx, state.beat);
  state.beat = i;
  state.beatT = 0;
  const b = z.beats[i];
  hud.clearLabels();
  hud.clearGrade();

  const apply = () => {
    setEnv(b.env);
    rig.setAnchor(b.cam, !!(b.instant || b.cut));
    const last = i === z.beats.length - 1;
    hud.setBeat(i, { kicker: b.kicker || `${CHAPTERS.find(c => c.id === z.id)?.cn || ''} · Beat ${i + 1}`, html: b.html },
      { last, hasNextZone: true });
    (b.labels || []).forEach(L => {
      const p = new THREE.Vector3(...L.pos);
      hud.addLabel({ text: L.text, sub: L.sub || '', cls: L.cls || '', getPos: () => p });
    });
    if (b.audio) audio.setBed(b.audio);
    if (b.sfx) (Array.isArray(b.sfx) ? b.sfx : [b.sfx]).forEach(s => audio.sfx(s));
    if (b.onEnter) b.onEnter(z, ctx, i);
    if (z.onBeat) z.onBeat(i, ctx, b);
    if (b.cut) {
      setTimeout(() => hud.fade(0, 550), 120);
    }
  };

  if (b.cut && !force) {
    hud.fade(1, 240);
    setTimeout(apply, 250);
  } else {
    apply();
  }
}

function nextBeatOrIdle() {
  const z = state.zone;
  if (!z) return;
  if (state.beat < z.beats.length - 1) gotoBeat(state.beat + 1);
}

/* ---------------- main loop ---------------- */
const clock = new THREE.Clock();
let menuDrift = 0;

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;
  state.lastDt = dt;
  sampleQuality(dt);
  sky.uniforms.uTime.value = t;

  if (state.mode === 'menu') {
    menuDrift += dt;
    rig.setAnchor({
      pos: [40 + Math.sin(menuDrift * 0.05) * 14, 34 + Math.sin(menuDrift * 0.08) * 4, 95],
      look: [0, 6, -30], fov: 60,
    });
    clouds.userData.update?.(t);
  }

  if (state.mode === 'zone' && state.zone) {
    const z = state.zone;
    const b = z.beats[state.beat];
    state.beatT += dt;
    if (b && b.auto != null && !window.__noAuto && state.beatT > b.auto && !transitioning) {
      if (state.beat < z.beats.length - 1) gotoBeat(state.beat + 1);
    }
    try { z.update && z.update(ctx, t, dt, state.beat, state.beatT); } catch (e) { console.error(e); }
    clouds.userData.update?.(t);
    // keep sun light + backdrop anchored to zone
    moon.position.set(z.center[0] - 160, z.center[1] + 150, z.center[2] - 420);
    if (z.center) {
      dir.target.position.set(...z.center);
      dir.position.set(
        z.center[0] + envCur.sunDir.x * 160,
        z.center[1] + Math.max(envCur.sunDir.y, 0.08) * 160 + 60,
        z.center[2] + envCur.sunDir.z * 160,
      );
    }
  }

  _lastDt = dt;
  rig.update(dt);
  applyEnv(1);
  audio.update(dt);
  hud.updateLabels(camera, innerWidth, innerHeight);
  composer.render();
}

/* ---------------- resize ---------------- */
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

/* audio unlocks on first gesture */
const initAudio = () => { audio.init(); audio.resume(); window.removeEventListener('pointerdown', initAudio); };
window.addEventListener('pointerdown', initAudio);

if (SNAP) window.__snap = true;

/* ---------------- go ---------------- */
if (params.get('skip') === '1') document.getElementById('menu').classList.add('hidden');
if (params.get('auto') === '0') window.__noAuto = true;
boot();
loop();

// expose for debugging / screenshots
window.__world = { goToZone, gotoBeat, state, hud, ctx, audio, chars: charStore, rig: () => rig, setEnv, snapEnv };
