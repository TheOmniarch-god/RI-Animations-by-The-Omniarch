// charverify.js — in-browser proof that the four cast GLBs load, swap in, and render.
// Usage: node tools/charverify.js   (server must be running on :8080)
const fs = require('fs');
try { fs.mkdirSync('/tmp/ri-shots', { recursive: true }); } catch (e) {}
const puppeteer = require('puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader', '--window-size=1600,900'],
    defaultViewport: { width: 1600, height: 900 },
  });
  const page = await browser.newPage();
  const errs = [], infos = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  page.on('console', m => {
    const t = m.text();
    if (m.type() === 'error' && !/favicon|SwiftShader|GPU stall|GroupMarker/i.test(t)) errs.push('CONSOLE: ' + t.slice(0, 200));
    if (/charassets|draco/i.test(t)) infos.push(m.type().toUpperCase() + ' ' + t.slice(0, 200));
  });
  await page.goto('http://localhost:8080/?z=z1&b=1&auto=0&snap=1', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction('window.__ready === true', { timeout: 30000 });
  await sleep(2000);
  // wait for the char store to finish (4 GLBs + draco decode under swiftshader)
  const done = await page.waitForFunction(
    `(() => { const c = window.__world.chars;
      return c && c.status === 'done' ? { ready: [...c.ready.keys()], swapped: [...c.swapped.entries()] } : null; })()`,
    { timeout: 60000 }
  ).then(h => h.jsonValue());
  await sleep(1500);

  // wide zone shot (characters visible in scene)
  await page.screenshot({ path: '/tmp/ri-shots/chars_zone.png' });

  // Fang Yuan face close-up (z1 b1 anchor: look [0,2.35,0])
  await page.evaluate(() => {
    const rig = window.__world.rig();
    rig.tgtLook.set(0, 2.35, 0);
    rig.dist = 2.2;
    rig.tgtFov = 35;
  });
  await sleep(2500);
  await page.screenshot({ path: '/tmp/ri-shots/chars_face.png' });

  console.log(JSON.stringify({ done, errs, infos: infos.slice(0, 12) }, null, 1));
  await browser.close();
  process.exit(errs.length ? 1 : 0);
})();
