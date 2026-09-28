// ============================================================
// z4.js — Chapter 4: Gu Yue Fang Yuan! — the Aperture Opening
// Ceremony beneath the Clan Leader's Pavilion.
// ============================================================
import * as THREE from 'three';
import { rr, ri, TEX, glowSprite, decal, pointCloud, canvasTex } from '../util.js';
import { createDriftPoints, createHopeStream, RippleField, runeCircle, lightShaft } from '../fx.js';
import { createFlowRibbon } from '../water.js';
import {
  makeFangYuan, makeElder, makeFigure, makeCrowdFigure, animateFigure, makeMaid, makeHero,
} from '../figures.js';
import {
  makePavilion, makeCaveShell, makeStalactites, makeOrchidField, rockyBlocks,
  makeCrowd, makeStiltHouse,
} from './common.js';

const C = [0, 0, -2400];
const w = (p, l, fov) => ({ pos: [p[0] + C[0], p[1] + C[1], p[2] + C[2]], look: [l[0] + C[0], l[1] + C[1], l[2] + C[2]], fov });
const W = (p) => [p[0] + C[0], p[1] + C[1], p[2] + C[2]];

/* trial geometry */
const BANK_NEAR = 14;          // z of the near bank (start)
const SPRING_Z = -46;           // spirit spring
const stepZ = (n) => BANK_NEAR - 1.6 - n * 1.12;   // world z of step n
const riverZ = (z) => 6 * Math.sin(z * 0.14) + 1;   // meandering river centreline

export const zone4 = {
  id: 'z4',
  center: C,

  build(ctx) {
    const g = this.group = new THREE.Group();
    g.position.set(...C);
    ctx.scene.add(g);
    const refs = this.refs = {};

    /* ================= ABOVE: THE SQUARE ================= */
    const top = new THREE.Group();
    top.position.y = 70;
    g.add(top);
    refs.top = top;

    // mountaintop platform
    const plateau = new THREE.Mesh(
      new THREE.CylinderGeometry(34, 52, 14, 26, 3),
      new THREE.MeshStandardMaterial({ color: 0x7a7880, map: TEX.stone, roughness: 0.95, flatShading: true }),
    );
    plateau.position.y = -7;
    plateau.receiveShadow = true;
    plateau.castShadow = true;
    top.add(plateau);
    const square = new THREE.Mesh(
      new THREE.CircleGeometry(24, 40),
      new THREE.MeshStandardMaterial({ color: 0x9a948c, map: TEX.stone, roughness: 0.95 }),
    );
    square.rotation.x = -Math.PI / 2;
    square.position.y = 0.06;
    square.receiveShadow = true;
    top.add(square);

    // the five-story Clan Leader's Pavilion
    const pav = makePavilion({ stories: 5, w: 10, color: 0x8c3b2e });
    pav.position.set(0, 0.1, -12);
    top.add(pav);
    refs.pav = pav;
    // two flanking halls
    [-20, 20].forEach(x => {
      const hall = makePavilion({ stories: 1, w: 9, color: 0x7c3428 });
      hall.position.set(x, 0.1, -6);
      hall.rotation.y = x > 0 ? -0.4 : 0.4;
      top.add(hall);
    });

    // the hundred youths (two-thirds of them shown as a gathered host)
    const crowdTop = makeCrowd(70, 21, [0, 0.2, 12], { zStretch: 0.75, seed: 11 });
    top.add(crowdTop);
    refs.crowdTop = crowdTop;

    // Academy Elder with the roll
    const acad = makeElder(0xefe8d6, 0x6b2f2f);
    acad.group.position.set(-4, 0.2, 14);
    acad.group.rotation.y = Math.PI;
    top.add(acad.group);
    refs.acad = acad;

    // mountain body below the square (closed cylinder so the cave stays sealed)
    const mountain = new THREE.Mesh(
      new THREE.CylinderGeometry(46, 78, 130, 24, 6, true),
      new THREE.MeshStandardMaterial({ color: 0x4d4a55, map: TEX.stone, roughness: 0.96, flatShading: true, side: THREE.DoubleSide }),
    );
    mountain.position.y = 70 - 7 - 65;
    g.add(mountain);

    // banners on the square
    [[-14, 6, 0x6b2f2f, '正'], [14, 6, 0x2f4a6b, '道'], [-14, -4, 0x4a5a3a, '天'], [14, -4, 0x5a4a6b, '古']].forEach(([x, z, c, e]) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 7, 6),
        new THREE.MeshStandardMaterial({ color: 0x3a2a1a }));
      pole.position.set(x, 3.5, z);
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(2, 3.4),
        new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide, roughness: 0.9 }));
      cloth.position.set(x + 1, 5.2, z);
      top.add(pole, cloth);
    });

    /* ================= BELOW: THE CAVERN ================= */
    const cave = new THREE.Group();
    g.add(cave);
    refs.cave = cave;

    const shell = makeCaveShell(92, 3);
    shell.position.y = 14;
    cave.add(shell);
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(78, 48),
      new THREE.MeshStandardMaterial({ color: 0x55576a, map: TEX.darkRock, roughness: 0.97 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    cave.add(floor);

    // gentle floor undulation rocks
    const bumps = rockyBlocks({ count: 26, area: 130, y: 0.3, min: 0.8, max: 3, color: 0x4a4c5e });
    cave.add(bumps);

    // rainbow stalactites overhead
    const stal = makeStalactites({ count: 150, radius: 78, ceilY: 42, glowCount: 54, seed: 5 });
    cave.add(stal);
    refs.stal = stal;

    // seven-coloured light shafts
    const shaftCols = [0xff4d4d, 0xffa13d, 0xffe13d, 0x59e05d, 0x3ddcdc, 0x4d8dff, 0xb44dff];
    refs.shafts = shaftCols.map((c, i) => {
      const sh = lightShaft(c, 4.5, 40, 0.22);
      const a = (i / 7) * Math.PI * 2;
      sh.position.set(Math.cos(a) * 34, 21, Math.sin(a) * 26);
      sh.rotation.x = Math.PI / 2 + rr(-0.1, 0.1);
      sh.rotation.z = rr(-0.2, 0.2);
      cave.add(sh);
      return sh;
    });

    /* ---- underground river (glowing blue, knee deep) ---- */
    const riverPts = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const x = -78 + t * 156;
      const z = riverZ(x * 0.35) + (t - 0.5) * 6;
      riverPts.push(new THREE.Vector3(x, 0.35, z));
    }
    const riverCurve = new THREE.CatmullRomCurve3(riverPts);
    const river = createFlowRibbon(riverCurve, 6.4, {
      colA: 0x03101f, colB: 0x0a4a7a, colGlow: 0x3fb8ff, flow: 0.8, sparkle: 0.982, opacity: 1,
    }, 260);
    cave.add(river);
    refs.river = river;
    // star-like caustic points beneath the surface
    const underPos = [];
    for (let i = 0; i < 420; i++) {
      const t = i / 420;
      const p = riverCurve.getPointAt(t);
      underPos.push(p.x + rr(-5, 5), 0.2, p.z + rr(-4.4, 4.4));
    }
    const under = pointCloud(underPos, { color: 0x7fd0ff, size: 1.1, opacity: 0.8, map: TEX.glow, additive: true });
    cave.add(under);
    refs.under = under;

    // riverbank stones along the curve
    for (let i = 0; i < 34; i++) {
      const t = i / 34;
      const p = riverCurve.getPointAt(t);
      const r = new THREE.Mesh(new THREE.IcosahedronGeometry(rr(0.3, 0.9), 0),
        new THREE.MeshStandardMaterial({ color: 0x707686, roughness: 0.9, flatShading: true }));
      const s = 1;
      r.position.set(p.x + rr(-8, 8), 0.25, p.z + (Math.random() > 0.5 ? 1 : -1) * rr(6.6, 8.4));
      r.scale.setScalar(rr(0.6, 1.4));
      r.castShadow = true;
      cave.add(r);
    }

    /* ---- moon orchid field on the far bank ---- */
    const orchids = makeOrchidField({ count: 3200, cx: 0, cz: -26, rx: 40, rz: 24, y: 0 });
    cave.add(orchids);
    refs.orchids = orchids;

    /* ---- the spirit spring (source of the pressure) ---- */
    const spring = new THREE.Group();
    spring.position.set(0, 0, SPRING_Z);
    cave.add(spring);
    const springPool = new THREE.Mesh(
      new THREE.CircleGeometry(7.5, 40),
      (() => {
        const m = canvasTex('spring', 256, 256, (c2, wd, ht) => {
          const grd = c2.createRadialGradient(wd / 2, ht / 2, 6, wd / 2, ht / 2, wd / 2);
          grd.addColorStop(0, '#bfeaff'); grd.addColorStop(0.5, '#3f9fdc'); grd.addColorStop(1, '#0a2a4a');
          c2.fillStyle = grd; c2.fillRect(0, 0, wd, ht);
        });
        return new THREE.MeshStandardMaterial({ map: m, emissive: 0x2f8fd0, emissiveIntensity: 1.6, roughness: 0.25 });
      })(),
    );
    springPool.rotation.x = -Math.PI / 2;
    springPool.position.y = 0.12;
    spring.add(springPool);
    const springGlow = glowSprite(0x7fd8ff, 26, 0.65);
    springGlow.position.y = 3;
    spring.add(springGlow);
    const springLight = new THREE.PointLight(0x5fbfff, 560, 70, 1.2);
    springLight.position.y = 5;
    spring.add(springLight);
    refs.springLight = springLight;
    // column of rising qi
    const qiCol = lightShaft(0x9fe0ff, 6, 30, 0.3);
    qiCol.position.set(0, 15, 0);
    qiCol.rotation.x = 0; // vertical? lightShaft is a plane; keep upright
    qiCol.rotation.y = 0;
    spring.add(qiCol);
    refs.qiCol = qiCol;
    // rune circle around the spring
    const srune = runeCircle(10, 0x7fd8ff, 0.4);
    srune.position.y = 0.2;
    spring.add(srune);
    refs.srune = srune;

    /* ---- pressure ripple over the field ---- */
    refs.ripples = new RippleField(cave, new THREE.Vector3(0, 0.1, -24), { count: 6, radius: 34, color: 0x9fd6ff });

    /* ---- step marker lanterns along the crossing ---- */
    refs.stepMarks = [];
    for (let n = 10; n <= 50; n += 10) {
      const z = stepZ(n);
      const m = glowSprite(0xffe6a8, 2.2, 0.75);
      m.position.set(6.4, 0.9, z);
      cave.add(m);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.9, 5),
        new THREE.MeshStandardMaterial({ color: 0x3a3428 }));
      post.position.set(6.4, 0.45, z);
      cave.add(post);
      refs.stepMarks.push(m);
    }

    /* ---- the crowd of youths on the near bank ---- */
    const crowd = makeCrowd(56, 15, [0, 0, BANK_NEAR + 8], { zStretch: 0.7, seed: 21 });
    cave.add(crowd);
    refs.crowd = crowd;

    /* ---- elders on a rock shelf ---- */
    const shelf = new THREE.Mesh(
      new THREE.BoxGeometry(22, 4.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x55576a, map: TEX.darkRock, roughness: 0.96 }),
    );
    shelf.position.set(-24, 2.25, BANK_NEAR + 6);
    shelf.receiveShadow = shelf.castShadow = true;
    cave.add(shelf);
    const shelfLamp = new THREE.PointLight(0xffd0a0, 430, 44, 1.25);
    shelfLamp.position.set(-24, 9.5, BANK_NEAR + 9);
    cave.add(shelfLamp);
    refs.shelfLamp = shelfLamp;
    refs.elders = [];
    const elderDefs = [
      { robe: 0xe6e1d4, acc: 0x8c2f26, name: 'Gu Yue Chi Lian', x: -6 },   // red-hair rival
      { robe: 0xe6e1d4, acc: 0x2f5a8c, name: 'Gu Yue Mo Chen', x: -2 },    // horse-faced
      { robe: 0xdcd4c2, acc: 0x4a6b3a, name: 'Academy Elder', x: 2 },
      { robe: 0xf0ead8, acc: 0xa3221d, name: 'Gu Yue Clan Leader', x: 6 },
    ];
    elderDefs.forEach((d, i) => {
      const e = makeElder(d.robe, d.acc);
      e.group.position.set(-24 + d.x, 4.5, BANK_NEAR + 6 + (i % 2 ? 1.2 : -1.2));
      e.group.rotation.y = 0.35;
      e.setPose(i === 3 ? 'armsBack' : i === 0 ? 'point' : 'crossed');
      cave.add(e.group);
      refs.elders.push({ fig: e, def: d });
    });
    // scroll in the academy elder's hand is implied by pose 'crossed' — add a small list
    const rollTex = canvasTex('roll', 64, 128, (c2, wd, ht) => {
      c2.fillStyle = '#e9dfc6'; c2.fillRect(0, 0, wd, ht);
      c2.fillStyle = '#5a4a30'; c2.font = '10px serif';
      for (let i = 0; i < 10; i++) c2.fillText('古月', 6, 12 + i * 12);
    });
    const roll = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.5),
      new THREE.MeshStandardMaterial({ map: rollTex, side: THREE.DoubleSide }));
    roll.position.set(0, 1.0, 0.28);
    roll.rotation.x = -0.5;
    refs.elders[2].fig.group.add(roll);

    /* ---- protagonist in the crowd ---- */
    const fy = makeFangYuan();
    fy.group.position.set(1.5, 0, BANK_NEAR + 5);
    fy.group.rotation.y = Math.PI;
    cave.add(fy.group);
    refs.fy = fy;

    /* ---- named youths who take the test (created per trial) ---- */
    refs.walker = null;

    /* ---- local cave ambience particles ---- */
    const dustPos = [];
    for (let i = 0; i < 320; i++) dustPos.push(rr(-70, 70), rr(1, 34), rr(-60, BANK_NEAR + 26));
    const dust = createDriftPoints(dustPos, {
      color: 0xbfd8f0, size: 0.9, opacity: 0.3, amp: 1.6, speed: 0.12, twinkle: 0.5, map: TEX.glow,
    });
    cave.add(dust);
    refs.dust = dust;

    /* ---- cave lighting ---- */
    const caveAmb = new THREE.PointLight(0x6a8fd0, 520, 220, 1.15);
    caveAmb.position.set(0, 26, -6);
    cave.add(caveAmb);
    refs.caveAmb = caveAmb;
    const warmLamp = new THREE.PointLight(0xffb46a, 420, 70, 1.25);
    warmLamp.position.set(0, 8, BANK_NEAR + 10);
    cave.add(warmLamp);
    refs.warmLamp = warmLamp;

    /* spotlight for the final name-call */
    const spot = lightShaft(0xfff2c8, 7, 34, 0.0);
    spot.position.set(1.5, 17, BANK_NEAR + 5);
    cave.add(spot);
    refs.spot = spot;
    const spotBase = new THREE.PointLight(0xffe8b0, 0, 34, 1.2);
    spotBase.position.set(1.5, 4, BANK_NEAR + 5);
    cave.add(spotBase);
    refs.spotBase = spotBase;

    /* ================= BEATS ================= */
    const B = (kicker, html, cam, env, extra = {}) => ({ kicker, html, cam, env, ...extra });
    const dayTop = {
      top: 0x2f5aa8, mid: 0x7aa4d8, bot: 0xd8e4f0,
      sunDir: [-0.5, 0.55, 0.6], sunColor: 0xfff0d0, sunSize: 0.04, sunI: 1.6,
      stars: 0, fogColor: 0x9ab4cc, fogDensity: 0.006,
      hemiSky: 0xa8c4e0, hemiGround: 0x4a4438, hemiI: 0.8,
      dirColor: 0xfff0d0, dirI: 2.4, ambientI: 0.35,
      exposure: 1.0, bloomS: 0.45, bloomR: 0.5, bloomT: 0.85, vignette: 0.8,
    };
    const caveEnv = (o = {}) => ({
      top: 0x05060c, mid: 0x0a1020, bot: 0x101a30,
      sunDir: [0, -0.7, -0.3], sunColor: 0x4a6a9a, sunSize: 0.03, sunI: 0.0,
      stars: 0, fogColor: 0x0a0e18, fogDensity: 0.011,
      hemiSky: 0x4a6fa8, hemiGround: 0x1a2030, hemiI: 0.85,
      dirColor: 0x8fb4e0, dirI: 0.4, ambientI: 0.3,
      exposure: 1.0, bloomS: 0.45, bloomR: 0.6, bloomT: 0.8, vignette: 1.0,
      ...o,
    });

    this.beats = [
      B(
        '广场 · Before the Clan Leader’s Pavilion',
        `<b>More than a hundred fifteen-year-old youths gather before the Clan Leader’s Pavilion.</b>
         <span class="stage">Five stories, projected eaves, upturned corners — the centre of power for the entire village. The Academy Elder, white-haired but vigorous, wastes no words: <i>“Today is the Aperture Opening Ceremony, a major turning point in your lives. Follow me.”</i></span>`,
        w([9, 77, 38], [0, 73.5, -6], 56),
        dayTop,
        {
          auto: 12,
          labels: [
            { text: 'Clan Leader’s Pavilion', sub: 'five storeys · ancestral spirit tablets within', pos: W([0, 88, -12]) },
            { text: 'The Academy Elder', sub: 'holding the roll of names', pos: W([-4, 73.4, 14]) },
            { text: 'A hundred and more youths', sub: 'fifteen years old · their futures in one morning', pos: W([6, 74, 20]) },
          ],
          audio: { wind: 0.6, shimmer: 0.3 },
        },
      ),

      B(
        '地下溶洞 · Descent into the cavern',
        `<b>They do not go upstairs — they go down.</b>
         <span class="stage">Stone steps into an underground cavern: stalactites radiate seven colours — red, orange, yellow, green, cyan, blue, violet — illuminating every face with rainbow brilliance. Several hundred years ago the Gu Yue clan migrated from Central Continent to Southern Border and settled here for one reason: <b>the spirit spring below</b>, producing primeval stones — the very foundation of Gu Yue Village.</span>`,
        w([13, 34, 33], [1, 16, -8], 58),
        caveEnv({ bloomS: 0.5, bloomT: 0.8 }),
        {
          auto: 14,
          labels: [
            { text: 'Seven-colour stalactites', sub: 'red · orange · yellow · green · cyan · blue · violet', pos: W([0, 36, -8]) },
            { text: 'Primeval stones', sub: 'the spirit spring’s gift — the clan’s foundation', pos: W([-18, 4, -18]), cls: 'wl-blue' },
          ],
          audio: { rumble: 0.5, drip: 1, wind: 0.2 },
          sfx: 'whoosh',
        },
      ),

      B(
        '地下河 · The starlit river & moon orchids',
        `<b>In the darkness, the river gives off a faint blue glow — like the river of stars in the night sky.</b>
         <span class="stage">Just over ten metres wide, so clear you can see the fish, the aquatic plants, the sand and stones of the riverbed. On the opposite bank: a field of <b>moon orchids</b> — crescent petals of blue-pink, stems like jade, centres gleaming like pearls. A blue-green carpet studded with countless pearls. Food for many kinds of Gu.</span>`,
        w([16, 13, 34], [-2, 4, -16], 55),
        caveEnv({ bloomS: 0.45, bloomT: 0.8, hemiI: 0.6 }),
        {
          auto: 15,
          labels: [
            { text: 'Underground River', sub: 'knee-deep · crossing point for the trial', pos: W([-16, 2.4, 2]), cls: 'wl-blue' },
            { text: 'Moon Orchid Field', sub: 'the clan’s largest growing site', pos: W([0, 3.4, -30]) },
            { text: 'Spirit Spring', sub: 'source of primeval qi — and of pressure', pos: W([0, 6, SPRING_Z]), cls: 'wl-blue' },
          ],
          audio: { rumble: 0.4, drip: 1.2, shimmer: 0.35 },
        },
      ),

      B(
        '测验 · Gu Yue Chen Bo — three steps',
        `<b>“Gu Yue Chen Bo: three steps. No aptitude to become a Gu Master.”</b>
         <span class="stage">The river reaches only to his knees. On the far bank an invisible wall resists him; sparse clusters of pure-white light rise from the flowers and enter his body, softening it — but after three steps, the pressure returns like a wall. His face pales: without aptitude, he can only live as a mortal, at the very bottom of the clan's hierarchy. Next: Gu Yue Zao Xie — four steps. None.</span>`,
        w([11, 4.6, 20], [-1, 1.8, -2], 50),
        caveEnv({ bloomS: 0.45, bloomT: 0.8 }),
        {
          auto: 16,
          labels: [
            { text: 'Gu Yue Chen Bo', sub: '3 steps · no aptitude', pos: W([-2, 3.2, 9.5]), cls: 'wl-red' },
          ],
          audio: { drip: 1, rumble: 0.4 },
          sfx: 'tick',
          onEnter: (z, c) => { c.hud.showSteps(true); c.hud.setSteps(0); c.hud.clearGrade(); z.spawnWalker('Gu Yue Chen Bo', 3, 'none'); },
          onExit: (z, c) => c.hud.showSteps(false),
        },
      ),

      B(
        '优等 · Gu Yue Mo Bei — Grade B!',
        `<b>“Excellent! Gu Yue Mo Bei, Grade B aptitude — primeval sea: sixty-six percent.”</b>
         <span class="stage">A horse-faced youth in hemp, tall and fierce: thirty-six steps, faint lights entering him all the way. Grade B means special care, grooming as a future clan elder — Rank 3 in six or seven years. The red-haired Gu Yue Chi Lian sneers at his rival Gu Yue Mo Chen: <i>“Well? My grandson isn't bad, is he?”</i> — five in ten can cultivate; in Gu Yue bloodline, six in ten.</span>`,
        w([-6, 6.2, 24], [3, 2, -6], 49),
        caveEnv({ bloomS: 0.45, bloomT: 0.8 }),
        {
          auto: 17,
          labels: [
            { text: 'Gu Yue Mo Bei', sub: '36 steps · Grade B · primeval sea 66%', pos: W([-3, 3.4, -28]) },
            { text: 'Elders’ shelf', sub: 'two factions · tooth and nail each year', pos: W([-24, 8.4, BANK_NEAR + 6]) },
          ],
          audio: { drip: 1, shimmer: 0.3 },
          onEnter: (z, c) => { c.hud.showSteps(true); c.hud.setSteps(0); c.hud.clearGrade(); z.spawnWalker('Gu Yue Mo Bei', 36, 'B'); },
          onExit: (z, c) => c.hud.showSteps(false),
        },
      ),

      B(
        '暗流 · The grandfather’s hand',
        `<b>“Gu Yue Chi Cheng — thirty-six steps.” Another Grade B; Gu Yue Chi Lian howls with triumph.</b>
         <span class="stage">But Fang Yuan remembers: Chi Cheng's aptitude was actually only Grade C — the deception arranged by his grandfather, one of the clan's two most powerful elders, is what shows thirty-six. Expose it now and earn a small reward, only to make a dangerous enemy; blackmail, and he is far too weak. <i>A sharp gleam flickers in his eyes as he weighs how to exploit this knowledge.</i></span>`,
        w([7, 9, 31], [-19, 5.2, 12], 48),
        caveEnv({ bloomS: 0.45, bloomT: 0.8, fogDensity: 0.015 }),
        {
          auto: 16,
          labels: [
            { text: 'Gu Yue Chi Lian', sub: 'red-haired elder · the rigged thirty-six', pos: W([-30, 8.4, BANK_NEAR + 4.8]), cls: 'wl-red' },
            { text: 'Gu Yue Mo Chen', sub: 'his lifelong rival — watching back', pos: W([-26, 8.4, BANK_NEAR + 7.2]) },
            { text: 'Gu Yue Chi Cheng', sub: 'Grade C, wearing Grade B’s mask', pos: W([3.5, 3.4, -28]), cls: 'wl-red' },
          ],
          audio: { drip: 0.9, rumble: 0.5, drone: 0.4 },
          onEnter: (z, c) => { c.hud.showSteps(true); c.hud.setSteps(0); c.hud.clearGrade(); z.spawnWalker('Gu Yue Chi Cheng', 36, 'C'); },
          onExit: (z, c) => c.hud.showSteps(false),
        },
      ),

      B(
        '点名 · <b>“Gu Yue Fang Yuan!”</b>',
        `<b>The Academy Elder calls his name — and the world turns to look.</b>
         <span class="stage">Countless eyes converge. Among them, the most important pair: <i>“This is getting more and more interesting,”</i> Fang Yuan smiles inwardly — and wades into the river. <b>Next: Chapter 5 — the Hope Gu and the opening of the aperture.</b></span>`,
        w([5.0, 3.2, 9.5], [1.5, 1.8, 20.5], 46),
        caveEnv({ bloomS: 0.5, bloomT: 0.8, dirI: 0.4, hemiI: 0.7 }),
        {
          auto: null,
          labels: [
            { text: 'Gu Yue Fang Yuan', sub: 'the name the whole cavern turns toward', pos: W([1.5, 3.6, 5]), cls: 'wl-red' },
            { text: '“Gu Yue Fang Yuan!”', sub: 'Academy Elder · reading the roll', pos: W([-4, 3.4, 14]) },
          ],
          audio: { drip: 0.7, shimmer: 0.5 },
          sfx: ['hush', 'gong'],
          onEnter: (z, c) => {
            c.hud.showSteps(false);
            z.clearWalker();
            z.refs.spot.material.opacity = 0.3;
            z.refs.spotBase.intensity = 380;
            c.rig.shake(0.2, 1);
            // the crowd turns toward him
            z.refs.crowd.userData.figs.forEach(f => {
              const dx = 1.5 - f.position.x, dz = (BANK_NEAR + 5) - f.position.z;
              f.rotation.y = Math.atan2(dx, dz);
            });
          },
        },
      ),
    ];
  },

  clearWalker() {
    const refs = this.refs;
    if (refs.walker) {
      refs.cave.remove(refs.walker.fig.group);
      refs.walker = null;
    }
  },

  /* spawn a named youth crossing the river */
  spawnWalker(name, targetSteps, grade) {
    const refs = this.refs;
    if (refs.walker) { refs.cave.remove(refs.walker.fig.group); refs.walker = null; }
    const fig = makeFigure({
      robe: [0x5a4a42, 0x4a5560, 0x54485e][targetSteps % 3],
      trim: 0x333a44, sash: 0x3a3a44, hair: 'bun', scale: 1.0,
      blood: 0,
    });
    const startX = rr(-2.5, 2.5);
    fig.group.position.set(startX, 0, BANK_NEAR);
    fig.group.rotation.y = Math.PI; // facing -z
    fig.setPose('walk');
    refs.cave.add(fig.group);
    // hope-lights rising from flowers into the walker
    const stream = createHopeStream({
      count: 260,
      target: new THREE.Vector3(0, 1.1, 0),
      sources: Array.from({ length: 60 }, () => [rr(-2.6, 2.6), rr(0.1, 0.5), rr(-2.2, 1.4)]),
      color: 0xf8f4e0, size: 2.2,
    });
    fig.group.add(stream);
    refs.walker = {
      fig, name, targetSteps, grade, steps: 0, t: 0, done: false, stream,
      startX,
    };
    refs.walker.totalDist = Math.abs(stepZ(targetSteps) - BANK_NEAR);
  },

  update(ctx, t, dt, beat) {
    const r = this.refs;
    if (!r) return;

    r.river.material.uniforms.uTime.value = t;
    r.under.userData.update?.(t);
    r.dust.userData.update(t);
    r.ripples.update(dt);
    r.srune.material.opacity = 0.28 + 0.18 * Math.sin(t * 1.3);
    r.qiCol.material.opacity = 0.22 + 0.12 * Math.sin(t * 2.1);
    r.springLight.intensity = 42 + Math.sin(t * 3.4) * 7;
    r.stepMarks.forEach((m, i) => { m.material.opacity = 0.55 + 0.3 * Math.sin(t * 2 + i); });
    r.shafts.forEach((s, i) => { s.material.opacity = 0.16 + 0.1 * Math.sin(t * 1.1 + i * 1.7); });

    if (beat !== 6 && Math.abs(r.fy.group.position.z - (BANK_NEAR + 5)) > 0.01) {
      r.fy.group.position.z = BANK_NEAR + 5;
      r.fy.group.position.x = 1.5;
      r.fy.setPose('stand');
    }
    animateFigure(r.fy, t);
    r.elders.forEach((e, i) => animateFigure(e.fig, t));
    animateFigure(r.acad, t);

    /* walker state machine */
    const wk = r.walker;
    if (wk && !wk.done) {
      wk.t += dt;
      const fig = wk.fig;
      const zTarget = stepZ(wk.targetSteps);
      const zCur = fig.group.position.z;
      const dir = Math.sign(zTarget - BANK_NEAR); // -1 (going -z)
      const speed = 3.1;
      if (Math.abs(zCur - zTarget) > 0.15) {
        fig.group.position.z += dir * speed * dt;
        const z = fig.group.position.z;
        // wade path: drift gently toward the crossing lane
        const prog = (BANK_NEAR - z) / Math.max(0.01, BANK_NEAR - zTarget);
        fig.group.position.x = wk.startX * (1 - prog) + 0.5 * prog;
        fig.group.position.y = 0;
        // step count
        const n = Math.max(0, Math.round((BANK_NEAR - 1.6 - z) / 1.12));
        if (n !== wk.steps) {
          wk.steps = n;
          ctx.hud.setSteps(n);
          ctx.audio.sfx('tick');
        }
        // pressure resistance: slow down near the end
      } else {
        wk.done = true;
        fig.setPose(wk.grade === 'none' ? 'clutch' : wk.grade === 'C' ? 'kneel' : 'crossed');
        ctx.audio.sfx(wk.grade === 'none' ? 'dread' : 'bell');
        if (wk.grade === 'B') ctx.hud.setSteps(wk.targetSteps, 'GRADE B · PRIMEVAL SEA 66%');
        else if (wk.grade === 'C') ctx.hud.setSteps(wk.targetSteps, '— THE ROLL SAYS B —');
        else ctx.hud.setSteps(wk.targetSteps, 'NO APTITUDE');
      }
      // hope-lights follow
      wk.stream.userData.uniforms.uTime.value = t;
      wk.stream.userData.setActive(wk.done ? 0.25 : 1);
      // head down at the wall
      if (wk.done) fig.parts.head.rotation.x = 0.3;
    } else if (wk && wk.done) {
      wk.stream.userData.uniforms.uTime.value = t;
    }

    /* final spotlight breathing */
    if (beat === 6) {
      r.spot.material.opacity = 0.24 + 0.09 * Math.sin(t * 2.4);
      r.spotBase.intensity = 300 + Math.sin(t * 2.4) * 45;
      // protagonist steps forward slightly
      r.fy.group.position.z = BANK_NEAR + 5 - Math.min(2.2, ctx.state.beatT * 0.5);
      r.fy.setPose('walk');
    }
  },
};
