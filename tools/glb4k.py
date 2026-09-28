#!/usr/bin/env python3
"""glb4k.py — upgrade a GLB's embedded textures to 4K (pro-grade, free, local).

Pipeline per character:
  1. parse the (Draco-compressed) web GLB, extract each embedded image (2048px)
  2. super-resolve each image 2x (ESPCN x2, overlapping quadrants, seam-blended)
     — each texture runs in a FRESH subprocess (sandbox RAM ceiling is ~1.5GB)
  3. repack the GLB: mesh/tangents/animations untouched, images swapped to 4K

Usage: python3 tools/glb4k.py <in.glb> <out.glb>
"""
import json, struct, sys, time, subprocess, tempfile, os
import numpy as np
import cv2

GLB_MAGIC = 0x46546C67
GLTF_VERSION = 2
CHUNK_JSON = 0x4E4F534A
CHUNK_BIN = 0x004E4942
HERE = os.path.dirname(os.path.abspath(__file__))


def read_glb(path):
    with open(path, 'rb') as f:
        data = f.read()
    magic, version, length = struct.unpack_from('<III', data, 0)
    assert magic == GLB_MAGIC and version == GLTF_VERSION and length == len(data)
    off = 12
    js = bin_chunk = None
    while off < len(data):
        clen, ctype = struct.unpack_from('<II', data, off)
        body = data[off + 8:off + 8 + clen]
        if ctype == CHUNK_JSON:
            js = json.loads(body)
        elif ctype == CHUNK_BIN:
            bin_chunk = body
        off += 8 + clen
    return js, (bin_chunk or b'')


def write_glb(path, js, bin_buf):
    jsb = json.dumps(js, separators=(',', ':')).encode('utf-8')
    if len(jsb) % 4:
        jsb += b' ' * (4 - len(jsb) % 4)
    if len(bin_buf) % 4:
        bin_buf += b'\0' * (4 - len(bin_buf) % 4)
    total = 12 + 8 + len(jsb) + (8 + len(bin_buf) if bin_buf else 0)
    with open(path, 'wb') as f:
        f.write(struct.pack('<III', GLB_MAGIC, GLTF_VERSION, total))
        f.write(struct.pack('<II', len(jsb), CHUNK_JSON) + jsb)
        if bin_buf:
            f.write(struct.pack('<II', len(bin_buf), CHUNK_BIN) + bin_buf)


def process(in_glb, out_glb, jpeg_q=92):
    js, bin_buf = read_glb(in_glb)
    views = js.get('bufferViews', [])
    images = js.get('images', [])
    if not images:
        print('no embedded images — nothing to do')
        return
    tmpdir = tempfile.mkdtemp(prefix='glb4k_')

    # 1) extract + 2) super-resolve each image (fresh subprocess per texture)
    new_payloads = {}   # view_index -> bytes
    for i, img in enumerate(images):
        bv = views[img['bufferView']]
        b0, b1 = bv['byteOffset'], bv['byteOffset'] + bv['byteLength']
        src = f'{tmpdir}/src_{i}.png'
        dst = f'{tmpdir}/sr_{i}.png'
        cv2.imwrite(src, cv2.imdecode(np.frombuffer(bin_buf[b0:b1], np.uint8), cv2.IMREAD_COLOR))
        print(f"  image {i} ({img.get('mimeType')}, {bv['byteLength']//1024} KB) -> SR...", flush=True)
        t0 = time.time()
        r = subprocess.run([sys.executable, os.path.join(HERE, 'glb4k_worker.py'), src, dst],
                           capture_output=True, text=True)
        if r.returncode != 0 or not os.path.exists(dst):
            print(f"WORKER FAILED (rc={r.returncode})\n{r.stderr[-800:]}", flush=True)
            sys.exit(1)
        mat = cv2.imread(dst, cv2.IMREAD_COLOR)
        print(f"    -> {mat.shape[1]}x{mat.shape[0]} in {time.time()-t0:.0f}s", flush=True)
        if img['mimeType'] == 'image/jpeg':
            ok, enc = cv2.imencode('.jpg', mat, [int(cv2.IMWRITE_JPEG_QUALITY), jpeg_q])
        else:
            ok, enc = cv2.imencode('.png', mat, [int(cv2.IMWRITE_PNG_COMPRESSION), 6])
        assert ok
        new_payloads[img['bufferView']] = enc.tobytes()
        del mat

    # 3) repack: same bufferView order, new image payloads
    new_buf = bytearray()
    for i, bv in enumerate(views):
        b0 = bv['byteOffset']
        payload = new_payloads.get(i, bin_buf[b0:b0 + bv['byteLength']])
        bv['byteOffset'] = len(new_buf)
        bv['byteLength'] = len(payload)
        new_buf += payload
        pad = (-len(new_buf)) % 4
        if pad:
            new_buf += b'\0' * pad
    js['buffers'][0]['byteLength'] = len(new_buf)
    write_glb(out_glb, js, bytes(new_buf))
    print(f"WROTE {out_glb} ({os.path.getsize(out_glb)//1024} KB)", flush=True)
    for f in os.listdir(tmpdir):
        os.remove(os.path.join(tmpdir, f))
    os.rmdir(tmpdir)


if __name__ == '__main__':
    t0 = time.time()
    process(sys.argv[1], sys.argv[2])
    print(f"total {time.time()-t0:.0f}s", flush=True)
