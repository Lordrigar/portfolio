"""Extract Solo's supplied sheet. Requires Pillow.
Usage: python scripts/split-solo-sprites.py /path/to/solo.png
"""
from collections import deque
from pathlib import Path
import json
import sys
from PIL import Image
source=Image.open(sys.argv[1]).convert('RGBA')
if source.size!=(1536,1024): raise SystemExit('Expected 1536x1024 source.')
output=Path(__file__).resolve().parents[1]/'public/games/fox-adventure/sprites/solo'
output.mkdir(parents=True,exist_ok=True)
# Every region has an explicit body anchor; effects do not shift its position.
rows={
'idle':(3,142,138,[(165,260,210),(310,405,357),(455,550,505),(600,700,650),(745,845,798),(895,990,947)]),
'walk':(149,280,274,[(170,270,218),(320,425,370),(470,570,520),(620,725,670),(775,875,820),(925,1025,970),(1070,1175,1120),(1220,1325,1270)]),
'run':(287,410,401,[(140,280,222),(295,435,375),(445,590,529),(600,745,684),(755,900,840),(905,1050,993),(1060,1200,1148),(1215,1360,1305)]),
'jump':(417,548,540,[(170,270,215),(315,420,365),(460,560,513),(610,710,663),(760,865,814),(895,1020,964)]),
'crouch':(555,670,666,[(175,265,214),(315,415,363),(465,565,513),(615,715,663)]),
'punch':(677,813,798,[(175,270,218),(320,425,370),(470,580,520),(615,765,675),(770,920,825),(930,1048,978),(1080,1195,1128),(1230,1350,1280)]),
'hit':(823,973,962,[(140,230,183),(265,360,310),(385,485,435),(510,610,560)]),
'death':(823,974,963,[(705,800,750),(800,890,845),(890,985,945),(990,1084,1045),(1088,1193,1145),(1193,1298,1250),(1298,1410,1358),(1410,1520,1465)]),
}
rates={'idle':6,'walk':8,'run':12,'jump':10,'crouch':8,'punch':12,'hit':10,'death':8}
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
 strip.save(output/f'{name}.png')
 manifest[name]={'file':f'{name}.png','frames':len(regions),'frameWidth':192,'frameHeight':176,'frameRate':rates[name],'repeat':-1 if name in ('idle','walk','run') else 0}
(output/'animations.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(f'Prepared {sum(len(row[3]) for row in rows.values())} Solo frames across {len(rows)} animations.')
