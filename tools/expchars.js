// GLB character exporter: node expchars.js <outdir>
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const outdir = process.argv[2] || require('path').join(__dirname, '..', 'characters');
  fs.mkdirSync(outdir, { recursive: true });
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader', '--window-size=900,700'],
    defaultViewport: { width: 900, height: 700 },
  });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (!/favicon|SwiftShader|GPU|GroupMarker|Automatic fallback/i.test(t)) errs.push('CONSOLE: ' + t); } });
  await page.goto('http://localhost:8080/charsheet.html', { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForFunction('window.__sheetReady === true', { timeout: 20000 });
  const ids = await page.evaluate(() => window.__charIds);
  const meta = await page.evaluate(() => window.__charMeta);
  const recipes = [];
  for (const id of ids) {
    const b64 = await page.evaluate((i) => window.__exportGLB(i), id);
    const buf = Buffer.from(b64, 'base64');
    fs.writeFileSync(path.join(outdir, id + '.glb'), buf);
    const m = meta.find(x => x.id === id);
    recipes.push({ file: id + '.glb', ...m, bytes: buf.length });
    console.log(`✓ ${id}.glb ${(buf.length / 1024).toFixed(1)}KB`);
  }
  fs.writeFileSync(path.join(outdir, 'recipes.json'), JSON.stringify(recipes, null, 2));
  console.log('recipes.json written —', ids.length, 'characters');
  if (errs.length) { console.log('ERRORS:'); errs.forEach(e => console.log(' ', e)); process.exitCode = 2; }
  else console.log('clean export');
  await browser.close();
})();
