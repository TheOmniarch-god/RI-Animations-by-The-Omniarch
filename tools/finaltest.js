const puppeteer = require('puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const out = {};

  // --- A: auto-advance mechanism (headless is slow-motion, so inject beatT) ---
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 150)); });
    await page.goto('http://localhost:8080/?z=z1&b=0', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window.__ready === true', { timeout: 30000 });
    await sleep(1500);
    out.beatBefore = await page.evaluate(() => window.__world.state.beat);
    await page.evaluate(() => { window.__world.state.beatT = 9999; });
    await sleep(700);
    out.beatAfterInject = await page.evaluate(() => window.__world.state.beat);
    // quality sampler exercised (slow fps → should step down without errors)
    await sleep(3200);
    out.qualityErrors = errs;
    await page.close();
  }

  // --- B: full click-through inside a sandboxed iframe (exact preview conditions) ---
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    const errs = [];
    page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !m.text().includes('404')) errs.push('CONSOLE ' + m.text().slice(0, 200)); });
    await page.goto('http://localhost:8080/preview_sim.html', { waitUntil: 'domcontentloaded' });
    await sleep(6000); // let menu boot inside iframe
    // click Chapter 1 card (coords inside iframe = same viewport coords; card row1 left)
    await page.mouse.click(275, 560);
    await sleep(6000);
    await page.screenshot({ path: '/tmp/ri-shots/iframe_zone.png' });
    // click next-beat arrow (bottom center-right of viewport, inside world HUD)
    await page.mouse.click(713, 678);
    await sleep(2500);
    await page.screenshot({ path: '/tmp/ri-shots/iframe_beat1.png' });
    out.iframeErrors = errs;
    await page.close();
  }

  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
