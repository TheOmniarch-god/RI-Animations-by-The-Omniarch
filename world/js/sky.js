// ============================================================
// sky.js — shader sky dome, cloud sea, distant peaks
// ============================================================
import * as THREE from 'three';
import { rng, rr, TEX, fbm } from './util.js';

export const SKY_VERT = /* glsl */`
  varying vec3 vDir;
  void main(){
    vDir = position;
    vec4 mv = modelViewMatrix * vec4(position,1.0);
    gl_Position = projectionMatrix * mv;
    gl_Position.z = gl_Position.w; // push to far plane
  }
`;
export const SKY_FRAG = /* glsl */`
  precision highp float;
  varying vec3 vDir;
  uniform vec3 uTop, uMid, uBot;
  uniform vec3 uSunDir, uSunColor;
  uniform float uSunSize, uSunI, uStars, uTime;

  float hash(vec3 p){
    p = fract(p*0.3183099+vec3(0.71,0.113,0.419));
    p *= 17.0;
    return fract(p.x*p.y*p.z*(p.x+p.y+p.z));
  }
  void main(){
    vec3 d = normalize(vDir);
    float h = clamp(d.y*0.5+0.5, 0.0, 1.0);
    // 3-stop gradient
    vec3 col = mix(uBot, uMid, smoothstep(0.42, 0.55, h));
    col = mix(col, uTop, smoothstep(0.55, 0.78, h));

    // sun disc + halo
    float sd = max(dot(d, normalize(uSunDir)), 0.0);
    float disc = smoothstep(cos(uSunSize), cos(uSunSize*0.55), sd);
    float halo = pow(sd, 18.0)*0.7 + pow(sd, 4.0)*0.24;
    col += uSunColor * (disc*1.6 + halo) * uSunI;

    // stars
    if(uStars > 0.001 && d.y > -0.05){
      vec3 sp = floor(d*230.0);
      float s = hash(sp);
      float star = step(0.994, s);
      float tw = 0.6 + 0.4*sin(uTime*(2.0+s*4.0)+s*40.0);
      col += vec3(0.9,0.95,1.0)*star*tw*uStars*smoothstep(0.0,0.25,d.y);
    }
    gl_FragColor = vec4(col,1.0);
  }
`;

export function createSky() {
  const uniforms = {
    uTop: { value: new THREE.Color(0x0a1428) },
    uMid: { value: new THREE.Color(0x54324a) },
    uBot: { value: new THREE.Color(0xc46a34) },
    uSunDir: { value: new THREE.Vector3(-1, 0.12, -0.35).normalize() },
    uSunColor: { value: new THREE.Color(0xffc48a) },
    uSunSize: { value: 0.035 },
    uSunI: { value: 1.0 },
    uStars: { value: 0.0 },
    uTime: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  // keep dome centred on camera
  mesh.onBeforeRender = (r, s, cam) => { mesh.position.copy(cam.position); };
  return { mesh, uniforms };
}

/** drifting billboard cloud sea below the world */
export function createCloudSea(count = 90, spread = 420, y = -26) {
  const group = new THREE.Group();
  const tex = TEX.cloud;
  for (let i = 0; i < count; i++) {
    const m = new THREE.SpriteMaterial({
      map: tex, transparent: true, depthWrite: false,
      opacity: rr(0.24, 0.62),
      color: new THREE.Color().setHSL(rr(0.58, 0.65), 0.15, rr(0.72, 0.95)),
      blending: THREE.NormalBlending,
    });
    const s = new THREE.Sprite(m);
    const a = rr(0, Math.PI * 2), r = Math.sqrt(rng()) * spread;
    s.position.set(Math.cos(a) * r, y + rr(-14, 16), Math.sin(a) * r);
    s.scale.set(rr(60, 150), rr(24, 55), 1);
    s.userData.drift = rr(0.4, 1.6);
    s.userData.baseX = s.position.x;
    group.add(s);
  }
  group.userData.update = (t) => {
    group.children.forEach((s, i) => {
      s.position.x = s.userData.baseX + Math.sin(t * 0.03 * s.userData.drift + i) * 18;
    });
  };
  return group;
}

/** far silhouette peaks ringing the world */
export function createDistantPeaks(count = 22, spread = 500) {
  const group = new THREE.Group();
  const mats = [
    new THREE.MeshBasicMaterial({ color: 0x11151f, fog: true }),
    new THREE.MeshBasicMaterial({ color: 0x171d2b, fog: true }),
    new THREE.MeshBasicMaterial({ color: 0x1d2536, fog: true }),
  ];
  const ring = (n, rad, hMin, hMax, wMin, wMax, yOff, matOff) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rr(-0.12, 0.12);
      const r = rad + rr(-70, 130);
      const h = rr(hMin, hMax), w = rr(wMin, wMax);
      const seed = rr(0, 9);
      const geo = new THREE.ConeGeometry(w, h, 9, 4, false);
      const p = geo.attributes.position;
      const v = new THREE.Vector3();
      for (let k = 0; k < p.count; k++) {
        v.fromBufferAttribute(p, k);
        const ang = Math.atan2(v.z, v.x);
        const t = (v.y + h / 2) / h;
        const nz = fbm(Math.cos(ang) * 2.2 + seed, Math.sin(ang) * 2.2 + t * 3.5, 4);
        const bulge = 1 + (nz - 0.5) * 0.85 * (1 - t * 0.35);
        v.x *= bulge; v.z *= bulge;
        v.y += (nz - 0.5) * h * 0.08 * (1 - t);
        p.setXYZ(k, v.x, v.y, v.z);
      }
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, mats[(i + matOff) % 3]);
      m.position.set(Math.cos(a) * r, yOff + h * 0.32, Math.sin(a) * r);
      m.rotation.y = rr(0, 6);
      group.add(m);
    }
  };
  // far silhouette ring + nearer inner ring for parallax depth
  ring(count, spread, 90, 240, 60, 150, -40, 0);
  ring(Math.round(count * 0.7), spread * 0.72, 60, 150, 50, 110, -36, 1);
  return group;
}

/** a single hero peak massif with jagged rocks — reusable */
export function createPeak(radius, height, color = 0x5c5a60, rockDetail = 2) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.94, metalness: 0.02, flatShading: true });
  const body = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 10, 4, false), mat);
  body.position.y = height * 0.5;
  body.castShadow = body.receiveShadow = true;
  g.add(body);
  return { group: g, mat };
}
