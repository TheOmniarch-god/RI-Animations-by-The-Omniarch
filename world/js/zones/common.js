// ============================================================
// common.js — shared world-building pieces (houses, pavilions,
// caverns, orchid fields, crowds…)
// ============================================================
import * as THREE from 'three';
import { rng, rr, ri, pick, TEX, fbm, groundGeo, rockGeo, instanced, xform, merge, glowSprite, pointCloud, canvasTex } from '../util.js';
import { makeCrowdFigure, makeFigure, MAT } from '../figures.js';

/* ---------------- stilt house (mountain folk) ---------------- */
export function makeStiltHouse({ w = 4.4, d = 3.6, stiltH = 1.6, bamboo = false, seed = 0 } = {}) {
  const g = new THREE.Group();
  const wallTex = bamboo ? TEX.bamboo : TEX.wood;
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, color: bamboo ? 0xcfe0b8 : 0xffffff, roughness: 0.9 });
  const woodMat = new THREE.MeshStandardMaterial({ map: TEX.wood, roughness: 0.92 });
  const darkWood = new THREE.MeshStandardMaterial({ color: 0x4a3623, roughness: 0.9 });

  // stilts
  const stiltGeo = new THREE.CylinderGeometry(0.09, 0.11, stiltH, 6);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    const st = new THREE.Mesh(stiltGeo, darkWood);
    st.position.set(sx * (w / 2 - 0.3), -stiltH / 2, sz * (d / 2 - 0.3));
    st.castShadow = true;
    g.add(st);
  });
  // cross braces
  const brace = new THREE.Mesh(new THREE.BoxGeometry(w - 0.4, 0.07, 0.07), darkWood);
  brace.position.y = -stiltH * 0.6; g.add(brace);
  const brace2 = brace.clone(); brace2.rotation.y = Math.PI / 2;
  brace2.geometry = new THREE.BoxGeometry(0.07, 0.07, d - 0.4); g.add(brace2);

  // floor
  const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), woodMat);
  floor.position.y = 0.08; floor.castShadow = floor.receiveShadow = true;
  g.add(floor);

  // walls
  const H = 2.3;
  const walls = new THREE.Mesh(new THREE.BoxGeometry(w - 0.15, H, d - 0.15), wallMat);
  walls.position.y = 0.16 + H / 2;
  walls.castShadow = walls.receiveShadow = true;
  g.add(walls);

  // door (dark inset)
  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.7), new THREE.MeshStandardMaterial({ color: 0x171310, roughness: 1 }));
  door.position.set(0, 0.16 + 0.85, d / 2 + 0.01);
  g.add(door);

  // windows (emissive when lit)
  const winMat = new THREE.MeshStandardMaterial({
    color: 0x33261a, emissive: 0xffb45e, emissiveIntensity: 0.0, roughness: 0.6,
  });
  const winGeo = new THREE.PlaneGeometry(0.7, 0.6);
  const wins = [];
  const addWin = (x, y, z, ry) => {
    const win = new THREE.Mesh(winGeo, winMat);
    win.position.set(x, y, z); win.rotation.y = ry;
    g.add(win); wins.push(win);
  };
  addWin(-w / 4, 0.16 + 1.3, d / 2 + 0.012, 0);
  addWin(w / 4, 0.16 + 1.3, d / 2 + 0.012, 0);
  addWin(w / 2 + 0.012, 0.16 + 1.3, 0, Math.PI / 2);
  addWin(-w / 2 - 0.012, 0.16 + 1.3, 0, -Math.PI / 2);

  // railing
  const rail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, 0.05), darkWood);
  rail.position.set(0, 0.62, d / 2 + 0.25); g.add(rail);
  const railPost = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), darkWood);
  [[-w / 2 + 0.2, d / 2 + 0.25], [w / 2 - 0.2, d / 2 + 0.25]].forEach(([x, z]) => {
    const p = railPost.clone(); p.position.set(x, 0.4, z); g.add(p);
  });

  // roof — hipped pyramid with overhang
  const roofH = rr(1.3, 1.7);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, roofH, 4),
    new THREE.MeshStandardMaterial({ map: TEX.roof, color: 0xdfe6ee, roughness: 0.85 }));
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d));
  roof.position.y = 0.16 + H + roofH / 2 - 0.1;
  roof.castShadow = true;
  g.add(roof);
  // ridge cap
  const cap = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 0.1, 0.14), darkWood);
  cap.position.y = 0.16 + H + roofH - 0.12;
  g.add(cap);

  g.userData.windows = winMat;
  g.userData.setLit = (v) => { winMat.emissiveIntensity = v ? 2.6 : 0.0; };
  return g;
}

/* ---------------- multi-story pavilion (Clan Leader's) ---------------- */
export function makePavilion({ stories = 5, w = 9, storyH = 4.2, color = 0x8c3b2e } = {}) {
  const g = new THREE.Group();
  const colMat = new THREE.MeshStandardMaterial({ color, roughness: 0.75 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xd9c9a8, roughness: 0.9 });
  const roofMat = new THREE.MeshStandardMaterial({ map: TEX.roof, color: 0xc8d4e2, roughness: 0.8 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd8b46a, metalness: 0.7, roughness: 0.35, emissive: 0x694c14, emissiveIntensity: 0.35 });
  const winMat = new THREE.MeshStandardMaterial({ color: 0x2c2118, emissive: 0xffc47a, emissiveIntensity: 2.2, roughness: 0.6 });

  let y = 0;
  for (let s = 0; s < stories; s++) {
    const k = 1 - s * 0.11;
    const bw = w * k, bd = w * k * 0.86;
    const body = new THREE.Mesh(new THREE.BoxGeometry(bw - 0.4, storyH - 0.6, bd - 0.4), wallMat);
    body.position.y = y + (storyH - 0.6) / 2 + 0.4;
    body.castShadow = body.receiveShadow = true;
    g.add(body);
    // columns
    const colGeo = new THREE.CylinderGeometry(0.18, 0.2, storyH - 0.4, 8);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
      const c = new THREE.Mesh(colGeo, colMat);
      c.position.set(sx * (bw / 2 - 0.45), y + storyH / 2 + 0.2, sz * (bd / 2 - 0.45));
      c.castShadow = true;
      g.add(c);
    });
    // windows band
    const win = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.7, 1.5, bd + 0.06), winMat);
    win.position.y = y + storyH * 0.55;
    g.add(win);
    // eaves roof
    const rh = 1.7 * k + 0.4;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(bw, bd) * 0.86, rh, 4), roofMat);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(bw / Math.max(bw, bd), 1, bd / Math.max(bw, bd));
    roof.position.y = y + storyH + rh / 2 - 0.25;
    roof.castShadow = true;
    g.add(roof);
    // upturned corners
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz]) => {
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.9, 5), roofMat);
      tip.position.set(sx * bw * 0.55, y + storyH + 0.28, sz * bd * 0.55);
      tip.rotation.z = -sx * 0.9;
      tip.rotation.x = sz * 0.5;
      g.add(tip);
    });
    y += storyH;
  }
  // finial
  const fin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 2.4, 6), goldMat);
  fin.position.y = y + 1.0; g.add(fin);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), goldMat);
  orb.position.y = y + 2.3; g.add(orb);
  const halo = glowSprite(0xffd890, 4, 0.5);
  halo.position.y = y + 2.3; g.add(halo);

  // entry stairs
  for (let i = 0; i < 4; i++) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 0.24, 0.9 - i * 0.14), wallMat);
    st.position.set(0, 0.12 + i * 0.24, w * 0.45 + 1.2 - i * 0.32);
    st.receiveShadow = true;
    g.add(st);
  }
  g.userData.winMat = winMat;
  return g;
}

/* ---------------- cave shell (interior) ---------------- */
export function makeCaveShell(radius = 85, seed = 3) {
  const geo = new THREE.IcosahedronGeometry(radius, 4);
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = fbm(v.x * 0.045 + seed, v.y * 0.05 + v.z * 0.04, 4);
    v.multiplyScalar(1 + (n - 0.5) * 0.42);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    map: TEX.darkRock, color: 0x9aa0ae, roughness: 0.96, side: THREE.BackSide, flatShading: true,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}

/* ---------------- rainbow stalactites ---------------- */
export function makeStalactites({ count = 130, radius = 70, ceilY = 40, glowCount = 46, seed = 5 } = {}) {
  const group = new THREE.Group();
  const r2 = makeRngLocal(seed);
  // dark rock ones
  const rockTr = [], glowTr = [];
  const colors = [0xff4d4d, 0xffa13d, 0xffe13d, 0x59e05d, 0x3ddcdc, 0x4d8dff, 0xb44dff];
  for (let i = 0; i < count; i++) {
    const a = r2() * Math.PI * 2, r = Math.sqrt(r2()) * radius;
    const h = 3 + r2() * 9 * (1 - r / radius + 0.3);
    const tr = { pos: [Math.cos(a) * r, ceilY - h / 2 - r2() * 2, Math.sin(a) * r], rot: [Math.PI, r2() * 6, 0], scale: [0.7 + r2() * 0.9, h, 0.7 + r2() * 0.9] };
    if (i % 3 === 0 && glowTr.length < glowCount) glowTr.push({ ...tr });
    else rockTr.push(tr);
  }
  const rockMat = new THREE.MeshStandardMaterial({ map: TEX.darkRock, roughness: 0.95, flatShading: true, color: 0xb0b4c0 });
  const rockIM = instanced(new THREE.ConeGeometry(0.9, 1, 7), rockMat, rockTr, true);
  group.add(rockIM);
  // glowing colored tips
  const glowMat = new THREE.MeshBasicMaterial({ vertexColors: false, toneMapped: true });
  const glowIM = new THREE.InstancedMesh(new THREE.ConeGeometry(0.7, 1, 7), glowMat, glowTr.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  const col = new THREE.Color();
  glowTr.forEach((tr, i) => {
    pos.set(...tr.pos); q.setFromEuler(new THREE.Euler(...tr.rot));
    sc.set(tr.scale[0] * 0.8, tr.scale[1] * 0.6, tr.scale[2] * 0.8);
    m4.compose(pos, q, sc);
    glowIM.setMatrixAt(i, m4);
    glowIM.setColorAt(i, col.set(colors[i % colors.length]).multiplyScalar(0.9));
  });
  glowIM.instanceColor.needsUpdate = true;
  group.add(glowIM);
  // point sparkle sprites at glow tips
  glowTr.forEach((tr, i) => {
    const s = glowSprite(colors[i % colors.length], tr.scale[1] * 1.6, 0.32);
    s.position.set(tr.pos[0], tr.pos[1], tr.pos[2]);
    group.add(s);
  });
  return group;
}

function makeRngLocal(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/* ---------------- moon orchid field ---------------- */
export function makeOrchidField({ count = 2600, cx = 0, cz = -30, rx = 34, rz = 20, y = 0 } = {}) {
  const group = new THREE.Group();
  const tr = [];
  const r2 = makeRngLocal(99);
  const positions = [];
  for (let i = 0; i < count; i++) {
    // elliptical distribution, denser center
    const a = r2() * Math.PI * 2, r = Math.pow(r2(), 0.62);
    const x = cx + Math.cos(a) * r * rx;
    const z = cz + Math.sin(a) * r * rz;
    tr.push({ pos: [x, y + 0.16 + r2() * 0.12, z], rot: [r2() * 0.5 - 0.25, r2() * 6.28, r2() * 0.5 - 0.25], scale: 0.75 + r2() * 0.7 });
    positions.push(x, y + 0.45 + r2() * 0.3, z);
  }
  const blossomMat = new THREE.MeshStandardMaterial({
    color: 0xbcd0f5, emissive: 0x7fa8e8, emissiveIntensity: 0.45,
    roughness: 0.5, flatShading: true,
  });
  const blossom = instanced(new THREE.IcosahedronGeometry(0.16, 0), blossomMat, tr);
  blossom.scale.y = 0.6;
  group.add(blossom);

  // jade stems
  const stemTr = tr.filter((_, i) => i % 4 === 0).map(t => ({ pos: [t.pos[0], y + 0.1, t.pos[2]], scale: [1, 0.5 + (t.scale || 1) * 0.4, 1] }));
  const stems = instanced(new THREE.CylinderGeometry(0.03, 0.045, 0.5, 5),
    new THREE.MeshStandardMaterial({ color: 0x8fd8b0, emissive: 0x2f7a58, emissiveIntensity: 0.5, roughness: 0.6 }), stemTr);
  group.add(stems);

  // pearl lustre points
  const pearls = pointCloud(positions, {
    color: 0xeef4ff, size: 1.05, opacity: 0.55, map: TEX.glow, additive: true,
  });
  group.add(pearls);
  group.userData.pearls = pearls;
  return group;
}

/* ---------------- village scattered on a slope ---------------- */
export function scatterVillage({ count = 160, size = 220, slopeAxis = 'x', litP = 0.75, y0 = 0, gradient = 0.35 } = {}) {
  const group = new THREE.Group();
  const houses = [];
  const r2 = makeRngLocal(7);
  const litMats = [];
  for (let i = 0; i < count; i++) {
    const x = (r2() - 0.5) * size;
    const z = (r2() - 0.5) * size;
    const base = gradient * (slopeAxis === 'x' ? -x : -z);
    const y = y0 + base + Math.sin(x * 0.05) * 2 + Math.cos(z * 0.06) * 2;
    const s = 0.55 + r2() * 0.75;
    const h = makeStiltHouse({ stiltH: 1.4, seed: i, bamboo: r2() > 0.6 });
    h.position.set(x, y, z);
    h.rotation.y = r2() * Math.PI * 2;
    h.scale.setScalar(s);
    const lit = r2() < litP;
    h.userData.setLit(lit);
    group.add(h);
    houses.push(h);
    litMats.push(h.userData.windows);
  }
  group.userData.houses = houses;
  group.userData.setAllLit = (v, jitter = 0.9) => {
    houses.forEach(h => h.userData.setLit(v && Math.random() < jitter + 0.1));
  };
  return group;
}

/* ---------------- warm village light ribbon (points) ---------------- */
export function villageLights({ count = 1400, size = 240, y0 = 0, gradient = 0.35 } = {}) {
  const pos = [];
  const r2 = makeRngLocal(13);
  for (let i = 0; i < count; i++) {
    const x = (r2() - 0.5) * size;
    const z = (r2() - 0.5) * size;
    // denser band = the "ribbon of radiance"
    const band = Math.sin(x * 0.02 + z * 0.015) * 0.5 + 0.5;
    if (r2() > 0.35 + band * 0.6) continue;
    const y = y0 - gradient * x + Math.sin(x * 0.05) * 2 + Math.cos(z * 0.06) * 2 + rr(1.5, 4);
    pos.push(x, y, z);
  }
  return pointCloud(pos, { color: 0xffc47a, size: 1.7, opacity: 0.95, map: TEX.glow, additive: true });
}

/* ---------------- crowd of youths ---------------- */
export function makeCrowd(count, radius, center = [0, 0, 0], opts = {}) {
  const g = new THREE.Group();
  const palette = opts.palette || [0x4a5560, 0x5a4a42, 0x3d5a4a, 0x54485e, 0x64544a, 0x40505f];
  const r2 = makeRngLocal(opts.seed || 42);
  const figs = [];
  for (let i = 0; i < count; i++) {
    const a = r2() * Math.PI * 2;
    const r = Math.sqrt(r2()) * radius;
    const f = makeCrowdFigure(palette[i % palette.length]);
    f.position.set(center[0] + Math.cos(a) * r, center[1], center[2] + Math.sin(a) * r * (opts.zStretch || 1));
    f.rotation.y = Math.atan2(center[0] - f.position.x, center[2] - f.position.z) + rr(-0.5, 0.5);
    f.scale.setScalar(0.9 + r2() * 0.2);
    g.add(f);
    figs.push(f);
  }
  g.userData.figs = figs;
  return g;
}

/* ---------------- rocky shelf / cliff blocks ---------------- */
export function rockyBlocks({ count = 14, area = 40, y = 0, min = 1.5, max = 5, color = 0x6a6870 } = {}) {
  const tr = [];
  const r2 = makeRngLocal(31);
  for (let i = 0; i < count; i++) {
    const s = min + r2() * (max - min);
    tr.push({
      pos: [(r2() - 0.5) * area, y + s * 0.2, (r2() - 0.5) * area],
      rot: [r2() * 0.6, r2() * 6.28, r2() * 0.6],
      scale: [s * (0.7 + r2() * 0.7), s, s * (0.7 + r2() * 0.7)],
    });
  }
  const m = instanced(new THREE.IcosahedronGeometry(1, 1),
    new THREE.MeshStandardMaterial({ color, roughness: 0.95, flatShading: true, map: TEX.stone }), tr, true);
  return m;
}

/* ---------------- sect war banner ---------------- */
export function makeBanner(color = 0x6b2f2f, emblem = '道') {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 6.5, 6), new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9 }));
  pole.position.y = 3.25; pole.castShadow = true;
  g.add(pole);
  const clothTex = canvasTex('banner' + color + emblem, 128, 256, (c2, w, h) => {
    c2.fillStyle = '#' + new THREE.Color(color).getHexString();
    c2.fillRect(0, 0, w, h);
    c2.strokeStyle = 'rgba(216,180,106,.9)'; c2.lineWidth = 4;
    c2.strokeRect(8, 8, w - 16, h - 16);
    c2.fillStyle = 'rgba(240,225,190,.95)';
    c2.font = 'bold 64px serif';
    c2.textAlign = 'center';
    c2.fillText(emblem, w / 2, h / 2 + 20);
    // tatters
    c2.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 8; i++) c2.beginPath(), c2.arc(rr(0, w), rr(h * 0.7, h), rr(4, 14), 0, 7), c2.fill();
  });
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.6, 6, 10),
    new THREE.MeshStandardMaterial({ map: clothTex, side: THREE.DoubleSide, roughness: 0.95 }));
  cloth.position.set(1.1, 4.4, 0);
  cloth.castShadow = true;
  g.add(cloth);
  g.userData.cloth = cloth;
  return g;
}

/* ---------------- ground helper with material ---------------- */
export function ground(size, segs, heightFn, { color = 0x6f6d72, map = TEX.stone, y = 0, flat = false } = {}) {
  const geo = groundGeo(size, segs, heightFn);
  const mat = new THREE.MeshStandardMaterial({ color, map, roughness: 0.95, flatShading: flat });
  const m = new THREE.Mesh(geo, mat);
  m.position.y = y;
  m.receiveShadow = true; m.castShadow = false;
  return m;
}

/* ---------------- stone stairs descending ---------------- */
export function stoneStairs(from, to, steps = 24, width = 3) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ map: TEX.stone, color: 0xb8b6bc, roughness: 0.95 });
  const dir = new THREE.Vector3(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  const horiz = new THREE.Vector2(dir.x, dir.z);
  const len = horiz.length();
  const angle = Math.atan2(horiz.y, horiz.x);
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const st = new THREE.Mesh(new THREE.BoxGeometry(len / steps + 0.3, 0.5, width), mat);
    st.position.set(
      from[0] + dir.x * t, from[1] + dir.y * t, from[2] + dir.z * t,
    );
    st.rotation.y = -angle;
    st.receiveShadow = true; st.castShadow = true;
    g.add(st);
  }
  return g;
}

export { MAT };
