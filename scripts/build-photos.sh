#!/bin/bash
# Convert the original camera roll into web-ready assets.
#
# The originals are ~174MB of 24MP JPEGs plus 36 HEICs that no browser can
# decode. This produces a 1600px display copy and a 480px grid thumbnail for
# each, both JPEG, plus a manifest the gallery reads at runtime.
#
# Originals are never modified. Re-running is safe and idempotent.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/photos"
OUT="$ROOT/public/photos"

rm -rf "$OUT"
mkdir -p "$OUT/full" "$OUT/thumb"

# Deterministic order so a re-run doesn't reshuffle which photo is which index.
shopt -s nullglob nocaseglob
files=()
for f in "$SRC"/*.{jpg,jpeg,png,heic}; do files+=("$f"); done
shopt -u nocaseglob

IFS=$'\n' files=($(sort <<<"${files[*]:-}")) || true
unset IFS

total=${#files[@]}
echo "found $total source photos"

manifest="$OUT/manifest.json"
echo '{"photos":[' > "$manifest"

index=0
ok=0
failed=0

for src in "${files[@]}"; do
  index=$((index + 1))
  name=$(printf "%03d" "$index")

  if sips -s format jpeg -s formatOptions 80 -Z 1600 "$src" \
       --out "$OUT/full/$name.jpg" >/dev/null 2>&1 \
     && sips -s format jpeg -s formatOptions 70 -Z 480 "$src" \
       --out "$OUT/thumb/$name.jpg" >/dev/null 2>&1; then

    # A 12px JPEG inlined as a data URI. Blurred up by CSS it gives each photo
    # a placeholder made of its own colours, so images resolve out of their
    # own palette instead of popping in against grey.
    # Derived from the generated thumbnail, not the original: the camera file
    # carries an ICC profile and EXIF block that survive the resize and would
    # bloat a 12px image to several kilobytes.
    lqip=""
    if sips -s format jpeg -s formatOptions 35 -Z 12 "$OUT/thumb/$name.jpg" \
         --out "$OUT/.lqip.jpg" >/dev/null 2>&1; then
      lqip="data:image/jpeg;base64,$(base64 -i "$OUT/.lqip.jpg" | tr -d '\n')"
    fi

    [ "$ok" -gt 0 ] && echo ',' >> "$manifest"
    printf '  {"id":"%s","full":"photos/full/%s.jpg","thumb":"photos/thumb/%s.jpg","lqip":"%s"}' \
      "$name" "$name" "$name" "$lqip" >> "$manifest"
    ok=$((ok + 1))
  else
    echo "  ! failed: $(basename "$src")" >&2
    rm -f "$OUT/full/$name.jpg" "$OUT/thumb/$name.jpg"
    failed=$((failed + 1))
  fi

  if [ $((index % 15)) -eq 0 ]; then echo "  ...$index/$total"; fi
done

echo '' >> "$manifest"
echo ']}' >> "$manifest"

rm -f "$OUT/.lqip.jpg"
echo "converted: $ok   failed: $failed"
echo "output size: $(du -sh "$OUT" | cut -f1)"
