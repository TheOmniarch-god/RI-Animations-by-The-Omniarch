// verify_ch1.js — close-up verification of the Chapter 1 rig integration.
// Face-level shots of Fang Yuan through the beat sequence (headless, 2K test
// textures, real world code). Writes animation/ch1/verify_*.png
const puppeteer = require('puppeteer');
const wait = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const OUT = '/home/user/ri-project/animation/ch1';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({ headless: 'shell', args: [
    '--no-sandbox', '--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader',
    '--window-size=512,512', '--js-flags=--max-old-space-size=600',
  ] });
  const page = await browser.newPage();
  await page.setViewport({ width: 512, height: 512 });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => errs.push('PAGE: ' + e.message.slice(0, 200)));
  await page.evaluateOnNewDocument(() => {
    window.__charUrls = {
      fang_yuan: 'characters/_t/fang_yuan.glb', fang_zheng: 'characters/_t/fang_zheng.glb',
      shen_cui: 'characters/_t/shen_cui.glb', gu_yue_elder: 'characters/_t/gu_yue_elder.glb',
    };
  });
  await page.goto('http://127.0.0.1:8080/?z=z1&b=0&auto=0', { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(
    () => window.__world && window.__world.chars.status === 'done' && window.__world.state.zone.refs.fy.animator,
    { timeout: 300000, polling: 500 },
  );

  // headless runs ~0.27x: wait on BOTH clocks (pose = animator t, crowd = beatT)
  const waitBoth = async (target, timeoutMs = 150000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      const s = await page.evaluate(() => ({
        at: window.__world.state.zone.refs.fy.animator.state.t,
        bt: window.__world.state.beatT,
      }));
      if (s.at >= target && s.bt >= target) return s;
      await wait(400);
    }
    throw new Error(`clocks never reached ${target}`);
  };

  const shot = async (name) => {
    await wait(400); // let the last frame settle
    await page.screenshot({ path: `${OUT}/${name}.png` });
    console.log('shot:', name);
  };

  // close-up anchor from his CURRENT facing (group yaw + root yaw)
  const faceShot = async (name, dist = 2.3, fov = 38, back = false) => {
    await page.evaluate(({ dist, fov, back }) => {
      const w = window.__world, z = w.state.zone, fy = z.refs.fy;
      const base = fy.group.position;
      const yaw = fy.group.rotation.y + (fy.rig ? fy.rig.skinned.rotation.y : 0) + (back ? Math.PI : 0);
      const d = back ? 2.1 : dist;
      const headY = base.y + 1.62;
      const pos = [Math.sin(yaw) * d, headY + 0.1, Math.cos(yaw) * d];
      const look = [0, base.y + 1.35, 0];
      w.rig().setAnchor({ pos, look, fov }, true);
    }, { dist, fov, back });
    await wait(900);
    await shot(name);
  };

  const state = () => page.evaluate(() => {
    const w = window.__world, z = w.state.zone, fy = z.refs.fy;
    return {
      beat: w.state.beat,
      anim: fy.animator.state.name,
      animT: +fy.animator.state.t.toFixed(2),
      beatT: +w.state.beatT.toFixed(2),
      yaw: +(fy.group.rotation.y + fy.rig.skinned.rotation.y).toFixed(2),
      fyY: +fy.rig.skinned.position.y.toFixed(3),
    };
  });

  console.log('--- A: idle (beat 0), face close-up');
  await waitBoth(1.5);
  console.log(JSON.stringify(await state()));
  await faceShot('verify_A_idle_face');

  console.log('--- B: the full turn (beat 1), facing the host');
  await page.evaluate(() => window.__world.gotoBeat(1, true));
  await waitBoth(3.7);
  console.log(JSON.stringify(await state()));
  await faceShot('verify_B_turned_face');
  // wide: the whole summit, recoil complete (beat-1 camera framing)
  await page.evaluate(() => {
    window.__world.rig().setAnchor({ pos: [7.2, 4.6, 9.4], look: [0, 2.35, 0], fov: 42 }, true);
  });
  await waitBoth(5.4);
  console.log(JSON.stringify(await state()));
  await shot('verify_C_summit_recoil_wide');

  console.log('--- D: the dying verse (beat 2), over-the-shoulder west gaze');
  await page.evaluate(() => window.__world.gotoBeat(2, true));
  await waitBoth(3.2);
  console.log(JSON.stringify(await state()));
  await faceShot('verify_D_verse_west', 2.6, 40, true);

  console.log('--- E: self-detonation (beat 3), brace close-up');
  await page.evaluate(() => window.__world.gotoBeat(3, true));
  await waitBoth(1.5);
  console.log(JSON.stringify(await state()));
  await faceShot('verify_E_brace_blast', 3.0, 44);

  const fe = errs.filter(e => !/net::ERR|404|Draco/i.test(e));
  console.log('\nerrors:', fe.length ? fe.slice(0, 8) : 'none');
  await browser.close();
})().catch(e => { console.error('VERIFY FAILED:', e.message); process.exit(1); });
