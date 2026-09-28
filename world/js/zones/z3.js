// ============================================================
// z3.js — Chapter 3: Kindly Piss Off — fifth watch, morning
// wash, the walk with the whispering youths, and the dawn
// that answers a demon's contempt.
// ============================================================
import * as THREE from 'three';
import { rr, fbm, TEX, glowSprite } from '../util.js';
import { createDriftPoints, ShockRings } from '../fx.js';
import {
  makeFangYuan, makeFangZheng, makeMaid, makeCrowdFigure, animateFigure, makeFigure,
} from '../figures.js';
import { makeStiltHouse } from './common.js';
import { makeLantern, makeBasin, makeClapper } from '../figures.js';

const C = [2400, 0, 0];
const w = (p, l, fov) => ({ pos: [p[0] + C[0], p[1] + C[1], p[2] + C[2]], look: [l[0] + C[0], l[1] + C[1], l[2] + C[2]], fov });
const W = (p) => [p[0] + C[0], p[1] + C[1], p[2] + C[2]];

const pathX = (z) => 12 * Math.sin(z * 0.05);
const H = (x, z) => {
  const dx = x - pathX(z);
  const ridge = 9 * Math.exp(-(dx * dx) / 460);
  const n = fbm(x * 0.045 + 9, z * 0.045 - 4, 4) * 2.6;
  const edge = -Math.max(0, Math.abs(x) - 62) * 0.45;
  return ridge + n + edge - 2;
};

export const zone3 = {
  id: 'z3',
  center: C,

  build(ctx) {
    const g = this.group = new THREE.Group();
    g.position.set(...C);
    ctx.scene.add(g);
    const refs = this.refs = {};

    /* ============ RIDGE & PATH ============ */
    const terrain = new THREE.Mesh(
      groundGeo2(230, 200, 70, H),
      new THREE.MeshStandardMaterial({ color: 0x5f6a58, map: TEX.stone, roughness: 0.97 }),
    );
    terrain.receiveShadow = true;
    g.add(terrain);

    // packed-earth path ribbon
    const pathGeo = new THREE.PlaneGeometry(5.4, 150, 4, 90);
    pathGeo.rotateX(-Math.PI / 2);
    {
      const p = pathGeo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const z = p.getZ(i);
        const x = p.getX(i) + pathX(z);
        p.setX(i, x);
        p.setY(i, H(x, z) + 0.12);
      }
      pathGeo.computeVertexNormals();
    }
    const path = new THREE.Mesh(pathGeo, new THREE.MeshStandardMaterial({
      color: 0x8a7a5e, map: TEX.stone, roughness: 1,
    }));
    path.receiveShadow = true;
    g.add(path);

    /* ============ HOUSES ALONG THE PATH ============ */
    const houseLitMats = [];
    const housesG = new THREE.Group();
    g.add(housesG);
    for (let i = 0; i < 30; i++) {
      const z = -70 + i * 5 + rr(-2, 2);
      const side = i % 2 === 0 ? 1 : -1;
      const off = rr(11, 26) * side;
      const x = pathX(z) + off;
      const h = makeStiltHouse({ stiltH: rr(1.6, 3.2), bamboo: rr(0, 1) > 0.5 });
      h.position.set(x, H(x, z) + rr(0.05, 0.4), z);
      h.rotation.y = (side > 0 ? -Math.PI / 2 : Math.PI / 2) + rr(-0.4, 0.4);
      h.scale.setScalar(rr(0.85, 1.35));
      housesG.add(h);
      houseLitMats.push(h.userData.windows);
      h.userData.setLit(true);
    }
    refs.houseLitMats = houseLitMats;

    /* ============ LANTERN POSTS ============ */
    refs.lanterns = [];
    for (let z = -64; z < 70; z += 11) {
      const side = (z / 11) % 2 ? 1 : -1;
      const x = pathX(z) + 3.6 * side;
      const post = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.1, 6),
        new THREE.MeshStandardMaterial({ color: 0x3a2c1e, roughness: 0.9 }));
      pole.position.y = 1.55; pole.castShadow = true;
      post.add(pole);
      const lan = makeLantern(0xffb45e, 1);
      lan.position.y = 3.0;
      post.add(lan);
      post.position.set(x, H(x, z), z);
      g.add(post);
      refs.lanterns.push(lan);
    }

    /* ============ FANG HOUSE (porch, stairs) ============ */
    const hz = -44, hx = pathX(hz) + 17;
    const hy = H(hx, hz);
    this._hx = hx; this._hy = hy; this._hz = hz;
    const STILT = 3.4 * 1.5;
    this.STILT = STILT;
    const fangHouse = makeStiltHouse({ stiltH: 3.4, bamboo: false });
    fangHouse.position.set(hx, hy + STILT, hz);
    fangHouse.rotation.y = -Math.PI / 2 + 0.25;
    fangHouse.scale.setScalar(1.5);
    fangHouse.userData.setLit(true);
    g.add(fangHouse);
    // porch deck toward path
    const porch = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.3, 4.6),
      new THREE.MeshStandardMaterial({ map: TEX.wood, roughness: 0.9 }));
    porch.position.set(hx - 4.4, hy + STILT + 0.06, hz + 1);
    porch.receiveShadow = true;
    g.add(porch);
    // stairs down to path
    for (let i = 0; i < 7; i++) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 0.75),
        new THREE.MeshStandardMaterial({ map: TEX.wood, roughness: 0.9 }));
      st.position.set(hx - 6.4 - i * 0.62, hy + STILT - 0.15 - i * 0.8, hz + 1 + i * 0.18);
      g.add(st);
    }
    // warm doorway glow
    const doorGlow = glowSprite(0xffb45e, 5, 0.55);
    doorGlow.position.set(hx - 2.2, hy + STILT + 1.6, hz + 1);
    g.add(doorGlow);
    // cool fill so Shen Cui and the basin read before sunrise
    const washFill = new THREE.PointLight(0xbcd4ff, 130, 14, 1.5);
    washFill.position.set(hx - 6.5, hy + STILT + 2.4, hz - 1.5);
    g.add(washFill);

    /* Shen Cui on the porch with the basin */
    const sc = makeMaid();
    sc.group.position.set(hx - 4.6, hy + STILT + 0.2, hz + 0.2);
    sc.group.rotation.y = -1.2;
    sc.setPose('curtsy');
    g.add(sc.group);
    refs.sc = sc;
    const basin = makeBasin();
    basin.position.set(hx - 5.5, hy + STILT + 0.85, hz - 0.4);
    g.add(basin);

    /* ============ NIGHT WATCHMAN ============ */
    const wz = -58, wx = pathX(wz) + 3.2;
    const wy = H(wx, wz);
    const watch = makeFigure({ robe: 0x33404e, trim: 0x22303c, sash: 0x2a2a30, hair: 'bun', scale: 1.0 });
    watch.group.position.set(wx, wy, wz);
    watch.group.rotation.y = 0.7;
    watch.setPose('stand');
    const clap = makeClapper();
    clap.position.set(0, -0.45, 0.14);
    watch.parts.arms[1].add(clap);
    g.add(watch.group);
    refs.watch = watch;
    refs.clapperRings = new ShockRings(g, { color: 0xffd9a0, max: 5 });
    refs.clapT = 0;

    /* ============ WALKERS ============ */
    const fy = makeFangYuan();
    g.add(fy.group);
    refs.fy = fy;
    const fz = makeFangZheng();
    g.add(fz.group);
    refs.fz = fz;

    /* whispering youths in twos and threes */
    const clusters = [];
    const clusterPos = [[-30, 7], [-30, -9], [-18, 11], [-6, -8], [2, 9], [-46, -6]];
    clusterPos.forEach(([z, off], ci) => {
      const x = pathX(z) + off;
      const n = 2 + (ci % 2);
      const grp = new THREE.Group();
      for (let i = 0; i < n; i++) {
        const f = makeCrowdFigure([0x4a5560, 0x5a4a42, 0x3d5a4a, 0x54485e][ci % 4]);
        f.position.set(rr(-1.6, 1.6), 0, rr(-1.6, 1.6));
        f.rotation.y = Math.atan2(-f.position.x, -f.position.z) + rr(-0.4, 0.4);
        grp.add(f);
      }
      grp.position.set(x, H(x, z), z);
      g.add(grp);
      clusters.push(grp);
    });
    refs.clusters = clusters;

    /* a couple of pairs actually walking */
    refs.walkers = [];
    for (let i = 0; i < 4; i++) {
      const f = makeCrowdFigure([0x46505c, 0x585048, 0x3c5648][i % 3]);
      f.userData = { z0: -60 + i * 30 + rr(-6, 6), off: (i % 2 ? 1 : -1) * rr(2, 4.5), spd: rr(1.4, 2.2) };
      g.add(f);
      refs.walkers.push(f);
    }

    /* ============ dawn haze & motes ============ */
    const haze = createDriftPoints(
      flatArr(140, [-80, 80, 0, 14, -80, 80]),
      { color: 0xbfd0e8, size: 1.4, opacity: 0.32, amp: 2.4, speed: 0.16, twinkle: 0.6, map: TEX.glow },
    );
    g.add(haze);
    refs.haze = haze;

    /* east gate hinting at the pavilion direction */
    const gz = 74;
    const gx = pathX(gz);
    const gate = new THREE.Group();
    const colMat = new THREE.MeshStandardMaterial({ color: 0x7c3428, roughness: 0.8 });
    [-3.4, 3.4].forEach(ox => {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 7, 8), colMat);
      c.position.set(ox, 3.5, 0); c.castShadow = true;
      gate.add(c);
    });
    const beam = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.55, 0.7), colMat);
    beam.position.y = 7; gate.add(beam);
    const gateRoof = new THREE.Mesh(new THREE.ConeGeometry(5.4, 1.7, 4),
      new THREE.MeshStandardMaterial({ map: TEX.roof, color: 0xc8d4e2, roughness: 0.85 }));
    gateRoof.rotation.y = Math.PI / 4;
    gateRoof.scale.set(1, 1, 0.5);
    gateRoof.position.y = 8.1;
    gate.add(gateRoof);
    gate.position.set(gx, H(gx, gz), gz);
    g.add(gate);
    refs.gate = gate;

    /* ============ positions per beat ============ */
    // walkers state
    this.poses = {
      b1: { fy: [hx - 3.2, hy + STILT + 0.2, hz + 1], fyr: -1.5, fz: [hx - 2.0, hy + STILT + 0.2, hz + 2.6] },
      b3: { z: -24 }, b4: { z: -6 }, b5: { z: 12 },
    };

    /* ============ BEATS ============ */
    const B = (kicker, html, cam, env, extra = {}) => ({ kicker, html, cam, env, ...extra });
    const preDawn = (o = {}) => ({
      top: 0x04071a, mid: 0x0c1834, bot: 0x1c2c50,
      sunDir: [0.5, -0.02, 0.87], sunColor: 0x8fa8e0, sunSize: 0.035, sunI: 0.18,
      stars: 0.85, fogColor: 0x0c1222, fogDensity: 0.011,
      hemiSky: 0x2a3c66, hemiGround: 0x14181f, hemiI: 0.5,
      dirColor: 0x6f88c0, dirI: 0.4, ambientI: 0.17,
      exposure: 1.0, bloomS: 0.65, bloomR: 0.58, bloomT: 0.72, vignette: 0.95,
      ...o,
    });

    this.beats = [
      B(
        '五更 · The fifth watch',
        `<b>Clack, clack-clack. Clack, clack-clack.</b>
         <span class="stage">The night watchman strikes his wooden clapper in a steady rhythm; the hollow strikes drift into the stilt house. Fang Yuan tosses aside the thin silk quilt — barely two hours of sleep. Five hundred years of trials have tempered willpower into steel.</span>`,
        w([pathX(-50) + 6.5, H(pathX(-50) + 6.5, -50) + 1.9, -50], [pathX(-58) + 3.2, H(pathX(-58) + 3.2, -58) + 1.5, -58], 50),
        preDawn(),
        {
          auto: 12,
          labels: [
            { text: 'The night watchman', sub: 'fifth watch · spring rain has ceased', pos: W([wx, wy + 4, wz]) },
          ],
          audio: { wind: 0.7, clack: 1, rumble: 0.1 },
        },
      ),

      B(
        '晨洗 · The morning wash',
        `<b>“Young Master Fang Yuan, you are awake. Your servant will come up at once to attend your morning wash.”</b>
         <span class="stage">Shen Cui — the aunt and uncle's informant — climbs the stairs with a basin of warm water, a willow twig dipped in fine snow-salt, her soft hands smoothing clothes that are already smooth. Fang Yuan's heart, like still water: <b>“Enough. You can go.”</b></span>`,
        w([hx - 13, hy + 8.8, hz + 13], [hx - 4.5, hy + 5.7, hz + 1], 44),
        preDawn({ stars: 0.6, sunI: 0.3, sunDir: [0.5, 0.01, 0.87], bot: 0x243457, hemiI: 0.55 }),
        {
          auto: 13,
          labels: [
            { text: 'Shen Cui', sub: 'maidservant · pearl hairpin · her mother keeps the household', pos: W([hx - 4.6, hy + 6.4, hz + 0.2]) },
            { text: 'The Fang residence', sub: 'orphans of the Fang lineage, raised by uncle & aunt', pos: W([hx, hy + 11, hz]) },
          ],
          audio: { wind: 0.5, shimmer: 0.25 },
        },
      ),

      B(
        '同行 · The walk to the ceremony',
        `<b>“Look — those are the two Fang brothers.”</b>
         <span class="stage">Youths gather in twos and threes, all bound for the same destination. <i>“So that's him. Expressionless, acting as though no one else exists — as arrogant as the rumors say.”</i> · <i>“If you could do what he does, you could act that arrogant too!”</i> Fang Zheng walks with his head lowered, following his elder brother's shadow.</span>`,
        w([pathX(-14) + 17, 5.2, -4], [pathX(-23), 1.9, -24], 52),
        {
          top: 0x0a1430, mid: 0x1c2c54, bot: 0x4a4470,
          sunDir: [0.5, 0.06, 0.87], sunColor: 0xffb070, sunSize: 0.04, sunI: 0.55,
          stars: 0.4, fogColor: 0x161c33, fogDensity: 0.011,
          hemiSky: 0x3a4c78, hemiGround: 0x1a1e26, hemiI: 0.6,
          dirColor: 0xc090c0, dirI: 0.8, ambientI: 0.22,
          exposure: 1.0, bloomS: 0.6, bloomR: 0.55, bloomT: 0.75, vignette: 0.92,
        },
        {
          auto: 15,
          labels: [
            { text: '“So that’s him…”', sub: 'the one who writes poetry — Bring in the Wine, Ode to the Plum Blossom', pos: W([pathX(-30) + 7, H(pathX(-30) + 7, -30) + 3.4, -30]) },
            { text: '“As arrogant as the rumors say.”', sub: 'sour tone · envy and jealousy', pos: W([pathX(-18) - 11, H(pathX(-18) - 11, -18) + 3.4, -18]), cls: 'wl-red' },
            { text: 'Gu Yue Fang Yuan', sub: 'walking in front — five centuries in front', pos: W([pathX(-24), H(pathX(-24), -24) + 3.2, -24]) },
          ],
          audio: { wind: 0.55, clack: 0.7 },
        },
      ),

      B(
        '阴影 · Walking into darkness',
        `<b>“The morning sun was gradually rising — yet Fang Zheng suddenly felt he was walking into darkness.”</b>
         <span class="stage">The darkness comes from his elder brother. Perhaps, for his entire life, he will never escape the enormous shadow cast over him. The word for this feeling: <i>suffocation</i>. From behind, his breathing grows laboured — a detail this life's five hundred years catch down to the smallest tremor. The uncle and aunt assigned Shen Cui to watch him; gave Fang Zheng an old woman. People worry not about having little, but about having unequal shares.</span>`,
        w([pathX(-15.5), H(pathX(-15.5), -15.5) + 1.55, -15.5], [pathX(4), H(pathX(4), 4) + 1.5, 4], 50),
        {
          top: 0x14244c, mid: 0x3a4472, bot: 0x9a6a6a,
          sunDir: [0.42, 0.14, 0.9], sunColor: 0xffb070, sunSize: 0.045, sunI: 1.0,
          stars: 0.15, fogColor: 0x2a3048, fogDensity: 0.012,
          hemiSky: 0x5a6a9a, hemiGround: 0x2a2630, hemiI: 1.0,
          dirColor: 0xffa878, dirI: 1.4, ambientI: 0.35,
          exposure: 1.02, bloomS: 0.6, bloomR: 0.55, bloomT: 0.75, vignette: 0.95,
        },
        {
          auto: 15,
          labels: [
            { text: 'Fang Zheng', sub: '“this damned feeling… suffocation”', pos: W([pathX(-3.4), H(pathX(-3.4), -4) + 3.1, -4]), cls: 'wl-red' },
          ],
          audio: { wind: 0.5, drone: 0.4 },
        },
      ),

      B(
        '魔头的笑意 · Kindly piss off',
        `<b>“As long as they do not block my path — they can piss off. I wouldn't even deign to step on them.”</b>
         <span class="stage">So what if that is his own younger brother? So what if Shen Cui were more beautiful? Elders, clan leader, aunt and uncle — all merely passing through his life. Five hundred years of experience distilled into one truth: in his heart, there remained only the <b>Great Dao of Eternal Life</b>. And the demonic path never has the word compromise.</span>`,
        w([pathX(-2) + 3.4, 1.75, 4], [pathX(13), 2.1, 13], 45),
        {
          top: 0x2a4a8a, mid: 0x6a7ab0, bot: 0xf4b066,
          sunDir: [0.68, 0.16, 0.72], sunColor: 0xffc880, sunSize: 0.05, sunI: 1.25,
          stars: 0.0, fogColor: 0x6a7090, fogDensity: 0.010,
          hemiSky: 0x8fa8d0, hemiGround: 0x4a4438, hemiI: 1.15,
          dirColor: 0xffc088, dirI: 1.7, ambientI: 0.35,
          exposure: 1.0, bloomS: 0.5, bloomR: 0.6, bloomT: 0.78, vignette: 0.85,
        },
        {
          auto: null,
          labels: [
            { text: 'Gu Yue Fang Yuan', sub: 'the tree above the forest — first to feel the wind', pos: W([pathX(13), H(pathX(13), 13) + 3.4, 13]) },
          ],
          audio: { wind: 0.6, shimmer: 0.5, drone: 0.3 },
          sfx: 'swell',
          onEnter: (z, c) => c.rig.shake(0.25, 1.4),
        },
      ),
    ];
  },

  update(ctx, t, dt, beat) {
    const r = this.refs;
    if (!r) return;

    // watchman clapper rhythm (visual rings + already-scheduled audio)
    r.clapT -= dt;
    if (r.clapT <= 0 && (beat === 0 || beat === 1)) {
      r.clapT = 2.6;
      const hand = new THREE.Vector3();
      r.watch.parts.arms[1].getWorldPosition(hand);
      [0, 0.24, 0.43].forEach((d) => {
        setTimeout(() => {
          if (ctx.state.zone === this)
            r.clapperRings.spawn(hand.clone(), { dur: 0.7, scale: 1.6, color: 0xffe0b0 });
        }, d * 1000);
      });
      r.watch.parts.arms[1].rotation.x = -1.1;
      setTimeout(() => { r.watch.parts.arms[1].rotation.x = -0.2; }, 400);
    }
    r.clapperRings.update(dt);

    // luminous walk positions
    const STILT_PORCH = this.STILT + 0.2;
    const fyP = r.fy.group.position, fzP = r.fz.group.position;
    let tz, tr;
    if (beat <= 1) {
      if (beat === 0) {
        setPos(fyP, this.poses.b1.fy); tr = this.poses.b1.fyr;
        setPos(fzP, this.poses.b1.fz);
        r.fy.setPose('stand'); r.fz.setPose('stand');
      } else {
        // standing on the porch landing
        setPos(fyP, [this._hx - 4.4, this._hy + STILT_PORCH, this._hz + 1.8]); tr = -1.35;
        setPos(fzP, [this._hx - 2.2, this._hy + STILT_PORCH, this._hz + 3.1]);
        r.fy.setPose('crossed');
        r.fz.setPose('stand');
      }
    } else {
      tz = beat === 3 ? this.poses.b4.z : beat === 4 ? this.poses.b5.z : this.poses.b3.z;
      const x = pathX(tz);
      setPos(fyP, [x, H(x, tz) + 0.1, tz]);
      tr = 0;
      const x2 = pathX(tz - 3.0);
      setPos(fzP, [x2, H(x2, tz - 3.0) + 0.1, tz - 3.0]);
      r.fy.setPose('walk');
      r.fz.setPose('walk');
      // Zheng's head always lowered
      r.fz.parts.head.rotation.x = 0.4;
    }
    r.fy.group.rotation.y = tr;
    r.fz.group.rotation.y = tr;

    animateFigure(r.fy, t);
    animateFigure(r.fz, t);
    animateFigure(r.sc, t);
    animateFigure(r.watch, t);

    // passers-by
    r.walkers.forEach(f => {
      const u = ((t * f.userData.spd + f.userData.z0 + 200) % 140) - 70;
      const x = pathX(u) + f.userData.off;
      f.position.set(x, H(x, u), u);
      const ahead = u + 1;
      f.rotation.y = Math.atan2(pathX(ahead) + f.userData.off - x, 1);
      f.children.forEach(ch => { if (ch.geometry?.type === 'ConeGeometry') ch.position.y = 0.575 + Math.abs(Math.sin(t * 5 + f.userData.z0)) * 0.04; });
    });

    // lantern warmth drops as day arrives
    const dayness = [0, 0.15, 0.4, 0.7, 1][beat] ?? 0;
    const flick = 0.75 + 0.25 * Math.sin(t * 9.7) * Math.sin(t * 3.1);
    r.lanterns.forEach((l, i) => {
      const s = (1 - dayness * 0.75) * flick;
      l.children[0].material.emissiveIntensity = 0.8 * s;
      const halo = l.children.find(c => c.isSprite);
      if (halo) halo.material.opacity = 0.7 * s;
    });
    r.houseLitMats.forEach(m => {
      m.emissiveIntensity = 2.6 * (1 - dayness * 0.6);
    });

    r.haze.userData.update(t);
  },
};

/* helpers */
function setPos(v, p) { v.set(p[0], p[1], p[2]); }
function flatArr(n, [xa, xb, ya, yb, za, zb]) {
  const a = [];
  for (let i = 0; i < n; i++) a.push(rr(xa, xb), rr(ya, yb), rr(za, zb));
  return a;
}
function groundGeo2(w, d, segs, fn) {
  const g = new THREE.PlaneGeometry(w, d, segs, Math.round(segs * d / w));
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, fn(p.getX(i), p.getZ(i)));
  g.computeVertexNormals();
  return g;
}
