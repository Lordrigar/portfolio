"""Extract seven death frames. Requires Pillow.
Usage: python scripts/split-death-sprites.py /path/to/death.png
"""
from collections import deque
from pathlib import Path
import json
import sys
from PIL import Image
source=Image.open(sys.argv[1]).convert('RGBA')
if source.size!=(2172,724):
    raise SystemExit('Expected the original 2172x724 sheet.')
output=Path(__file__).resolve().parents[1]/'public/games/fox-adventure/sprites/death'
output.mkdir(parents=True,exist_ok=True)
regions=[(175,385,300),(415,640,540),(655,915,780),(910,1175,1030),
         (1175,1445,1290),(1445,1720,1560),(1730,2020,1870)]
scale=source.width/2048
strip=Image.new('RGBA',(192*7,176))
for i,(left,right,anchor) in enumerate(regions):
    left,right,anchor=[round(v*scale) for v in (left,right,anchor)]
    frame=source.crop((left,210,right,510))
    px=frame.load(); w,h=frame.size
    todo=deque([(x,y) for x in range(w) for y in (0,h-1)]+[(x,y) for y in range(h) for x in (0,w-1)])
    seen=set()
    while todo:
        x,y=todo.popleft()
        if not (0<=x<w and 0<=y<h) or (x,y) in seen: continue
        seen.add((x,y));r,g,b,a=px[x,y]
        if r<90 and g<70 and b<105 and b>=r-12 and b>g+2:
            px[x,y]=(0,0,0,0)
            todo.extend(((x-1,y),(x+1,y),(x,y-1),(x,y+1)))
    cell=Image.new('RGBA',(384,352))
    cell.alpha_composite(frame,(192+left-anchor,46))
    cell=cell.resize((192,176),Image.Resampling.NEAREST)
    cell.save(output/f'death-{i:02}.png')
    strip.alpha_composite(cell,(i*192,0))
strip.save(output/'death.png')
(output/'animations.json').write_text(json.dumps({'death':{'file':'death.png','frames':7,'frameWidth':192,'frameHeight':176,'frameRate':7,'repeat':0,'origin':{'x':0.5,'y':165/176}}},indent=2)+'\n')
print('Prepared seven aligned death frames and animation strip.')
