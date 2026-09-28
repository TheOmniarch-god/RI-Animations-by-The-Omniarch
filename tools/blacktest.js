const puppeteer = require('puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  const msgs = [];
  page.on('console', m => msgs.push(m.type() + ': ' + m.text().slice(0, 300)));
  page.on('pageerror', e => msgs.push('PAGEERROR: ' + e.message.slice(0, 500)));
  page.on('requestfailed', r => msgs.push('REQFAIL: ' + r.url().slice(0, 200) + ' ' + (r.failure() && r.failure().errorText)));
  await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  for (const t of [1, 3, 6, 10]) {
    await sleep(t === 1 ? 1000 : 3000);
    const state = await page.evaluate(() => {
      const loader = document.getElementById('loader');
      const menu = document.getElementById('menu');
      const fade = document.getElementById('fade');
      const flash = document.getElementById('flash');
      const vis = el => el ? { display: getComputedStyle(el).display, opacity: getComputedStyle(el).opacity, cls: el.className, hidden: el.classList.contains('hidden') } : null;
      return {
        ready: window.__ready || false,
        loader: vis(loader),
        menu: vis(menu),
        fade: vis(fade),
        flash: vis(flash),
        mode: window.__world ? window.__world.state.mode : 'no-world',
        canvas: !!document.querySelector('canvas'),
        bodyChildren: document.body.children.length,
      };
    }).catch(e => ({ err: e.message }));
    console.log('t=' + t, JSON.stringify(state));
    await page.screenshot({ path: `/tmp/ri-shots/black_t${t}.png` });
  }
  console.log('--- console (' + msgs.length + ') ---');
  msgs.slice(0, 40).forEach(m => console.log(m));
  await browser.close();
})();
