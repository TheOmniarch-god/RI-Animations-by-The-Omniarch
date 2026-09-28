# RI — Animations & 3D World (The Omniarch)

Everything for the *Reverend Insanity* (Gu Zhen Ren, Vol.1 "Demonic Nature Never
Changes", Ch1–5, as translated at https://ri.theomniarch.com.ng/) 3D project:
the interactive world, the character model archive, and the build/test tooling.

**This repository is the source of truth.** Work happens in a local clone of this
repo; the sandbox workspace holds nothing canonical outside the clone.

## Layout

```
world/                the interactive 3D world (runnable app)
  index.html          app shell — loads bundle.js as a classic script
  bundle.js           compiled single-script build (rebuild: sh tools/build.sh)
  js/                 source modules (main, chapters, hud, rig, audio, sky, figures, fx, water, zones/z1..z5)
  css/  music/        styling + five per-chapter licensed MP3 tracks
  lib/three/          vendored three.js 0.160.0 core + addons (no CDN)
  server.py           static server with CORS (preview-iframe safe)
  README.md           full app documentation (controls, URL params, music credits)
characters/           13 .glb models + recipes.json — main 4 cast are realistic
                      Tripo3D 4K PBR (Draco, ~9–12 MB); rest are
                      procedural placeholders. See REALISTIC_CAST.md (status: done)
viewer.html           interactive GLB character archive (orbit/zoom) — also works on GitHub Pages
charsheet.html        cast table + in-browser GLB re-exporter (download buttons)
figures/              canonical procedural generator source (figures.js, util.js)
jsm/  three/          vendored three.js bits so the viewer/charsheet run offline
tools/                build + verification harnesses (run from repo root):
  build.sh            self-healing esbuild bundle (world/js/ → world/bundle.js)
  shots.js            screenshot + runtime-error harness (out: /tmp/ri-shots/)
  facecam.js          close-up face camera probe
  expchars.js         GLB character exporter (puppeteer; out: characters/)
  itest.js            interactive-flow regression (0 errors expected)
  blacktest.js        boot black-screen watchdog
  finaltest.js        auto-advance + click-through inside a sandboxed iframe
  iframetest.js       minimal iframe repro
  charverify.js       cast pipeline proof: 4/4 GLBs load + swap, zone/face shots
  studiotests.js      studio-lit portrait of each cast GLB (characters/viewer.html)
  cast2k.sh           Tripo API cast @ detailed 2K (abort-on-error, stage+cleanup)
package.json          tool deps: esbuild, puppeteer, three (stub-healed by build.sh)
```

## Quick start (from a fresh clone)

```bash
git clone https://github.com/TheOmniarch-god/RI-Animations-by-The-Omniarch.git
cd RI-Animations-by-The-Omniarch
PUPPETEER_SKIP_DOWNLOAD=1 npm install          # one-time tool install
python3 world/server.py 8080                   # → http://localhost:8080/   (the 3D world)
sh tools/build.sh                              # after editing world/js/*
node tools/finaltest.js                        # full regression (expects 0 errors)
```

Character viewer: serve the repo root (`python3 -m http.server 9000`) →
`http://localhost:9000/viewer.html`. On GitHub Pages it just works.

## The cast (characters/)

- **Fang Yuan** — protagonist, 15 (reborn body), tall lean, wild black hair, tattered **black** robe w/ bloodstains (Demon Fang Yuan)
- **Fang Zheng** — twin, grey-blue robe, topknot
- **Shen Cui** — maidservant, green tunic, pearl hairpin
- **Gu Yue Elder / Elder Chi Lian** — clan elders, scholar hats
- **Gu Yue Geniuses I–III** — trial candidates, variant builds
- **Clan Villagers I–III** — the gathered host, seeded random faces
- **Predicament Beast** — spined shadow-beast from Ren Zu's parable (Ch5)
- **Spring Autumn Cicada** — the time-travel Gu (Ch2)

Every character has a **seeded, specific face** (randomized once, fixed forever).
Regenerate any model via `charsheet.html`. Workflow: characters are modelled first,
then animation is polished **one chapter at a time**, starting with Chapter 1.

> **Realistic characters (✅ delivered):** the world runs a **GLB-first pipeline**
> (`world/js/charassets.js`) that loads the main cast from this `characters/`
> folder at boot and swaps them in-place into every scene instance (auto-fit,
> auto-play idle clip). The four main cast GLBs are now **realistic Tripo3D PBR
> models** (4K PBR — 2K Tripo detailed super-resolved to 4096px, Draco mesh, ~9–12 MB each) — the world's
> `GLTFLoader` is wired with three's `DRACOLoader` (decoder hosted at
> `world/lib/draco/`, same-origin so the offline preview iframe needs no CDN).
> Fang Yuan wears the **black** tattered robe (canon — not green). Drop any PBR export (Meshy/Tripo/Luma) over a filename and the character
> appears everywhere. Studio preview: `characters/viewer.html?m=<id>`.
> Playbook with paste-ready prompts + cast log:
> [`characters/REALISTIC_CAST.md`](characters/REALISTIC_CAST.md).

### Animation (✅ homegrown — 0 credits, 0 clip files)

The Tripo GLBs are unrigged, so instead of paying an animation API we build the
rig **in code at load time**: `world/js/animlab.js` derives a 17-bone skeleton
from each model's own silhouette (arm chain is data-driven), computes
per-vertex skin weights (Gaussian falloff, top-4 blend — handles the tattered
robe), and drives it with three procedural motions: **idle / walk / death**
(Chapter 1's execution tone). Full 4K Fang Yuan (130k verts) rigs in 0.3 s.

- Studio: `characters/viewer.html?m=fang_yuan` → **Idle / Walk / Death** buttons
- Live demo: [animation/death_demo.gif](animation/death_demo.gif) — standing → stagger → head-down collapse, captured from the rig at 4K
- Design notes + the four skinning gotchas we fixed: [`ANIMATION.md`](ANIMATION.md)

## Music credits (world/music/)

| Chapter | Track | Source | License |
|---|---|---|---|
| Ch 1 (siege) | shakuhachi, driving | Miyuki Nakajima, *Shakuhachi Classical* trk 5 — Jamendo/Internet Archive `jamendo-179988` | CC BY-NC-ND 3.0 |
| Ch 2 (river of time) | shakuhachi, meditative | same album, trk 1 | CC BY-NC-ND 3.0 |
| Ch 3 (dawn) | shakuhachi, gentle | same album, trk 2 | CC BY-NC-ND 3.0 |
| Ch 4 (trials) | shakuhachi, grand | same album, trk 4 | CC BY-NC-ND 3.0 |
| Ch 5 (hope / Ren Zu) | epic Japanese orchestral | *Epic Japanese Music feat. Mamoru Ogata* — Mogami of Yamagata, Internet Archive | CC BY-SA 4.0 |

3-minute cuts, 2.5–3 s fades, 96 kbps MP3. Attribution required; NC/ND terms apply
to the Nakajima tracks (non-commercial, no derivatives).

## License

Character models, generator code, world app code, tooling: MIT (c) 2026 The Omniarch.
Source text (Reverend Insanity) is © the original author; this repo contains fan-made
3D assets and short quoted chapter references in metadata/captions only.
