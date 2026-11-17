"""Extract the supplied presentation sheet. Requires Pillow: pip install pillow.
Usage: python scripts/split-fox-sprites.py /path/to/source.png
"""
from pathlib import Path
from collections import deque
import json
import sys
from PIL import Image

source = Image.open(sys.argv[1]).convert('RGBA')
output = Path(__file__).resolve().parents[1] / 'public/games/fox-adventure/sprites'
output.mkdir(parents=True, exist_ok=True)
# Explicit regions avoid labels and separator lines in the original 1536x1024 sheet.
rows = {
    'idle': [(160+i*192, 8, 310+i*192, 160) for i in range(4)],
    'walk': [(160+i*165, 174, 310+i*165, 310) for i in range(8)],
    'run': [(150+i*165, 326, 310+i*165, 468) for i in range(8)],
    'jump': [(165, 486, 315, 635), (355, 486, 505, 635), (545, 482, 695, 635), (725, 486, 875, 635)],
    'throw': [(160,650,310,814), (355,650,505,814), (545,650,740,814), (745,650,890,814), (970,650,1110,814), (1150,650,1305,814)],
    'projectile': [(260, 850, 345, 936), (375, 850, 490, 936), (515, 850, 632, 936), (650, 850, 755, 936)],
    'hit': [(1050, 850, 1130, 940), (1150, 850, 1250, 940), (1270, 850, 1370, 940)],
}
if source.size != (1536, 1024):
    raise SystemExit('Expected the original 1536x1024 sheet.')
manifest = {}
for name, regions in rows.items():
    strip = Image.new('RGBA', (192 * len(regions), 176))
    for index, box in enumerate(regions):
        frame = source.crop(box)
        pixels = frame.load()
        w, h = frame.size
        # Flood only background pixels connected to the crop border; keep dark outlines.
        pending = deque([(x, y) for x in range(w) for y in (0, h-1)] + [(x, y) for y in range(h) for x in (0, w-1)])
        visited = set()
        while pending:
            x, y = pending.popleft()
            if (x, y) in visited or not (0 <= x < w and 0 <= y < h):
                continue
            visited.add((x, y))
            r, g, b, a = pixels[x, y]
            if r < 65 and g < 48 and b < 85 and b > r and b > g:
                pixels[x, y] = (0, 0, 0, 0)
                pending.extend(((x-1,y),(x+1,y),(x,y-1),(x,y+1)))
        frame = frame.crop(frame.getbbox())
        cell = Image.new('RGBA', (192, 176))
        cell.alpha_composite(frame, ((192-frame.width)//2, 168-frame.height))
        cell.save(output / f'{name}-{index:02}.png')
        strip.alpha_composite(cell, (192*index, 0))
    strip.save(output / f'{name}.png')
    manifest[name] = {'frames': len(regions), 'frameWidth': 192, 'frameHeight': 176}
(output / 'animations.json').write_text(json.dumps(manifest, indent=2)+'\n')
print(f'Extracted {sum(len(r) for r in rows.values())} frames into {output}')
