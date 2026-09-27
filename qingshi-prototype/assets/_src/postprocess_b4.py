# -*- coding: utf-8 -*-
import os
from PIL import Image
A = os.path.join(os.path.dirname(__file__), "..")
ACH = os.path.join(A, "ach")
DARK = (0x17,0x14,0x0F,255)

ids = ["cangshu","yizi","shutongwen","shaqiu","shuyumengtian","dongmen",
       "yibo","hushu","sili","jinchan","nitian","shiwodai"]
labels = ["仓鼠哲学家","一字千钧","书同文","沙丘之夜","孰与蒙恬","东门黄犬",
          "义薄云天","护书之人","死里逃生","金蝉脱壳","逆天改命","时不我待"]

for i in ids:
    im = Image.open(os.path.join(ACH, f"ach_{i}_raw.png")).convert("RGBA")
    im = im.resize((512,512), Image.LANCZOS)
    im.save(os.path.join(ACH, f"ach_{i}.png"))

# 总览 4列x3行, 每格 240
cell=250
out = Image.new("RGBA",(cell*4, cell*3), DARK)
for idx,(i,lab) in enumerate(zip(ids,labels)):
    im = Image.open(os.path.join(ACH, f"ach_{i}.png")).resize((230,230), Image.LANCZOS)
    r,c = divmod(idx,4)
    out.alpha_composite(im,(c*cell+10, r*cell+10))
out.convert("RGB").save(os.path.join(A,"_gen","b4-check.png"))
print("done", len(ids))
