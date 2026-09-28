// ============================================================
// z1.js — Chapter 1: Though The Flesh Perish, The Demonic Heart
// Knows No Regret — the summit siege, the self-detonation,
// and the spring rain over Gu Yue Village.
// ============================================================
import * as THREE from 'three';
import {
  rr, fbm, TEX, groundGeo, glowSprite, decal,
} from '../util.js';
import { createDriftPoints, createRain, ShockRings, Burst, runeCircle } from '../fx.js';
import {
  makeFangYuan, makeHero, makeCrowdFigure, animateFigure, makeElder,
} from '../figures.js';
import {
  makeStiltHouse, makePavilion, villageLights, rockyBlocks, makeBanner,
} from './common.js';
import { TURN_END } from '../animlab.js';

const SUMMIT_H = (x, z) => {
  const r = Math.hypot(x, z);
  const plateau = 1 - smooth01((r - 15) / 14);
  return plateau * 2.3 + fbm(x * 0.13 + 3, z * 0.13 - 7, 4) * 0.75 - smooth01((r - 26) / 10) * 7;
};
function smooth01(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }

/* village slope (local) */
const VILL_H = (x, z) => -0.34 * x + fbm(x * 0.05, z * 0.05, 4) * 4.5 + Math.sin(z * 0.045) * 2.5;

export const zone1 = {
  id: 'z1',
  center: [0, 0, 0],

  build(ctx) {
    const g = this.group = new THREE.Group();
    ctx.scene.add(g);
    const refs = this.refs = {};

    /* ============ SUMMIT ============ */
    const summit = new THREE.Group();
    g.add(summit);
    refs.summit = summit;

    // main cliff face / mountain body
    const bodyGeo = new THREE.CylinderGeometry(17, 68, 130, 26, 10, true);
    {
      const p = bodyGeo.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        const n = fbm(Math.atan2(v.z, v.x) * 2.4, v.y * 0.06 + 4, 4);
        const bulge = 1 + (n - 0.5) * 0.55;
        v.x *= bulge; v.z *= bulge;
        p.setXYZ(i, v.x, v.y, v.z);
      }
      bodyGeo.computeVertexNormals();
    }
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x4d4a55, map: TEX.stone, roughness: 0.96, flatShading: true, side: THREE.DoubleSide,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = -63;
    body.castShadow = body.receiveShadow = true;
    summit.add(body);

    // plateau
    const plate = new THREE.Mesh(
      groundGeo(76, 60, SUMMIT_H),
      new THREE.MeshStandardMaterial({ color: 0x6a666e, map: TEX.stone, roughness: 0.97, flatShading: true }),
    );
    plate.receiveShadow = true;
    summit.add(plate);

    // rim rocks + boulders + broken pillars (the demon's lair)
    const rim = rockyBlocks({ count: 22, area: 60, y: 1.4, min: 1.2, max: 4.6, color: 0x565360 });
    rim.position.y = 0;
    summit.add(rim);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x5c5966, map: TEX.stone, roughness: 0.95 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.4;
      const r = rr(14, 19);
      const h = rr(2.5, 6);
      const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, h, 7), pillarMat);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      pil.position.set(x, SUMMIT_H(x, z) + h / 2 - rr(0, 0.7), z);
      pil.rotation.z = rr(-0.14, 0.14);
      pil.castShadow = true;
      summit.add(pil);
    }

    // blood pool + splatter under the demon
    const blood = decal(0xffffff, 8.5, 0.95, TEX.blood);
    blood.position.y = SUMMIT_H(0, 0) + 0.05;
    summit.add(blood);
    const blood2 = decal(0x7e0d10, 4, 0.6, TEX.glow);
    blood2.position.y = SUMMIT_H(0, 0) + 0.06;
    blood2.scale.set(1.7, 1, 1.3);
    summit.add(blood2);

    // faint demonic rune circle beneath
    const runes = runeCircle(3.4, 0xa3221d, 0.3);
    runes.position.y = SUMMIT_H(0, 0) + 0.04;
    summit.add(runes);
    refs.runes = runes;

    /* --- Fang Yuan, at the centre of the ring --- */
    const fy = makeFangYuan();
    fy.group.position.set(0, SUMMIT_H(0, 0), 0);
    fy.group.rotation.y = Math.PI * 0.15;
    summit.add(fy.group);
    refs.fy = fy;

    /* --- first ring: the righteous heroes --- */
    refs.heroes = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + rr(-0.14, 0.14);
      const r = rr(7, 11.5);
      const h = makeHero(i);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      h.group.position.set(x, SUMMIT_H(x, z), z);
      h.group.rotation.y = Math.atan2(-z, -x) + Math.PI / 2 + rr(-0.3, 0.3);
      const poses = ['point', 'sneer', 'clutch', 'crossed', 'brawl', 'sneer'];
      h.setPose(i % 5 === 3 ? 'kneel' : poses[i % poses.length]);
      summit.add(h.group);
      refs.heroes.push(h);
    }

    /* --- second ring: the gathered host --- */
    const hostPalette = [0x5a3a3a, 0x3a4a5a, 0x5a5560, 0x4a5a45, 0x5f5040];
    refs.host = [];
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + rr(-0.2, 0.2);
      const r = rr(12.5, 17.5);
      const f = makeCrowdFigure(hostPalette[i % hostPalette.length]);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      f.position.set(x, SUMMIT_H(x, z), z);
      f.rotation.y = Math.atan2(-z, -x) + Math.PI / 2;
      summit.add(f);
      refs.host.push(f);
    }

    /* --- sect banners --- */
    refs.banners = [];
    [[0x6b2f2f, '義'], [0x2f4a6b, '正'], [0x4a5a3a, '天'], [0x5a4a6b, '誅']].forEach(([c, e], i) => {
      const b = makeBanner(c, e);
      const a = (i / 4) * Math.PI * 2 + 0.8;
      const x = Math.cos(a) * 16.5, z = Math.sin(a) * 16.5;
      b.position.set(x, SUMMIT_H(x, z), z);
      b.rotation.y = Math.atan2(-z, -x) + Math.PI / 2;
      summit.add(b);
      refs.banners.push(b);
    });

    /* --- wind / embers over the summit --- */
    const windPos = [];
    for (let i = 0; i < 240; i++) windPos.push(rr(-30, 30), rr(1, 16), rr(-30, 30));
    const windPts = createDriftPoints(windPos, {
      color: 0xffb080, size: 0.9, opacity: 0.5, amp: 3.4, speed: 0.9, twinkle: 1.4, map: TEX.glow,
    });
    summit.add(windPts);
    refs.windPts = windPts;

    /* ============ THE DETONATION FX (armed) ============ */
    refs.rings = new ShockRings(g, { color: 0xffd9a0, max: 7 });
    refs.burst1 = new Burst(g, { count: 320, color: 0xffcf8a, size: 2.4, gravity: 10, drag: 0.9 });
    refs.burst2 = new Burst(g, { count: 220, color: 0xff7a4a, size: 3.4, gravity: 16, drag: 0.7 });
    refs.blastLight = new THREE.PointLight(0xffc070, 0, 110, 1.3);
    refs.blastLight.position.set(0, SUMMIT_H(0, 0) + 2.5, 0);
    summit.add(refs.blastLight);

    /* ============ GU YUE VILLAGE (night rain slope) ============ */
    const vil = new THREE.Group();
    vil.position.set(180, -78, 96);
    g.add(vil);
    refs.vil = vil;

    const vGround = new THREE.Mesh(
      groundGeo(300, 70, VILL_H),
      new THREE.MeshStandardMaterial({ color: 0x3c4448, map: TEX.stone, roughness: 0.97 }),
    );
    vGround.receiveShadow = true;
    vil.add(vGround);

    // the ribbon of lights
    const lights = villageLights({ count: 2600, size: 280, gradient: 0.34 });
    lights.position.y = 1.5;
    vil.add(lights);
    refs.vLights = lights;

    // scattered stilt houses on the slope
    const houses = new THREE.Group();
    const r2 = (() => { let s = 77; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; })();
    for (let i = 0; i < 190; i++) {
      const x = (r2() - 0.5) * 260;
      const z = (r2() - 0.5) * 260;
      const band = Math.sin(x * 0.02 + z * 0.015) * 0.5 + 0.5;
      if (r2() > 0.3 + band * 0.65) continue;
      const h = makeStiltHouse({ stiltH: 1.6, bamboo: r2() > 0.55 });
      h.position.set(x, VILL_H(x, z) + 0.3, z);
      h.rotation.y = r2() * Math.PI * 2;
      h.scale.setScalar(0.6 + r2() * 0.75);
      h.userData.setLit(true);
      houses.add(h);
    }
    vil.add(houses);
    refs.houses = houses;

    // ancestral hall — grand pavilion, brilliantly lit
    const hall = makePavilion({ stories: 3, w: 11, color: 0x7c3428 });
    const hx = -34, hz = 14;
    hall.position.set(hx, VILL_H(hx, hz) + 0.4, hz);
    hall.rotation.y = 0.5;
    vil.add(hall);
    refs.hall = hall;
    // courtyard glow
    const court = new THREE.PointLight(0xffb46a, 620, 80, 1.25);
    court.position.set(hx, VILL_H(hx, hz) + 8, hz);
    vil.add(court);
    refs.hallLight = court;
    const courtGlow = glowSprite(0xffb45e, 26, 0.5);
    courtGlow.position.copy(court.position);
    vil.add(courtGlow);
    // ceremony light on the ground beneath
    const hallDec = decal(0xffb45e, 30, 0.4, TEX.glow);
    hallDec.position.set(hx, VILL_H(hx, hz) + 0.6, hz);
    vil.add(hallDec);

    // a few elder silhouettes kneeling inside (visible as tiny shapes)
    refs.eldersInside = [];
    for (let i = 0; i < 5; i++) {
      const e = makeElder(0xe6e1d4, 0x8c2f26);
      e.group.userData.noGLB = true; // the kneeling prayer pose is the point — keep procedural
      e.group.scale.setScalar(0.85);
      const ex = hx + Math.cos(i * 1.2) * 2.4, ez = hz + Math.sin(i * 1.2) * 2.4;
      e.group.position.set(ex, VILL_H(ex, ez) + 0.8, ez);
      e.group.rotation.y = Math.atan2(hx - ex, hz - ez) + Math.PI;
      e.setPose('pray');
      vil.add(e.group);
      refs.eldersInside.push(e);
    }

    // rain
    const rain = createRain({ count: 3400, area: 320, height: 90, color: 0x9db8d8, opacity: 0.0, len: 0.8, wind: 0.7 });
    rain.position.y = 40;
    vil.add(rain);
    refs.rain = rain;

    // slope glow mist
    const mist = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 90),
      new THREE.MeshBasicMaterial({ map: TEX.cloud, color: 0x33507a, transparent: true, opacity: 0.35, depthWrite: false }),
    );
    mist.position.set(0, 30, -80);
    vil.add(mist);
    // twinkle for the light ribbon
    refs.vLights = lights;
    lights.userData.update = (t) => {
      lights.material.opacity = 0.82 + 0.16 * Math.sin(t * 2.1) + 0.06 * Math.sin(t * 7.3);
    };

    /* ============ BEATS ============ */
    const B = (kicker, html, cam, env, extra = {}) => ({ kicker, html, cam, env, ...extra });

    this.beats = [
      B(
        '青茅山 · Summit of Qing Mao Mountain',
        `<b>“Fang Yuan! Hand over the Spring Autumn Cicada without struggle, and I shall grant you a quick death!”</b>
         <span class="stage">Tattered dark robe, hair wild, body bathed in blood — every path to life has been severed. The trap has snapped shut; on this day, death is absolute.</span>`,
        { pos: [15.5, 7.2, 19.5], look: [0, 2.2, 0], fov: 52 },
        {
          top: 0x2a2a55, mid: 0xb0502a, bot: 0xf0a24a,
          sunDir: [-1, 0.10, -0.30], sunColor: 0xff9a4a, sunSize: 0.05, sunI: 1.35,
          stars: 0.18, fogColor: 0x50302c, fogDensity: 0.011,
          hemiSky: 0x7a6a9a, hemiGround: 0x50382a, hemiI: 0.6,
          dirColor: 0xff9748, dirI: 2.2, ambientI: 0.3,
          exposure: 1.05, bloomS: 0.55, bloomR: 0.55, bloomT: 0.82, vignette: 0.9,
        },
        {
          auto: 13,
          onEnter: (z) => { const a = z.refs.fy.animator; if (a) a.start('idle'); },
          labels: [
            { text: 'Gu Yue Fang Yuan', sub: 'Old Demon Fang · five centuries of carnage', pos: [0, 3.6, 0] },
            { text: 'The Righteous Host', sub: 'sect leaders & young heroes, united as one', pos: [0, 4.5, -15] },
          ],
          audio: { wind: 0.95, rumble: 0.5, drone: 0.85 },
          sfx: 'dread',
        },
      ),

      B(
        '僵持 · Six hours slip into eternity',
        `<b>His eyes were abyssal, like an ancient well — unfathomably deep, without shore and without bottom.</b>
         <span class="stage">None of them dare make a move; every soul trembles before the final, dying wrath of Old Demon Fang. He stood as motionless as a statue — then slowly turned around. That solitary motion sent a convulsion through the host: the multitude recoiled in unison, a full pace in panic.</span>`,
        { pos: [7.2, 4.6, 9.4], look: [0, 2.35, 0], fov: 42 },
        {
          top: 0x232349, mid: 0x9c4226, bot: 0xe08b3e,
          sunDir: [-1, 0.05, -0.30], sunColor: 0xff8a3a, sunSize: 0.045, sunI: 1.5,
          stars: 0.3, fogColor: 0x482a28, fogDensity: 0.012,
          hemiSky: 0x6a5a8a, hemiGround: 0x48342a, hemiI: 0.55,
          dirColor: 0xff8a3e, dirI: 2.4, ambientI: 0.28,
          exposure: 1.06, bloomS: 0.6, bloomR: 0.55, bloomT: 0.8, vignette: 0.95,
        },
        {
          auto: 12,
          onEnter: (z) => { const a = z.refs.fy.animator; if (a) a.start('turn'); },
          labels: [
            { text: 'Blood on grey-white stone', sub: 'the mountain rocks dyed dark red', pos: [2.5, 2.4, 2.5], cls: 'wl-red' },
          ],
          audio: { wind: 1.0, rumble: 0.6, drone: 0.9 },
        },
      ),

      B(
        '绝命诗 · The verse of a dying demon',
        `<b>“Green mountains beneath the setting sun, autumn moon and spring breeze.<br/>
         Truly, in the morning one’s hair is like black silk, by dusk it turns to snow;<br/>
         Right and wrong, success and failure: all vanish in the turning of a head.”</b>
         <span class="stage">A Chinese student of Earth, cast into this world — three hundred years adrift, two hundred years of dominion. In the end, he failed: yet not the faintest whisper of regret.</span>`,
        { pos: [10, 4.2, 11], look: [-46, 5, -14], fov: 60 },
        {
          top: 0x1d1d40, mid: 0x8a3a24, bot: 0xd87a34,
          sunDir: [-1, 0.028, -0.26], sunColor: 0xff7a30, sunSize: 0.05, sunI: 1.6,
          stars: 0.4, fogColor: 0x40262a, fogDensity: 0.011,
          hemiSky: 0x5a5a8a, hemiGround: 0x40302a, hemiI: 0.5,
          dirColor: 0xff7a34, dirI: 2.5, ambientI: 0.26,
          exposure: 1.08, bloomS: 0.65, bloomR: 0.6, bloomT: 0.78, vignette: 0.9,
        },
        {
          auto: 14,
          onEnter: (z) => { const a = z.refs.fy.animator; if (a) a.start('poem'); },
          labels: [
            { text: 'The western ridge', sub: 'sun sinks — clouds set ablaze', pos: [-70, 18, -22] },
          ],
          audio: { wind: 1.0, drone: 0.7, shimmer: 0.25 },
          sfx: 'bell',
        },
      ),

      B(
        '自爆 · Self-detonation',
        `<b>“If this newly refined Spring Autumn Cicada works — I will still be a demon in my next life!”</b>
         <span class="stage">Greed and panic drive the host forward — and in that very breath, with a thunderous blast, Fang Yuan brazenly self-detonates.</span>`,
        { pos: [18, 7.5, 23], look: [0, 3, 0], fov: 58 },
        {
          top: 0x4a3a44, mid: 0xd8702e, bot: 0xffd080,
          sunDir: [-1, 0.06, -0.28], sunColor: 0xffc070, sunSize: 0.06, sunI: 2.6,
          stars: 0.2, fogColor: 0x6a4030, fogDensity: 0.012,
          hemiSky: 0xffd0b0, hemiGround: 0x6a4a3a, hemiI: 0.9,
          dirColor: 0xffd8a0, dirI: 3.2, ambientI: 0.5,
          exposure: 1.14, bloomS: 0.72, bloomR: 0.7, bloomT: 0.65, vignette: 0.7,
        },
        {
          auto: 4.6,
          audio: { wind: 0.8, drone: 1.0, rumble: 0.8 },
          onEnter: (z, c) => {
            const r = z.refs;
            r.explodeT = 0;
            const a = r.fy.animator; if (a) a.start('brace'); // the final breath, then the blast
            c.hud.flashFx(1.0, 110, 1400);
            c.rig.shake(1.5, 2.0);
            c.audio.sfx('boom');
            const o = new THREE.Vector3(0, SUMMIT_H(0, 0) + 2.2, 0);
            r.burst1.fire(o, { speed: 26, dur: 3.4, spread: 1, up: 0.7 });
            r.burst2.fire(o, { speed: 16, dur: 4, spread: 1.4, up: 1.0 });
            r.rings.spawn(o, { dur: 1.7, scale: 46 });
            setTimeout(() => r.rings.spawn(o, { dur: 2.1, scale: 74, color: 0xfff2d0 }), 240);
            setTimeout(() => r.rings.spawn(new THREE.Vector3(0, SUMMIT_H(0, 0) + 14, 0), { normal: new THREE.Vector3(0, 0, 1), dur: 2.4, scale: 84, color: 0xffc890 }), 460);
            r.blastLight.intensity = 0;
          },
        },
      ),

      B(
        '春雨 · Spring rain over Qing Mao Mountain',
        `<b>“Spring rain fell continuously, silently nourishing Qing Mao Mountain.”</b>
         <span class="stage">Night is deep. From the mountainside to the foothills, faint shimmering lights glow — a brilliant ribbon of radiance across the slope: <b>Gu Yue Village</b>, several thousand stilt houses nestled on the mountain.</span>`,
        { pos: [332, 58, 218], look: [178, -48, 92], fov: 55 },
        {
          top: 0x050812, mid: 0x0b1428, bot: 0x14243c,
          sunDir: [0.35, 0.5, -0.6], sunColor: 0xa8c0ff, sunSize: 0.03, sunI: 0.5,
          stars: 0.9, fogColor: 0x0b1120, fogDensity: 0.0085,
          hemiSky: 0x2a3c5e, hemiGround: 0x11141c, hemiI: 0.6,
          dirColor: 0x8fa8d8, dirI: 0.7, ambientI: 0.24,
          exposure: 1.0, bloomS: 0.7, bloomR: 0.6, bloomT: 0.7, vignette: 0.95,
        },
        {
          auto: 12, cut: true,
          labels: [
            { text: 'Gu Yue Village', sub: '古月 · nestled upon Qing Mao Mountain', pos: [150, -40, 80] },
            { text: 'Qing Mao Mountain', sub: '青茅 · tranquil range, distinct human habitation', pos: [300, 0, 60] },
          ],
          audio: { rain: 1.0, wind: 0.5, rumble: 0.15 },
        },
      ),

      B(
        '祠堂 · The Aperture Opening Ceremony eve',
        `<b>“Ancestors bless us! Hope that in this Aperture Opening Ceremony, many youths with excellent aptitude can emerge — to bring fresh blood and hope to our clan!”</b>
         <span class="stage">The Clan Leader kowtows, forehead meeting the brown floor in soft, rhythmic thuds. The elders murmur of Bai Ning Bing’s terrifying talent — and of a genius in the Fang lineage who could speak at three months, walk at four.</span>`,
        { pos: [226, -8, 128], look: [148, -46, 110], fov: 46 },
        {
          top: 0x04060f, mid: 0x0a1226, bot: 0x12203a,
          sunDir: [0.35, 0.5, -0.6], sunColor: 0xa8c0ff, sunSize: 0.03, sunI: 0.4,
          stars: 0.8, fogColor: 0x0a0f1c, fogDensity: 0.011,
          hemiSky: 0x2a3c5e, hemiGround: 0x11141c, hemiI: 0.5,
          dirColor: 0x8fa8d8, dirI: 0.5, ambientI: 0.16,
          exposure: 1.0, bloomS: 0.8, bloomR: 0.62, bloomT: 0.66, vignette: 0.95,
        },
        {
          auto: null,
          labels: [
            { text: 'Ancestral Hall', sub: 'three tiers of spirit tablets · red-copper censers', pos: [146, -34, 104] },
          ],
          audio: { rain: 0.8, wind: 0.35, shimmer: 0.3 },
          sfx: 'gong',
        },
      ),
    ];
  },

  /* ---------------- per-frame ---------------- */
  update(ctx, t, dt, beat, beatT) {
    const r = this.refs;
    if (!r) return;

    // ambient figure life
    animateFigure(r.fy, t);
    r.heroes.forEach(h => animateFigure(h, t));
    r.eldersInside.forEach(e => animateFigure(e, t));
    r.banners.forEach((b, i) => {
      const cloth = b.userData.cloth;
      if (cloth) {
        const p = cloth.geometry.attributes.position;
        for (let v = 0; v < p.count; v++) {
          const x = p.getX(v);
          p.setZ(v, Math.sin(t * 3 + x * 2 + i) * 0.18 * (x + 1.1) * 0.5);
        }
        p.needsUpdate = true;
      }
    });

    r.windPts.userData.update(t);
    r.runes.material.opacity = 0.18 + 0.14 * Math.sin(t * 1.7);
    r.vLights.userData.update(t);
    r.rain.userData.update(t);
    r.rain.userData.setOpacity(beat >= 4 ? 0.55 : 0);

    // restore the host when navigating away from the blast
    if (beat !== 3 && r.explodeT != null) {
      r.explodeT = null;
      r.blastLight.intensity = 0;
      [...r.heroes.map(h => h.group), ...r.host].forEach(f => {
        if (f.userData._bx != null) {
          f.position.set(f.userData._bx, f.userData._by, f.userData._bz);
          f.rotation.x = 0; f.rotation.z = 0;
        }
      });
    }

    // the multitude recoils a full pace — timed to the end of his turn
    const allFig = [...r.heroes.map(h => h.group), ...r.host];
    if (beat === 1 && beatT != null && beatT > TURN_END) {
      const k = 1 - Math.pow(1 - Math.min(1, (beatT - TURN_END) / 1.1), 2); // easeOut
      allFig.forEach((f, i) => {
        if (f.userData._rx == null) {
          f.userData._rx = f.position.x; f.userData._ry = f.position.y; f.userData._rz = f.position.z;
          f.userData._rjx = f.rotation.x; f.userData._rjy = f.rotation.y;
        }
        const len = Math.hypot(f.userData._rx, f.userData._rz) || 1;
        const wob = 1 + (i % 5) * 0.15;
        f.position.x = f.userData._rx + (f.userData._rx / len) * k * 1.1 * wob;
        f.position.z = f.userData._rz + (f.userData._rz / len) * k * 1.1 * wob;
        f.position.y = f.userData._ry + k * k * 0.25;
        f.rotation.x = f.userData._rjx + k * 0.35;
        f.rotation.y = f.userData._rjy + k * 0.2 * ((i % 2) ? 1 : -1);
      });
    } else if (beat !== 1) {
      allFig.forEach(f => {
        if (f.userData._rx != null) {
          f.position.set(f.userData._rx, f.userData._ry, f.userData._rz);
          f.rotation.x = f.userData._rjx; f.rotation.y = f.userData._rjy;
        }
      });
    }

    // detonation choreography
    if (beat === 3 && r.explodeT != null) {
      r.explodeT += dt;
      const te = r.explodeT;
      r.blastLight.intensity = te < 0.25 ? te * 5200 : Math.max(0, 3600 * (1 - (te - 0.25) / 1.4));
      const k = smooth01(Math.min(1, Math.max(0, (te - 0.14) * 1.4)));
      [...r.heroes.map(h => h.group), ...r.host].forEach((f, i) => {
        const bx = f.userData._bx ?? (f.userData._bx = f.position.x);
        const bz = f.userData._bz ?? (f.userData._bz = f.position.z);
        const by = f.userData._by ?? (f.userData._by = f.position.y);
        const len = Math.hypot(bx, bz) || 1;
        const dirx = bx / len, dirz = bz / len;
        const wob = 1 + (i % 5) * 0.22;
        f.position.x = bx + dirx * k * 8 * wob;
        f.position.z = bz + dirz * k * 8 * wob;
        f.position.y = by + k * k * (2 + (i % 3));
        f.rotation.z = k * 1.8 * ((i % 2) ? 1 : -1);
        f.rotation.x = k * 1.1;
      });
    }
    r.burst1.update(dt);
    r.burst2.update(dt);
    r.rings.update(dt);

    // hall light flicker at night beats
    if (beat >= 4) {
      r.hallLight.intensity = 600 + Math.sin(t * 9.3) * 55 + Math.sin(t * 23.7) * 25;
    }
  },
};
