"""Extract the supplied eight-frame power-up animation.
Requires Pillow. Usage: python scripts/split-powerup-sprites.py /path/to/powerup.png
"""
from collections import deque
from pathlib import Path
import json
import sys
from PIL import Image

source = Image.open(sys.argv[1]).convert('RGBA')
if source.size != (2172,724):
    raise SystemExit('Expected the original 2172x724 power-up sheet.')
output = Path(__file__).resolve().parents[1] / 'public/games/fox-adventure/sprites/powerup'
output.mkdir(parents=True,exist_ok=True)
# Regions measured against the displayed reference; align the boots rather
# than centering each silhouette, which shifts as the bottle is raised.
regions = [(205,420,324),(440,665,550),(675,895,785),(900,1133,1010),
           (1135,1364,1240),(1365,1588,1470),(1590,1806,1700),(1810,2020,1935)]
scale = source.width / 2048
strip = Image.new('RGBA',(320*8,320))
for index,(left,right,anchor) in enumerate(regions):
    left,right,anchor = [round(value*scale) for value in (left,right,anchor)]
    frame = source.crop((left,225,right,525))
    pixels = frame.load()
    w,h = frame.size
    queue = deque([(x,y) for x in range(w) for y in (0,h-1)] + [(x,y) for y in range(h) for x in (0,w-1)])
    seen = set()
    while queue:
        x,y = queue.popleft()
        if not (0<=x<w and 0<=y<h) or (x,y) in seen:
            continue
        seen.add((x,y))
        r,g,b,a = pixels[x,y]
        if r<90 and g<70 and b<105 and b>=r-12 and b>g+2:
            pixels[x,y]=(0,0,0,0)
            queue.extend(((x-1,y),(x+1,y),(x,y-1),(x,y+1)))
    cell=Image.new('RGBA',(320,320))
    cell.alpha_composite(frame,(160+left-anchor,12))
    cell.save(output/f'drink-{index:02}.png')
    strip.alpha_composite(cell,(index*320,0))
strip.save(output/'drink.png')
(output/'animations.json').write_text(json.dumps({'drink':{'file':'drink.png','frames':8,'frameWidth':320,'frameHeight':320,'frameRate':8,'repeat':0,'origin':{'x':0.5,'y':0.94375}}},indent=2)+'\n')
print('Prepared 8 power-up frames and a 2560x320 animation strip.')
