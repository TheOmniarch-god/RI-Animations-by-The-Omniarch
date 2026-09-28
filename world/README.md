# Reverend Insanity — A 3D World

An interactive Three.js experience for chapters 1–5 of *Reverend Insanity* (Gu Zhen Ren, translated by The Omniarch), as published at https://ri.theomniarch.com.ng/.

Five per-chapter zones, **29 cinematic beats** quoting the actual chapter lines, rich VFX (rain, sunset siege, self-detonation, River of Time, underground glowing river, moon orchids, Hope Gu particles, aperture-opening finale), a chapter-select menu styled after the source site — plus a locked Chapter 6 card.

## Build

Run from the **repo root** (this `world/` directory's parent):

```bash
sh tools/build.sh      # re-bundle world/js/ → world/bundle.js (esbuild, ~100ms)
```

`index.html` loads **`bundle.js` as a classic script** — no importmap, no per-file
module fetches, no CORS/MIME requirements, and no dependence on files that may be
dropped from a sandbox snapshot. **After editing anything under `js/`, re-run
`tools/build.sh`.** The three.js core is committed at `world/lib/three/three.module.js`
(the build script self-heals a `node_modules/three` stub from it).

## Run

Run from the **repo root**:

```bash
python3 world/server.py 8080
# → http://localhost:8080/
```

`server.py` (not plain `http.server`) is required: it sends `Access-Control-Allow-Origin: *` so ES modules load inside the platform's preview iframe, which runs with `sandbox="allow-scripts"` (opaque origin → every module fetch is cross-origin). Without CORS headers the app is blocked and the screen stays black.

## Controls

| Input | Action |
|---|---|
| Chapter cards (menu) | Enter a zone |
| `←` / `→` or `Space` | Prev / next beat |
| `‹` `›` buttons, dots | Beat navigation |
| Drag / scroll | Look around / zoom |
| `Esc` or ☰ Map | Back to menu |
| `M` | Mute everything |
| `N` or ♫ Music | Toggle chapter music |
| Next Chapter › | Jump to the next zone (last beat) |

Beats auto-advance after their `auto` seconds unless the URL contains `?auto=0`.

## URL parameters

- `?z=z1..z5` — enter a zone directly; `&b=N` — beat index
- `&auto=0` — disable auto-advance
- `&snap=1` — deterministic screenshots: instant env lerp + camera damping (used by the harness)
- `&skip=1` — skip the menu
- `window.__hq = true` — pin full render quality (harness sets this)

## Structure

```
index.html          app shell: loader, menu, HUD, fx layers, importmap
css/style.css       UI styling (gold/red/paper/serif tokens)
js/main.js          orchestrator (source — bundle.js is its compiled form): boot, env-lerp engine, beat state machine,
                    composer, adaptive quality (fps → pixel-ratio/bloom steps)
js/chapters.js      menu cards (incl. locked Ch6)
js/hud.js           menu, captions, world labels, title card, flash/fade, step counter
js/rig.js           camera rig: beat anchors + drag/wheel + shake
js/audio.js         per-chapter music (music/ *.mp3) + fully synthesized WebAudio SFX/beds
js/sky.js  util.js  figures.js  fx.js  water.js    shared systems
js/charassets.js    GLB-first character pipeline: loads the main cast from the repo's
                    characters/ archive, swaps in-place into every scene instance,
                    auto-fits, auto-plays idle clips (see characters/REALISTIC_CAST.md)
js/zones/z1..z5.js  the five chapter zones (29 beats total)
lib/three/          vendored Three.js 0.160.0 core + addons (no CDN)
music/              five per-chapter MP3s (licensed, see Music credits)
bundle.js           compiled single-script build loaded by index.html
server.py           static server with CORS (preview-iframe safe)
favicon.ico
```

## Music credits

Per-chapter background music, crossfaded on zone entry (toggle with `N` / ♫ Music):

| Chapter | Track | Source | License |
|---|---|---|---|
| Ch 1 (siege) | shakuhachi, driving | Miyuki Nakajima, *Shakuhachi Classical* — via Jamendo / Internet Archive (`jamendo-179988`, trk 05) | CC BY-NC-ND 3.0 |
| Ch 2 (river of time) | shakuhachi, meditative | Miyuki Nakajima, *Shakuhachi Classical* (trk 01) | CC BY-NC-ND 3.0 |
| Ch 3 (dawn) | shakuhachi, gentle | Miyuki Nakajima, *Shakuhachi Classical* (trk 02) | CC BY-NC-ND 3.0 |
| Ch 4 (trials) | shakuhachi, grand | Miyuki Nakajima, *Shakuhachi Classical* (trk 04) | CC BY-NC-ND 3.0 |
| Ch 5 (hope / Ren Zu) | epic Japanese orchestral | *Epic Japanese Music feat. Mamoru Ogata* — Mogami of Yamagata, Internet Archive | CC BY-SA 4.0 |

Trims are 3-minute cuts with 2.5–3 s fade in/out (encoded 96 kbps MP3). All remaining
soundscape (wind, rain, gongs, gong-swell, detonation, heartbeat) is synthesized in
`js/audio.js` — no other audio assets. License terms require attribution (above) and
no commercial use / no derivatives for the CC BY-NC-ND tracks.

## Character assets

The character models (Fang Yuan, Fang Zheng, Shen Cui, elders, trial geniuses,
seeded-face villagers, the Predicament beast, Spring Autumn Cicada) live in the
**[RI-Animations-by-The-Omniarch](https://github.com/TheOmniarch-god/RI-Animations-by-The-Omniarch)**
GitHub repository as export-ready `.glb` files with an interactive `viewer.html`
and a self-contained in-browser re-exporter (`charsheet.html`). This app runs the
same procedural generators (`js/figures.js`) so characters stay in sync with the
repo. Workflow: characters are modelled first, then animation is polished one
chapter at a time, starting with Chapter 1.

## Verification harnesses (in `tools/`, run from repo root)

- `node tools/shots.js [menu|zN:beat …]` → screenshots in `/tmp/ri-shots/`; probes `{zone, beat, cap, ch}` per target, collects console/page errors (expects none)
- `node tools/itest.js` — interactive flows: card pick, arrows, drag/wheel, ESC, next-chapter, mute, Map (0 errors)
- `node tools/finaltest.js` — auto-advance + full click-through **inside a sandboxed iframe** (exact preview conditions)
- `preview_sim.html` (served) — manual sandboxed-iframe repro page

## Robustness

- Boot watchdog (inline): if boot hangs >25 s or throws, loader hides, menu shows, error banner appears — never a silent black screen
- `_toMenuInner` guarded with `try/finally` so the fade overlay always clears
- WebGL context-loss banner; per-zone build `try/catch`; adaptive quality for weak GPUs
