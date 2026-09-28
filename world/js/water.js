// ============================================================
// water.js — glowing river / flow-field shaders
// ============================================================
import * as THREE from 'three';
import { ribbonGeo } from './util.js';

const FLOW_FRAG = /* glsl */`
  precision highp float;
  varying vec2 vUv;
  uniform float uTime, uFlow, uSparkle, uOpacity;
  uniform vec3 uColA, uColB, uColGlow;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p){
    vec2 i=floor(p), f=fract(p);
    vec2 u=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),
               mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
  }
  float fbm(vec2 p){
    float s=0.0,a=0.5;
    for(int i=0;i<4;i++){ s+=a*noise(p); p*=2.03; a*=0.5; }
    return s;
  }
  void main(){
    vec2 uv = vUv;
    // flow along u — negative uFlow = upstream against reading direction
    float t = uTime*uFlow;
    float n1 = fbm(vec2(uv.x*40.0 - t*6.0, uv.y*7.0));
    float n2 = fbm(vec2(uv.x*90.0 - t*11.0, uv.y*16.0 + 4.7));
    float wave = n1*0.65 + n2*0.35;

    vec3 col = mix(uColA, uColB, wave);
    // caustic glow lines
    float caust = smoothstep(0.62, 0.9, fbm(vec2(uv.x*70.0 - t*9.0, uv.y*11.0+2.2)));
    col += uColGlow * caust * 0.9;

    // sparkles (the "river of stars")
    float sp = step(1.0 - uSparkle, hash(floor(vec2(uv.x*300.0 - t*40.0, uv.y*60.0))));
    float twk = 0.5 + 0.5*sin(uTime*8.0 + hash(floor(uv*40.0))*40.0);
    col += vec3(0.9,0.97,1.0)*sp*twk*1.4;

    // edge brightening / fade
    float edge = smoothstep(0.0,0.14,uv.y)*smoothstep(1.0,0.86,uv.y);
    float alpha = (0.55 + 0.45*wave) * mix(0.35,1.0,edge) * uOpacity;
    gl_FragColor = vec4(col, alpha);
  }
`;

const FLOW_VERT = /* glsl */`
  varying vec2 vUv;
  void main(){
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
  }
`;

export function flowMaterial({
  colA = 0x071428, colB = 0x0e3a5e, colGlow = 0x3fa8ff,
  flow = 1, sparkle = 0.985, opacity = 1, side = THREE.DoubleSide,
} = {}) {
  const uniforms = {
    uTime: { value: 0 }, uFlow: { value: flow }, uSparkle: { value: sparkle },
    uOpacity: { value: opacity },
    uColA: { value: new THREE.Color(colA) },
    uColB: { value: new THREE.Color(colB) },
    uColGlow: { value: new THREE.Color(colGlow) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, vertexShader: FLOW_VERT, fragmentShader: FLOW_FRAG,
    transparent: true, depthWrite: false, side,
  });
  return mat;
}

/** flat glowing underground river (plane, XZ) */
export function createFlowPlane(w, d, opts = {}) {
  const mat = flowMaterial(opts);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d, 1, 1), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.userData.update = (t) => { mat.uniforms.uTime.value = t; };
  return mesh;
}

/** helical / curving ribbon (River of Time) */
export function createFlowRibbon(curve, width, opts = {}, uSegs = 320) {
  const geo = ribbonGeo(curve, width, uSegs, 6, opts.twist || 0);
  const mat = flowMaterial(opts);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.update = (t) => { mat.uniforms.uTime.value = t; };
  return mesh;
}

/** sample points along a curve — for particle rivers */
export function curvePoints(curve, count) {
  const out = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    curve.getPointAt(i / count, v);
    out.push(v.x, v.y, v.z);
  }
  return out;
}
