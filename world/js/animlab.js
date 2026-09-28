// ============================================================
// animlab.js — homegrown auto-rig + procedural animation
// Rigs a Tripo-style A-pose GLB (no skeleton) in pure code:
//   1. derives a 17-bone human skeleton from the model's height
//   2. computes per-vertex skin weights (distance falloff to
//      bone segments, top-4 blend) and rebuilds as SkinnedMesh
//   3. procedural animations (idle / walk / death) drive bones
//      per frame — no clip files, no API, no credits
// ============================================================
import * as THREE from 'three';

// Bone spec in FEET-BASED absolute coords for a figure of height H,
// feet at y=0, facing +Z. The arm chain is DATA-DRIVEN from the model's
// actual silhouette (Tripo A-poses vary in arm spread); everything else
// follows the standard proportions.
const BONE_SPEC = (H, hands) => {
  const shY = 0.82 * H; // shoulder height
  // hand extremes in anatomy space (x>0 = left, x<0 = right)
  const hl = hands && hands.lx > 0.03 * H ? hands : { lx: 0.30 * H, ly: 0.62 * H, rx: -0.30 * H, ry: 0.62 * H };
  const sx = 0.45; // shoulder x as fraction of hand x
  return [
    // [name, parent, [x, y, z] (absolute, feet-based), influenceRadius]
    ['hips',      null,        [0, 0.50 * H, 0],        0.14 * H],
    ['spine',     'hips',      [0, 0.61 * H, 0],        0.13 * H],
    ['chest',     'spine',     [0, 0.73 * H, 0],        0.14 * H],
    ['neck',      'chest',     [0, 0.845 * H, 0],       0.075 * H],
    ['head',      'neck',      [0, 0.93 * H, 0],        0.10 * H],
    ['shoulderL', 'chest',     [sx * hl.lx, shY, 0],    0.115 * H],
    ['elbowL',    'shoulderL', [sx * hl.lx + (hl.lx - sx * hl.lx) * 0.5, (shY + hl.ly) * 0.5, 0], 0.105 * H],
    ['wristL',    'elbowL',    [hl.lx, hl.ly, 0],       0.09 * H],
    ['shoulderR', 'chest',     [sx * hl.rx, shY, 0],    0.115 * H],
    ['elbowR',    'shoulderR', [sx * hl.rx + (hl.rx - sx * hl.rx) * 0.5, (shY + hl.ry) * 0.5, 0], 0.105 * H],
    ['wristR',    'elbowR',    [hl.rx, hl.ry, 0],       0.09 * H],
    ['hipL',      'hips',      [0.09 * H, 0.47 * H, 0],  0.12 * H],
    ['kneeL',     'hipL',      [0.09 * H, 0.25 * H, 0],  0.11 * H],
    ['ankleL',    'kneeL',     [0.09 * H, 0.05 * H, 0],  0.085 * H],
    ['hipR',      'hips',      [-0.09 * H, 0.47 * H, 0], 0.12 * H],
    ['kneeR',     'hipR',      [-0.09 * H, 0.25 * H, 0], 0.11 * H],
    ['ankleR',    'kneeR',     [-0.09 * H, 0.05 * H, 0], 0.085 * H],
  ];
};

function segDistSq(px, py, pz, ax, ay, az, bx, by, bz) {
  const abx = bx - ax, aby = by - ay, abz = bz - az;
  const apx = px - ax, apy = py - ay, apz = pz - az;
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby + apz * abz) /
    Math.max(abx * abx + aby * aby + abz * abz, 1e-9)));
  const dx = px - (ax + abx * t), dy = py - (ay + aby * t), dz = pz - (az + abz * t);
  return dx * dx + dy * dy + dz * dz;
}

/** Find the main mesh node (largest triangle count) inside a scene. */
function mainMesh(root) {
  let best = null, bestTris = 0;
  root.traverse(o => {
    if (o.isMesh && o.geometry) {
      const idx = o.geometry.index;
      const tris = idx ? idx.count / 3 : (o.geometry.attributes.position?.count / 3 || 0);
      if (tris > bestTris) { bestTris = tris; best = o; }
    }
  });
  return best;
}

/**
 * Auto-rig an A-pose humanoid. Returns { bones, byName, skinned, height }
 * or null if no suitable mesh is found.
 *
 * The skinned mesh replaces the main mesh in the scene graph; original
 * local transform is preserved and returned as skinned.userData.orig.
 */
export function autoRig(root) {
  const mesh = mainMesh(root);
  if (!mesh) return null;
  const geom = mesh.geometry;
  const pos = geom.attributes.position;
  if (!pos || pos.count < 500) return null;

  // model-space bbox (geometry local space).
  // Anatomy space: feet at y=0, figure centered on x/z (bone spec lives there).
  const box = new THREE.Box3().setFromBufferAttribute(pos);
  const size = box.getSize(new THREE.Vector3());
  const H = Math.max(size.y, 0.5);
  const c0 = box.getCenter(new THREE.Vector3());
  const feetY = box.min.y;

  // Data-driven arm chain: find the most lateral points (hands) in the
  // mid-body band. Relaxed A-pose hands sit near hip height and are the
  // outermost silhouette points; the robe hem stays inside them.
  let lx = -Infinity, ly = 0, rx = Infinity, ry = 0;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) - c0.x;
    const y = pos.getY(i) - feetY;
    if (y > 0.30 * H && y < 0.72 * H) {
      if (x > lx) { lx = x; ly = y; }
      if (x < rx) { rx = x; ry = y; }
    }
  }
  if (!isFinite(lx) || !isFinite(rx)) { lx = 0.30 * H; rx = -0.30 * H; ly = ry = 0.62 * H; }

  const spec = BONE_SPEC(H, { lx, ly, rx, ry });
  const bones = [], byName = {};
  for (const [name, parent, p, r] of spec) {
    const b = new THREE.Bone();
    b.name = name;
    b.userData.radius = r;
    b.userData.abs = new THREE.Vector3(p[0], p[1], p[2]);
    bones.push(b);
    byName[name] = b;
  }
  // hierarchy + RELATIVE positions (child abs - parent abs)
  for (const [name, parent, p, r] of spec) {
    const b = byName[name];
    if (parent) {
      const pa = byName[parent].userData.abs;
      b.position.set(p[0] - pa.x, p[1] - pa.y, p[2] - pa.z);
    } else {
      // root bone: anatomy abs → geometry-local (local = abs + center/min offset)
      b.position.set(p[0] + c0.x, p[1] + feetY, p[2] + c0.z);
    }
  }
  // build parent links
  for (const [name, parent] of spec) {
    if (parent) byName[parent].add(byName[name]);
  }
  // skin segments: parent-abs → child-abs (root: point)
  const segs = spec.map(([name, parent, p, r]) => ({
    name,
    a: parent ? byName[parent].userData.abs : new THREE.Vector3(p[0], p[1], p[2]),
    b: new THREE.Vector3(p[0], p[1], p[2]),
    r,
  }));

  // --- skin weights: Gaussian falloff to bone segments, top-4 ---
  const n = pos.count;
  const skinIdx = new Uint16Array(n * 4);
  const skinWt = new Float32Array(n * 4);
  // CRITICAL: use stride-aware getX/getY/getZ — GLB vertex buffers are
  // interleaved (pos+normal+uv, stride 8), raw .array indexing reads garbage.
  // Gaussian falloff is robust for volumetric garments (long tattered robe)
  // and A-pose arms alike. sigma = 2 x the bone's influence radius.
  const sigma2 = segs.map(g => (g.r * 2.0) * (g.r * 2.0));
  for (let i = 0; i < n; i++) {
    // local → anatomy space (feet at y=0, centered x/z)
    const px = pos.getX(i) - c0.x, py = pos.getY(i) - feetY, pz = pos.getZ(i) - c0.z;
    const scores = new Float32Array(spec.length);
    let bs = 0, best = 0, nearest = 0, nd2 = Infinity;
    for (let s = 0; s < spec.length; s++) {
      const g = segs[s];
      const d2 = segDistSq(px, py, pz, g.a.x, g.a.y, g.a.z, g.b.x, g.b.y, g.b.z);
      if (d2 < nd2) { nd2 = d2; nearest = s; }
      scores[s] = Math.exp(-d2 / sigma2[s]);
      bs += scores[s];
      if (scores[s] > scores[best]) best = s;
    }
    if (bs < 1e-6) { skinIdx[i * 4] = nearest; skinWt[i * 4] = 1; continue; }
    const order = spec.map((_, s) => s).sort((u, v) => scores[v] - scores[u]).slice(0, 4);
    const sum = order.reduce((a, s) => a + scores[s], 0);
    for (let k = 0; k < 4; k++) {
      const s = order[k];
      skinIdx[i * 4 + k] = s;
      skinWt[i * 4 + k] = scores[s] / sum;
    }
  }
  geom.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIdx, 4));
  geom.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWt, 4));

  // --- build SkinnedMesh and swap it into the graph ---
  const skinned = new THREE.SkinnedMesh(geom, mesh.material);
  skinned.castShadow = mesh.castShadow;
  skinned.receiveShadow = mesh.receiveShadow;
  skinned.name = (mesh.name || 'mesh') + '_skinned';
  skinned.position.copy(mesh.position);
  skinned.quaternion.copy(mesh.quaternion);
  skinned.scale.copy(mesh.scale);
  skinned.userData.orig = {
    position: skinned.position.clone(),
    rotation: skinned.rotation.clone(),
  };
  skinned.add(byName['hips']);
  const parent = mesh.parent;
  if (parent) { parent.remove(mesh); parent.add(skinned); }
  else root.add(skinned);

  // bind AFTER the mesh is in the graph. Ancestors' matrixWorld must be
  // current at this moment — the viewer may have just scaled/positioned the
  // root, and a stale bind matrix silently corrupts all skinning.
  root.updateWorldMatrix(true, true);
  skinned.updateMatrixWorld(true);
  skinned.bind(new THREE.Skeleton(bones));
  return { bones, byName, skinned, height: H };
}

// ------------------------------------------------------------
// procedural animations
// Each returns { boneName: [rx, ry, rz], root?: {y, rz, rx, ry?, ryDelta?} }
// for time t. root.ry is an ABSOLUTE body yaw; root.ryDelta is measured from
// the yaw the previous motion left (continuity across beat changes).
// ------------------------------------------------------------
const ZERO = [0, 0, 0];
const clamp01 = v => Math.max(0, Math.min(1, v));
const easeInOut = v => v * v * (3 - 2 * v);
const easeOut = v => 1 - (1 - v) * (1 - v);

function animIdle(t) {
  const br = Math.sin(t * 1.7);
  return {
    chest: [br * 0.035, 0, 0],
    neck: [br * 0.02, Math.sin(t * 0.6) * 0.03, 0],
    head: [br * 0.015, Math.sin(t * 0.45) * 0.05, Math.sin(t * 0.3) * 0.02],
    shoulderL: [0, 0, 0.06 + br * 0.01],
    shoulderR: [0, 0, -0.06 - br * 0.01],
    wristL: [0, 0, 0.03],
    wristR: [0, 0, -0.03],
    hips: [0, Math.sin(t * 0.5) * 0.015, 0],
  };
}

function animWalk(t, H) {
  const ph = t * 7.2;
  const s = Math.sin(ph), c = Math.cos(ph);
  return {
    hipL: [s * 0.55, 0, 0.03],
    hipR: [-s * 0.55, 0, -0.03],
    kneeL: [Math.max(0, -s) * 0.75 + 0.05, 0, 0],
    kneeR: [Math.max(0, s) * 0.75 + 0.05, 0, 0],
    ankleL: [-Math.max(0, -s) * 0.35 + c * 0.08, 0, 0],
    ankleR: [-Math.max(0, s) * 0.35 - c * 0.08, 0, 0],
    shoulderL: [-s * 0.42, 0, 0.08],
    shoulderR: [s * 0.42, 0, -0.08],
    elbowL: [-0.35, 0, 0],
    elbowR: [-0.35, 0, 0],
    chest: [0.04, s * 0.05, 0],
    head: [-s * 0.03, -s * 0.04, 0],
    spine: [0.02, 0, 0],
    hips: [0, 0, s * 0.035],
    root: { y: Math.abs(c) * 0.012 * H, rz: 0 },
  };
}

// death — stagger, collapse, settle (Chapter 1 tone)
const DEATH_KEYS = [
  { t: 0.0, p: {
      head: [0.1, 0.15, 0], chest: [+0.05, 0.08, 0],
      shoulderL: [0.25, 0, 0.35], shoulderR: [0.25, 0, -0.35],
      wristL: [-0.4, 0, 0.2], wristR: [-0.4, 0, -0.2],
      kneeL: [0.15, 0, 0], kneeR: [0.1, 0, 0],
  } },
  { t: 0.35, p: {
      head: [+0.5, 0.1, 0.05], chest: [+0.2, 0.05, 0], spine: [+0.15, 0, 0],
      shoulderL: [-0.4, 0, 0.6], shoulderR: [-0.3, 0, -0.5],
      wristL: [-0.9, 0, 0.3], wristR: [-0.7, 0, -0.3],
      hipL: [0.35, 0, 0.05], hipR: [0.2, 0, -0.05],
      kneeL: [0.7, 0, 0], kneeR: [0.5, 0, 0],
  } },
  { t: 0.8, p: {
      head: [+0.75, 0, 0.15], neck: [+0.5, 0, 0.05], chest: [+0.85, 0, 0.1],
      spine: [+0.7, 0, 0.15],
      shoulderL: [-1.1, 0, 1.0], shoulderR: [-0.9, 0, -0.9],
      elbowL: [-0.5, 0, 0.2], elbowR: [-0.4, 0, -0.2],
      wristL: [-1.2, 0, 0.4], wristR: [-1.0, 0, -0.4],
      hipL: [0.9, 0, 0.1], hipR: [0.6, 0, -0.1],
      kneeL: [1.1, 0, 0], kneeR: [0.8, 0, 0],
      ankleL: [-0.6, 0, 0], ankleR: [-0.4, 0, 0],
  } },
  { t: 1.3, p: {
      head: [+1.05, 0, 0.2], neck: [+0.6, 0, 0.1], chest: [+1.15, 0, 0.25],
      spine: [+0.95, 0, 0.3],
      shoulderL: [-1.35, 0, 1.25], shoulderR: [-1.2, 0, -1.2],
      elbowL: [-0.6, 0, 0.3], elbowR: [-0.55, 0, -0.3],
      wristL: [-1.5, 0, 0.5], wristR: [-1.4, 0, -0.5],
      hipL: [1.05, 0, 0.12], hipR: [0.75, 0, -0.08],
      kneeL: [1.2, 0, 0.05], kneeR: [0.9, 0, -0.05],
      ankleL: [-0.7, 0, 0], ankleR: [-0.55, 0, 0],
  } },
];
const DEATH_DUR = 2.6; // seconds total (last key holds)

function animDeath(t, H) {
  const k = Math.min(t / DEATH_DUR, 1);
  let a = DEATH_KEYS[0], b = DEATH_KEYS[DEATH_KEYS.length - 1];
  for (let i = 0; i < DEATH_KEYS.length - 1; i++) {
    if (k >= DEATH_KEYS[i].t && k <= DEATH_KEYS[i + 1].t) { a = DEATH_KEYS[i]; b = DEATH_KEYS[i + 1]; break; }
  }
  let u = (k - a.t) / Math.max(b.t - a.t, 1e-6);
  u = u * u * (3 - 2 * u); // smoothstep
  const out = {};
  const names = new Set([...Object.keys(a.p), ...Object.keys(b.p)]);
  for (const nm of names) {
    const pa = a.p[nm] || ZERO, pb = b.p[nm] || ZERO;
    out[nm] = [pa[0] + (pb[0] - pa[0]) * u, pa[1] + (pb[1] - pa[1]) * u, pa[2] + (pb[2] - pa[2]) * u];
  }
  // root collapse: hips drop as the body falls (ease-in for the fall)
  const fall = k < 0.25 ? 0 : Math.min(1, (k - 0.25) / 0.55);
  const fe = fall * fall;
  out.root = { y: -fe * 0.42 * H, rz: fe * 0.12, rx: fe * 0.18 };
  return out;
}

// ——————————————————————————
// Ch1 motions — the summit siege, as played in world/js/zones/z1.js.
// ——————————————————————————

// "Fang Yuan, who had stood as motionless as a statue, slowly turned
// around. That solitary motion sent a convulsion through the host."
// A held beat (statue), then ONE deliberate 2.6 s turn of the whole body,
// back-turned → facing the crowd. Absolute ry, z1-specific (his group yaw
// + the camera bearing). The crowd recoil in z1 is timed to TURN_END.
const TURN_FROM = 3.32, TURN_TO = 0.15, TURN_HOLD = 0.8, TURN_DUR = 2.6;
export const TURN_END = TURN_HOLD + TURN_DUR; // ≈3.4 s into the beat
function animTurn(t) {
  const u = clamp01((t - TURN_HOLD) / TURN_DUR);
  const e = easeInOut(u);
  const br = Math.sin(t * 1.3);
  const lead = Math.sin(u * Math.PI) * 0.3; // head leads the turn, then settles
  return {
    head: [0.03 + br * 0.01, lead, 0.02 * Math.sin(u * Math.PI)],
    neck: [0.015, lead * 0.5, 0],
    chest: [0.02 + br * 0.008, e * 0.05, 0],
    spine: [0.015, e * 0.04, 0],
    shoulderL: [0, 0, 0.06],
    shoulderR: [0, 0, -0.06],
    root: { y: 0, ry: TURN_FROM + (TURN_TO - TURN_FROM) * e },
  };
}

// "Though the flesh perish, the demonic heart knows no regret."
// A slow 2.6 s turn of the whole body toward the western ridge, head lifted
// to the dying light, the verse delivered from stillness. WEST_YAW is
// z1-specific (his group yaw + the ridge bearing) — do not reuse elsewhere.
const WEST_YAW = -2.32;
function animPoem(t) {
  const e = easeInOut(clamp01(t / 2.6));
  const br = Math.sin(t * 1.05);
  return {
    head: [-0.07 + br * 0.008, 0.08 * (1 - e), 0.02],
    neck: [-0.035, 0.05 * (1 - e), 0],
    chest: [-0.055 - 0.02 * e, 0.06 * (1 - e), 0],
    spine: [-0.02, 0.05 * (1 - e), 0],
    shoulderL: [0, 0, 0.055 + br * 0.006],
    shoulderR: [0, 0, -0.055 - br * 0.006],
    root: { y: 0, ry: WEST_YAW * e },
  };
}

// "He self-detonates, brazen." — the final breath: chin up to the heavens,
// chest inflating, arms flung wide, a low crouch — while the body swings
// back around to face his executioners. ryDelta is measured from whatever
// yaw the previous motion left (poem → faces the crowd again).
function animBrace(t) {
  const e = easeOut(clamp01(t / 0.8));
  return {
    head: [-0.42 * e, 0, 0],
    neck: [-0.2 * e, 0, 0],
    chest: [-0.3 * e, 0, 0],
    spine: [-0.17 * e, 0, 0],
    shoulderL: [-0.22 * e, 0, 0.32 * e],
    shoulderR: [-0.22 * e, 0, -0.32 * e],
    elbowL: [-0.3 * e, 0, 0.14 * e],
    elbowR: [-0.3 * e, 0, -0.14 * e],
    wristL: [-0.5 * e, 0, 0.22 * e],
    wristR: [-0.5 * e, 0, -0.22 * e],
    hips: [0.1 * e, 0, 0],
    root: { y: -0.09 * e, rx: 0.06 * e, ryDelta: 2.45 * e },
  };
}

export const ANIMS = { idle: animIdle, walk: animWalk, death: animDeath, turn: animTurn, poem: animPoem, brace: animBrace };
export const DEATH_DURATION = DEATH_DUR;

/**
 * Attach the animation lab to a rigged model.
 * start(name) begins an animation; tick(dt) advances it.
 */
export function createAnimator(rig) {
  const damp = (cur, tgt, dt, k = 10) => cur + (tgt - cur) * Math.min(1, dt * k);
  const state = { name: 'idle', t: 0, playing: true };
  const cur = {};
  for (const b of rig.bones) cur[b.name] = [0, 0, 0];
  const orig = rig.skinned.userData.orig ||
    { position: rig.skinned.position.clone(), rotation: rig.skinned.rotation.clone() };
  let rootY = 0, rootRZ = 0, rootRX = 0, rootRY = 0;
  let ryBase = 0; // body yaw captured at start(), for ryDelta motions

  const applyRoot = () => {
    rig.skinned.position.y = orig.position.y + rootY;
    rig.skinned.rotation.x = orig.rotation.x + rootRX;
    rig.skinned.rotation.y = orig.rotation.y + rootRY;
    rig.skinned.rotation.z = orig.rotation.z + rootRZ;
  };

  return {
    state,
    start(name) {
      state.name = ANIMS[name] ? name : 'idle';
      state.t = 0;
      state.playing = true;
      ryBase = rootRY;
      // Snap the figure to the motion's t=0 pose (no damped "whip" into it).
      const p0 = ANIMS[state.name](0, rig.height);
      for (const b of rig.bones) {
        const tgt = p0[b.name] || ZERO;
        b.rotation.set(tgt[0], tgt[1], tgt[2]);
        cur[b.name] = [tgt[0], tgt[1], tgt[2]];
      }
      // Reset root offsets the motion owns; keep the ones it doesn't
      // (a crouch doesn't cancel a death drop; brace continues a poem yaw).
      const r0 = p0.root || {};
      if (Math.abs(r0.y || 0) < 1e-3) rootY = 0;
      if (Math.abs(r0.rz || 0) < 1e-3) rootRZ = 0;
      if (Math.abs(r0.rx || 0) < 1e-3) rootRX = 0;
      // Absolute-ry motions: snap on a large cut (back-turned turn),
      // keep the current yaw on small continuity (poem after turn);
      // ryDelta motions always continue from the current yaw.
      if (r0.ry != null && Math.abs(r0.ry - rootRY) > 0.5) rootRY = r0.ry;
      applyRoot();
    },
    tick(dt) {
      if (!state.playing) return;
      state.t += dt;
      const H = rig.height;
      const pose = ANIMS[state.name](state.t, H);
      for (const b of rig.bones) {
        const tgt = pose[b.name] || ZERO;
        const c = cur[b.name];
        c[0] = damp(c[0], tgt[0], dt);
        c[1] = damp(c[1], tgt[1], dt);
        c[2] = damp(c[2], tgt[2], dt);
        b.rotation.set(c[0], c[1], c[2]);
      }
      const rt = pose.root;
      if (rt) {
        rootY = damp(rootY, rt.y, dt, 8);
        rootRZ = damp(rootRZ, rt.rz || 0, dt, 8);
        rootRX = damp(rootRX, rt.rx || 0, dt, 8);
        const ryTgt = rt.ry != null ? rt.ry : (rt.ryDelta != null ? ryBase + rt.ryDelta : rootRY);
        rootRY = damp(rootRY, ryTgt, dt, 8);
      } else {
        rootY = damp(rootY, 0, dt, 6);
        rootRZ = damp(rootRZ, 0, dt, 6);
        rootRX = damp(rootRX, 0, dt, 6);
      }
      applyRoot();
      if (state.name === 'death' && state.t > DEATH_DUR + 0.5) state.playing = false;
    },
  };
}
