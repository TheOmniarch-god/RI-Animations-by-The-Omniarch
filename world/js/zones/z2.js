// ============================================================
// z2.js — Chapter 2: Reversing Time, Five Hundred Years Of
// Enlightenment — the River of Time, the Spring Autumn Cicada,
// the archive of memory, and the twin in the night rain.
// ============================================================
import * as THREE from 'three';
import { rr, TEX, glowSprite, pointCloud, decal, fbm } from '../util.js';
import { createDriftPoints, createRain, createHopeStream } from '../fx.js';
import { flowMaterial } from '../water.js';
import { makeFangYuan, makeFangZheng, animateFigure, makeFigure } from '../figures.js';
import { makeCicada, animateCicada } from '../figures.js';
import { makeStiltHouse, rockyBlocks, ground } from './common.js';

const C = [0, 0, 2400];                 // zone centre (world)
const w = (p, l, fov) => ({ pos: [p[0] + C[0], p[1] + C[1], p[2] + C[2]], look: [l[0] + C[0], l[1] + C[1], l[2] + C[2]], fov });
const W = (p) => [p[0] + C[0], p[1] + C[1], p[2] + C[2]];

/* a grand helix — the river climbing against its own current */
function helixCurve(turns = 3, r0 = 26, y0 = -8, y1 = 58, phase = 0) {
  const pts = [];
  const N = 160;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const a = phase + t * Math.PI * 2 * turns;
    const r = r0 + Math.sin(t * Math.PI * 5) * 3.5;
    pts.push(new THREE.Vector3(Math.cos(a) * r, y0 + (y1 - y0) * t, Math.sin(a) * r));
  }
  return new THREE.CatmullRomCurve3(pts);
}

const ROOM = { x: -34, y: 15, z: 30 };  // the window diorama (local)

export const zone2 = {
  id: 'z2',
  center: C,

  build(ctx) {
    const g = this.group = new THREE.Group();
    g.position.set(...C);
    ctx.scene.add(g);
    const refs = this.refs = {};

    /* ============ RIVER OF TIME ============ */
    const curveA = helixCurve(3, 26, -8, 58, 0);
    const curveB = helixCurve(3, 33, -16, 44, Math.PI);
    const ribbonA = new THREE.Mesh(
      ribbonGeoLocal(curveA, 5.4, 400, 6),
      flowMaterial({ colA: 0x041024, colB: 0x0c3f6e, colGlow: 0x58c8ff, flow: -1.4, sparkle: 0.976, opacity: 1 }),
    );
    g.add(ribbonA);
    refs.riverA = ribbonA;
    const ribbonB = new THREE.Mesh(
      ribbonGeoLocal(curveB, 3.2, 360, 5),
      flowMaterial({ colA: 0x061426, colB: 0x14507e, colGlow: 0x88e0ff, flow: -0.9, sparkle: 0.984, opacity: 0.75 }),
    );
    g.add(ribbonB);
    refs.riverB = ribbonB;

    // luminous core thread inside the main ribbon (the current itself)
    const thread = new THREE.Mesh(
      ribbonGeoLocal(curveA, 0.7, 400, 3),
      flowMaterial({ colA: 0x9fd8ff, colB: 0xffffff, colGlow: 0xffffff, flow: -2.6, sparkle: 0.95, opacity: 0.9 }),
    );
    g.add(thread);
    refs.thread = thread;

    // river spray / star-motes around the helix
    const motePos = [];
    for (let i = 0; i < 700; i++) {
      const t = i / 700;
      const p = curveA.getPointAt(t);
      motePos.push(p.x + rr(-7, 7), p.y + rr(-5, 5), p.z + rr(-7, 7));
    }
    const motes = createDriftPoints(motePos, {
      color: 0xbfe6ff, size: 1.1, opacity: 0.8, amp: 1.4, speed: 0.35, twinkle: 1.6, map: TEX.glow,
    });
    g.add(motes);
    refs.motes = motes;

    /* ============ SPRING AUTUMN CICADA ============ */
    const cicada = makeCicada();
    cicada.scale.setScalar(2.4);
    cicada.position.set(0, 30, 0);
    g.add(cicada);
    refs.cicada = cicada;
    // orbit ring under it
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(7, 0.05, 6, 90),
      new THREE.MeshBasicMaterial({ color: 0xd8b46a, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 26, 0);
    g.add(ring);
    refs.ring = ring;

    /* ============ MEMORY ORBS — 500 years ============ */
    const orbGroup = new THREE.Group();
    g.add(orbGroup);
    refs.orbs = [];
    const orbGeo = new THREE.SphereGeometry(1, 12, 10);
    const orbKinds = [
      { c: 0xffd98a, name: 'Secret troves, unopened by anyone' },
      { c: 0x9fd6ff, name: 'The pulse of history, grasped at a glance' },
      { c: 0xff9f9f, name: 'Hidden experts, prodigies — and those not yet born' },
      { c: 0xc9ff9f, name: 'Grueling cultivation · five hundred years of battle' },
    ];
    for (let i = 0; i < 46; i++) {
      const t = i / 46;
      const a = t * Math.PI * 6.2 + 0.7;
      const r = 40 + Math.sin(t * Math.PI * 4) * 9;
      const y = 6 + t * 46;
      const kind = orbKinds[i % orbKinds.length];
      const m = new THREE.Mesh(orbGeo, new THREE.MeshStandardMaterial({
        color: kind.c, emissive: kind.c, emissiveIntensity: 1.1, transparent: true, opacity: 0.85, roughness: 0.3,
      }));
      const s = rr(0.5, 1.3);
      m.scale.setScalar(s);
      m.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      const halo = glowSprite(kind.c, s * 3.4, 0.35);
      m.add(halo);
      orbGroup.add(m);
      refs.orbs.push({ mesh: m, base: m.position.clone(), ph: rr(0, 6), spd: rr(0.4, 1) });
    }

    /* ============ OBSERVATION LEDGE — Fang Yuan watching ============ */
    const ledge = new THREE.Group();
    ledge.position.set(38, 6, 26);
    g.add(ledge);
    const ledgeTop = 4;
    const ledgeFloor = ledgeTop + 2;
    const ledgeRock = new THREE.Mesh(
      new THREE.CylinderGeometry(9, 12, ledgeTop + 4, 9),
      new THREE.MeshStandardMaterial({ color: 0x4a4e5c, map: TEX.stone, roughness: 0.95, flatShading: true }),
    );
    ledgeRock.position.y = ledgeFloor - (ledgeTop + 4) / 2;
    ledgeRock.receiveShadow = ledgeRock.castShadow = true;
    ledge.add(ledgeRock);
    // rune circle + figure
    const rc = new THREE.Mesh(
      new THREE.RingGeometry(2.2, 2.5, 48),
      new THREE.MeshBasicMaterial({ color: 0xd8b46a, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    );
    rc.rotation.x = -Math.PI / 2;
    rc.position.y = ledgeFloor + 0.05;
    ledge.add(rc);

    const fy = makeFangYuan();
    fy.group.position.y = ledgeFloor;
    fy.group.rotation.y = -0.7;
    ledge.add(fy.group);
    refs.fy = fy;

    /* ============ THE ROOM IN THE RAIN ============ */
    const room = new THREE.Group();
    room.position.set(ROOM.x, ROOM.y, ROOM.z);
    // rocky island under the diorama — gives the void a horizon anchor
    const island = new THREE.Mesh(new THREE.CylinderGeometry(15, 19, 2.4, 9),
      new THREE.MeshStandardMaterial({ color: 0x1c2434, map: TEX.darkRock, roughness: 1, flatShading: true }));
    island.position.set(ROOM.x, ROOM.y - 1.3, ROOM.z);
    g.add(island);
    g.add(room);
    refs.room = room;
    const floorMat = new THREE.MeshStandardMaterial({ map: TEX.wood, color: 0xcdb090, roughness: 0.9 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(11, 0.3, 9), floorMat);
    floor.receiveShadow = true;
    room.add(floor);
    // window wall (north, -z)
    const wallMat = new THREE.MeshStandardMaterial({ map: TEX.bamboo, color: 0xd8c8a8, roughness: 0.92 });
    const wallN = new THREE.Mesh(new THREE.BoxGeometry(11, 5.4, 0.25), wallMat);
    wallN.position.set(0, 2.7, -4.4);
    room.add(wallN);
    // lattice window (opening with glow of night beyond)
    const winFrame = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.6),
      new THREE.MeshStandardMaterial({ map: TEX.lattice, roughness: 0.9 }));
    winFrame.position.set(0, 3, -4.25);
    room.add(winFrame);
    const winGlow = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.8),
      new THREE.MeshBasicMaterial({ color: 0x24406a, transparent: true, opacity: 0.85 }));
    winGlow.position.set(0, 3, -4.35);
    room.add(winGlow);
    // side walls partial
    const wallW = new THREE.Mesh(new THREE.BoxGeometry(0.25, 5.4, 9), wallMat);
    wallW.position.set(-5.4, 2.7, 0); room.add(wallW);
    // doorway (east side of north wall region) — door post
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x3a2c1e, roughness: 0.85 });
    const jambL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4, 0.3), doorMat);
    jambL.position.set(2.5, 2, 4.2);
    const jambR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4, 0.3), doorMat);
    jambR.position.set(4.7, 2, 4.2);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.4, 0.3), doorMat);
    lintel.position.set(3.6, 4.2, 4.2);
    room.add(jambL, jambR, lintel);
    // roof (open on camera side)
    const roof = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.3, 9.6),
      new THREE.MeshStandardMaterial({ map: TEX.roof, color: 0xb8c2ce, roughness: 0.9 }));
    roof.position.y = 5.6;
    room.add(roof);
    // lantern inside
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xffc47a, emissive: 0xffa04a, emissiveIntensity: 1.6 }));
    lamp.position.set(-3.6, 3.4, 2.6);
    room.add(lamp);
    const lampLight = new THREE.PointLight(0xffb060, 60, 18, 1.5);
    // cool moon spill through the doorway so the exit isn't a black void
    const doorMoon = new THREE.PointLight(0x8fb0e0, 45, 40, 1.2);
    doorMoon.position.set(3.6, 6, 14);
    room.add(doorMoon);
    // warm bounce to lift Fang Zheng in the doorway
    const doorBounce = new THREE.PointLight(0xffb46a, 45, 8, 1.5);
    doorBounce.position.set(3.2, 2.6, 2.4);
    room.add(doorBounce);
    lampLight.position.copy(lamp.position);
    room.add(lampLight);
    refs.lampLight = lampLight;

    // Fang Yuan at the window (looking out at the rain)
    const fyR = makeFangYuan();
    fyR.group.position.set(-0.4, 0.16, -2.6);
    fyR.group.rotation.y = Math.PI; // facing window (-z)
    room.add(fyR.group);
    refs.fyRoom = fyR;
    // Fang Zheng at the doorway
    const fz = makeFangZheng();
    fz.group.position.set(3.6, 0.16, 3.9);
    fz.group.rotation.y = Math.PI + 0.4;
    room.add(fz.group);
    refs.fz = fz;

    // rain outside the window (local box)
    const rain = createRain({ count: 1500, area: 30, height: 34, color: 0xa8c2e0, opacity: 0.55, len: 0.5, wind: 0.5 });
    rain.position.set(0, 14, -20);
    room.add(rain);
    refs.rain = rain;
    // wet glow under window
    const wet = decal(0x3a5f8f, 14, 0.5, TEX.glow);
    wet.position.set(0, -0.1, -9);
    room.add(wet);

    /* --- little house cluster behind the room (context) --- */
    for (let i = 0; i < 6; i++) {
      const h = makeStiltHouse({ stiltH: 2.4 });
      const a = -1.2 + i * 0.5;
      h.position.set(ROOM.x + Math.cos(a) * (16 + i * 3), ROOM.y - 6 - i * 1.4, ROOM.z + Math.sin(a) * (16 + i * 3) + 6);
      h.rotation.y = rr(0, 6);
      h.scale.setScalar(0.9);
      h.userData.setLit(i % 2 === 0);
      g.add(h);
    }
    // ledge stairs-ish glow bridge between ledge and room
    const bridgePts = [];
    for (let i = 0; i < 24; i++) {
      const t = i / 23;
      bridgePts.push(lerp(38, ROOM.x, t) + Math.sin(t * 6) * 2, lerp(ledgeFloor + 6, ROOM.y + 1, t) + Math.sin(t * Math.PI) * 3, lerp(26, ROOM.z + 6, t));
    }
    const bridge = pointCloud(bridgePts, { color: 0xd8e8ff, size: 1.4, opacity: 0.5, map: TEX.glow, additive: true });
    g.add(bridge);
    refs.bridge = bridge;

    /* ============ BEATS ============ */
    const B = (kicker, html, cam, env, extra = {}) => ({ kicker, html, cam, env, ...extra });
    const spaceEnv = {
      top: 0x02030a, mid: 0x061027, bot: 0x0a1c3a,
      sunDir: [0.5, 0.4, -0.7], sunColor: 0x88b4ff, sunSize: 0.02, sunI: 0.35,
      stars: 1.0, fogColor: 0x040810, fogDensity: 0.0075,
      hemiSky: 0x3a5f9f, hemiGround: 0x11182a, hemiI: 0.55,
      dirColor: 0x9fc0ff, dirI: 0.8, ambientI: 0.2,
      exposure: 1.0, bloomS: 0.8, bloomR: 0.6, bloomT: 0.62, vignette: 0.92,
    };

    this.beats = [
      B(
        '時間之河 · The River of Time',
        `<b>“In legends, there exists a River of Time in this world, supporting the flow of all existence.”</b>
         <span class="stage">And by utilizing the power of the Spring Autumn Cicada, one can travel upstream against the current — returning to the past. Almost no one was truly certain. Every use demands a life: the whole body, the whole cultivation base, as driving power.</span>`,
        w([56, 34, 66], [0, 28, 0], 52),
        spaceEnv,
        {
          auto: 13,
          labels: [
            { text: 'The River of Time', sub: 'flowing upstream — rebirth against the current', pos: W([26, 44, 0]), cls: 'wl-blue' },
          ],
          audio: { shimmer: 0.7, wind: 0.35, rumble: 0.3 },
        },
      ),

      B(
        '春秋蟬 · The Spring Autumn Cicada',
        `<b>Ranked seventh among the Ten Mystical Gu — in short: rebirth.</b>
         <span class="stage">It took monumental effort, the slaughter of hundreds of thousands of stirring heaven’s wrath and men’s resentment, endless tribulations to refine it… and yet, reborn, the cicada had not travelled back with him. He sighs — then smiles: <i>“Even if it is gone, I can simply refine another one.”</i></span>`,
        w([13, 32, 17.5], [0, 30, 0], 44),
        { ...spaceEnv, sunColor: 0xffe0a0, dirColor: 0xffd8a0, sunI: 0.5, bloomS: 0.55, bloomT: 0.8 },
        {
          auto: 13,
          labels: [
            { text: 'Spring Autumn Cicada', sub: 'Ten Mystical Gu · №7 · expendable, one use', pos: W([0, 35.5, 0]) },
          ],
          audio: { shimmer: 0.9, wind: 0.3 },
          sfx: 'bell',
        },
      ),

      B(
        '五百年的记忆 · The priceless treasure',
        `<b>“He still carried a priceless treasure; he was far from empty-handed — his five hundred years of memories and experience.”</b>
         <span class="stage">Countless secret troves unopened by anyone. Major historical events, one by one. Countless figures — hidden experts, extraordinary prodigies, and those not even born yet. As long as he played his cards well, recreating his former glory would be no problem at all.</span>`,
        w([-38, 44, 44], [0, 32, 0], 56),
        spaceEnv,
        {
          auto: 14,
          labels: [
            { text: 'Secret troves', sub: 'currently unopened by anyone', pos: W([40, 46, -8]), cls: '' },
            { text: 'Figures of the future', sub: 'not even born yet', pos: W([-44, 40, 6]) },
            { text: 'Five hundred years of battle', sub: 'the overall situation — and the initiative', pos: W([8, 54, 40]) },
          ],
          audio: { shimmer: 0.8, wind: 0.3, rumble: 0.2 },
        },
      ),

      B(
        '笼 · A sturdy cell is safety',
        `<b>“Through the eyes of a demonic overlord tempered by five hundred years, this Qing Mao Mountain was truly too small — and Gu Yue Village, more like a cage.”</b>
         <span class="stage">Yet while a cage imprisons freedom, a sturdy cell often represents safety. He is a mortal: primeval sea not yet open, unable even to survive an ordinary wild boar. Only Rank 3 buys the mountains and rivers of this world. Outside the window, the night rain falls — tomorrow is the Aperture Opening Ceremony.</span>`,
        w([ROOM.x + 7, ROOM.y + 5.5, ROOM.z + 14], [ROOM.x, ROOM.y + 2.6, ROOM.z - 3], 48),
        {
          top: 0x04060f, mid: 0x0a1428, bot: 0x14243c,
          sunDir: [0.3, 0.5, -0.6], sunColor: 0xa8c0ff, sunSize: 0.03, sunI: 0.3,
          stars: 0.8, fogColor: 0x080d18, fogDensity: 0.009,
          hemiSky: 0x2a3c5e, hemiGround: 0x141820, hemiI: 0.5,
          dirColor: 0x8fa8d8, dirI: 0.5, ambientI: 0.16,
          exposure: 1.0, bloomS: 0.7, bloomR: 0.6, bloomT: 0.7, vignette: 0.95,
        },
        {
          auto: 15,
          labels: [
            { text: 'The window in the night rain', sub: 'fifth-generation orphan of the Fang lineage', pos: W([ROOM.x, ROOM.y + 5.4, ROOM.z - 4]) },
          ],
          audio: { rain: 0.9, wind: 0.5, rumble: 0.15 },
        },
      ),

      B(
        '双生子 · The twin at the door',
        `<b>“Brother, why are you standing by the window letting the rain fall on you?”</b>
         <span class="stage">Fang Zheng lowers his head to his toes — his trademark habit. Behind his obedient words: envy, a buried resentment he cannot name. Born from the same womb: the brother given diamond-like talent, himself a roadside stone. Fang Yuan’s gaze cuts like an icy blade: <b>“You can go.”</b> And in his heart: <i>“Vengeance is not my intention — the demonic path never has the word compromise.”</i></span>`,
        w([ROOM.x + 2.6, ROOM.y + 3.2, ROOM.z + 7.8], [ROOM.x + 2.0, ROOM.y + 1.75, ROOM.z + 1.2], 44),
        {
          top: 0x04060f, mid: 0x0a1428, bot: 0x14243c,
          sunDir: [0.3, 0.5, -0.6], sunColor: 0xa8c0ff, sunSize: 0.03, sunI: 0.3,
          stars: 0.7, fogColor: 0x080d18, fogDensity: 0.010,
          hemiSky: 0x2e4266, hemiGround: 0x141820, hemiI: 0.55,
          dirColor: 0x8fa8d8, dirI: 0.5, ambientI: 0.18,
          exposure: 1.0, bloomS: 0.7, bloomR: 0.6, bloomT: 0.7, vignette: 0.95,
        },
        {
          auto: null,
          labels: [
            { text: 'Fang Zheng', sub: 'the twin — head lowered, as always', pos: W([ROOM.x + 3.6, ROOM.y + 2.4, ROOM.z + 3.2]) },
          ],
          audio: { rain: 0.8, wind: 0.4 },
        },
      ),
    ];
  },

  update(ctx, t, dt, beat) {
    const r = this.refs;
    if (!r) return;
    r.riverA.material.uniforms.uTime.value = t;
    r.riverB.material.uniforms.uTime.value = t;
    r.thread.material.uniforms.uTime.value = t;
    r.motes.userData.update(t);

    // cicada breathing orbit
    r.cicada.position.x = Math.sin(t * 0.32) * 3.4;
    r.cicada.position.z = Math.cos(t * 0.32) * 3.4;
    r.cicada.position.y = 30 + Math.sin(t * 0.7) * 1.4;
    r.cicada.rotation.y = t * 0.4;
    animateCicada(r.cicada, t);
    r.ring.rotation.z = t * 0.3;
    r.ring.material.opacity = 0.35 + 0.2 * Math.sin(t * 1.4);

    // memory orbs drift
    r.orbs.forEach((o, i) => {
      o.mesh.position.y = o.base.y + Math.sin(t * o.spd + o.ph) * 1.6;
      o.mesh.position.x = o.base.x + Math.sin(t * 0.22 * o.spd + o.ph) * 2.4;
      o.mesh.material.emissiveIntensity = 0.9 + 0.5 * Math.sin(t * 1.8 + i);
    });

    animateFigure(r.fy, t);
    animateFigure(r.fyRoom, t);
    animateFigure(r.fz, t);
    r.fz.parts.head.rotation.x = 0.34;
    r.rain.userData.update(t);
    r.bridge.material.opacity = 0.4 + 0.2 * Math.sin(t * 1.1);
    r.lampLight.intensity = 86 + Math.sin(t * 11) * 8;
  },
};

/* local ribbon helper (avoids re-import cycle) */
function ribbonGeoLocal(curve, width, uSegs = 300, vSegs = 6) {
  const pos = [], uv = [], idx = [];
  const pt = new THREE.Vector3(), tan = new THREE.Vector3();
  const side = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), nrm = new THREE.Vector3();
  for (let i = 0; i <= uSegs; i++) {
    const u = i / uSegs;
    curve.getPointAt(u, pt);
    curve.getTangentAt(u, tan);
    side.crossVectors(up, tan).normalize();
    nrm.crossVectors(tan, side);
    const wv = width * (0.86 + 0.28 * Math.sin(u * Math.PI * 7));
    for (let j = 0; j <= vSegs; j++) {
      const v = j / vSegs - 0.5;
      pos.push(pt.x + side.x * wv * v * 2, pt.y + side.y * wv * v * 2, pt.z + side.z * wv * v * 2);
      uv.push(u, j / vSegs);
    }
  }
  const row = vSegs + 1;
  for (let i = 0; i < uSegs; i++) for (let j = 0; j < vSegs; j++) {
    const a = i * row + j, b = a + row;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}
function lerp(a, b, t) { return a + (b - a) * t; }
