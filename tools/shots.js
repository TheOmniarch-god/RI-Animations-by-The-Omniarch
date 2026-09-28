// screenshot & runtime-error harness
const fs = require('fs');
try { fs.mkdirSync('/tmp/ri-shots', { recursive: true }); } catch (e) {}
const puppeteer = require('puppeteer');
const fs = require('fs');

const BASE = 'http://localhost:8080/';

async function main() {
  const targets = process.argv.slice(2);
  const list = targets.length ? targets : ['menu', 'z1:0', 'z1:3', 'z1:4', 'z2:0', 'z4:3', 'z5:5'];
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox', '--disable-setuid-sandbox',
      '--use-gl=angle', '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--window-size=1600,900',
    ],
    defaultViewport: { width: 1600, height: 900 },
  });
  const errors = {};
  for (const t of list) {
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
    page.on('console', m => {
      if (m.type() === 'error' || m.type() === 'warning') {
        const txt = m.text();
        if (!/favicon|Autofill|SwiftShader|GPU stall|Automatic fallback|GroupMarkerNotSet/i.test(txt))
          errs.push(m.type().toUpperCase() + ': ' + txt);
      }
    });
    await page.evaluateOnNewDocument(() => { window.__hq = true; });
  await page.evaluateOnNewDocument(async () => {
      try {
        const THREE = await import('/lib/three/three.module.js');
        const orig = THREE.Object3D.prototype.add;
        THREE.Object3D.prototype.add = function (...args) {
          for (const a of args) {
            if (!a || !a.isObject3D) {
              console.error('BADADD_STACK: ' + (a === undefined ? 'undefined' : typeof a) + '\n' + new Error().stack.split('\n').slice(1, 7).join('\n'));
            }
          }
          return orig.apply(this, args);
        };
      } catch (e) { console.error('tracer fail ' + e.message); }
    });
    let url = BASE;
    if (t !== 'menu') {
      const [z, b] = t.split(':');
      url += `?z=${z}&b=${b || 0}&auto=0&snap=1`;
    }
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForFunction('window.__ready === true', { timeout: 30000 });
      await new Promise(r => setTimeout(r, 3800)); // let env settle & intro play
      const probe = await page.evaluate(() => ({
        zone: window.__world.state.zone?.id,
        beat: window.__world.state.beat,
        cap: (document.getElementById('cap-kicker').textContent || '').slice(0, 40),
        ch: document.getElementById('hud-cn').textContent,
      })).catch(e => ({ err: e.message }));
      console.log('   probe:', JSON.stringify(probe));
      const zmatch = t.match(/@(\d+)$/);
      if (zmatch) {
        const n = parseInt(zmatch[1], 10);
        await page.evaluate((k) => {
          const el = document.querySelector('canvas') || document.body;
          for (let i = 0; i < k; i++) {
            el.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, clientX: 700, clientY: 350, bubbles: true, cancelable: true }));
          }
        }, n);
        await new Promise(r => setTimeout(r, 3600)); // rig lerp settle at swiftshader fps
      }
      const name = t.replace(':', '_').replace('@', '_z');
      await page.screenshot({ path: `/tmp/ri-shots/${name}.png` });
      console.log(`✓ ${t} -> shots/${name}.png` + (errs.length ? `  [${errs.length} errors]` : ''));
    } catch (e) {
      console.log(`✗ ${t}: ${e.message}`);
    }
    if (errs.length) errors[t] = errs.slice(0, 12);
    await page.close();
  }
  await browser.close();
  if (Object.keys(errors).length) {
    console.log('\n===== RUNTIME ISSUES =====');
    for (const [k, v] of Object.entries(errors)) {
      console.log(`--- ${k}`);
      v.forEach(e => console.log('   ' + e));
    }
    process.exitCode = 2;
  } else console.log('\nNo runtime errors captured.');
}
main();
