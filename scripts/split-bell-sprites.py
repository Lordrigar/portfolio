"""Extract bell idle/attack frames without regenerating their artwork.
Requires Pillow. Usage: python scripts/split-bell-sprites.py /path/to/bell.png
"""
from collections import deque
from pathlib import Path
import json
import sys
from PIL import Image

source = Image.open(sys.argv[1]).convert('RGBA')
if source.size != (1774, 887):
    raise SystemExit('Expected the original 1774x887 bell sheet.')
output = Path(__file__).resolve().parents[1] / 'public/games/fox-adventure/sprites/bell'
output.mkdir(parents=True, exist_ok=True)
# x bounds and bell-body anchor: effects may extend farther than the character.
rows = {
    'idle': (140, 372, [(185,415,267), (450,680,532), (715,940,797), (975,1200,1057), (1240,1470,1322), (1505,1740,1587)]),
    'attack': (450, 710, [(165,365,235), (375,580,445), (585,780,650), (785,960,850), (960,1175,1070), (1175,1342,1265), (1342,1533,1460), (1533,1745,1670)]),
}
manifest = {}
for name, (top, bottom, regions) in rows.items():
    strip = Image.new('RGBA', (320 * len(regions), 288))
    for index, (left, right, anchor) in enumerate(regions):
        frame = source.crop((left, top, right, bottom))
        pixels = frame.load()
        w, h = frame.size
        pending = deque([(x,y) for x in range(w) for y in (0,h-1)] + [(x,y) for y in range(h) for x in (0,w-1)])
        visited = set()
        while pending:
            x,y = pending.popleft()
            if not (0 <= x < w and 0 <= y < h) or (x,y) in visited:
                continue
            visited.add((x,y))
            r,g,b,a = pixels[x,y]
            if r < 90 and g < 70 and b < 105 and b >= r - 12 and b > g + 2:
                pixels[x,y] = (0,0,0,0)
                pending.extend(((x-1,y),(x+1,y),(x,y-1),(x,y+1)))
        cell = Image.new('RGBA', (320,288))
        cell.alpha_composite(frame,(160+left-anchor,16))
        cell.save(output / f'{name}-{index:02}.png')
        strip.alpha_composite(cell,(index*320,0))
    strip.save(output / f'{name}.png')
    manifest[name] = {'file': f'{name}.png', 'frames': len(regions), 'frameWidth':320, 'frameHeight':288, 'frameRate':6 if name == 'idle' else 12, 'repeat':-1 if name == 'idle' else 0}
(output/'animations.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Prepared 6 idle frames and 8 attack frames.')
