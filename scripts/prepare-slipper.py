"""Prepare the supplied slipper as a transparent projectile. Requires Pillow.
Usage: python scripts/prepare-slipper.py /path/to/papuc.png
"""
from collections import deque
from pathlib import Path
import sys
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGBA')
p=im.load();w,h=im.size
q=deque([(x,y) for x in range(w) for y in (0,h-1)]+[(x,y) for y in range(h) for x in (0,w-1)])
seen=set()
while q:
 x,y=q.popleft()
 if not(0<=x<w and 0<=y<h) or (x,y) in seen:continue
 seen.add((x,y));r,g,b,a=p[x,y]
 if r<100 and g<75 and b<120 and b>=r-28 and b>g+2:
  p[x,y]=(0,0,0,0);q.extend(((x-1,y),(x+1,y),(x,y-1),(x,y+1)))
# Retain substantial slipper pieces; discard tiny detached crumbs.
seen=set();components=[]
for y in range(h):
 for x in range(w):
  if (x,y) in seen or not p[x,y][3]:continue
  q=deque([(x,y)]);component=[]
  while q:
   xx,yy=q.popleft()
   if not(0<=xx<w and 0<=yy<h) or (xx,yy) in seen or not p[xx,yy][3]:continue
   seen.add((xx,yy));component.append((xx,yy));q.extend(((xx-1,yy),(xx+1,yy),(xx,yy-1),(xx,yy+1)))
  if len(component)>=300:components.append(component)
mask=Image.new('L',im.size)
mp=mask.load()
for component in components:
 for x,y in component:mp[x,y]=255
im.putalpha(mask)
im=im.crop(im.getbbox());im.thumbnail((56,38),Image.Resampling.NEAREST)
cell=Image.new('RGBA',(64,48));cell.alpha_composite(im,((64-im.width)//2,(48-im.height)//2))
output=Path(__file__).resolve().parents[1]/'public/games/fox-adventure/sprites/slipper.png'
cell.save(output)
print(output)
