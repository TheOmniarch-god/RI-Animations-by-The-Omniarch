#!/usr/bin/env python3
"""glb4k_worker.py — 2x super-resolution of ONE texture (fresh process, RAM-safe).

Usage: python3 tools/glb4k_worker.py <in_2048.png> <out_4096.png>
"""
import sys, time, os, tempfile
import numpy as np
import cv2

os.environ.setdefault('OPENCV_LOG_LEVEL', 'ERROR')


def main(inp, outp):
    sr = cv2.dnn_superres.DnnSuperResImpl_create()
    sr.readModel('/tmp/sr/ESPCN_x2.pb')
    sr.setModel('espcn', 2)
    mat = cv2.imread(inp, cv2.IMREAD_COLOR)
    h, w = mat.shape[:2]
    tmpdir = tempfile.mkdtemp(prefix='srw_')
    ctx, base, overlap = 16, 1024, 32
    padded = cv2.copyMakeBorder(mat, ctx, ctx, ctx, ctx, cv2.BORDER_REFLECT_101)
    S = base + overlap

    def places(n):
        a, b = ctx, ctx + n - S
        return [a] if b <= a + base // 2 else [a, b]

    py, px = places(h), places(w)
    quads = {}
    for iy, y in enumerate(py):
        for ix, x in enumerate(px):
            res = sr.upsample(padded[y:y + S, x:x + S])
            p = f'{tmpdir}/q_{iy}_{ix}.png'
            cv2.imwrite(p, res)
            quads[(iy, ix)] = (2 * (y - ctx), 2 * (x - ctx), p)
            del res

    H2, W2 = h * 2, w * 2
    out = np.zeros((H2, W2, 3), dtype=np.uint8)
    wold = np.zeros((H2, W2), dtype=np.float32)
    half = np.linspace(0.25, 1.0, S, dtype=np.float32)
    ys = np.concatenate([half[::-1], half])
    ramp = np.clip(ys[:, None] * ys[None, :], 0.25, 1.0)
    for key in sorted(quads):
        oy, ox, p = quads[key]
        res = cv2.imread(p, cv2.IMREAD_COLOR).astype(np.float32)
        Hq, Wq = res.shape[:2]
        wnew = ramp[:Hq, :Wq]
        to = wold[oy:oy + Hq, ox:ox + Wq]
        tot = to + wnew
        out[oy:oy + Hq, ox:ox + Wq] = (
            out[oy:oy + Hq, ox:ox + Wq].astype(np.float32) * to[..., None]
            + res * wnew[..., None]
        ) / np.maximum(tot, 1e-6)[..., None]
        wold[oy:oy + Hq, ox:ox + Wq] = tot
        os.remove(p)
        del res
    cv2.imwrite(outp, out)
    print(f"OK {w}x{h} -> {W2}x{H2} {time.strftime('%H:%M:%S')}", flush=True)


if __name__ == '__main__':
    t0 = time.time()
    main(sys.argv[1], sys.argv[2])
    print(f"worker total {time.time()-t0:.1f}s", flush=True)
