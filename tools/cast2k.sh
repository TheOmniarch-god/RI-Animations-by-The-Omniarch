#!/usr/bin/env bash
# Cast 3 remaining main cast at DETAILED (2K) PBR via Tripo CLI.
# 30 credits each. Aborts on first failure. Raw 18 MB exports are staged in
# /home/user/tmp_cast and DELETED after each character lands (workspace stays
# lean — everything durable goes to GitHub). Optimized GLBs keep FULL 2K
# textures (no downscale) + Draco mesh compression.
set -euo pipefail
cd "$(dirname "$0")/.."
STAGE=/home/user/tmp_cast
LOG=/tmp/cast2k.log
: > "$LOG"
mkdir -p characters/previews
export PATH="$(npm prefix -g)/bin:$PATH"
if ! command -v tripo >/dev/null; then sudo npm install -g tripo-cli >/dev/null 2>&1; fi
if ! /home/user/ri-project/node_modules/.bin/gltf-transform --version >/dev/null 2>&1; then
  PUPPETEER_SKIP_DOWNLOAD=1 npm install --no-audit --no-fund >/dev/null 2>&1
fi

cast_one() {
  local id="$1"; local prompt="$2"; local slug
  slug=$(echo "$id" | tr '_' '-')
  echo "=== CAST $id (detailed/2K) ===" | tee -a "$LOG"
  tripo make "$prompt" --model tripo-v3.1 \
    -p texture_quality=detailed -p pbr=true -p auto_size=true -p face_limit=400000 \
    -o "$STAGE" --name "$id" --yes --no-open 2>&1 | tee -a "$LOG"
  local dir
  dir=$(ls -dt "$STAGE"/tripo-out/"$slug"-* | head -1)
  echo "=== OPTIMIZE $id (draco, keep 2K) ===" | tee -a "$LOG"
  (cd "$dir" && /home/user/ri-project/node_modules/.bin/gltf-transform optimize model.glb final.glb --compress draco 2>&1 | tail -1) | tee -a "$LOG"
  cp "$dir/final.glb" "characters/$id.glb"
  cp "$dir/preview.png" "characters/previews/$id.png"
  echo "=== DONE $id -> characters/$id.glb ($(stat -c%s "characters/$id.glb") bytes) ===" | tee -a "$LOG"
  rm -rf "$dir"   # workspace lean: raw export is re-fetchable by task id
}

#cast_one fang_zheng (already landed this session)"Realistic 3D character model, a 15-year-old East Asian boy with a gentle, earnest kind face and warm eyes, neat black hair tied in a topknot, slender build, wearing a grey-blue Chinese hanfu scholar robe with pale white trim and a brown sash, standing in A-pose, full body, high-detail PBR textures, dark fantasy xianxia style, neutral gray studio background"

cast_one shen_cui "Realistic 3D character model, a 16-year-old East Asian maidservant girl with a soft, meek, downcast expression, black hair in a low bun with a small gold pearl hairpin, slender frame, wearing a muted green Chinese tunic and skirt with a dark green sash, standing in A-pose, full body, high-detail PBR textures, xianxia style, neutral gray studio background"

cast_one gu_yue_elder "Realistic 3D character model, a 60-year-old East Asian man with a long grey beard, deep wrinkles, stern imposing expression, black traditional scholar cap, wearing a pale ivory Chinese hanfu robe with crimson red trim and an upright dignified posture, standing in A-pose, full body, high-detail PBR textures, dark fantasy xianxia style, neutral gray studio background"

echo "ALL CAST OK (2K)" | tee -a "$LOG"
