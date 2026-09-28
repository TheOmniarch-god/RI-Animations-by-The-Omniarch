// ============================================================
// figures.js — procedural stylized characters, beasts & props
// ============================================================
import * as THREE from 'three';
import { rng, rr, pick, TEX, glowSprite } from './util.js';
import { charStore } from './charassets.js';

const MAT = (color, o = {}) => new THREE.MeshStandardMaterial({
  color, roughness: o.rough ?? 0.82, metalness: o.metal ?? 0.04,
  emissive: o.emissive ?? 0x000000, emissiveIntensity: o.ei ?? 1,
  map: o.map ?? null, transparent: !!o.transparent, opacity: o.opacity ?? 1,
  side: o.side ?? THREE.FrontSide,
});

/* ---------- procedural faces: every character gets their own ---------- */
const _faceCache = new Map();
function _mul(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function faceTex(seed = 1, age = 'adult') {
  const key = seed + '|' + age;
  if (_faceCache.has(key)) return _faceCache.get(key);
  const c = document.createElement('canvas');
  c.width = 96; c.height = 96;
  const g = c.getContext('2d');
  const R = _mul(seed * 7919 + 13);
  const dark = 'rgba(24,18,14,';
  const skinL = 'rgba(120,84,58,';
  const youth = age === 'youth', elder = age === 'elder';
  const browW = youth ? 15 : elder ? 21 : 18;
  const browTh = youth ? 2.6 : elder ? 5 : 3.6;
  const eyeRx = youth ? 8.5 : elder ? 6.5 : 7.5;
  const eyeRy = youth ? 7 : 5.5;
  const tilt = (R() - 0.5) * 0.5;
  g.lineCap = 'round';
  // brows
  g.strokeStyle = dark + (elder ? 0.75 : 0.85) + ')';
  g.lineWidth = browTh + R() * 1.4;
  [-1, 1].forEach(s => {
    const cx = 48 + s * 21, cy = 30 + (R() - 0.5) * 3;
    g.beginPath();
    g.moveTo(cx - s * browW * 0.5, cy + 2 + tilt * s * 3);
    g.quadraticCurveTo(cx, cy - 5 - R() * 3, cx + s * browW * 0.5, cy + 1);
    g.stroke();
  });
  // eyes
  [-1, 1].forEach(s => {
    const cx = 48 + s * 19, cy = 46;
    if (elder && R() > 0.4) {
      g.beginPath(); g.lineWidth = 2.4; g.strokeStyle = dark + '0.9)';
      g.moveTo(cx - eyeRx, cy); g.quadraticCurveTo(cx, cy + 4, cx + eyeRx, cy); g.stroke();
      return;
    }
    g.fillStyle = 'rgba(250,248,244,0.95)';
    g.beginPath(); g.ellipse(cx, cy, eyeRx, eyeRy, s * tilt * 0.4, 0, 7); g.fill();
    g.fillStyle = dark + '0.92)';
    g.beginPath(); g.arc(cx + (R() - 0.5) * 2, cy + (youth ? 1 : 0), eyeRx * (youth ? 0.62 : 0.55), 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.beginPath(); g.arc(cx - 2, cy - 2, 1.6, 0, 7); g.fill();
    g.strokeStyle = dark + '0.9)'; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(cx - eyeRx, cy - eyeRy + 1);
    g.quadraticCurveTo(cx, cy - eyeRy - 3, cx + eyeRx, cy - eyeRy + 1); g.stroke();
  });
  // nose
  g.strokeStyle = skinL + '0.5)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(47, 54); g.quadraticCurveTo(48 + (R() - 0.5) * 3, 60, 50, 62); g.stroke();
  // mouth
  const mw = (youth ? 11 : 13) + R() * 4;
  g.strokeStyle = 'rgba(112,58,48,0.85)'; g.lineWidth = 2.4;
  g.beginPath();
  const smile = (R() - 0.45) * 6;
  g.moveTo(48 - mw, 72); g.quadraticCurveTo(48, 72 + smile, 48 + mw, 72); g.stroke();
  if (elder) { // wrinkles
    g.strokeStyle = skinL + '0.45)'; g.lineWidth = 1.4;
    for (const s of [-1, 1]) for (let i = 0; i < 2; i++) {
      g.beginPath(); g.moveTo(48 + s * (30 - i * 3), 52 + i * 5); g.lineTo(48 + s * (40 - i * 3), 50 + i * 5); g.stroke();
    }
  }
  if (youth) { // soft blush
    g.fillStyle = 'rgba(214,120,96,0.12)';
    [-1, 1].forEach(s => { g.beginPath(); g.ellipse(48 + s * 30, 60, 8, 5, 0, 0, 7); g.fill(); });
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  _faceCache.set(key, t);
  return t;
}
const SKIN = () => MAT(0xd9b28f, { rough: 0.9 });
const HAIR = () => MAT(0x141114, { rough: 0.7 });

/**
 * Build a stylized robed figure.
 * opts: { scale, robe, trim, sash, hair:'bun'|'long'|'wild'|'none'|'elder',
 *         beard, tattered, blood, eyes, hat:'scholar'|'none', skin }
 * Returns { group, parts, setPose(name) }
 */
export function makeFigure(opts = {}) {
  const o = Object.assign({
    scale: 1, robe: 0x3d4a58, trim: 0x2a333d, sash: 0x7a2f28,
    hair: 'bun', beard: false, tattered: false, blood: 0, eyes: true,
    hat: 'none', skin: 0xd9b28f, wide: 1, age: null, face: null,
  }, opts);

  const g = new THREE.Group();
  const body = new THREE.Group(); // for bob / kneel
  g.add(body);
  const parts = { root: g, body, arms: [], legs: [] };

  const robeMat = o.tattered
    ? MAT(0xffffff, { map: TEX.bloodRobe, rough: 0.9 })
    : MAT(o.robe, { rough: 0.88 });
  const trimMat = MAT(o.trim, { rough: 0.85 });
  const skinM = MAT(o.skin, { rough: 0.9 });
  const hairM = HAIR();

  /* robe (skirt) */
  const robe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.155 * o.wide, 0.31, 1.0, 18, 1, false),
    robeMat
  );
  robe.position.y = 0.62;
  body.add(robe);
  parts.robe = robe;

  /* chest / shoulders */
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.165 * o.wide, 16, 12), robeMat);
  chest.scale.set(1.12, 0.9, 0.82);
  chest.position.y = 1.30;
  body.add(chest);

  /* sash */
  const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.163 * o.wide, 0.175 * o.wide, 0.1, 18), MAT(o.sash, { rough: 0.7 }));
  sash.position.y = 1.08;
  body.add(sash);

  /* collar */
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.028, 8, 20), trimMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 1.44;
  body.add(collar);

  /* neck + head */
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.09, 8), skinM);
  neck.position.y = 1.47;
  body.add(neck);

  const head = new THREE.Group();
  head.position.y = 1.585;
  body.add(head);
  parts.head = head;

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.108, 20, 16), skinM);
  skull.scale.set(0.95, 1.06, 0.98);
  head.add(skull);

  if (o.eyes) {
    // curved face decal: unique eyes + brows + mouth per seed, three ages
    const age = o.age || (o.beard ? 'elder' : (o.scale < 0.97 ? 'youth' : 'adult'));
    const faceSeed = o.face != null ? o.face : Math.floor(rr(0, 40));
    const faceGeo = new THREE.CylinderGeometry(0.117, 0.117, 0.17, 16, 1, true, Math.PI / 2 + 0.6, Math.PI * 2 - 1.2);
    const faceMat = new THREE.MeshStandardMaterial({
      map: faceTex(faceSeed, age), transparent: true, alphaTest: 0.35,
      roughness: 0.72, metalness: 0.0,
    });
    const fp = new THREE.Mesh(faceGeo, faceMat);
    fp.position.y = -0.008;
    head.add(fp);
    parts.face = fp;
  }

  /* hair */
  if (o.hair === 'bun' || o.hair === 'scholar') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.112, 18, 12, Math.PI / 2 + 0.6, Math.PI * 2 - 1.2, 0, Math.PI * 0.62), hairM);
    cap.position.y = 0.014;
    head.add(cap);
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), hairM);
    bun.position.set(0, 0.11, -0.03);
    head.add(bun);
  } else if (o.hair === 'long' || o.hair === 'wild') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.115, 18, 12, Math.PI / 2 + 0.6, Math.PI * 2 - 1.2, 0, Math.PI * 0.7), hairM);
    cap.position.y = 0.012;
    head.add(cap);
    const back = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.06, o.hair === 'wild' ? 0.55 : 0.42, 8, 1, true), hairM);
    back.position.set(0, o.hair === 'wild' ? -0.24 : -0.18, -0.055);
    head.add(back);
    if (o.hair === 'wild') {
      parts.strands = [];
      for (let i = 0; i < 7; i++) {
        const st = new THREE.Mesh(new THREE.ConeGeometry(rr(0.012, 0.022), rr(0.3, 0.62), 4), hairM);
        const a = rr(0, Math.PI * 2);
        st.position.set(Math.cos(a) * 0.09, rr(-0.1, 0.12), Math.sin(a) * 0.09 - 0.03);
        st.rotation.set(rr(-0.7, 0.7), a, rr(-0.7, 0.7));
        head.add(st);
        parts.strands.push(st);
      }
      /* side locks */
      [-0.09, 0.09].forEach(x => {
        const lk = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.3, 4), hairM);
        lk.position.set(x, -0.1, 0.03);
        lk.rotation.z = x > 0 ? -0.15 : 0.15;
        head.add(lk);
      });
    }
  }
  if (o.hat === 'scholar') {
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.13, 8), MAT(0x1c1a22));
    hat.position.y = 0.14;
    head.add(hat);
  }
  if (o.beard) {
    const bd = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22, 6), MAT(0xdcd7cc));
    bd.position.set(0, -0.14, 0.055);
    bd.rotation.x = 0.22;
    head.add(bd);
    const must = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.016, 0.02), MAT(0xdcd7cc));
    must.position.set(0, -0.035, 0.1);
    head.add(must);
  }

  /* blood flecks for wounded figures */
  if (o.blood > 0) {
    for (let i = 0; i < o.blood; i++) {
      const b = new THREE.Mesh(
        new THREE.CircleGeometry(rr(0.02, 0.06), 6),
        new THREE.MeshBasicMaterial({ color: pick([0x8c1210, 0x640c0c, 0xa81a14]), transparent: true, opacity: 0.85 })
      );
      const a = rr(0, Math.PI * 2);
      b.position.set(Math.cos(a) * 0.2, rr(0.4, 1.35), Math.sin(a) * 0.2);
      b.lookAt(b.position.clone().multiplyScalar(2));
      body.add(b);
    }
  }

  /* arms — shoulder pivots */
  const mkArm = (side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.16 * o.wide, 1.36, 0);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.085, 0.5, 12), robeMat);
    sleeve.position.y = -0.24;
    pivot.add(sleeve);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), skinM);
    hand.position.y = -0.5;
    pivot.add(hand);
    body.add(pivot);
    parts.arms.push(pivot);
    return pivot;
  };
  mkArm(-1); mkArm(1);

  /* legs (visible for walking youths / commoners) */
  const mkLeg = (side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.08, 0.55, 0);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.55, 10), MAT(0x2c2f36));
    leg.position.y = -0.27;
    pivot.add(leg);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.16), MAT(0x1a1a1e));
    foot.position.set(0, -0.55, 0.04);
    pivot.add(foot);
    body.add(pivot);
    parts.legs.push(pivot);
    return pivot;
  };
  mkLeg(-1); mkLeg(1);

  g.scale.setScalar(o.scale);
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = false; } });

  const fig = { group: g, parts, pose: 'stand', opts: o, t0: rr(0, 100) };
  fig.setPose = (name) => { fig.pose = name; applyPose(fig, name); };
  fig.setPose('stand');
  return fig;
}

/* pose library — rotations on arm pivots / body */
export function applyPose(fig, name) {
  const [aL, aR] = fig.parts.arms;
  const body = fig.parts.body;
  const reset = () => {
    aL.rotation.set(0, 0, 0.08); aR.rotation.set(0, 0, -0.08);
    body.rotation.set(0, 0, 0); body.position.y = 0;
    if (fig.parts.legs.length) fig.parts.legs.forEach(l => l.rotation.x = 0);
  };
  reset();
  switch (name) {
    case 'stand': break;
    case 'point': aR.rotation.x = -1.45; aR.rotation.z = -0.25; break;
    case 'pointBoth': aL.rotation.x = -1.4; aR.rotation.x = -1.4; break;
    case 'sneer': aR.rotation.x = -0.6; aR.rotation.z = -0.7; aL.rotation.x = -0.3; break;
    case 'clutch': aL.rotation.x = -1.05; aL.rotation.z = 0.5; aR.rotation.x = -1.0; aR.rotation.z = -0.5; break;
    case 'kneel':
      body.position.y = -0.34; body.rotation.x = 0.1;
      aL.rotation.x = -0.5; aR.rotation.x = -0.55;
      break;
    case 'pray':
      body.position.y = -0.34;
      aL.rotation.x = -1.55; aR.rotation.x = -1.55;
      aL.rotation.z = 0.5; aR.rotation.z = -0.5;
      break;
    case 'bow': body.rotation.x = 0.85; aL.rotation.x = -0.4; aR.rotation.x = -0.4; break;
    case 'hunch': body.rotation.x = 0.55; body.position.y = -0.1;
      aL.rotation.x = -0.3; aR.rotation.x = -0.3; break;
    case 'armsBack': aL.rotation.x = 0.3; aL.rotation.z = 0.5; aR.rotation.x = 0.3; aR.rotation.z = -0.5; break;
    case 'crossed': aL.rotation.x = -1.25; aR.rotation.x = -1.25; aL.rotation.z = 0.65; aR.rotation.z = -0.65; break;
    case 'raise': aL.rotation.x = 2.65; aR.rotation.x = 2.65; aL.rotation.z = 0.3; aR.rotation.z = -0.3; break;
    case 'curtsy': body.rotation.x = 0.3; aL.rotation.x = -0.7; aR.rotation.x = -0.7; aL.rotation.z = 0.8; aR.rotation.z = -0.8; break;
    case 'walk': break; // handled in animate
    case 'brawl': aR.rotation.x = -1.7; aL.rotation.x = -0.6; aL.rotation.z = 0.7; body.rotation.z = 0.08; break;
  }
}

/** per-frame figure animation */
export function animateFigure(fig, t) {
  if (fig.isGLB) {
    if (fig.mixer) {
      const dt = Math.min(0.1, Math.max(0, t - (fig._lt || 0)));
      fig.mixer.update(dt);
    }
    fig._lt = t;
    return;
  }
  const p = fig.parts;
  if (fig.pose === 'walk') {
    const w = t * 5.2 + fig.t0;
    if (p.legs.length) {
      p.legs[0].rotation.x = Math.sin(w) * 0.5;
      p.legs[1].rotation.x = -Math.sin(w) * 0.5;
    }
    p.arms[0].rotation.x = -Math.sin(w) * 0.35;
    p.arms[1].rotation.x = Math.sin(w) * 0.35;
    p.body.position.y = Math.abs(Math.sin(w)) * 0.035;
    p.body.rotation.x = 0.06;
  } else if (fig.pose === 'stand' || fig.pose === 'point' || fig.pose === 'sneer') {
    p.body.position.y = Math.sin(t * 1.4 + fig.t0) * 0.012;
  }
  if (p.strands) {
    p.strands.forEach((s, i) => {
      s.rotation.x = Math.sin(t * 2.4 + i * 1.7) * 0.22;
      s.rotation.z += Math.sin(t * 1.9 + i) * 0.004;
    });
  }
}

/* ---------------- special characters ---------------- */

/** Fang Yuan — tattered emerald robe, wild hair, bloodied */
export function makeFangYuan() {
  const f = makeFigure({
    robe: 0xffffff, tattered: true, trim: 0x1d3a2c, sash: 0x241a12,
    hair: 'wild', scale: 0.93, blood: 10, skin: 0xd9c1a6,
    age: 'youth', face: 7, wide: 0.92,   // ~15 years old: slighter, specific face
  });
  f.parts.head.scale.setScalar(1.05);      // youthfully proportioned head
  f.isFangYuan = true;
  charStore.onCreated('fang_yuan', f);
  return f;
}

/** Fang Zheng — his mirror, head habitually lowered */
export function makeFangZheng() {
  const f = makeFigure({ robe: 0x51606e, trim: 0x36424d, sash: 0x4a3b28, hair: 'bun', scale: 0.9, age: 'youth', face: 12, wide: 0.93 });
  f.parts.head.rotation.x = 0.34;
  f.isFangZheng = true;
  charStore.onCreated('fang_zheng', f);
  return f;
}

/** Clan elder */
export function makeElder(robe = 0xe6e1d4, accent = 0x8c2f26) {
  const f = makeFigure({ robe, trim: accent, sash: accent, hair: 'bun', beard: true, scale: 1.0, hat: 'scholar' });
  if (robe === 0xe6e1d4 && accent === 0x8c2f26) charStore.onCreated('gu_yue_elder', f);
  return f;
}

/** Shen Cui — maidservant, green tunic, pearl hairpin */
export function makeMaid() {
  const f = makeFigure({ robe: 0x4f7a5b, trim: 0x365a41, sash: 0x2e4436, hair: 'bun', scale: 0.9, age: 'youth', face: 3 });
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.16, 5), MAT(0xc9a86a, { metal: 0.6, rough: 0.35 }));
  pin.rotation.z = Math.PI / 2.4;
  pin.position.set(0.02, 0.11, -0.02);
  f.parts.head.add(pin);
  charStore.onCreated('shen_cui', f);
  const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4dd, emissiveIntensity: 0.6 }));
  pearl.position.set(0.07, 0.14, -0.02);
  f.parts.head.add(pearl);
  f.isMaid = true;
  return f;
}

/** Righteous-path combatant with weapon */
export function makeHero(i = 0) {
  const palettes = [
    [0x6b2f2f, 0x3a1a1a], [0x2f4a6b, 0x1d2c3d], [0x5a5a63, 0x33333b],
    [0x6b5a2f, 0x3d331a], [0x3d6b4a, 0x22402e], [0x58356b, 0x33203d],
    [0x704030, 0x40241a], [0x334455, 0x1f2b36],
  ];
  const [robe, trim] = palettes[i % palettes.length];
  const f = makeFigure({
    robe, trim, sash: 0x1c1c22, hair: i % 3 === 0 ? 'long' : 'bun',
    beard: i % 4 === 0, scale: rr(0.96, 1.06), blood: i % 3 === 0 ? 3 : 0,
    hat: i % 5 === 0 ? 'scholar' : 'none',
  });
  /* weapon */
  const kind = i % 3;
  const hand = null;
  if (kind === 0) { // straight sword
    const sw = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.95, 0.012), MAT(0xbfc6cf, { metal: 0.85, rough: 0.3 }));
    blade.position.y = 0.55; sw.add(blade);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.04), MAT(0x8a7440, { metal: 0.7, rough: 0.4 }));
    guard.position.y = 0.06; sw.add(guard);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 6), MAT(0x3a2a1a));
    grip.position.y = -0.05; sw.add(grip);
    sw.position.set(0, -0.5, 0.06);
    sw.rotation.x = -0.2;
    f.parts.arms[1].add(sw);
  } else if (kind === 1) { // spear
    const sp = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.7, 6), MAT(0x5a4326));
    sp.add(pole);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.22, 6), MAT(0xc8ccd4, { metal: 0.85, rough: 0.3 }));
    tip.position.y = 0.95; sp.add(tip);
    sp.position.set(0.02, -0.1, 0.06);
    sp.rotation.z = 0.12;
    f.parts.arms[1].add(sp);
  } // else bare fists
  f.isHero = true;
  return f;
}

/** Simplified distant crowd figure (cheap) */
export function makeCrowdFigure(robeColor) {
  const g = new THREE.Group();
  const robe = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.15, 7), MAT(robeColor ?? 0x4a5560));
  robe.position.y = 0.575;
  g.add(robe);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 7), SKIN());
  head.position.y = 1.32;
  g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.104, 8, 7, 0, Math.PI * 2, 0, Math.PI * 0.6), HAIR());
  hair.position.y = 1.335;
  g.add(hair);
  g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return g;
}

/** Quadruped "Predicament" beast — dark, spiked, glowing eyes */
export function makePredicament(scale = 1) {
  const g = new THREE.Group();
  const dark = MAT(0x0c0b10, { rough: 0.95 });
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), dark);
  body.scale.set(1.7, 0.85, 0.8);
  body.position.y = 0.62;
  g.add(body);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 1), dark);
  head.scale.set(1.15, 0.9, 1.25);
  head.position.set(0.72, 0.78, 0);
  g.add(head);
  const jaw = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.34, 5), dark);
  jaw.rotation.z = -Math.PI / 2;
  jaw.position.set(0.95, 0.66, 0);
  g.add(jaw);
  /* spines */
  for (let i = 0; i < 6; i++) {
    const sp = new THREE.Mesh(new THREE.ConeGeometry(rr(0.04, 0.08), rr(0.2, 0.42), 4), dark);
    sp.position.set(-0.55 + i * 0.22, 0.95 + Math.sin(i) * 0.04, 0);
    sp.rotation.z = rr(-0.4, 0.1);
    g.add(sp);
  }
  /* legs */
  [[0.42, 0.2], [0.42, -0.2], [-0.42, 0.2], [-0.42, -0.2]].forEach(([x, z], i) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.035, 0.55, 5), dark);
    leg.position.set(x, 0.27, z);
    leg.rotation.z = i < 2 ? -0.15 : 0.15;
    g.add(leg);
  });
  /* glowing eyes */
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xff5a3c });
  [-0.1, 0.1].forEach(z => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), eyeM);
    e.position.set(0.88, 0.84, z);
    g.add(e);
    const halo = glowSprite(0xff6a44, 0.5, 0.9);
    halo.position.copy(e.position);
    g.add(halo);
  });
  /* tail */
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.7, 5), dark);
  tail.rotation.z = Math.PI / 2 + 0.5;
  tail.position.set(-0.85, 0.7, 0);
  g.add(tail);
  g.scale.setScalar(scale);
  g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  g.isBeast = true;
  return g;
}

/* ---------------- props ---------------- */
export function makeLantern(color = 0xffb45e, s = 1) {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.26, 6),
    new THREE.MeshStandardMaterial({ color: 0xd8443a, emissive: 0xff7a3a, emissiveIntensity: 0.8, roughness: 0.7 }));
  g.add(frame);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.08, 6), MAT(0x2a1f16));
  cap.position.y = 0.17; g.add(cap);
  const base = cap.clone(); base.position.y = -0.17; base.rotation.z = Math.PI; g.add(base);
  const halo = glowSprite(color, 1.6, 0.75);
  g.add(halo);
  g.scale.setScalar(s);
  return g;
}

export function makeBasin() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.14, 12, 1, true),
    MAT(0x8a6a45, { side: THREE.DoubleSide }));
  g.add(b);
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.205, 12),
    new THREE.MeshStandardMaterial({ color: 0x7fb6c9, emissive: 0x2a5a6a, emissiveIntensity: 0.4, roughness: 0.2, metalness: 0.3 }));
  water.rotation.x = -Math.PI / 2; water.position.y = 0.05;
  g.add(water);
  return g;
}

export function makeClapper() {
  const g = new THREE.Group();
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.05), MAT(0x8a6a3f));
  g.add(board);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.2, 4), MAT(0x333333));
  cord.position.y = 0.1; g.add(cord);
  return g;
}

export function makeScroll() {
  const g = new THREE.Group();
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.44),
    new THREE.MeshStandardMaterial({ color: 0xe9dfc6, roughness: 0.95, side: THREE.DoubleSide }));
  g.add(paper);
  const rod1 = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.4, 6), MAT(0x4a3826));
  rod1.rotation.z = Math.PI / 2; rod1.position.y = 0.22; g.add(rod1);
  const rod2 = rod1.clone(); rod2.position.y = -0.22; g.add(rod2);
  return g;
}

/** Spring Autumn Cicada — the seventh of the Ten Mystical Gu */
export function makeCicada() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x9a7d2e, emissive: 0xd9b44a, emissiveIntensity: 1.4,
    metalness: 0.75, roughness: 0.3,
  });
  const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), bodyMat);
  thorax.scale.set(1.0, 0.8, 1.35);
  g.add(thorax);
  const abdomen = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.05, 0.8, 10), bodyMat);
  abdomen.rotation.x = Math.PI / 2;
  abdomen.position.z = -0.55;
  g.add(abdomen);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), bodyMat);
  head.position.z = 0.42;
  g.add(head);
  const eyeM = new THREE.MeshStandardMaterial({ color: 0x183a18, emissive: 0x4aff7a, emissiveIntensity: 1.4 });
  [-0.12, 0.12].forEach(x => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), eyeM);
    e.position.set(x, 0.06, 0.56);
    g.add(e);
  });
  /* wings */
  const wingMat = new THREE.MeshStandardMaterial({
    map: TEX.wing, transparent: true, opacity: 0.75, side: THREE.DoubleSide,
    emissive: 0x7dff9a, emissiveIntensity: 0.3, depthWrite: false,
  });
  g.userData.wings = [];
  [[1, 0.12], [-1, -0.12]].forEach(([s, z]) => {
    const w1 = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.45), wingMat);
    w1.position.set(s * 0.5, 0.16, z);
    w1.rotation.y = s * 0.35; w1.rotation.x = -0.15;
    g.add(w1); g.userData.wings.push(w1);
    const w2 = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.34), wingMat);
    w2.position.set(s * 0.38, 0.1, -0.38);
    w2.rotation.y = s * 0.75; w2.rotation.x = -0.15;
    g.add(w2); g.userData.wings.push(w2);
  });
  /* halo shells */
  const halo1 = glowSprite(0xffe08a, 4.4, 0.85);
  g.add(halo1);
  const halo2 = glowSprite(0x8affb0, 7.5, 0.4);
  g.add(halo2);
  g.traverse(m => { if (m.isMesh) m.castShadow = false; });
  g.isCicada = true;
  return g;
}

export function animateCicada(c, t) {
  const wings = c.userData.wings || [];
  wings.forEach((w, i) => {
    const base = i < 2 ? -0.15 : -0.15;
    w.rotation.z = Math.sin(t * 14 + i * 1.9) * 0.32 + (i < 2 ? 0.1 : 0);
    w.rotation.x = base + Math.sin(t * 14) * 0.18;
  });
  c.position.y += Math.sin(t * 1.7) * 0.004;
}

export { MAT };
