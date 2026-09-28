// studiotests.js — studio-lit portrait of each cast GLB via characters/viewer.html
const fs = require('fs');
try { fs.mkdirSync('/tmp/ri-shots', { recursive: true }); } catch (e) {}
const puppeteer = require('puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const ids = ['fang_yuan', 'fang_zheng', 'shen_cui', 'gu_yue_elder'];
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader', '--window-size=900,900'],
    defaultViewport: { width: 900, height: 900 },
  });
  for (const id of ids) {
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !/favicon|SwiftShader|GPU/i.test(m.text())) errs.push(m.text().slice(0, 150)); });
    await page.goto(`http://localhost:8080/characters/viewer.html?m=${id}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction('window.__loaded === true', { timeout: 45000 });
    await sleep(2600); // shadow maps + draco settle
    await page.screenshot({ path: `/tmp/ri-shots/studio_${id}.png` });
    const label = await page.evaluate(() => document.getElementById('label').textContent);
    console.log(id, '→', label, errs.length ? 'ERRORS: ' + errs.join(' | ') : '(clean)');
    await page.close();
  }
  await browser.close();
})();
