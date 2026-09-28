// ============================================================
// rig.js — cinematic camera rig: anchored beats + user offsets
// ============================================================
import * as THREE from 'three';
import { clamp, damp, lerp } from './util.js';

export class CameraRig {
  constructor(camera, dom) {
    this.cam = camera;
    this.dom = dom;

    this.basePos = new THREE.Vector3(0, 10, 30);
    this.baseLook = new THREE.Vector3(0, 4, 0);
    this.tgtPos = this.basePos.clone();
    this.tgtLook = this.baseLook.clone();
    this.fov = 55; this.tgtFov = 55;

    this.yaw = 0; this.pitch = 0; this.dist = 1;
    this.shakeAmp = 0; this.shakeT = 0;
    this.enabled = true;

    this._drag = null;
    dom.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
      this._drag = { x: e.clientX, y: e.clientY };
      dom.setPointerCapture?.(e.pointerId);
    });
    dom.addEventListener('pointermove', (e) => {
      if (!this._drag || !this.enabled) return;
      const dx = e.clientX - this._drag.x, dy = e.clientY - this._drag.y;
      this._drag.x = e.clientX; this._drag.y = e.clientY;
      this.yaw -= dx * 0.0034;
      this.pitch = clamp(this.pitch - dy * 0.0028, -0.6, 0.6);
    });
    const end = () => { this._drag = null; };
    dom.addEventListener('pointerup', end);
    dom.addEventListener('pointercancel', end);
    dom.addEventListener('wheel', (e) => {
      if (!this.enabled) return;
      e.preventDefault();
      this.dist = clamp(this.dist * (1 + e.deltaY * 0.0009), 0.4, 4.5);
    }, { passive: false });
    dom.addEventListener('dblclick', () => { this.yaw = 0; this.pitch = 0; this.dist = 1; });
  }

  setAnchor({ pos, look, fov = 55 }, instant = false) {
    this.tgtPos.set(...pos);
    this.tgtLook.set(...look);
    this.tgtFov = fov;
    if (instant) {
      this.basePos.copy(this.tgtPos);
      this.baseLook.copy(this.tgtLook);
      this.fov = this.tgtFov;
      this.yaw = 0; this.pitch = 0; this.dist = 1;
    }
  }

  shake(amp = 0.6, dur = 1.2) { this.shakeAmp = Math.max(this.shakeAmp, amp); this.shakeDur = dur; this.shakeT = 0; }

  update(dt) {
    const L1 = window.__snap ? 60 : 1.6;
    const L2 = window.__snap ? 60 : 2.1;
    this.basePos.x = damp(this.basePos.x, this.tgtPos.x, L1, dt);
    this.basePos.y = damp(this.basePos.y, this.tgtPos.y, L1, dt);
    this.basePos.z = damp(this.basePos.z, this.tgtPos.z, L1, dt);
    this.baseLook.x = damp(this.baseLook.x, this.tgtLook.x, L2, dt);
    this.baseLook.y = damp(this.baseLook.y, this.tgtLook.y, L2, dt);
    this.baseLook.z = damp(this.baseLook.z, this.tgtLook.z, L2, dt);
    this.fov = damp(this.fov, this.tgtFov, L1, dt);

    // orbit offset around the look target
    const off = this._off || (this._off = new THREE.Vector3());
    off.copy(this.basePos).sub(this.baseLook);
    const sph = this._sph || (this._sph = new THREE.Spherical());
    sph.setFromVector3(off);
    sph.theta += this.yaw;
    sph.phi = clamp(sph.phi - this.pitch, 0.15, Math.PI - 0.15);
    sph.radius *= this.dist;
    off.setFromSpherical(sph);

    const pos = this._p || (this._p = new THREE.Vector3());
    pos.copy(this.baseLook).add(off);

    // camera shake
    if (this.shakeAmp > 0.001) {
      this.shakeT += dt;
      const k = Math.max(0, 1 - this.shakeT / (this.shakeDur || 1.2));
      const a = this.shakeAmp * k * k;
      pos.x += (Math.random() - 0.5) * a;
      pos.y += (Math.random() - 0.5) * a;
      pos.z += (Math.random() - 0.5) * a;
      if (this.shakeT > (this.shakeDur || 1.2)) this.shakeAmp = 0;
    }

    this.cam.position.copy(pos);
    this.cam.lookAt(this.baseLook);
    if (Math.abs(this.cam.fov - this.fov) > 0.01) {
      this.cam.fov = this.fov;
      this.cam.updateProjectionMatrix();
    }
  }
}
