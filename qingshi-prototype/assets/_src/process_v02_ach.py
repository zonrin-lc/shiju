# -*- coding: utf-8 -*-
"""v0.2: 48枚新成就 raw -> 512 正式 PNG (修白角)"""
import os, glob
from PIL import Image
ACH = os.path.join(os.path.dirname(__file__), "..", "ach")

def fix_corners(im):
    px = im.load(); w,h = im.size; n=0
    for y in range(h):
        for x in range(w):
            r,g,b,a = px[x,y]
            if r>195 and g>195 and b>195:
                px[x,y]=(38,31,23,255); n+=1
    return n

cnt=0
for raw in sorted(glob.glob(os.path.join(ACH,"*_raw.png"))):
    name = os.path.basename(raw)[:-8]   # 去 _raw.png
    # 只处理 v0.2 新增的 48 枚 (李斯12枚之前已处理, 但其raw也在; 统一处理无害)
    im = Image.open(raw).convert("RGBA")
    fix_corners(im)
    im = im.resize((512,512), Image.LANCZOS)
    im.save(os.path.join(ACH, name+".png"))
    cnt+=1
print("processed", cnt, "ach icons -> 512")
