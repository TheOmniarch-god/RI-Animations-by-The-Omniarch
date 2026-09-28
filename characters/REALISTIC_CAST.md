# Realistic cast — Tripo3D API + free web playbook

## Status: ✅ MAIN CAST DELIVERED (2026-09-28, Route A)

All four main characters cast via Tripo3D API v3 (`tripo-cli`), **80 free credits
total** (20/character, `v3.1-20260211`, PBR standard, auto-size, 400k face cap):

| File | Character | Task | Optimized size |
|---|---|---|---|
| `fang_yuan.glb` | Fang Yuan | `9a54e70f` | 1.48 MB |
| `fang_zheng.glb` | Fang Zheng | `e9b00cc7` | 1.37 MB |
| `shen_cui.glb` | Shen Cui | `f4430d2c` | 1.43 MB |
| `gu_yue_elder.glb` | Gu Yue elder | `c0f5c584` | 1.33 MB |

Each GLB is post-processed: textures 2048→1024 (Lanczos) + **Draco mesh
compression** (raw Tripo export ≈14 MB → ≈1.4 MB). The world's `charassets.js`
wires three's `DRACOLoader` with the decoder hosted at `world/lib/draco/`
(same-origin, so the offline preview iframe needs no CDN).

Notes:
- Free API wallet (600 cr) was visible under platform.tripo3d.ai → Billing and
  expires **2026-10-12** — anything cast later should be prioritized before then.
- `tools/cast3.sh` re-casts the remaining three (idempotent — skips landed ids).
- Studio portraits: `characters/viewer.html?m=<id>` (serve via `world/server.py`).

---

The world app runs a **GLB-first character pipeline**: it loads
`characters/<id>.glb` at boot and swaps it in-place into every scene instance of
that character (auto-scaled to the right height, auto-plays an idle animation if
the GLB has one). **Drop a generated export under one of these names and the
character appears everywhere automatically.**

## Files (exact names — the world watches these)

| File | Character |
|---|---|
| `fang_yuan.glb` | Fang Yuan (Demon Fang Yuan, ~15) |
| `fang_zheng.glb` | Fang Zheng (twin) |
| `shen_cui.glb` | Shen Cui (maidservant) |
| `gu_yue_elder.glb` | Gu Yue elder |

## Route A — Tripo3D API (what the agent runs)

`tools/tripo_cast.js` does the whole loop (submit → poll → download GLB + preview
PNG → land in this folder). The key is passed via environment only, never stored:

```bash
TRIPO_API_KEY=*** node tools/tripo_cast.js test      # ONE cheap test: shen_cui, standard texture
TRIPO_API_KEY=*** node tools/tripo_cast.js all     # all four, standard texture
TRIPO_API_KEY=*** node tools/tripo_cast.js all --detailed   # HD PBR textures (more credits)
```

- Model `v3.1-20260211`, `texture+pbr on`, `auto_size` (real-world meters),
  face limit 400k (keeps GLBs light for the repo).
- Typical task time 10–120 s; previews land in `characters/previews/<id>.png`
  for visual review before the cast is declared good.
- Cost check happens after the single `test` run, before the rest is spent.

Get a key: tripo3d.ai → account → **API Keys** (shown only once at creation).
Check the same dashboard for your credit balance — new accounts usually come with
free credits; the agent will stop at the first billing error so nothing is
overspent.

## Route B — free web generation (zero spending)

If no API credits are available, generate in the web app instead (Meshy or Tripo
web UIs both have free signup credits):

1. Sign up (free credits).
2. **Text-to-3D** per character with the prompts below. Settings:
   - **PBR texture: ON** (this is the "realistic, not shapes" part — skin, cloth, hair)
   - **Auto-rig / smart skeleton: ON** if offered (the world will play the idle clip)
   - Full body, single character, A-pose or T-pose, plain/neutral background
   - No props, no ground plane
3. **Export as `.glb`** (not FBX/OBJ — GLB keeps textures embedded).
4. Rename to the exact filenames above and put them in this `characters/` folder
   (git commit + push, or drag into the repo via the GitHub web UI).
5. Done — the world detects them on next load. No code changes.

> Generate 2–3 candidates per character and keep the best. For consistent faces
> across regenerations, use **Image-to-3D**: generate (or paste) a reference face
> image first, then convert that image to 3D — same character, better likeness.

## Prompts (paste-ready)

**fang_yuan.glb**
```
Realistic 3D character model, a 15-year-old East Asian boy with sharp, cold,
emotionless eyes and pale skin, long wild messy black hair, thin wiry build,
wearing a tattered dark emerald-green Chinese hanfu robe with faded blood
stains, torn hems and a dark sash belt, standing in A-pose, full body,
high-detail PBR textures on skin and cloth, dark fantasy xianxia style,
neutral gray studio background
```

**fang_zheng.glb**
```
Realistic 3D character model, a 15-year-old East Asian boy with a gentle,
earnest kind face and warm eyes, neat black hair tied in a topknot, slender
build, wearing a grey-blue Chinese hanfu scholar robe with pale white trim and
a brown sash, standing in A-pose, full body, high-detail PBR textures,
dark fantasy xianxia style, neutral gray studio background
```

**shen_cui.glb**
```
Realistic 3D character model, a 16-year-old East Asian maidservant girl with a
soft, meek, downcast expression, black hair in a low bun with a small gold
pearl hairpin, slender frame, wearing a muted green Chinese tunic and skirt
with a dark green sash, standing in A-pose, full body, high-detail PBR
textures, xianxia style, neutral gray studio background
```

**gu_yue_elder.glb**
```
Realistic 3D character model, a 60-year-old East Asian man with a long grey
beard, deep wrinkles, stern imposing expression, black traditional scholar
cap, wearing a pale ivory Chinese hanfu robe with crimson red trim and an
upright dignified posture, standing in A-pose, full body, high-detail PBR
textures, dark fantasy xianxia style, neutral gray studio background
```

## What the world does with the models (pipeline notes)

- `world/js/charassets.js` loads the four GLBs at boot via `GLTFLoader`.
- Each scene instance (Fang Yuan appears in all five chapters) gets a **clone**,
  fitted so its bounding box matches the original procedural figure exactly
  (same height, same base, same position/rotation ownership — zone beat code
  keeps working unchanged).
- If the GLB carries animations, an `idle`/`stand` clip (or the first clip) is
  auto-played on a per-instance `AnimationMixer`.
- The procedural low-poly figure stays in the graph, hidden — automatic fallback
  if a GLB ever fails to load, and a safety net for pose code that touches
  `parts.head` / `parts.body`.
- Console: `[charassets] <id>: GLB loaded (N anims)` / `swapped GLB into <id> instance #K`.

### Later upgrades (when credits allow)

- Walk/death/detonation clips per character → the zone beat director will
  retarget them (replaces the current procedural arm-swing cycles).
- The remaining cast (elders' variants, trial geniuses, villagers, Predicament
  beast, Spring Autumn Cicada) — same filenames-in-`characters/` contract;
  entries just get added to `CHAR_URLS` in `world/js/charassets.js`.
