const puppeteer = require('puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  const msgs = [];
  // catch messages from the sandboxed child frame too
  page.on('console', m => msgs.push('[' + (m.location() && m.location().url ? 'frame' : 'top') + '] ' + m.type() + ': ' + m.text().slice(0, 250)));
  page.on('pageerror', e => msgs.push('TOP-ERR: ' + e.message.slice(0, 300)));
  await page.goto('http://localhost:8080/preview_sim.html', { waitUntil: 'domcontentloaded' });
  await sleep(8000);
  // probe inside iframe (same origin? sandboxed = opaque origin -> can't evaluate; check via screenshot only)
  await page.screenshot({ path: '/tmp/ri-shots/iframe_t8.png' });
  console.log('shot iframe_t8 taken; msgs=' + msgs.length);
  msgs.slice(0, 25).forEach(m => console.log(m));
  await browser.close();
})();
