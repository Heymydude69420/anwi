#!/usr/bin/env python3
"""Attach a colour palette to every photo in the manifest.

An inlined tiny JPEG was the obvious placeholder, but some camera files carry
ICC profiles that survive a resize — a 12px thumbnail came out at 8KB, and the
manifest ballooned to 477KB. A handful of sampled colours gives the same
"resolves out of its own palette" effect for ~60 bytes per photo.

sips writes the downsample; the 4x3 PNG it produces is parsed here directly,
since there's no imaging library available and a PNG that small is trivial to
decode by hand.
"""

import base64
import json
import os
import struct
import subprocess
import sys
import tempfile
import zlib

GRID_W, GRID_H = 4, 3


def png_pixels(path):
    """Decode a small non-interlaced 8-bit PNG into a list of (r, g, b)."""
    data = open(path, "rb").read()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("not a png")

    pos = 8
    width = height = color_type = None
    idat = b""

    while pos < len(data):
        (length,) = struct.unpack(">I", data[pos : pos + 4])
        kind = data[pos + 4 : pos + 8]
        body = data[pos + 8 : pos + 8 + length]
        pos += 12 + length  # length + type + body + crc

        if kind == b"IHDR":
            width, height, _bit_depth, color_type = struct.unpack(">IIBB", body[:10])
        elif kind == b"IDAT":
            idat += body
        elif kind == b"IEND":
            break

    channels = {0: 1, 2: 3, 4: 2, 6: 4}[color_type]
    raw = zlib.decompress(idat)
    stride = width * channels

    pixels = []
    previous = bytearray(stride)

    for y in range(height):
        start = y * (stride + 1)
        filter_type = raw[start]
        line = bytearray(raw[start + 1 : start + 1 + stride])

        # Undo the per-scanline filter (PNG spec section 9).
        for i in range(stride):
            left = line[i - channels] if i >= channels else 0
            up = previous[i]
            if filter_type == 1:
                line[i] = (line[i] + left) & 0xFF
            elif filter_type == 2:
                line[i] = (line[i] + up) & 0xFF
            elif filter_type == 3:
                line[i] = (line[i] + (left + up) // 2) & 0xFF
            elif filter_type == 4:
                upleft = previous[i - channels] if i >= channels else 0
                p = left + up - upleft
                pa, pb, pc = abs(p - left), abs(p - up), abs(p - upleft)
                nearest = left if (pa <= pb and pa <= pc) else (up if pb <= pc else upleft)
                line[i] = (line[i] + nearest) & 0xFF

        for x in range(width):
            off = x * channels
            if channels >= 3:
                pixels.append((line[off], line[off + 1], line[off + 2]))
            else:
                pixels.append((line[off],) * 3)

        previous = line

    return pixels


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    manifest_path = os.path.join(root, "public", "photos", "manifest.json")
    manifest = json.load(open(manifest_path))

    tmp = tempfile.mktemp(suffix=".png")
    done = 0

    for photo in manifest["photos"]:
        source = os.path.join(root, "public", photo["thumb"])

        result = subprocess.run(
            ["sips", "-s", "format", "png", "-z", str(GRID_H), str(GRID_W), source, "--out", tmp],
            capture_output=True,
        )
        if result.returncode != 0:
            photo.pop("lqip", None)
            continue

        try:
            pixels = png_pixels(tmp)
        except Exception:
            photo.pop("lqip", None)
            continue

        photo.pop("lqip", None)
        photo["grid"] = ["%02x%02x%02x" % px for px in pixels]

        # Average, for the flat fallback and for tinting the surrounding chrome.
        n = len(pixels)
        photo["tint"] = "%02x%02x%02x" % (
            sum(p[0] for p in pixels) // n,
            sum(p[1] for p in pixels) // n,
            sum(p[2] for p in pixels) // n,
        )
        done += 1

    if os.path.exists(tmp):
        os.remove(tmp)

    json.dump(manifest, open(manifest_path, "w"), separators=(",", ":"))
    size = os.path.getsize(manifest_path)
    print(f"  palettes written for {done}/{len(manifest['photos'])} photos")
    print(f"  manifest: {size // 1024} KB")


if __name__ == "__main__":
    sys.exit(main())
