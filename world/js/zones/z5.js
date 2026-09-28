// ============================================================
// z5.js — Chapter 5: Ren Zu's Three Gu, Hope Opens the Aperture
// the vision dais, the flight of the Predicaments, and the
// hope of immortality.
// ============================================================
import * as THREE from 'three';
import { rr, TEX, glowSprite, decal, pointCloud, canvasTex } from '../util.js';
import {
  createDriftPoints, createHopeStream, RippleField, runeCircle, lightShaft, ShockRings, Burst,
} from '../fx.js';
import {
  makeFangYuan, makeElder, makeFigure, animateFigure, makePredicament, makeCrowdFigure,
} from '../figures.js';
import { createFlowRibbon } from '../water.js';
import {
  makeCaveShell, makeStalactites, makeOrchidField, rockyBlocks, makeCrowd,
} from './common.js';

const C = [2400, 0, 2400];
const w = (p, l, fov) => ({ pos: [p[0] + C[0], p[1] + C[1], p[2] + C[2]], look: [l[0] + C[0], l[1] + C[1], l[2] + C[2]], fov });
const W = (p) => [p[0] + C[0], p[1] + C[1], p[2] + C[2]];

const BANK = 14;
const STEP27_Z = BANK - 1.6 - 27 * 1.12;      // ≈ -17.8
const DAIS = { x: 0, y: 10, z: -78, r: 15 };

const stepZ = (n) => BANK - 1.6 - n * 1.12;

export const zone5 = {
  id: 'z5',
  center: C,

  build(ctx) {
    const g = this.group = new THREE.Group();
    g.position.set(...C);
    ctx.scene.add(g);
    const refs = this.refs = {};

    /* ============ CAVERN ============ */
    const shell = makeCaveShell(96, 7);
    shell.position.y = 16;
    g.add(shell);
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(84, 48),
      new THREE.MeshStandardMaterial({ color: 0x4e5164, map: TEX.darkRock, roughness: 0.97 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    g.add(floor);
    g.add(rockyBlocks({ count: 30, area: 150, y: 0.3, min: 0.9, max: 3.4, color: 0x474a5c }));
    g.add(makeStalactites({ count: 150, radius: 82, ceilY: 46, glowCount: 46, seed: 9 }));

    /* river behind him (already crossed) — southern edge */
    const riverPts = [];
    for (let i = 0; i <= 30; i++) {
      const t = i / 30;
      riverPts.push(new THREE.Vector3(-70 + t * 140, 0.3, BANK + 4 + Math.sin(t * 6) * 2.2));
    }
    const riverCurve = new THREE.CatmullRomCurve3(riverPts);
    const river = createFlowRibbon(riverCurve, 6.4, {
      colA: 0x03101f, colB: 0x0a4a7a, colGlow: 0x3fb8ff, flow: 0.8, sparkle: 0.982,
    }, 200);
    g.add(river);
    refs.river = river;

    /* moon orchid field — his path */
    const orchids = makeOrchidField({ count: 3600, cx: 0, cz: -24, rx: 42, rz: 30, y: 0 });
    g.add(orchids);
    refs.orchids = orchids;

    /* pressure ripples */
    refs.ripples = new RippleField(g, new THREE.Vector3(0, 0.1, -14), { count: 7, radius: 38, color: 0xbfe0ff });

    /* spirit spring far end */
    const springGlow = glowSprite(0x7fd8ff, 18, 0.22);
    springGlow.position.set(0, 4, -50);
    g.add(springGlow);
    const springLight = new THREE.PointLight(0x5fbfff, 520, 80, 1.2);
    springLight.position.set(0, 6, -50);
    g.add(springLight);
    refs.springLight = springLight;

    /* ============ ELDERS WATCHING FROM THE BANK ============ */
    refs.elders = [];
    [[-7, 0x8c2f26, 'Gu Yue Chi Lian'], [-3, 0x2f5a8c, 'Gu Yue Mo Chen'], [1, 0xa3221d, 'Gu Yue Clan Leader']].forEach(([x, acc, name], i) => {
      const e = makeElder(0xe6e1d4, acc);
      e.group.position.set(x, 0, BANK + 7 + (i % 2));
      e.group.rotation.y = Math.PI;
      e.setPose(i === 2 ? 'frown' : 'crossed');
      g.add(e.group);
      refs.elders.push({ fig: e, name });
    });
    const crowd = makeCrowd(40, 13, [0, 0, BANK + 14], { zStretch: 0.6, seed: 33 });
    g.add(crowd);
    refs.crowd = crowd;

    /* ============ THE PROTAGONIST ============ */
    const fy = makeFangYuan();
    fy.group.position.set(0.6, 0, BANK);
    fy.group.rotation.y = Math.PI;
    g.add(fy.group);
    refs.fy = fy;

    /* hope stream feeding him (field → abdomen) */
    const abdomen = new THREE.Vector3(0, 1.05, 0);
    const hopeIn = createHopeStream({
      count: 700,
      target: abdomen.clone(),
      sources: Array.from({ length: 220 }, () => [rr(-7, 7), rr(0.2, 0.7), rr(-5.5, 5.5)]),
      color: 0xfdf8e6, size: 1.7,
    });
    fy.group.add(hopeIn);
    refs.hopeIn = hopeIn;

    /* light-mass in his abdomen (grows with every step) */
    const gut = glowSprite(0xfff2c0, 0.0, 1);
    gut.position.set(0, 1.05, 0.1);
    fy.group.add(gut);
    refs.gut = gut;
    const gutLight = new THREE.PointLight(0xffe8b0, 0, 9, 1.5);
    gutLight.position.set(0, 1.05, 0);
    fy.group.add(gutLight);
    refs.gutLight = gutLight;

    /* ============ THE VISION DAIS ============ */
    const dais = new THREE.Group();
    dais.position.set(DAIS.x, DAIS.y, DAIS.z);
    g.add(dais);
    refs.dais = dais;

    const daisTop = new THREE.Mesh(
      new THREE.CylinderGeometry(DAIS.r, DAIS.r + 3.5, 3.4, 40),
      new THREE.MeshStandardMaterial({ color: 0x3c3f52, map: TEX.darkRock, roughness: 0.95, flatShading: true }),
    );
    daisTop.receiveShadow = daisTop.castShadow = true;
    dais.add(daisTop);
    const daisFloorY = 1.7;
    const circle = runeCircle(DAIS.r * 0.86, 0xd8b46a, 0.5);
    circle.position.y = daisFloorY + 0.06;
    dais.add(circle);
    refs.circle = circle;
    // ring of standing stones
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const h = rr(2.4, 4.6);
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, h, 6),
        new THREE.MeshStandardMaterial({ color: 0x55586a, map: TEX.darkRock, roughness: 0.95, flatShading: true }));
      st.position.set(Math.cos(a) * (DAIS.r - 1.6), daisFloorY + h / 2, Math.sin(a) * (DAIS.r - 1.6));
      st.castShadow = true;
      dais.add(st);
    }
    // star cluster above the vision (fake heavens under the shell)
    const starPos = [];
    for (let i = 0; i < 500; i++) {
      const a = rr(0, Math.PI * 2), r = Math.pow(rr(0, 1), 0.5) * 55;
      starPos.push(Math.cos(a) * r, rr(26, 44) + DAIS.y, DAIS.z + Math.sin(a) * r * 0.8);
    }
    const stars = pointCloud(starPos, { color: 0xdfe8ff, size: 0.9, opacity: 0.9, map: TEX.glow, additive: true });
    g.add(stars);
    refs.stars = stars;
    const visionDome = glowSprite(0x1a2c55, 130, 0.5);
    visionDome.position.set(DAIS.x, DAIS.y + 30, DAIS.z);
    g.add(visionDome);
    // bridge of light from field to dais
    const bridgePts = [];
    for (let i = 0; i < 40; i++) {
      const t = i / 39;
      bridgePts.push(
        Math.sin(t * 2.6) * 3.5,
        1 + t * t * (DAIS.y - 1) + Math.sin(t * Math.PI) * 2.2,
        -48 + t * (DAIS.z + 48 + 14),
      );
    }
    const bridge = pointCloud(bridgePts, { color: 0xcfe0ff, size: 1.6, opacity: 0.5, map: TEX.glow, additive: true });
    g.add(bridge);
    refs.bridge = bridge;

    /* --- Ren Zu, in three ages --- */
    const mkRen = (opts) => {
      const f = makeFigure({
        robe: 0x6b503a, trim: 0x4a3826, sash: 0x3a2c1c, hair: 'wild',
        scale: 1.55, wide: 1.35, skin: 0xc9a07e, beard: !!opts.beard,
      });
      // crude fur kilt accent
      const kilt = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.34, 9),
        new THREE.MeshStandardMaterial({ color: 0x54402c, roughness: 1 }));
      kilt.position.y = 0.62;
      f.parts.body.add(kilt);
      f.group.position.set(0, daisFloorY, 2);
      f.group.visible = false;
      dais.add(f.group);
      return f;
    };
    refs.renYoung = mkRen({});
    refs.renMid = mkRen({});
    refs.renOld = mkRen({ beard: true });
    refs.renOld.group.scale.setScalar(1.35);
    // staff for the old man
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 2.4, 6),
      new THREE.MeshStandardMaterial({ color: 0x5a4630, roughness: 1 }));
    staff.position.set(0.5, 1.0, 0.3);
    staff.rotation.z = -0.16;
    refs.renOld.parts.body.add(staff);

    /* --- the three Gu --- */
    // Strength Gu — largest, warm
    const strength = new THREE.Group();
    const sCore = new THREE.Mesh(new THREE.IcosahedronGeometry(1.7, 1),
      new THREE.MeshStandardMaterial({ color: 0xff7a3a, emissive: 0xff5a1a, emissiveIntensity: 2.2, roughness: 0.35 }));
    strength.add(sCore);
    for (let i = 0; i < 12; i++) {
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.1, 5),
        new THREE.MeshStandardMaterial({ color: 0xffb45a, emissive: 0xff8a2a, emissiveIntensity: 1.6 }));
      const a = (i / 12) * Math.PI * 2, e = (i % 4 - 1.5) * 0.5;
      sp.position.set(Math.cos(a) * 2.1, Math.sin(e) * 1.6, Math.sin(a) * 2.1);
      sp.lookAt(sp.position.clone().multiplyScalar(2));
      sp.rotateX(Math.PI / 2);
      strength.add(sp);
    }
    strength.add(glowSprite(0xff9a4a, 14, 0.7));
    strength.position.set(-5, daisFloorY + 4.4, -2);
    dais.add(strength);
    refs.strength = strength;
    const sLight = new THREE.PointLight(0xff8a3a, 260, 44, 1.3);
    strength.add(sLight);

    // Wisdom Gu — beautiful, blue-white, ringed
    const wisdom = new THREE.Group();
    const wCore = new THREE.Mesh(new THREE.OctahedronGeometry(1.15, 0),
      new THREE.MeshStandardMaterial({ color: 0xcfe8ff, emissive: 0x6fb8ff, emissiveIntensity: 2.4, roughness: 0.2, metalness: 0.3 }));
    wisdom.add(wCore);
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.05, 6, 60),
      new THREE.MeshBasicMaterial({ color: 0x9fd6ff, transparent: true, opacity: 0.85 }));
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.03, 6, 60),
      new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.6 }));
    ring1.rotation.x = Math.PI / 2.3;
    ring2.rotation.x = -Math.PI / 3.1;
    wisdom.add(ring1, ring2);
    wisdom.add(glowSprite(0x9fd6ff, 11, 0.75));
    wisdom.position.set(5, daisFloorY + 4.4, -2);
    dais.add(wisdom);
    refs.wisdom = wisdom;
    refs.wisdomRings = [ring1, ring2];
    const wLight = new THREE.PointLight(0x6fb8ff, 240, 40, 1.3);
    wisdom.add(wLight);

    // Hope Gu — the frailest, a tiny point that becomes everything
    const hope = new THREE.Group();
    const hCore = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hope.add(hCore);
    const hHalo = glowSprite(0xfff6d8, 3.4, 0.85);
    hope.add(hHalo);
    hope.position.set(0, daisFloorY + 3.4, 3.4);
    dais.add(hope);
    refs.hope = hope;
    refs.hHopeHalo = hHalo;
    const hLight = new THREE.PointLight(0xfff2c8, 150, 34, 1.3);
    hope.add(hLight);
    refs.hLight = hLight;
    refs.baseHLight = 150;

    /* --- Predicaments --- */
    refs.beasts = [];
    for (let i = 0; i < 7; i++) {
      const b = makePredicament(rr(1.5, 2.1));
      b.position.y = 1.7;
      dais.add(b);
      refs.beasts.push({ g: b, a: (i / 7) * Math.PI * 2, r: 17, speed: rr(0.25, 0.42), flee: 0 });
    }
    refs.beastDark = 0; // enclosure radius driver

    /* --- heart glow for old Ren Zu --- */
    const heart = glowSprite(0xff5a6a, 0.0, 1);
    heart.position.set(0, daisFloorY + 2.4, 2.5);
    dais.add(heart);
    refs.heart = heart;

    /* --- aperture FX --- */
    refs.apRings = new ShockRings(g, { color: 0xffe9b0, max: 6 });
    refs.apBurst = new Burst(g, { count: 240, color: 0xffe9b8, size: 1.7, gravity: -4, drag: 1.2 });
    refs.apLight = new THREE.PointLight(0xffe0a0, 0, 40, 1.6);
    g.add(refs.apLight);
    const apRune = runeCircle(1.2, 0xffe9b0, 0);
    g.add(apRune);
    refs.apRune = apRune;
    const apCol = lightShaft(0xffe9b0, 3.4, 70, 0);
    g.add(apCol);
    refs.apCol = apCol;

    /* cave lighting */
    const caveAmb = new THREE.PointLight(0x5a7fc0, 560, 240, 1.15);
    caveAmb.position.set(0, 30, -10);
    g.add(caveAmb);
    const warm = new THREE.PointLight(0xffb46a, 380, 80, 1.25);
    warm.position.set(0, 8, BANK + 8);
    g.add(warm);

    /* dust */
    const dustPos = [];
    for (let i = 0; i < 300; i++) dustPos.push(rr(-75, 75), rr(1, 38), rr(-80, BANK + 30));
    const dust = createDriftPoints(dustPos, {
      color: 0xcfe0f8, size: 0.85, opacity: 0.3, amp: 1.7, speed: 0.12, twinkle: 0.5, map: TEX.glow,
    });
    g.add(dust);
    refs.dust = dust;

    /* ============ BEATS ============ */
    const B = (kicker, html, cam, env, extra = {}) => ({ kicker, html, cam, env, ...extra });
    const caveEnv = (o = {}) => ({
      top: 0x04060c, mid: 0x0a1024, bot: 0x0e1830,
      sunDir: [0, -0.7, -0.3], sunColor: 0x4a6a9a, sunSize: 0.03, sunI: 0,
      stars: 0, fogColor: 0x0a0e1a, fogDensity: 0.010,
      hemiSky: 0x4a6fa8, hemiGround: 0x1a2030, hemiI: 0.85,
      dirColor: 0x8fb4e0, dirI: 0.4, ambientI: 0.3,
      exposure: 1.0, bloomS: 0.5, bloomR: 0.6, bloomT: 0.8, vignette: 1.0,
      ...o,
    });

    this.beats = [
      B(
        '踏入花海 · Hope Gu rise from the flowers',
        `<b>“These are Hope Gu.”</b>
         <span class="stage">Every point of light is an individual Gu — their name is Hope. Under the pressure of the spirit spring they gather in his abdomen, roughly ten centimetres below his navel. The elders frown across the river: <i>“There seem to be rather few Hope Gu.”</i> Twenty-three steps and counting…</span>`,
        w([9, 3.6, 12], [0.4, 1.5, -8], 52),
        caveEnv({ bloomS: 0.5, bloomT: 0.8 }),
        {
          auto: 16,
          labels: [
            { text: 'Moon Orchid Field', sub: 'Hope Gu sleep among the petals', pos: W([0, 3, -30]) },
            { text: 'Spirit Spring', sub: 'concentrated primeval qi generates the pressure', pos: W([0, 8, -50]), cls: 'wl-blue' },
          ],
          audio: { shimmer: 0.5, drip: 0.7, rumble: 0.4 },
          onEnter: (z, c) => {
            c.hud.showSteps(true); c.hud.setSteps(0); c.hud.clearGrade();
            z.refs.apT = -1;
            z.refs._n = null;
            z.refs.fy.group.position.z = BANK;
            z.refs.gut.material.opacity = 0.1;
            z.refs.gut.scale.setScalar(0.3);
            z.refs.gutLight.intensity = 0;
          },
          onExit: (z, c) => c.hud.showSteps(false),
        },
      ),

      B(
        '人祖传 · Ren Zu — the strength of youth',
        `<b>“First, he sustained the largest of the three Gu with his youth. That Gu gave him strength.”</b>
         <span class="stage">When the world had just formed, wild beasts called <b>Predicaments</b> roamed a wilderness — and they found Ren Zu's scent especially enticing. With strength, his life improved: reliable food, the power to protect himself, many Predicaments defeated. But strength required rest, and could not face the pack alone.</span>`,
        w([11, 15, -63], [0, 13, -76], 50),
        caveEnv({ stars: 0, bloomS: 0.5, bloomT: 0.8, hemiI: 0.5, fogDensity: 0.010 }),
        {
          auto: 15,
          labels: [
            { text: 'Ren Zu', sub: 'the first human · eating raw flesh, drinking blood', pos: W([0, DAIS.y + 6.4, DAIS.z + 2]) },
            { text: 'Strength Gu', sub: 'the largest of the three · paid with youth', pos: W([-5, DAIS.y + 8.4, DAIS.z - 2]) },
            { text: 'Predicaments', sub: 'the beasts that hunger for him', pos: W([10, DAIS.y + 4, DAIS.z + 8]), cls: 'wl-red' },
          ],
          audio: { rumble: 0.6, shimmer: 0.5, drone: 0.4 },
          sfx: 'dread',
          onEnter: (z) => z.setStage('strength'),
        },
      ),

      B(
        '智慧之蛊 · Wisdom — and the winter of old age',
        `<b>“Then the second Gu gave him wisdom.”</b>
         <span class="stage">With wisdom, Ren Zu learned to think and reflect, accumulating experience — often more effective than strength. So he sustained the most beautiful of the three Gu with his middle years. But having offered youth and middle years, he grew old: muscles wasted, the mind slowed. <b>Strength Gu and Wisdom Gu realised he had nothing left — and abandoned him without compassion.</b> The Predicaments closed in.</span>`,
        w([-13, 14, -64], [0, 12.5, -77], 48),
        caveEnv({ bloomS: 0.5, bloomT: 0.8, fogDensity: 0.012, drone: 0.6 }),
        {
          auto: 17,
          labels: [
            { text: 'Wisdom Gu', sub: 'the most beautiful of the three · paid with middle years', pos: W([5, DAIS.y + 8.4, DAIS.z - 2]), cls: 'wl-blue' },
            { text: '“Human, what can you still give us?”', sub: 'Strength Gu and Wisdom Gu depart', pos: W([-6, DAIS.y + 9.5, DAIS.z - 6]), cls: 'wl-red' },
          ],
          audio: { rumble: 0.7, drone: 0.7, shimmer: 0.3 },
          onEnter: (z) => z.setStage('wisdom'),
        },
      ),

      B(
        '将心予希望 · Give your heart to hope',
        `<b>“Human, sustain me — all you need to do is give me your heart.”</b>
         <span class="stage">Of the three, it asked for the least: a tiny point of light, the dimmest of all. But when the human gave his heart to the Gu, it blazed with boundless light — and amid that light the Predicaments cried out in terror: <b>“It’s Hope Gu! Retreat! We Predicaments fear hope most of all!”</b> From that moment on, Ren Zu understood: when facing predicaments, give your heart to hope.</span>`,
        w([0, 13.5, -67], [0, 13, -76], 44),
        caveEnv({ bloomS: 0.55, bloomT: 0.8, hemiI: 0.7, fogDensity: 0.010 }),
        {
          auto: 17,
          labels: [
            { text: 'Hope Gu', sub: 'the frailest body · the greatest light', pos: W([0, DAIS.y + 7.6, DAIS.z + 3.4]) },
            { text: '“We fear hope most of all!”', sub: 'the Predicaments retreat in panic', pos: W([-9, DAIS.y + 5, DAIS.z + 9]), cls: 'wl-red' },
          ],
          audio: { shimmer: 0.9, rumble: 0.4, drone: 0.3 },
          sfx: 'bell',
          onEnter: (z) => z.setStage('hope'),
        },
      ),

      B(
        '二十七步 · Twenty-seven steps',
        `<b>“Twenty-four, twenty-five, twenty-six… twenty-seven.”</b>
         <span class="stage">At his twenty-seventh step he hears a boom: the mass of light in his abdomen — between his kidneys — reaches its limit and suddenly bursts. Entirely within him; no one else can detect it. Fine hairs stand on end, pores clench, the mind draws taut like a bowstring — then blankness, release, a light sheen of sweat. Across the river, the elders' hearts had sunk: <i>not the signs of Grade A.</i></span>`,
        w([6.8, 3.0, -7.2], [0.6, 1.25, -16.8], 46),
        caveEnv({ bloomS: 0.5, bloomT: 0.8, hemiI: 0.65, fogDensity: 0.0135 }),
        {
          auto: 15,
          labels: [
            { text: 'Gu Yue Fang Yuan', sub: 'step twenty-seven · the light-mass swells', pos: W([0.6, 3.4, STEP27_Z - 0.5]) },
            { text: 'The watching elders', sub: '“not the signs of Grade A aptitude…”', pos: W([-3, 5.6, BANK + 7]), cls: 'wl-red' },
          ],
          audio: { shimmer: 0.7, heartBeat: 1, rumble: 0.5 },
          onEnter: (z, c) => {
            c.hud.showSteps(true); c.hud.setSteps(23); z.refs.apT = -1; z.refs._n5 = null;
            z.refs.orchids.userData.pearls.material.opacity = 0.22;
            z.refs.orchids.children[0].material.emissiveIntensity = 0.35;
          },
          onExit: (z, c) => c.hud.showSteps(false),
        },
      ),

      B(
        '开窍 · The aperture opens',
        `<b>“An aperture had opened successfully!”</b>
         <span class="stage">Below his navel, between his kidneys — out of nowhere, a door. This was the hope of immortality! The first true aperture of a Gu Master: primeval sea yet to fill it, five hundred years of madness yet to come.<br/><br/>
         <b>— End of the published chapters —</b> Chapter 6 at the bench · 2,329 chapters to go.</span>`,
        w([4.6, 3.6, -11.5], [0.6, 1.45, -17.9], 44),
        caveEnv({ bloomS: 0.4, bloomT: 0.8, exposure: 1.05, hemiI: 0.9, fogColor: 0x1a1a24, vignette: 0.8 }),
        {
          auto: null,
          labels: [
            { text: 'The Aperture · 窍', sub: 'below the navel, between the kidneys — the hope of immortality', pos: W([0.6, 3.1, STEP27_Z]), cls: 'wl-blue' },
          ],
          audio: { shimmer: 1.0, heartBeat: 1, rumble: 0.3, drone: 0.5 },
          sfx: ['whoosh2', 'swell'],
          onEnter: (z, c) => {
            c.hud.showSteps(false); z.refs.apT = 0; z.refs.apFired = false;
            z.refs.orchids.userData.pearls.material.opacity = 0.15;
            z.refs.orchids.children[0].material.emissiveIntensity = 0.2;
          },
        },
      ),
    ];
  },

  /* which Ren Zu / Gu configuration is on stage */
  setStage(mode) {
    const r = this.refs;
    r._stage = mode;
    r._stageT = 0;
    r._blazed = false;
    r._n5 = null;
    r.renYoung.group.visible = false;
    r.renMid.group.visible = false;
    r.renOld.group.visible = false;
    r.strength.visible = true;
    r.wisdom.visible = true;
    r.hope.visible = mode === 'hope' || mode === 'wisdom';
    r.heart.material.opacity = 0;
    r.heart.scale.setScalar(0.01);
    r.beasts.forEach(b => {
      b.flee = 0;
      b.g.visible = true;
      b.g.traverse(ch => { if (ch.material) { ch.material.opacity = 1; ch.material.transparent = false; } });
    });
    if (mode === 'strength') {
      r.renYoung.group.visible = true;
      r.renYoung.setPose('brawl');
      r._mode2 = null;
      r.beasts.forEach(b => b.r = 17);
      r.strength.position.set(-5, 1.7 + 4.4, -2);
      r.wisdom.position.set(5, 1.7 + 4.4, -2);
    } else if (mode === 'wisdom') {
      r.renMid.group.visible = true;
      r.renMid.setPose('crossed');
      r.beasts.forEach(b => b.r = 13);
      r._mode2 = 'old'; // second half switches to the abandoned elder
      r.strength.position.set(-7, 1.7 + 6.4, -5);
      r.wisdom.position.set(6, 1.7 + 5.4, -3);
      // they drift away in the second half — handled in update
    } else if (mode === 'hope') {
      r.renOld.group.visible = true;
      r.renOld.setPose('kneel');
      r.beasts.forEach(b => b.r = 6.2);
      r.hope.scale.setScalar(1);
      r.strength.position.set(-12, 1.7 + 8.4, -10); // long gone
      r.wisdom.position.set(12, 1.7 + 8.4, -10);
      r.strength.visible = false;
      r.wisdom.visible = false;
    }
  },

  update(ctx, t, dt, beat) {
    const r = this.refs;
    if (!r) return;
    if (r.river) r.river.material.uniforms.uTime.value = t;
    r.dust.userData.update(t);
    r.ripples.update(dt);
    r.bridge.material.opacity = 0.4 + 0.2 * Math.sin(t * 1.2);
    r.springLight.intensity = 500 + Math.sin(t * 3.2) * 40;
    r.circle.material.opacity = 0.35 + 0.2 * Math.sin(t * 1.5);
    r.stars.material.opacity = 0.75 + 0.25 * Math.sin(t * 0.9);
    animateFigure(r.fy, t);
    r.elders.forEach(e => animateFigure(e.fig, t));
    if (r.renYoung.group.visible) animateFigure(r.renYoung, t);
    if (r.renMid.group.visible) animateFigure(r.renMid, t);
    if (r.renOld.group.visible) animateFigure(r.renOld, t);

    /* Gu idle motion */
    r.strength.rotation.y += dt * 0.6;
    r.strength.position.y += Math.sin(t * 1.4) * 0.006;
    r.wisdom.rotation.y -= dt * 0.8;
    r.wisdomRings[0].rotation.z += dt * 1.1;
    r.wisdomRings[1].rotation.z -= dt * 0.8;
    r.hope.position.y = 1.7 + 3.4 + Math.sin(t * 2.2) * 0.35;
    if (beat !== 3) r.hope.scale.setScalar((r.hope.scale.x) * 0.9 + (1 + Math.sin(t * 6) * 0.12) * 0.1);

    /* beasts circle */
    r._stageT = (r._stageT || 0) + dt;
    r.beasts.forEach((b, i) => {
      let radius = b.r;
      if (r._stage === 'wisdom' && r._mode2 === 'old' && r._stageT > 6) {
        radius = 8.5; // closing in on the old man
        if (!r._oldSwapped) {
          r._oldSwapped = true;
          r.renMid.group.visible = false;
          r.renOld.group.visible = true;
          r.renOld.setPose('kneel');
          r.strength.visible = false;
          r.wisdom.visible = false;
        }
      }
      if (b.flee > 0) radius = 16 + b.flee * 34;
      b.a += dt * b.speed * (b.flee > 0 ? 4 : 1);
      const x = Math.cos(b.a) * radius, z = Math.sin(b.a) * radius;
      b.g.position.x = x;
      b.g.position.z = z;
      b.g.position.y = 1.7 + Math.abs(Math.sin(t * 4 + i)) * 0.25;
      b.g.rotation.y = Math.atan2(-x, -z) + Math.PI / 2;
      if (b.flee > 0) {
        b.flee = Math.min(3, b.flee + dt * 0.9);
        b.g.children.forEach(ch => { if (ch.material) { ch.material.transparent = true; ch.material.opacity = Math.max(0, 1 - b.flee / 3); } });
      }
    });
    if (r._oldSwapped && r._stage !== 'wisdom') r._oldSwapped = false;

    /* --- beat 0: walk the field, count steps 0→23 --- */
    if (beat === 0) {
      const target = stepZ(23);
      const fyP = r.fy.group.position;
      if (fyP.z > target + 0.1) {
        const speed = (BANK - target) / 14;   // cross in ~14 s
        fyP.z -= speed * dt;
        r.fy.setPose('walk');
        const n = Math.max(0, Math.min(23, Math.round((BANK - 1.6 - fyP.z) / 1.12)));
        if (n !== r._n || r._n == null) {
          if (r._n != null && n !== r._n) { ctx.hud.setSteps(n); ctx.audio.sfx('tick'); }
          else if (r._n == null) ctx.hud.setSteps(0);
          r._n = n;
        }
        // gutter light grows
        const k = n / 23;
        r.gut.material.opacity = 0.15 + k * 0.75;
        r.gut.scale.setScalar(0.4 + k * 1.4);
        r.gutLight.intensity = k * 45;
      } else {
        r.fy.setPose('stand');
      }
      r.hopeIn.userData.update(t);
      r.hopeIn.userData.setActive(1);
      if (ctx.state.beatT > 0.5 && r._n !== 23) { /* keep counting even if arrival early */ }
    } else if (beat === 4) {
      /* beat 4: steps 24 → 27 */
      r.fy.setPose('walk');
      const fyP = r.fy.group.position;
      const t0 = Math.max(0, ctx.state.beatT - 1.5);
      const target = stepZ(27);
      const start = stepZ(23);
      const p = Math.min(1, t0 / 9);
      fyP.z = start + (target - start) * p;
      const n = 23 + Math.floor(p * 4.999);
      if (n !== r._n5) {
        r._n5 = n;
        ctx.hud.setSteps(Math.min(27, n));
        ctx.audio.sfx('tick');
      }
      const k = n / 27;
      r.gut.material.opacity = 0.22 + k * 0.25;
      r.gut.scale.setScalar(0.8 + k * 0.9);
      r.gutLight.intensity = 16 + k * 36;
      r.hopeIn.userData.update(t);
      r.hopeIn.userData.setActive(0.6);
      if (p >= 1) r.fy.setPose('stand');
    } else if (beat === 5) {
      r.fy.setPose('raise');
      r.fy.group.position.z = stepZ(27);
      r.hopeIn.userData.update(t);
      r.hopeIn.userData.setActive(0.3);
      r.gut.material.opacity = 0.55;
      r.gut.scale.setScalar(1.6);
      r.gutLight.intensity = 60;
      this._aperture(ctx, dt);
    } else {
      r.hopeIn.userData.update(t);
      r.hopeIn.userData.setActive(beat >= 1 && beat <= 3 ? 0.15 : 0.3);
    }

    /* --- beat 3: the offering & the blaze --- */
    if (beat === 3) {
      r._stageT = (r._stageT || 0); // continue
      const bt = ctx.state.beatT;
      if (bt < 2.6) {
        // heart grows
        const k = Math.min(1, bt / 2.4);
        r.heart.material.opacity = 0.3 + k * 0.7;
        r.heart.scale.setScalar(0.3 + k * 2.6);
        if (r.renOld.group.visible) r.renOld.setPose('kneel');
      } else if (!r._blazed) {
        r._blazed = true;
        // the blaze
        ctx.hud.flashFx(1.0, 140, 1700);
        ctx.rig.shake(0.5, 1.4);
        ctx.audio.sfx('swell');
        ctx.audio.sfx('boom');
        r.hope.scale.setScalar(7);
        r.hLight.intensity = 520;
        const wp = new THREE.Vector3();
        r.hope.getWorldPosition(wp);
        r.apRings.spawn(wp, { dur: 2, scale: 44, color: 0xffffff });
        setTimeout(() => r.apRings.spawn(wp, { dur: 2.4, scale: 70, color: 0xfff2d0 }), 300);
        r.beasts.forEach(b => { b.flee = 0.01; });
        if (r.renOld.group.visible) r.renOld.setPose('raise');
      } else {
        const k = Math.min(1, (ctx.state.beatT - 2.6) / 3);
        r.hope.scale.setScalar(7 - k * 4.6);
        r.hLight.intensity = 520 - k * 370;
      }
    }
    r.apRings.update(dt);
    r.apBurst.update(dt);
  },

  /* the final aperture-opening sequence */
  _aperture(ctx, dt) {
    const r = this.refs;
    if (r.apT == null || r.apT < 0) return;
    r.apT += dt;
    const T = r.apT;
    // light column + rune rise
    const fyP = r.fy.group.position;
    r.apCol.position.set(fyP.x, 36, fyP.z);
    r.apCol.material.opacity = Math.min(0.26, T * 0.18);
    r.apRune.position.set(fyP.x, 1.2, fyP.z + 0.5);
    r.apRune.rotation.x = 0;    // upright, facing the camera
    r.apRune.rotation.y = 0;
    r.apRune.rotation.z = T * 1.6;
    r.apRune.material.opacity = Math.min(0.5, T * 0.4);
    const s = 1 + Math.sin(T * 5) * 0.06;
    r.apRune.scale.setScalar(s);
    r.apLight.position.set(fyP.x, 1.3, fyP.z + 0.6);
    r.apLight.intensity = Math.min(540, T * 260);

    if (T > 1.4 && !r.apFired) {
      r.apFired = true;
      ctx.hud.flashFx(0.8, 140, 1600);
      ctx.rig.shake(0.8, 2.2);
      ctx.audio.sfx('boom');
      ctx.audio.sfx('bell');
      const o = new THREE.Vector3(fyP.x, 1.3, fyP.z);
      r.apBurst.fire(o, { speed: 14, dur: 5, spread: 1, up: 1.4 });
      r.apRings.spawn(o, { dur: 2.6, scale: 46, color: 0xfff2d0 });
      setTimeout(() => r.apRings.spawn(new THREE.Vector3(fyP.x, 1.3, fyP.z), { dur: 3, scale: 76, color: 0xffe9b0 }), 400);
    }
    // pulse after-glow
    if (r.apFired) {
      r.apLight.intensity = 470 + Math.sin(T * 6) * 70;
      r.gut.scale.setScalar(3 + Math.sin(T * 4) * 0.4);
    }
  },
};
