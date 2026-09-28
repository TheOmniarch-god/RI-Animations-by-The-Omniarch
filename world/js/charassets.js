// ============================================================
// charassets.js — GLB-first character pipeline
//
// Loads the main cast from the repository's characters/ archive
// (served at /characters/*.glb) and swaps them IN PLACE into the
// figure records the zones already built procedurally:
//   - zone code keeps owning record.group (position/rotation/visible)
//   - the procedural children stay in the graph, hidden (pose fallback)
//   - if the GLB carries animations, an idle action is auto-played
//
// Filename contract: characters/<id>.glb — drop a realistic (e.g.
// Meshy) export under that name and the world shows it automatically.
// ============================================================
import * as THREE from 'three';
import { GLTFLoader } from '../lib/jsm/loaders/GLTFLoader.js';

export const CHAR_URLS = {
  fang_yuan: 'characters/fang_yuan.glb',
  fang_zheng: 'characters/fang_zheng.glb',
  shen_cui: 'characters/shen_cui.glb',
  gu_yue_elder: 'characters/gu_yue_elder.glb',
};

export class CharStore {
  constructor() {
    this.loader = new GLTFLoader();
    this.status = 'idle';           // idle | loading | done
    this.ready = new Map();         // id -> { scene }
    this.swapped = new Map();       // id -> count
    this._registry = new Map();     // id -> Set<figureRecord>
  }

  /** start loading the whole archive (idempotent) */
  init() {
    if (this.status !== 'idle') return;
    this.status = 'loading';
    const jobs = Object.entries(CHAR_URLS).map(async ([id, url]) => {
      try {
        const gltf = await this.loader.loadAsync(url);
        this.ready.set(id, { scene: gltf.scene, anims: gltf.animations || [] });
        this._applyPending(id);
        console.info(`[charassets] ${id}: GLB loaded (${(gltf.animations || []).length} anims)`);
      } catch (e) {
        console.warn(`[charassets] ${id}: GLB load failed — procedural figure stays. ${e.message}`);
      }
    });
    Promise.allSettled(jobs).then(() => { this.status = 'done'; });
  }

  /** called by the figure factories whenever a named character is created */
  onCreated(id, record) {
    record._charId = id;
    let set = this._registry.get(id);
    if (!set) { set = new Set(); this._registry.set(id, set); }
    set.add(record);
    if (this.ready.has(id)) this._swap(record, this.ready.get(id), id);
  }

  _applyPending(id) {
    const asset = this.ready.get(id);
    const set = this._registry.get(id);
    if (set) set.forEach(rec => { if (!rec.isGLB) this._swap(rec, asset, id); });
  }

  /** replace the procedural contents of record.group with the GLB (fitted) */
  _swap(record, asset, id) {
    const g = record.group;
    if (g.children.some(c => c.userData.riGlbRoot)) return; // already swapped

    // target fit: match the procedural figure's world bbox (height + base + center)
    g.updateWorldMatrix(true, false);
    const pb = new THREE.Box3().setFromObject(g);
    const pc = pb.getCenter(new THREE.Vector3());
    const targetH = pb.max.y - pb.min.y;
    if (!(targetH > 0.1)) return;

    const proto = asset.scene;
    const ab = new THREE.Box3().setFromObject(proto);
    const protoH = (ab.max.y - ab.min.y) || 1;
    // account for the group's (world) scale so the fit lands correctly
    const ws = new THREE.Vector3().setFromMatrixColumn(g.matrixWorld, 0).length() || 1;
    const s = targetH / (protoH * ws);

    const wrap = new THREE.Group();
    wrap.userData.riGlbRoot = true;
    const inst = proto.clone(true);
    inst.scale.setScalar(s);
    wrap.add(inst);
    g.add(wrap);
    g.updateWorldMatrix(true, true);
    const wb = new THREE.Box3().setFromObject(wrap);   // world bbox of the placed wrap
    const wc = wb.getCenter(new THREE.Vector3());
    const delta = new THREE.Vector3(pc.x - wc.x, pb.min.y - wb.min.y, pc.z - wc.z);
    const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
    inv.elements[12] = 0; inv.elements[13] = 0; inv.elements[14] = 0; // linear part only (world→local translation)
    delta.applyMatrix4(inv);
    wrap.position.copy(delta);

    // hide the procedural children (kept in graph for pose-code safety)
    g.children.forEach(c => { if (!c.userData.riGlbRoot) c.visible = false; });
    g.add(wrap);

    // auto-play an idle animation if the GLB has any
    if (asset.anims && asset.anims.length) {
      const mixer = new THREE.AnimationMixer(inst);
      const clip = asset.anims.find(a => /idle|stand/i.test(a.name)) || asset.anims[0];
      mixer.clipAction(clip).play();
      record.mixer = mixer;
    }
    record.isGLB = true;
    record._lt = 0;
    const n = (this.swapped.get(id) || 0) + 1;
    this.swapped.set(id, n);
    console.info(`[charassets] swapped GLB into ${id} instance #${n}`);
  }
}

export const charStore = new CharStore();
