#!/usr/bin/env node
// ============================================================
// tripo_cast.js — cast the RI main cast via the Tripo3D API
//
// Usage (key comes from the environment — never from a file):
//   TRIPO_API_KEY=*** node tools/tripo_cast.js test        # ONE cheap test: shen_cui
//   TRIPO_API_KEY=*** node tools/tripo_cast.js all         # full main cast (4 generations)
//   TRIPO_API_KEY=*** node tools/tripo_cast.js fang_yuan   # a single character
//   add --detailed for HD textures on the final pass (costs more credits)
//
// Flow: POST /v3/generation/text-to-model -> task_id
//       GET  /v3/tasks/{task_id} every 3s until success (10-120s typical)
//       download output.model_url -> characters/<id>.glb
//                output.rendered_image_url -> characters/previews/<id>.png
//
// The world app (world/js/charassets.js) picks the new GLBs up automatically:
// overwrite characters/fang_yuan.glb / fang_zheng.glb / shen_cui.glb /
// gu_yue_elder.glb and the realistic characters appear in every scene.
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const API = 'https://openapi.tripo3d.ai';
const MODEL = 'v3.1-20260211';
const OUT_DIR = path.join(__dirname, '..', 'characters');
const PREVIEW_DIR = path.join(OUT_DIR, 'previews');

// Prompts: plain text, <1024 chars, no emoji (API limits)
const CAST = {
  shen_cui: {
    title: 'Shen Cui (maidservant)',
    prompt:
      'Realistic 3D character model, a 16-year-old East Asian maidservant girl with a soft, ' +
      'meek, downcast expression, black hair in a low bun with a small gold pearl hairpin, ' +
      'slender frame, wearing a muted green Chinese tunic and skirt with a dark green sash, ' +
      'standing in A-pose, full body, single character, high-detail PBR textures on skin and cloth, ' +
      'dark fantasy xianxia style, neutral gray studio background, no props',
  },
  fang_yuan: {
    title: 'Fang Yuan (Demon Fang Yuan, ~15)',
    prompt:
      'Realistic 3D character model, a 15-year-old East Asian boy with sharp, cold, emotionless eyes ' +
      'and pale skin, long wild messy black hair, thin wiry build, wearing a tattered dark emerald-green ' +
      'Chinese hanfu robe with faded blood stains, torn hems and a dark sash belt, standing in A-pose, ' +
      'full body, single character, high-detail PBR textures on skin and cloth, dark fantasy xianxia style, ' +
      'neutral gray studio background, no props',
  },
  fang_zheng: {
    title: 'Fang Zheng (twin)',
    prompt:
      'Realistic 3D character model, a 15-year-old East Asian boy with a gentle, earnest kind face and warm ' +
      'eyes, neat black hair tied in a topknot, slender build, wearing a grey-blue Chinese hanfu scholar robe ' +
      'with pale white trim and a brown sash, standing in A-pose, full body, single character, high-detail PBR ' +
      'textures on skin and cloth, dark fantasy xianxia style, neutral gray studio background, no props',
  },
  gu_yue_elder: {
    title: 'Gu Yue elder',
    prompt:
      'Realistic 3D character model, a 60-year-old East Asian man with a long grey beard, deep wrinkles, stern ' +
      'imposing expression, black traditional scholar cap, wearing a pale ivory Chinese hanfu robe with crimson ' +
      'red trim and an upright dignified posture, standing in A-pose, full body, single character, high-detail ' +
      'PBR textures on skin and cloth, dark fantasy xianxia style, neutral gray studio background, no props',
  },
};

const API_KEY = process.env.TRIPO_API_KEY || '';
const HINT = 'Set TRIPO_API_KEY (Dashboard of tripo3d.ai -> API Keys). It is shown only once at creation.';

async function submit(key, entry, detailed) {
  const res = await fetch(`${API}/v3/generation/text-to-model`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      prompt: entry.prompt,
      model: MODEL,
      texture: true,
      pbr: true,
      texture_quality: detailed ? 'detailed' : 'standard',
      auto_size: true,
      face_limit: 400000,
    }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.code !== 0) {
    throw new Error(`submit failed (http ${res.status}): ${JSON.stringify(j).slice(0, 400)}`);
  }
  return j.data.task_id;
}

async function pollTask(key, task_id) {
  const t0 = Date.now();
  for (;;) {
    if (Date.now() - t0 > 180000) throw new Error('polling timed out after 180s (task may still finish server-side)');
    await new Promise(r => setTimeout(r, 3000));
    const res = await fetch(`${API}/v3/tasks/${task_id}`, { headers: { Authorization: `Bearer ${key}` } });
    const j = await res.json().catch(() => ({}));
    const d = j.data || {};
    process.stdout.write(`  … ${d.status || 'waiting'} ${d.progress != null ? `(${d.progress}%)` : ''} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    if (d.status === 'success') { console.log(''); return d; }
    if (d.status === 'failed' || d.status === 'error') {
      console.log('');
      throw new Error(`task failed: ${JSON.stringify(d).slice(0, 400)}`);
    }
  }
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed (${res.status}): ${url.slice(0, 80)}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  return fs.statSync(dest).size;
}

async function castOne(key, id, entry, detailed) {
  console.log(`\n=== ${id} — ${entry.title}${detailed ? ' (HD texture)' : ' (standard texture)'}`);
  const task_id = await submit(key, entry, detailed);
  console.log(`  task ${task_id} submitted`);
  const out = await pollTask(key, task_id);
  if (!out.model_url) throw new Error('success but no model_url: ' + JSON.stringify(out).slice(0, 300));
  const glb = await download(out.model_url, path.join(OUT_DIR, `${id}.glb`));
  console.log(`  GLB  -> characters/${id}.glb (${(glb / 1048576).toFixed(2)} MB)`);
  let preview = null;
  if (out.rendered_image_url) {
    try {
      preview = await download(out.rendered_image_url, path.join(PREVIEW_DIR, `${id}.png`));
      console.log(`  preview -> characters/previews/${id}.png (${(preview / 1024).toFixed(0)} KB)`);
    } catch (e) { console.log('  (preview download failed, GLB is fine: ' + e.message + ')'); }
  }
  // log anything that looks like credit/usage info (for the cost report)
  const usage = out.usage || out.credits || j_usage(out);
  if (usage) console.log('  usage: ' + JSON.stringify(usage));
  return { id, task_id, glb_bytes: glb, preview_bytes: preview };
}

function j_usage(d) {
  const pick = {};
  for (const k of Object.keys(d || {})) {
    if (/credit|usage|cost/i.test(k)) pick[k] = d[k];
  }
  return Object.keys(pick).length ? pick : null;
}

async function main() {
  const args = process.argv.slice(2);
  const detailed = args.includes('--detailed');
  const sel = args.filter(a => !a.startsWith('--'));
  if (!API_KEY) { console.error('missing TRIPO_API_KEY. ' + HINT); process.exit(2); }

  let ids;
  if (sel.includes('test')) ids = ['shen_cui'];
  else if (sel.includes('all') || sel.length === 0) ids = ['shen_cui', 'fang_yuan', 'fang_zheng', 'gu_yue_elder'];
  else ids = sel;

  const results = [];
  for (const id of ids) {
    if (!CAST[id]) { console.error(`unknown character "${id}" (known: ${Object.keys(CAST).join(', ')})`); process.exit(2); }
    try {
      results.push(await castOne(API_KEY, id, CAST[id], detailed));
    } catch (e) {
      console.error(`✗ ${id}: ${e.message}`);
      // stop on first failure — likely a billing/auth problem; don't spend the rest
      console.error('Aborting remaining characters (check the error; likely auth or credits).');
      break;
    }
  }
  console.log('\n=== DONE ===');
  results.forEach(r => console.log(`  ✓ ${r.id}: ${(r.glb_bytes / 1048576).toFixed(2)} MB`));
  console.log('The world app swaps these GLBs in automatically on next load. Review characters/previews/*.png.');
}

main().catch(e => { console.error('fatal: ' + e.message); process.exit(1); });
