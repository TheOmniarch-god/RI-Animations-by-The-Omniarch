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
```

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

## Next: Chapter 1 integration (one chapter at a time)
`world/js/charassets.js` swaps the GLBs into the main world scene. The
execution beat (Fang Yuan's public sentencing) will drive:
idle (on the scaffold) → death (execution) → detonation.
Same `autoRig` + `createAnimator` — no new machinery needed.
