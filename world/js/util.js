// ============================================================
// util.js — math, noise, procedural textures, geometry helpers
// ============================================================
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ---------------- random ---------------- */
export function makeRng(seed = 1) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
export const rng = makeRng(20260927);
export const rr = (a, b, r = rng) => a + (b - a) * r();
export const ri = (a, b, r = rng) => Math.floor(rr(a, b + 1, r));
export const pick = (arr, r = rng) => arr[Math.floor(r() * arr.length) % arr.length];

/* ---------------- math ---------------- */
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => t * t * (3 - 2 * t);
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** frame-rate independent exponential damping */
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

/* ---------------- value noise ---------------- */
function hash2(x, y) {
  let h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}
export function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
export function fbm(x, y, oct = 4, lac = 2.0, gain = 0.5) {
  let s = 0, amp = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += amp * vnoise(x * f, y * f); f *= lac; amp *= gain; }
  return s;
}

/* ---------------- canvas textures ---------------- */
const texCache = new Map();
export function canvasTex(key, w, h, draw, opts = {}) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = opts.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(opts.repeat[0], opts.repeat[1]); }
  t.anisotropy = 4;
  texCache.set(key, t);
  return t;
}

export const TEX = {
  get glow() { return canvasTex('glow', 128, 128, (g, w, h) => {
    const grd = g.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,.55)');
    grd.addColorStop(0.6, 'rgba(255,255,255,.12)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
  }, { srgb: false }); },
  get soft() { return canvasTex('soft', 128, 128, (g, w, h) => {
    const grd = g.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2);
    grd.addColorStop(0, 'rgba(255,255,255,.9)');
    grd.addColorStop(0.5, 'rgba(255,255,255,.35)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
  }, { srgb: false }); },
  get cloud() { return canvasTex('cloud', 256, 256, (g, w, h) => {
    for (let i = 0; i < 90; i++) {
      const x = rr(0, w), y = rr(0, h), r = rr(18, 64);
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      const a = rr(0.03, 0.1);
      grd.addColorStop(0, `rgba(255,255,255,${a})`);
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
    }
  }, { srgb: false }); },
  get stone() { return canvasTex('stone', 256, 256, (g, w, h) => {
    g.fillStyle = '#8d8d90'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2400; i++) {
      const v = ri(90, 175);
      g.fillStyle = `rgba(${v},${v},${v + ri(-6, 6)},${rr(0.06, 0.22)})`;
      const s = rr(1, 5); g.fillRect(rr(0, w), rr(0, h), s, s);
    }
    for (let i = 0; i < 26; i++) { // cracks
      g.strokeStyle = `rgba(40,40,46,${rr(0.12, 0.3)})`;
      g.lineWidth = rr(0.5, 1.6);
      g.beginPath(); let x = rr(0, w), y = rr(0, h);
      g.moveTo(x, y);
      for (let k = 0; k < 6; k++) { x += rr(-34, 34); y += rr(-34, 34); g.lineTo(x, y); }
      g.stroke();
    }
  }, { repeat: [3, 3] }); },
  get darkRock() { return canvasTex('darkrock', 256, 256, (g, w, h) => {
    g.fillStyle = '#3c3b42'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 3000; i++) {
      const v = ri(34, 96);
      g.fillStyle = `rgba(${v},${v},${v + ri(-4, 8)},${rr(0.08, 0.3)})`;
      g.fillRect(rr(0, w), rr(0, h), rr(1, 6), rr(1, 6));
    }
  }, { repeat: [2, 2] }); },
  get wood() { return canvasTex('wood', 256, 256, (g, w, h) => {
    g.fillStyle = '#7a5a3a'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 3) {
      g.strokeStyle = `rgba(${ri(60, 120)},${ri(40, 80)},${ri(20, 46)},${rr(0.12, 0.35)})`;
      g.lineWidth = rr(0.6, 1.8);
      g.beginPath(); g.moveTo(0, y + Math.sin(y * 0.2) * 2);
      for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x * 0.05 + y) * 2.4);
      g.stroke();
    }
  }, { repeat: [2, 2] }); },
  get bamboo() { return canvasTex('bamboo', 128, 256, (g, w, h) => {
    g.fillStyle = '#7f9455'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) {
      g.fillStyle = `rgba(${ri(80, 140)},${ri(110, 170)},${ri(50, 100)},${rr(0.05, 0.2)})`;
      g.fillRect(rr(0, w), rr(0, h), rr(1, 4), rr(2, 10));
    }
    for (let y = 32; y < h; y += 64) {
      g.fillStyle = 'rgba(50,66,32,.55)'; g.fillRect(0, y, w, 4);
    }
  }, { repeat: [1, 2] }); },
  get blood() { return canvasTex('blood', 256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      const x = rr(40, w - 40), y = rr(40, h - 40), r = rr(10, 54);
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, `rgba(${ri(90, 140)},${ri(8, 20)},${ri(6, 16)},${rr(0.5, 0.9)})`);
      grd.addColorStop(0.7, `rgba(90,10,12,${rr(0.25, 0.5)})`);
      grd.addColorStop(1, 'rgba(70,6,8,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
    for (let i = 0; i < 120; i++) {
      g.fillStyle = `rgba(${ri(80, 150)},${ri(5, 25)},${ri(5, 18)},${rr(0.3, 0.8)})`;
      g.beginPath(); g.arc(rr(0, w), rr(0, h), rr(1, 4), 0, 7); g.fill();
    }
  }); },
  get bloodRobe() { return canvasTex('bloodrobe', 256, 256, (g, w, h) => {
    g.fillStyle = '#2f5d46'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1600; i++) {
      g.fillStyle = `rgba(${ri(30, 70)},${ri(70, 110)},${ri(50, 85)},${rr(0.04, 0.16)})`;
      g.fillRect(rr(0, w), rr(0, h), rr(1, 4), rr(1, 4));
    }
    for (let i = 0; i < 46; i++) { // blood stains & tears
      const x = rr(0, w), y = rr(0, h), r = rr(4, 26);
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, `rgba(${ri(90, 150)},${ri(8, 24)},${ri(6, 16)},${rr(0.35, 0.85)})`);
      grd.addColorStop(1, 'rgba(80,8,10,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
    for (let i = 0; i < 14; i++) { // tattered slashes
      g.strokeStyle = 'rgba(8,10,10,.85)'; g.lineWidth = rr(2, 6);
      g.beginPath(); const x = rr(0, w), y = rr(h * 0.45, h);
      g.moveTo(x, y); g.lineTo(x + rr(-26, 26), y - rr(20, 70)); g.stroke();
    }
  }); },
  get lattice() { return canvasTex('lattice', 256, 256, (g, w, h) => {
    g.fillStyle = '#1a1410'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#6b4c2e'; g.lineWidth = 7;
    for (let i = 0; i <= 4; i++) { const p = (i / 4) * w;
      g.beginPath(); g.moveTo(p, 0); g.lineTo(p, h); g.stroke();
      g.beginPath(); g.moveTo(0, p); g.lineTo(w, p); g.stroke(); }
    g.strokeStyle = '#8a6339'; g.lineWidth = 2;
    for (let i = 0; i <= 4; i++) { const p = (i / 4) * w + w / 8;
      g.beginPath(); g.moveTo(p, 0); g.lineTo(p, h); g.stroke(); }
  }); },
  get roof() { return canvasTex('roof', 128, 128, (g, w, h) => {
    g.fillStyle = '#4a5560'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 14) {
      for (let x = ((y / 14) % 2) * -10; x < w; x += 20) {
        g.fillStyle = `rgba(${ri(50, 90)},${ri(65, 105)},${ri(80, 120)},${rr(0.5, 0.95)})`;
        g.beginPath(); g.arc(x + 10, y + 6, 9, 0, Math.PI); g.fill();
      }
      g.fillStyle = 'rgba(20,26,32,.6)'; g.fillRect(0, y + 12, w, 2);
    }
  }, { repeat: [3, 3] }); },
  get petal() { return canvasTex('petal', 128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const grd = g.createRadialGradient(w/2, h/2, 4, w/2, h/2, w/2);
    grd.addColorStop(0, 'rgba(255,255,255,.95)');
    grd.addColorStop(0.35, 'rgba(210,205,255,.85)');
    grd.addColorStop(0.7, 'rgba(150,175,235,.55)');
    grd.addColorStop(1, 'rgba(120,150,220,0)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
  }, { srgb: false }); },
  get wing() { return canvasTex('wing', 256, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = 'rgba(230,255,220,.9)'; g.lineWidth = 3;
    g.beginPath(); g.ellipse(w * 0.5, h * 0.5, w * 0.46, h * 0.34, 0, 0, 7); g.stroke();
    g.fillStyle = 'rgba(190,255,200,.16)';
    g.beginPath(); g.ellipse(w * 0.5, h * 0.5, w * 0.46, h * 0.34, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(230,255,220,.55)'; g.lineWidth = 1.4;
    for (let i = -3; i <= 3; i++) {
      g.beginPath(); g.moveTo(w * 0.08, h * 0.5 + i * 3);
      g.quadraticCurveTo(w * 0.5, h * 0.5 + i * 10, w * 0.92, h * 0.5 + i * 6);
      g.stroke();
    }
  }, { srgb: false }); },
  get primevalStone() { return canvasTex('pstone', 64, 64, (g, w, h) => {
    g.fillStyle = '#3d4a58'; g.fillRect(0, 0, w, h);
    const grd = g.createRadialGradient(w/2, h/2, 2, w/2, h/2, w/2);
    grd.addColorStop(0, 'rgba(150,220,255,.9)');
    grd.addColorStop(0.5, 'rgba(80,150,210,.4)');
    grd.addColorStop(1, 'rgba(30,60,90,0)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
  }, { srgb: false }); },
};

/* ---------------- geometry ---------------- */
/** Displaced ground plane */
export function groundGeo(size, segs, heightFn) {
  const g = new THREE.PlaneGeometry(size, size, segs, segs);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    p.setY(i, heightFn(p.getX(i), p.getZ(i)));
  }
  g.computeVertexNormals();
  return g;
}

/** Jagged rock / peak: displaced icosahedron */
export function rockGeo(radius = 1, detail = 2, rough = 0.34, seed = 0) {
  const g = new THREE.IcosahedronGeometry(radius, detail);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = fbm(v.x * 1.7 + seed, v.y * 1.7 + v.z * 1.3 + seed * 2.1, 3);
    v.multiplyScalar(1 + (n - 0.5) * 2 * rough);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** Big mountain cone with noise displacement */
export function peakGeo(r = 10, h = 24, segs = 24, seed = 1) {
  const g = new THREE.ConeGeometry(r, h, segs, 7, true);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const ang = Math.atan2(v.z, v.x);
    const t = (v.y + h / 2) / h;
    const n = fbm(Math.cos(ang) * 2 + seed, Math.sin(ang) * 2 + t * 3, 4);
    const bulge = 1 + (n - 0.5) * 0.75 * (1 - t * 0.4);
    v.x *= bulge; v.z *= bulge;
    v.y += (n - 0.5) * 1.6;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** Ribbon strip along a curve (for the River of Time) */
export function ribbonGeo(curve, width, uSegs = 240, vSegs = 8, twist = 0) {
  const pos = [], uv = [], idx = [];
  const pt = new THREE.Vector3(), tan = new THREE.Vector3();
  const side = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const normal = new THREE.Vector3();
  for (let i = 0; i <= uSegs; i++) {
    const u = i / uSegs;
    curve.getPointAt(u, pt);
    curve.getTangentAt(u, tan);
    side.crossVectors(up, tan).normalize();
    if (twist !== 0) {
      const a = twist * u;
      normal.crossVectors(tan, side);
      side.multiplyScalar(Math.cos(a)).addScaledVector(normal, Math.sin(a));
    }
    const w = width * (0.85 + 0.3 * Math.sin(u * Math.PI * 6));
    for (let j = 0; j <= vSegs; j++) {
      const v = j / vSegs - 0.5;
      pos.push(pt.x + side.x * w * v * 2, pt.y + side.y * w * v * 2, pt.z + side.z * w * v * 2);
      uv.push(u, j / vSegs);
    }
  }
  const row = vSegs + 1;
  for (let i = 0; i < uSegs; i++) for (let j = 0; j < vSegs; j++) {
    const a = i * row + j, b = a + row;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* ---------------- objects ---------------- */
export function glowSprite(color = 0xffddaa, scale = 2, opacity = 1) {
  const m = new THREE.SpriteMaterial({
    map: TEX.glow, color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const s = new THREE.Sprite(m);
  s.scale.setScalar(scale);
  return s;
}

/** soft round decal on the ground */
export function decal(color, size, opacity = 0.8, map = null) {
  const m = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, depthWrite: false,
    map: map || undefined,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), m);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
/** Build an InstancedMesh from a list of {pos, rot?, scale?} transforms */
export function instanced(geo, mat, transforms, shadows = false) {
  const im = new THREE.InstancedMesh(geo, mat, transforms.length);
  transforms.forEach((tr, i) => {
    _p.set(...tr.pos);
    _q.setFromEuler(new THREE.Euler(...(tr.rot || [0, 0, 0])));
    const sc = tr.scale;
    _s.set(sc?.[0] ?? sc ?? 1, sc?.[1] ?? sc ?? 1, sc?.[2] ?? sc ?? 1);
    _m4.compose(_p, _q, _s);
    im.setMatrixAt(i, _m4);
  });
  im.instanceMatrix.needsUpdate = true;
  im.castShadow = shadows; im.receiveShadow = shadows;
  return im;
}

/** Merge part geometries (each pre-transformed) */
export function merge(parts) {
  const list = parts.filter(Boolean);
  return list.length === 1 ? list[0] : mergeGeometries(list, false);
}

export function xform(geo, pos = [0, 0, 0], rot = [0, 0, 0], scale = 1) {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot));
  const s = Array.isArray(scale) ? new THREE.Vector3(...scale) : new THREE.Vector3(scale, scale, scale);
  m.compose(new THREE.Vector3(...pos), q, s);
  geo.applyMatrix4(m);
  return geo;
}

/* ---------------- geometry-based point cloud ---------------- */
export function pointCloud(positions, { color = 0xffffff, size = 0.4, opacity = 1, map = null, additive = true, vertexColors = null, sizeAttenuation = true } = {}) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (vertexColors) g.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
  const m = new THREE.PointsMaterial({
    color, size, transparent: true, opacity, map: map || undefined,
    depthWrite: false, sizeAttenuation,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    vertexColors: !!vertexColors,
  });
  return new THREE.Points(g, m);
}

/* ---------------- simple label anchor helper ---------------- */
export function anchor(obj, dy = 0) {
  return () => {
    const v = new THREE.Vector3();
    obj.getWorldPosition(v);
    v.y += dy;
    return v;
  };
}
