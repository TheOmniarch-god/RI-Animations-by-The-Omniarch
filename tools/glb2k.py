#!/usr/bin/env python3
"""glb2k.py — make a lighter 2K-textured copy of a 4K GLB (headless-test only).

In-place image replacement: each image (bufferView or data-URI) is decoded,
resized to <=maxdim, re-encoded, and written back with ZERO padding to the
original byteLength. Offsets, bufferView layout, Draco blobs and all JSON
stay byte-identical — zero corruption risk. GPU memory still drops
(4096² -> 2048² decoded); file size is unchanged (local server, who cares).
Usage: python3 tools/glb2k.py characters/fang_yuan.glb characters/_t/fang_yuan.glb 2048
"""
import json, struct, sys, io, os, base64
from PIL import Image
from PIL import ImageFile
ImageFile.LOAD_TRUNCATED_IMAGES = True  # GLB bufferViews carry align-padding past the EOI

def load_glb(path):
    d = open(path, 'rb').read()
    magic, ver, length = struct.unpack('<4sII', d[:12])
    assert magic == b'glTF', 'not a glb'
    off, chunks = 12, {}
    while off < length:
        clen, ctype = struct.unpack('<II', d[off:off+8])
        chunks[ctype] = d[off+8:off+8+clen]
        off += 8 + clen
    return json.loads(chunks[0x4E4F534A]), chunks

def save_glb(path, j, chunks):
    jbytes = json.dumps(j, separators=(',', ':')).encode('utf-8')
    if len(jbytes) % 4: jbytes += b' ' * (4 - len(jbytes) % 4)
    bin_ = chunks.get(0x004E4942, b'')
    if len(bin_) % 4: bin_ += b'\x00' * (4 - len(bin_) % 4)
    out = struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(jbytes) + (8 + len(bin_) if bin_ else 0))
    out += struct.pack('<II', len(jbytes), 0x4E4F534A) + jbytes
    if bin_:
        out += struct.pack('<II', len(bin_), 0x004E4942) + bin_
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    open(path, 'wb').write(out)

def resize_to(raw, maxdim, wantlen):
    img = Image.open(io.BytesIO(raw))
    w, h = img.size
    if max(w, h) <= maxdim:
        return raw, (w, h), 'kept'
    s = maxdim / max(w, h)
    img = img.resize((int(w * s), int(h * s)), Image.LANCZOS)
    if img.format == 'JPEG' or raw[:2] == b'\xff\xd8':
        buf = io.BytesIO(); img.convert('RGB').save(buf, 'JPEG', quality=84, optimize=True)
        new = buf.getvalue()
    else:
        buf = io.BytesIO(); img.save(buf, 'PNG', optimize=True)
        new = buf.getvalue()
    if wantlen is not None and len(new) > wantlen:
        raise RuntimeError('resized image larger than slot (should not happen)')
    return new, img.size, 'resized'

def main():
    src, dst = sys.argv[1], sys.argv[2]
    maxdim = int(sys.argv[3]) if len(sys.argv) > 3 else 2048
    j, chunks = load_glb(src)
    bin_ = bytearray(chunks.get(0x004E4942, b''))
    for i, img in enumerate(j.get('images', [])):
        if 'bufferView' in img:
            bv = j['bufferViews'][img['bufferView']]
            o, l = bv.get('byteOffset', 0), bv['byteLength']
            raw = bytes(bin_[o:o + l])
            new, size, kind = resize_to(raw, maxdim, l)
            if kind == 'resized':
                bin_[o:o + len(new)] = new          # shrink: rest stays zero
                print(f'  image[{i}] bv[{img["bufferView"]}] {raw[:2]!r} -> {size} {len(raw)//1024}KB->{len(new)//1024}KB (slot {l//1024}KB)')
        elif img.get('uri', '').startswith('data:'):
            head, b64 = img['uri'].split(',', 1)
            raw = base64.decodebytes(b64.encode())
            new, size, kind = resize_to(raw, maxdim, None)
            if kind == 'resized':
                mime = head.split(':', 1)[1].split(';')[0]
                img['uri'] = f'data:{mime};base64,' + base64.b64encode(new).decode()
                print(f'  image[{i}] data-uri -> {size}')
    save_glb(dst, j, {**chunks, 0x004E4942: bytes(bin_)})
    print(f'{os.path.basename(src)}: {os.path.getsize(src)//1024}KB -> {os.path.basename(dst)}: {os.path.getsize(dst)//1024}KB (textures now <= {maxdim}px)')

if __name__ == '__main__':
    main()
