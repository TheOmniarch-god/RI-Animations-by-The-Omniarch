// ch1check.js — headless Chapter-1 integration check against the live server.
// Drives the real world (?z=z1&b=0&auto=0) with 2K test textures, steps
// through beats 0-3, screenshots each, and reports the animator state.
const puppeteer = require('puppeteer');

const BASE = process.env.BASE || 'http://127.0.0.1:8080';
const OUT = process.env.OUT || '/home/user/ri-project/animation/ch1';
const fs = require('fs');
fs.mkdirSync(OUT, { recursive: true });

const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: 'shell',
    args: [
      '--no-sandbox', '--disable-gpu', '--use-gl=swiftshader',
      '--enable-unsafe-swiftshader',
      '--window-size=512,512', '--force-color-profile=srgb',
      '--js-flags=--max-old-space-size=600',
    ],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 512, height: 512 });
  const errs = [], warns = [];
  page.on('console', m => {
    if (m.type() === 'error') errs.push(m.text());
    else if (m.type() === 'warning') warns.push(m.text());
  });
  page.on('pageerror', e => errs.push('PAGE: ' + e.message));
  page.on('requestfailed', r => errs.push('REQFAIL: ' + r.url().split('/').slice(-2).join('/') + ' ' + (r.failure() || {}).errorText));

  // 2K test archive (headless RAM budget); production uses the 4K originals
  await page.evaluateOnNewDocument(() => {
    window.__charUrls = {
      fang_yuan: 'characters/_t/fang_yuan.glb',
      fang_zheng: 'characters/_t/fang_zheng.glb',
      shen_cui: 'characters/_t/shen_cui.glb',
      gu_yue_elder: 'characters/_t/gu_yue_elder.glb',
    };
  });

  console.log('goto', BASE + '/?z=z1&b=0&auto=0');
  await page.goto(BASE + '/?z=z1&b=0&auto=0', { waitUntil: 'load', timeout: 180000 });

  try {
    await page.waitForFunction(
      () => window.__world && window.__world.chars && window.__world.chars.status === 'done',
      { timeout: 300000, polling: 500 },
    );
    console.log('chars done');
  } catch (e) {
    console.log('WAIT1 FAILED (chars.status done). console so far:');
    errs.slice(0, 20).forEach(x => console.log('  E ' + x.slice(0, 200)));
    await page.screenshot({ path: OUT + '/fail1.png' }).catch(() => {});
    throw e;
  }
  // wait until the fang_yuan instance is swapped AND auto-rigged
  try {
    await page.waitForFunction(
      () => {
        const z = window.__world.state && window.__world.state.zone;
        return z && z.refs && z.refs.fy && z.refs.fy.animator;
      },
      { timeout: 300000, polling: 500 },
    );
    console.log('fy animator ready');
  } catch (e) {
    console.log('WAIT2 FAILED (fy.animator). state:');
    const dbg = await page.evaluate(() => {
      const w = window.__world, z = w.state.zone;
      return {
        swapped: Object.fromEntries([...w.chars.swapped.entries()]),
        fyIsGLB: !!z.refs.fy.isGLB,
        fyHasRig: !!(z.refs.fy.rig),
        fyHasAnim: !!(z.refs.fy.animator),
      };
    }).catch(x => ({ eval: x.message }));
    console.log(JSON.stringify(dbg));
    errs.slice(0, 20).forEach(x => console.log('  E ' + x.slice(0, 200)));
    await page.screenshot({ path: OUT + '/fail2.png' }).catch(() => {});
    throw e;
  }
  await wait(1200);

  const info = () => page.evaluate(() => {
    const w = window.__world, z = w.state.zone, fy = z.refs.fy;
    const a = fy.animator, sk = fy.rig && fy.rig.skinned;
    const head = a && fy.rig.byName.head.rotation;
    const hero0 = z.refs.heroes[0].group;
    return {
      beat: w.state.beat,
      anim: a ? a.state.name : null,
      animT: a ? +a.state.t.toFixed(2) : null,
      bodyYaw: sk ? +sk.rotation.y.toFixed(2) : null,
      headYaw: head ? +head.y.toFixed(2) : null,
      fyY: sk ? +sk.position.y.toFixed(2) : null,
      hero0X: +hero0.position.x.toFixed(2),
      hero0Z: +hero0.position.z.toFixed(2),
      swapped: Object.fromEntries([...w.chars.swapped.entries()]),
      eldersGLB: z.refs.eldersInside.map(e => !!e.isGLB),
    };
  });

  // headless shell runs occlusion-throttled (~0.27x real time), so wait on
  // ANIM time, not wall time
  let pollN = 0;
  const waitAnim = async (target, timeoutMs = 120000) => {
    const t0 = Date.now();
    pollN = 0;
    while (Date.now() - t0 < timeoutMs) {
      const at = await page.evaluate(() => {
        const a = window.__world.state.zone.refs.fy.animator;
        return a ? a.state.t : 0;
      });
      if (pollN < 4) console.log(`  poll ${pollN++}: animT=${typeof at} ${at}`);
      if (at >= target) { console.log(`  reached ${target} in ${((Date.now() - t0) / 1000).toFixed(1)}s`); return at; }
      await wait(500);
    }
    throw new Error(`animT never reached ${target}`);
  };

  const plan = [
    [0, 2.0, 'summit siege — idle breathing'],
    [1, 4.8, 'the slow turn + host recoil (full)'],
    [2, 3.2, 'the dying verse — full west gaze'],
    [3, 1.4, 'self-detonation brace + blast'],
  ];
  const report = [];
  for (const [i, target, note] of plan) {
    await page.evaluate(bi => window.__world.gotoBeat(bi, true), i);
    await waitAnim(target);
    const s = await info();
    const png = `${OUT}/beat${i}.png`;
    await page.screenshot({ path: png });
    s.note = note;
    report.push(s);
    console.log(`beat ${i} (${note}):`, JSON.stringify(s));
  }

  // beat 3 -> back to beat 1: does the figure stand again (pose continuity)?
  await page.evaluate(() => window.__world.gotoBeat(1, true));
  await waitAnim(4.8);
  const back = await info();
  back.note = 'back to beat 1 after the blast';
  report.push(back);
  await page.screenshot({ path: `${OUT}/beat1_return.png` });
  console.log('return check:', JSON.stringify(back));

  const filteredErrs = errs.filter(e => !/net::ERR|404|Draco.*\.js/i.test(e));
  console.log('\n=== console errors:', filteredErrs.length ? '' : 'none');
  filteredErrs.slice(0, 10).forEach(e => console.log('  ' + e.slice(0, 200)));
  console.log('=== warnings:', warns.length);
  warns.slice(0, 6).forEach(w => console.log('  ' + w.slice(0, 160)));
  console.log('\nreport:', JSON.stringify(report, null, 1));
  await browser.close();
})().catch(e => { console.error('CHECK FAILED:', e.message); process.exit(1); });
