// close-up face camera probe: node facecam.js zN:beat lookY dist fov
const fs = require('fs');
try { fs.mkdirSync('/tmp/ri-shots', { recursive: true }); } catch (e) {}
const puppeteer = require('puppeteer');
(async () => {
  const [zb = 'z1:1', lookY = '0.95', dist = '0.55', fov = '40'] = process.argv.slice(2);
  const [z, b] = zb.split(':');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader', '--window-size=1600,900'],
    defaultViewport: { width: 1600, height: 900 },
  });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (!/favicon|SwiftShader|GPU stall|GroupMarker/i.test(t)) errs.push('CONSOLE: ' + t); } });
  await page.evaluateOnNewDocument(() => { window.__hq = true; });
  await page.goto(`http://localhost:8080/?z=${z}&b=${b}&auto=0&snap=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction('window.__ready === true', { timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));
  const info = await page.evaluate((ly, d, fv) => {
    const rig = window.__world.rig();
    const before = { look: rig.tgtLook.toArray().map(v => +v.toFixed(2)), pos: rig.tgtPos.toArray().map(v => +v.toFixed(2)) };
    rig.tgtLook.y += parseFloat(ly);
    rig.dist = parseFloat(d);
    rig.tgtFov = parseFloat(fv);
    return before;
  }, lookY, dist, fov);
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: `/tmp/ri-shots/facecam_${zb.replace(':', '_')}.png` });
  console.log('anchor:', JSON.stringify(info), errs.length ? 'ERRORS:' + errs.join(' | ') : 'clean');
  await browser.close();
})();
