// ============================================================
// fx.js — particles & visual effects (all shader-driven)
// ============================================================
import * as THREE from 'three';
import { rng, rr, TEX, pointCloud, glowSprite } from './util.js';

/* ---------------- RAIN (line streaks) ---------------- */
export function createRain({ count = 2600, area = 70, height = 40, color = 0x9fb8d0, opacity = 0.5, len = 0.55, wind = 0.6 } = {}) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 2 * 3);
  const tip = new Float32Array(count * 2);
  const rnd = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const x = rr(-area / 2, area / 2), y = rr(0, height), z = rr(-area / 2, area / 2);
    const s = rr(0.4, 1);
    pos.set([x, y, z], i * 6);
    pos.set([x, y, z], i * 6 + 3);
    tip[i * 2] = 0; tip[i * 2 + 1] = 1;
    rnd[i * 2] = s; rnd[i * 2 + 1] = s;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aTip', new THREE.BufferAttribute(tip, 1));
  geo.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 1));
  const uniforms = {
    uTime: { value: 0 }, uH: { value: height },
    uCenter: { value: new THREE.Vector3() },
    uColor: { value: new THREE.Color(color) },
    uOpacity: { value: opacity }, uLen: { value: len },
    uWind: { value: wind }, uArea: { value: area },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aTip, aRnd;
      uniform float uTime,uH,uLen,uWind,uArea;
      uniform vec3 uCenter;
      varying float vFade;
      void main(){
        float speed = (14.0 + aRnd*10.0);
        float y = mod(position.y - uTime*speed, uH);
        vec3 p = vec3(position.x + uCenter.x, y + uCenter.y - uH*0.5, position.z + uCenter.z);
        // slant with wind
        float drop = y;
        p.x += uWind * (uH - y) * 0.06;
        if(aTip > 0.5){ p.y -= uLen*(0.6+aRnd); p.x += uWind*uLen*0.35; }
        vFade = smoothstep(0.0, 4.0, y) * (0.5 + 0.5*aRnd);
        vec4 mv = modelViewMatrix * vec4(p,1.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; uniform float uOpacity;
      varying float vFade;
      void main(){ gl_FragColor = vec4(uColor, uOpacity*vFade); }`,
  });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  lines.userData.update = (t, camPos) => {
    uniforms.uTime.value = t;
    if (camPos) uniforms.uCenter.value.set(0, 0, 0), uniforms.uH.value = height; // center baked as offset 0
  };
  lines.userData.uniforms = uniforms;
  lines.userData.setOpacity = (v) => { uniforms.uOpacity.value = v; };
  return lines;
}

/* ---------------- generic twinkle drift points ---------------- */
export function createDriftPoints(positions, {
  color = 0xffd9a0, size = 1.2, opacity = 0.9, amp = 1.2, speed = 0.4,
  twinkle = 1.0, map = null, additive = true, area = 0,
} = {}) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const n = positions.length / 3;
  const phase = new Float32Array(n);
  for (let i = 0; i < n; i++) phase[i] = rr(0, Math.PI * 2);
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  const uniforms = {
    uTime: { value: 0 }, uSize: { value: size }, uColor: { value: new THREE.Color(color) },
    uOpacity: { value: opacity }, uAmp: { value: amp }, uSpeed: { value: speed },
    uTw: { value: twinkle }, uMap: { value: map },
    uHasMap: { value: map ? 1 : 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    vertexShader: /* glsl */`
      attribute float aPhase;
      uniform float uTime,uSize,uAmp,uSpeed,uTw;
      varying float vTw; varying float vPh;
      void main(){
        vec3 p = position;
        p.x += sin(uTime*uSpeed + aPhase)*uAmp;
        p.y += sin(uTime*uSpeed*0.7 + aPhase*1.7)*uAmp*0.55;
        p.z += cos(uTime*uSpeed*0.9 + aPhase*2.3)*uAmp;
        vTw = 0.55 + 0.45*sin(uTime*2.2*uTw + aPhase*7.0);
        vPh = aPhase;
        vec4 mv = modelViewMatrix * vec4(p,1.0);
        gl_PointSize = uSize * (240.0 / max(1.0,-mv.z));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; uniform float uOpacity,uHasMap;
      uniform sampler2D uMap;
      varying float vTw;
      void main(){
        float a = 1.0;
        if(uHasMap > 0.5){ a = texture2D(uMap, gl_PointCoord).a; if(a<0.02) discard; }
        else {
          float d = length(gl_PointCoord - 0.5);
          a = smoothstep(0.5, 0.06, d);
        }
        gl_FragColor = vec4(uColor, a*uOpacity*vTw);
      }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.userData.uniforms = uniforms;
  pts.userData.update = (t) => { uniforms.uTime.value = t; };
  pts.userData.setOpacity = (v) => { uniforms.uOpacity.value = v; };
  return pts;
}

/* ---------------- HOPE GU stream (flowers → body) ---------------- */
export function createHopeStream({ count = 900, target = new THREE.Vector3(), sources = [], color = 0xf8f4e0, size = 2.6 } = {}) {
  const geo = new THREE.BufferGeometry();
  const from = new Float32Array(count * 3);
  const to = new Float32Array(count * 3);
  const delay = new Float32Array(count);
  const spd = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const s = sources.length ? sources[i % sources.length] : [rr(-8, 8), rr(0.1, 0.4), rr(-8, 8)];
    from.set(s, i * 3);
    to.set([target.x + rr(-0.12, 0.12), target.y + rr(-0.1, 0.1), target.z + rr(-0.12, 0.12)], i * 3);
    delay[i] = rr(0, 1);
    spd[i] = rr(0.35, 0.75);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(from.slice(), 3)); // dummy
  geo.setAttribute('aFrom', new THREE.BufferAttribute(from, 3));
  geo.setAttribute('aTo', new THREE.BufferAttribute(to, 3));
  geo.setAttribute('aDelay', new THREE.BufferAttribute(delay, 1));
  geo.setAttribute('aSpd', new THREE.BufferAttribute(spd, 1));
  const uniforms = {
    uTime: { value: 0 }, uActive: { value: 1 }, uColor: { value: new THREE.Color(color) },
    uSize: { value: size }, uSuck: { value: 1 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute vec3 aFrom,aTo; attribute float aDelay,aSpd;
      uniform float uTime,uActive,uSize;
      varying float vA;
      void main(){
        float t = fract(uTime*aSpd*0.5 + aDelay);
        float e = t*t*(3.0-2.0*t);
        vec3 p = mix(aFrom,aTo,e);
        // slight arc
        p.y += sin(e*3.14159)*(0.6+aDelay);
        p.x += sin(uTime*2.0+aDelay*20.0)*0.12;
        vA = uActive * (0.35 + 0.65*sin(t*3.14159));
        vec4 mv = modelViewMatrix * vec4(p,1.0);
        gl_PointSize = uSize*(240.0/max(1.0,-mv.z))*(0.6+0.4*vA);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; varying float vA;
      void main(){
        float d = length(gl_PointCoord-0.5);
        float a = smoothstep(0.5,0.04,d);
        gl_FragColor = vec4(uColor, a*vA);
      }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.userData.uniforms = uniforms;
  pts.userData.update = (t) => { uniforms.uTime.value = t; };
  pts.userData.setActive = (v) => { uniforms.uActive.value = v; };
  return pts;
}

/* ---------------- expanding shock rings ---------------- */
export class ShockRings {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.pool = [];
    this.max = opts.max || 6;
    this.color = opts.color ?? 0xffe9c0;
    this.speed = opts.speed ?? 26;
    this.growth = opts.growth ?? 40;
    for (let i = 0; i < this.max; i++) {
      const m = new THREE.Mesh(
        new THREE.RingGeometry(0.92, 1, 72),
        new THREE.MeshBasicMaterial({ color: this.color, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      m.visible = false;
      scene.add(m);
      this.pool.push({ mesh: m, life: 0, dur: 1 });
    }
    this.i = 0;
  }
  spawn(pos, { normal = new THREE.Vector3(0, 1, 0), dur = 1.6, scale = 60, color = null } = {}) {
    const r = this.pool[this.i % this.pool.length];
    this.i++;
    r.mesh.position.copy(pos);
    r.mesh.lookAt(pos.clone().add(normal));
    r.life = 0; r.dur = dur; r.scale = scale;
    r.mesh.visible = true;
    if (color != null) r.mesh.material.color.set(color);
    else r.mesh.material.color.set(this.color);
  }
  update(dt) {
    this.pool.forEach(r => {
      if (!r.mesh.visible) return;
      r.life += dt;
      const t = r.life / r.dur;
      if (t >= 1) { r.mesh.visible = false; return; }
      const s = 0.5 + t * (r.scale || 60);
      r.mesh.scale.setScalar(s);
      r.mesh.material.opacity = (1 - t) * (1 - t) * 0.55;
    });
  }
}

/* ---------------- one-shot particle burst ---------------- */
export class Burst {
  constructor(scene, { count = 260, color = 0xffc070, size = 1.4, gravity = 14, drag = 0.6 } = {}) {
    this.n = count;
    this.pos = new Float32Array(count * 3);
    this.vel = new Float32Array(count * 3);
    this.life = new Float32Array(count);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.mat = new THREE.PointsMaterial({
      color, size, transparent: true, opacity: 1, depthWrite: false,
      blending: THREE.AdditiveBlending, map: TEX.glow, sizeAttenuation: true,
    });
    this.pts = new THREE.Points(this.geo, this.mat);
    this.pts.frustumCulled = false;
    this.pts.visible = false;
    scene.add(this.pts);
    this.gravity = gravity; this.drag = drag;
    this.active = false;
    this.age = 0; this.dur = 3;
  }
  fire(origin, { speed = 18, dur = 3, spread = 1, up = 0.5 } = {}) {
    for (let i = 0; i < this.n; i++) {
      this.pos.set([origin.x, origin.y, origin.z], i * 3);
      const a = rr(0, Math.PI * 2), b = rr(-1, 1);
      const sp = speed * rr(0.3, 1.3) * spread;
      const r = Math.sqrt(1 - b * b);
      this.vel.set([Math.cos(a) * r * sp, Math.abs(b) * sp * up + rr(0, speed * 0.4), Math.sin(a) * r * sp], i * 3);
      this.life[i] = rr(0.2, 1);
    }
    this.geo.attributes.position.needsUpdate = true;
    this.pts.visible = true;
    this.active = true; this.age = 0; this.dur = dur;
    this.mat.opacity = 1;
  }
  update(dt) {
    if (!this.active) return;
    this.age += dt;
    let alive = 0;
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.pos[i * 3 + 1] = -9999; continue; }
      alive++;
      const k = Math.exp(-this.drag * dt);
      this.vel[i * 3] *= k; this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * k - this.gravity * dt; this.vel[i * 3 + 2] *= k;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
    }
    this.geo.attributes.position.needsUpdate = true;
    const t = this.age / this.dur;
    this.mat.opacity = Math.max(0, 1 - t);
    if (t >= 1 || alive === 0) { this.active = false; this.pts.visible = false; }
  }
}

/* ---------------- light shaft (fake god ray) ---------------- */
const shaftTex = (() => {
  let cached = null;
  return () => {
    if (cached) return cached;
    const c = document.createElement('canvas');
    c.width = 64; c.height = 256;
    const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, 'rgba(255,255,255,.9)');
    grd.addColorStop(0.7, 'rgba(255,255,255,.25)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 256);
    // horizontal soft mask
    const g2 = g.createLinearGradient(0, 0, 64, 0);
    g2.addColorStop(0, 'rgba(0,0,0,1)');
    g2.addColorStop(0.5, 'rgba(0,0,0,0)');
    g2.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = g2; g.fillRect(0, 0, 64, 256);
    cached = new THREE.CanvasTexture(c);
    return cached;
  };
})();

export function lightShaft(color = 0xffffff, w = 4, h = 20, opacity = 0.3) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({
      map: shaftTex(), color, transparent: true, opacity,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    })
  );
  return m;
}

/* ---------------- fire embers column ---------------- */
export function createEmbers(count = 160, area = 14, height = 16) {
  const pos = [];
  for (let i = 0; i < count; i++) pos.push(rr(-area, area), rr(0, height), rr(-area, area));
  const pts = createDriftPoints(pos, {
    color: 0xff9a4a, size: 1.6, opacity: 0.9, amp: 1.4, speed: 0.5, twinkle: 2.4, map: TEX.glow,
  });
  return pts;
}

/* ---------------- pressure ripple rings (aptitude field) ---------------- */
export class RippleField {
  constructor(scene, center, { count = 5, radius = 9, color = 0x9fd6ff, y = 0.05 } = {}) {
    this.rings = [];
    this.t = 0;
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(
        new THREE.RingGeometry(0.96, 1, 80),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      m.rotation.x = -Math.PI / 2;
      m.position.copy(center); m.position.y = (y || 0) + 0.02 + i * 0.01;
      scene.add(m);
      this.rings.push({ m, off: i / count });
    }
    this.radius = radius;
    this.opacity = 1;
  }
  update(dt) {
    this.t += dt;
    this.rings.forEach(r => {
      const p = (this.t * 0.35 + r.off) % 1;
      const s = 0.3 + p * this.radius;
      r.m.scale.setScalar(s);
      r.m.material.opacity = (1 - p) * 0.22 * this.opacity;
    });
  }
}

/* ---------------- glowing rune/seal circle ---------------- */
export function runeCircle(radius = 3, color = 0xd8b46a, opacity = 0.5) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 512, 512);
  g.strokeStyle = 'rgba(255,255,255,1)';
  g.lineWidth = 3;
  g.beginPath(); g.arc(256, 256, 230, 0, 7); g.stroke();
  g.lineWidth = 1.5;
  g.beginPath(); g.arc(256, 256, 210, 0, 7); g.stroke();
  g.beginPath(); g.arc(256, 256, 140, 0, 7); g.stroke();
  // tick marks
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const r1 = 218, r2 = i % 6 === 0 ? 200 : 210;
    g.beginPath();
    g.moveTo(256 + Math.cos(a) * r1, 256 + Math.sin(a) * r1);
    g.lineTo(256 + Math.cos(a) * r2, 256 + Math.sin(a) * r2);
    g.stroke();
  }
  // pseudo-glyphs
  g.font = '26px serif';
  g.fillStyle = 'rgba(255,255,255,.95)';
  const glyphs = '道天地人命运风水雷山泽火冰心神魂气精血';
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    g.save();
    g.translate(256 + Math.cos(a) * 175, 256 + Math.sin(a) * 175);
    g.rotate(a + Math.PI / 2);
    g.fillText(glyphs[i % glyphs.length], -13, 9);
    g.restore();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 64),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, color })
  );
  m.rotation.x = -Math.PI / 2;
  return m;
}

/* ---------------- vertical fog cards ---------------- */
export function fogBank(w, h, opacity = 0.4, color = 0xbfc8d8) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: TEX.cloud, color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide })
  );
  return m;
}
