# Reverend Insanity — Character Archive (Vol.1, Ch1–5)

Stylized 3D character models for *Reverend Insanity* (Gu Zhen Ren), built for the
companion 3D world experience (ri-world). Every character has a **seeded, specific
face** — randomized once, then fixed, so each character always looks the same.

Characters are **modelled first**; animation is being polished one chapter at a time,
starting with Chapter 1.

## Contents

| Path | What |
|---|---|
| `characters/*.glb` | 13 export-ready character models (binary glTF, embedded PNG textures) |
| `characters/recipes.json` | Metadata: title, chapter, description, file per character |
| `viewer.html` | Interactive archive viewer (orbit / zoom / select) |
| `charsheet.html` | Character sheet + in-browser GLB re-exporter (download buttons) |
| `figures/` | Canonical generator source (`figures.js`, `util.js`) |
| `three/`, `jsm/` | Vendored three.js 0.160 core + loader/exporter utils (repo is self-contained, works offline & on GitHub Pages) |

## The cast

- **Fang Yuan** — protagonist, rendered as ~15 years old, wild black hair, tattered emerald robe (Demon Fang Yuan)
- **Fang Zheng** — his twin, grey-blue robe, topknot
- **Shen Cui** — maidservant, green tunic, pearl hairpin
- **Gu Yue Elder / Elder Chi Lian** — clan elders, scholar hats
- **Gu Yue Geniuses I–III** — trial candidates, variant builds
- **Clan Villagers I–III** — the gathered host, seeded random faces
- **Predicament Beast** — spined shadow-beast from Ren Zu's parable (Ch5)
- **Spring Autumn Cicada** — the time-travel Gu (Ch2)

## How to view

No build step. Either:

```sh
python3 -m http.server 8000
# open http://localhost:8000/viewer.html
```

or push to a GitHub repo and enable GitHub Pages — `viewer.html` and `charsheet.html`
resolve all assets relative to the repo root.

## How the models are made

The figures are generated procedurally in `figures/figures.js` (three.js): robe,
trim, sash, hair, hands, legs, a canvas-baked face texture per seed (`face: N`),
and per-character props (hairpins, hats, blood, tatters). The cast table in
`charsheet.html` is the single source of truth for the named characters; the same
code runs inside the world app to place them in scenes.

To regenerate a model, open `charsheet.html` and click the ⬇ button on a card.

## License

Character models and generator code: MIT (see license block below).
Source text (Reverend Insanity) is © the original author; this repo contains only
fan-made 3D assets and short quoted chapter references in metadata.

MIT License
Copyright (c) 2026 The Omniarch

Permission is hereby granted, free of charge, to any person obtaining a copy of this
software and associated documentation files (the "Software"), to deal in the Software
without restriction, including without limitation the rights to use, copy, modify,
merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to the following
conditions: The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS",
WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.
