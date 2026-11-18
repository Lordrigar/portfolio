"""Extract muscle fox animations. Requires Pillow.
Usage: python scripts/split-muscle-sprites.py /path/to/muscle-fox.png
"""
from collections import deque
from pathlib import Path
import json
import sys
from PIL import Image
source=Image.open(sys.argv[1]).convert('RGBA')
if source.size!=(1536,1024): raise SystemExit('Expected 1536x1024 source.')
output=Path(__file__).resolve().parents[1]/'public/games/fox-adventure/sprites/muscle'
output.mkdir(parents=True,exist_ok=True)
rows={
'idle':(8,160,154,[(150+i*166,280+i*166,220+i*166) for i in range(4)]),
'walk':(174,310,305,[(150+i*167,295+i*167,220+i*167) for i in range(8)]),
'run':(325,468,460,[(140+i*167,300+i*167,220+i*167) for i in range(8)]),
'jump':(480,621,615,[(160,290,225),(325,465,390),(490,635,555),(650,805,720)]),
'crouch':(636,783,777,[(160,285,225),(325,465,395),(490,635,560),(665,800,730)]),
'punch':(800,965,957,[(155,295,230),(330,470,405),(505,680,580),(690,885,765),(895,1035,950),(1060,1210,1120)]),
}
manifest={}
for name,(top,bottom,ground,regions) in rows.items():
 strip=Image.new('RGBA',(192*len(regions),176))
 for i,(left,right,anchor) in enumerate(regions):
  frame=source.crop((left,top,right,bottom));px=frame.load();w,h=frame.size
  todo=deque([(x,y) for x in range(w) for y in (0,h-1)]+[(x,y) for y in range(h) for x in (0,w-1)]);seen=set()
  while todo:
   x,y=todo.popleft()
   if not (0<=x<w and 0<=y<h) or (x,y) in seen: continue
   seen.add((x,y));r,g,b,a=px[x,y]
   if r<90 and g<70 and b<105 and b>=r-28 and b>g+2:
    px[x,y]=(0,0,0,0);todo.extend(((x-1,y),(x+1,y),(x,y-1),(x,y+1)))
  cell=Image.new('RGBA',(192,176));cell.alpha_composite(frame,(96+left-anchor,168-ground+top))
  cell.save(output/f'{name}-{i:02}.png');strip.alpha_composite(cell,(i*192,0))
 strip.save(output/f'{name}.png');manifest[name]={'frames':len(regions),'frameWidth':192,'frameHeight':176}
(output/'animations.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Prepared 34 muscle fox frames.')
