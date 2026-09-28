# Animation System — Homegrown Auto-Rig + Procedural Motion

**Round 4 (2026-09-28).** Zero API credits. Zero clip files. Pure code.

The 4K cast GLBs from Tripo are **unrigged** (single static mesh, 0 animations).
Instead of paying for a rigging/animation API, the whole rig + animation layer
is built in code and runs in the browser at load time:

```
world/js/animlab.js
├─ autoRig(root)          → 17-bone skeleton derived from the model itself
│   • bbox height → bone proportions (feet at y=0)
│   • arm chain is DATA-DRIVEN from the model's own silhouette
│     (hand extremes in the mid-body band) — no two Tripo A-poses match,
│     so a fixed template would miss the wrists
│   • per-vertex skin weights: Gaussian falloff to bone segments, top-4 blend
│     (robust for volumetric garments: the tattered robe is ~60% of the verts)
│   • rebuilds the mesh as a THREE.SkinnedMesh, swaps it in, binds with
│     fresh world matrices (stale bind matrices silently corrupt skinning)
└─ createAnimator(rig)    → per-frame damped bone driver
    • idle  — breathing, subtle head sway
    • walk  — scissor legs, counter-swing arms, torso pitch, root bob
    • death — stagger → head-down collapse → settle (Chapter 1 tone)
    • turn  — held beat (statue) → one deliberate 2.6 s whole-body turn
    • poem  — 2.6 s body turn to the western ridge, head lifted, stillness
    • brace — the final breath: chin up, chest out, arms wide, low crouch,
              body swings back to face the executioners (ryDelta continuity)
```

Root-motion contract: motions return `root: {y, rx, rz, ry?, ryDelta?}`.
`ry` is an ABSOLUTE body yaw, `ryDelta` is measured from the yaw the
previous motion left — `start()` snaps on large absolute cuts, keeps small
continuity, and `tick()` damps. That's what lets poem → brace swing the
body from the western gaze back to the crowd in one smooth breath.

**Try it:** `characters/viewer.html?m=fang_yuan` (or any of the four) →
**Idle / Walk / Death** buttons, or `?anim=death` to autostart.
Full 4K Fang Yuan: 130,384 verts, rigs in **0.3 s**.

## Verified (headless SwiftShader, 4K model)
- Weight sanity: head 12.6k / chest 30k / elbows 3.5k / knees 7.5k / ankles 6.3k
  (out of 130k) — anatomically distributed, no bone owns >35%.
- `death_demo.gif`: standing → stagger → head-down collapse, captured from the
  live rig at 4K textures.

## Gotchas discovered (all fixed — do not regress)
1. **Interleaved vertex buffers** — GLB pos/normal/uv are stride-8
   interleaved; raw `position.array[i*3]` reads garbage. Must use
   `getX/getY/getZ` (or `getComponent`).
2. **Stale bind matrices** — `skinned.bind()` captures ancestor
   `matrixWorld`; if the parent was just scaled/positioned, force
   `root.updateWorldMatrix(true, true)` first or every deformation is
   off by the missing transform.
3. **three r160 has no `Object3D.replaceChild`** (that's a DOM API) —
   swap with `parent.remove(old); parent.add(new)`.
4. **Real-time dt on slow renderers** — the viewer's loop must pass wall-clock
   dt (capped at 0.3 s) so animations run at real speed even at 1–2 fps
   on software GL.

## Chapter 1 integration (DONE — the summit siege, one chapter at a time)

`world/js/charassets.js` now auto-rigs EVERY swapped GLB instance
(`autoRig` + `createAnimator`, default `idle`), so all 16 main-cast
instances across the five zones breathe on their own the moment the 4K
models load. `animateFigure()` ticks `record.animator` per frame; a zone
switches motions with `record.animator.start('poem' | 'brace' | ...)`.

Chapter 1 (`world/js/zones/z1.js`) drives Fang Yuan's death exactly as
the chapter reads it:

| beat | motion | text it plays |
|------|--------|---------------|
| 0 summit siege | `idle` | besieged, every path to life severed |
| 1 the standoff | `turn` | "stood as motionless as a statue, slowly turned around" — and the host **recoils a full pace** (z1 kicks all 40 besiegers outward, timed to `TURN_END`) |
| 2 the dying verse | `poem` | whole body turns west to the setting sun, the verse from stillness |
| 3 self-detonation | `brace` | final breath + crouch while the body swings back to face his executioners, as the armed blast (flash/shake/bursts/rings) fires |

Design notes:
- The turn is a WHOLE-BODY turn (the text says "turned around", not a
  head turn). Beat 1's crowd recoil is a pure function of `beatT`
  (no latches to desync); navigation away restores positions.
- `WEST_YAW` / `TURN_FROM` are z1-specific (his group yaw + camera
  bearings) — do not reuse those constants in other zones.
- The five kneeling elders inside the ancestral-hall pavilion keep their
  procedural `pray` pose via `group.userData.noGLB = true` (a GLB elder
  would stand — the kneel is the point).
- `window.__charUrls` (set before the bundle loads) overrides the archive —
  the headless harness uses `tools/glb2k.py` 2K test builds of the 4K GLBs
  (4K textures OOM the 1.9 GB SwiftShader box; 2K decodes fit).

Verified headless (real world code, 2K test textures, zero console errors):
pose telemetry through the full sequence — turn lands at yaw 0.62
(facing the host), poem at −1.85 (facing west), brace at 0.60 with root
drop −0.09 (crouch), and the figure stands again on return navigation.
Frames: `animation/ch1/verify_{A..E}.png` (512² SwiftShader — the live
preview on a real GPU is the real look).

## Next: Chapters 2–5 (one chapter at a time)
z2 (Fang Yuan + Fang Zheng doublet), z3 (Shen Cui), z4 (the elders'
ceremony), z5 (the aperture). Same machinery: per-beat `start(...)` —
plus a couple of shared motions if the chapters call for them (kneel,
bow, point).
