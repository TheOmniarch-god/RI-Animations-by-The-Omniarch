#!/usr/bin/env bash
# Cast the remaining 3 characters via Tripo CLI (standard PBR, auto-size, 400k face cap).
# Aborts on first failure so credits are never overspent. After each success the GLB is
# web-optimized (resize 1024 + Draco) into characters/<id>.glb + preview.
set -euo pipefail
cd "$(dirname "$0")/.."
# Self-heal: sandbox resets wipe global npm installs
GP="$(npm prefix -g)"
export PATH="$GP/bin:$PATH"
if ! command -v tripo >/dev/null; then
  echo "tripo CLI missing — reinstalling" | tee -a /tmp/cast.log
  sudo npm install -g tripo-cli >/dev/null 2>&1
  export PATH="$GP/bin:$PATH"
fi
CAST=characters/cast
LOG=/tmp/cast.log
: > "$LOG"
mkdir -p characters/previews

cast_one() {
  local id="$1"; local prompt="$2"
  if [ -f "characters/$id.glb" ] && [ -f "characters/previews/$id.png" ]; then
    echo "=== SKIP $id (already landed) ===" | tee -a "$LOG"
    return 0
  fi
  echo "=== CAST $id ===" | tee -a "$LOG"
  tripo make "$prompt" --model tripo-v3.1 \
    -p texture_quality=standard -p pbr=true -p auto_size=true -p face_limit=400000 \
    -o "$CAST" --name "$id" --yes --no-open 2>&1 | tee -a "$LOG"
  local dir slug
  slug=$(echo "$id" | tr '_' '-')
  dir=$(ls -dt "$CAST"/tripo-out/"$slug"-* | head -1)
  echo "=== OPTIMIZE $id ($dir) ===" | tee -a "$LOG"
  if ! npx --yes --prefix /home/user/ri-project gltf-transform --version >/dev/null 2>&1; then
    npm i -D @gltf-transform/cli >/dev/null 2>&1
  fi
  (cd "$dir" && npx --prefix /home/user/ri-project gltf-transform resize model.glb model.1024.glb --width 1024 --height 1024 2>&1 | tail -1 && \
   npx --prefix /home/user/ri-project gltf-transform optimize model.1024.glb final.glb --compress draco 2>&1 | tail -1) | tee -a "$LOG"
  cp "$dir/final.glb" "characters/$id.glb"
  cp "$dir/preview.png" "characters/previews/$id.png"
  echo "=== DONE $id -> characters/$id.glb ($(stat -c%s "characters/$id.glb") bytes) ===" | tee -a "$LOG"
}

cast_one fang_yuan "Realistic 3D character model, a 15-year-old East Asian boy with sharp, cold, emotionless eyes and pale skin, long wild messy black hair, thin wiry build, wearing a tattered dark emerald-green Chinese hanfu robe with faded blood stains, torn hems and a dark sash belt, standing in A-pose, full body, high-detail PBR textures on skin and cloth, dark fantasy xianxia style, neutral gray studio background"

cast_one fang_zheng "Realistic 3D character model, a 15-year-old East Asian boy with a gentle, earnest kind face and warm eyes, neat black hair tied in a topknot, slender build, wearing a grey-blue Chinese hanfu scholar robe with pale white trim and a brown sash, standing in A-pose, full body, high-detail PBR textures, dark fantasy xianxia style, neutral gray studio background"

cast_one gu_yue_elder "Realistic 3D character model, a 60-year-old East Asian man with a long grey beard, deep wrinkles, stern imposing expression, black traditional scholar cap, wearing a pale ivory Chinese hanfu robe with crimson red trim and an upright dignified posture, standing in A-pose, full body, high-detail PBR textures, dark fantasy xianxia style, neutral gray studio background"

# Land the earlier Shen Cui test cast (already approved) alongside the rest
if [ -f "characters/cast/tripo-out/shen-cui-f4430d2c/shen_cui.final.glb" ]; then
  cp "characters/cast/tripo-out/shen-cui-f4430d2c/shen_cui.final.glb" "characters/shen_cui.glb"
  cp "characters/cast/tripo-out/shen-cui-f4430d2c/preview.png" "characters/previews/shen_cui.png"
  echo "LANDED shen_cui.glb" | tee -a "$LOG"
fi

echo "ALL CAST OK" | tee -a "$LOG"
