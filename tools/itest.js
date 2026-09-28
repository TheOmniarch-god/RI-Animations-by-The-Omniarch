const puppeteer = require('puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 200)); });
  const steps = {};
  try {
    await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction('window.__ready === true', { timeout: 30000 });
    await sleep(1500);
    steps.menuInitiallyVisible = await page.evaluate(() => !document.getElementById('menu').classList.contains('hidden'));

    // 1. click Chapter 3 card
    await page.evaluate(() => document.querySelectorAll('#chapter-cards .card')[2].click());
    await page.waitForFunction('window.__world.state.zone && window.__world.state.zone.id === "z3" && !window.__world.state.transitioning', { timeout: 25000 }).catch(() => {});
    await sleep(2000);
    steps.afterCardPick = await page.evaluate(() => ({ zone: window.__world.state.zone?.id, beat: window.__world.state.beat, mode: window.__world.state.mode }));

    // 2. ArrowRight → next beat
    const b0 = await page.evaluate(() => window.__world.state.beat);
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(`window.__world.state.beat === ${b0 + 1}`, { timeout: 15000 }).catch(() => {});
    await sleep(800);
    steps.afterArrow = await page.evaluate(() => window.__world.state.beat);

    // 3. drag look + wheel zoom
    const box = await (await page.$('canvas')).boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 200, box.y + box.height / 2 + 70, { steps: 12 });
    await page.mouse.up();
    await page.mouse.wheel({ deltaY: -420 });
    await sleep(700);
    steps.afterDragWheel = 'ok';

    // 4. next buttons ×2
    await page.click('#btn-next'); await sleep(1600);
    await page.click('#btn-next'); await sleep(1600);
    steps.afterNextBtns = await page.evaluate(() => window.__world.state.beat);

    // 5. Space → next
    await page.keyboard.press('Space');
    await sleep(1600);
    steps.afterSpace = await page.evaluate(() => window.__world.state.beat);

    // 6. ESC → menu
    await page.keyboard.press('Escape');
    await sleep(1400);
    steps.afterEsc = await page.evaluate(() => ({
      menuVisible: !document.getElementById('menu').classList.contains('hidden'),
      mode: window.__world.state.mode,
      zone: window.__world.state.zone?.id ?? null,
    }));

    // 7. pick Chapter 1 card from menu
    await page.evaluate(() => document.querySelectorAll('#chapter-cards .card')[0].click());
    await page.waitForFunction('window.__world.state.zone && window.__world.state.zone.id === "z1"', { timeout: 25000 }).catch(() => {});
    await sleep(2200);
    steps.afterPickZ1 = await page.evaluate(() => ({ zone: window.__world.state.zone?.id, beat: window.__world.state.beat }));

    // 8. jump to last z1 beat via dot (goBeat), check nextzone button
    await page.evaluate(() => window.__world.gotoBeat(5));
    await sleep(2200);
    steps.lastBeat = await page.evaluate(() => ({
      beat: window.__world.state.beat,
      nextzoneVisible: !document.getElementById('btn-nextzone').classList.contains('hidden'),
    }));

    // 9. Next Chapter button → z2
    await page.click('#btn-nextzone');
    await page.waitForFunction('window.__world.state.zone && window.__world.state.zone.id === "z2"', { timeout: 25000 }).catch(() => {});
    await sleep(2000);
    steps.afterNextZone = await page.evaluate(() => ({ zone: window.__world.state.zone?.id, beat: window.__world.state.beat }));

    // 10. mute toggle + prev
    await page.keyboard.press('m'); await sleep(300);
    await page.keyboard.press('ArrowLeft'); await sleep(1600);
    steps.afterMutePrev = await page.evaluate(() => ({ beat: window.__world.state.beat, muted: window.__world.audio?.muted }));

    // 11. Map button → menu
    await page.click('#btn-menu');
    await sleep(1400);
    steps.afterMapBtn = await page.evaluate(() => ({
      menuVisible: !document.getElementById('menu').classList.contains('hidden'),
      mode: window.__world.state.mode,
    }));
  } catch (e) {
    steps.FATAL = e.message;
  }
  console.log(JSON.stringify(steps, null, 1));
  console.log('ERRORS(' + errors.length + '):');
  errors.slice(0, 20).forEach(e => console.log('  ' + e));
  await browser.close();
})();
