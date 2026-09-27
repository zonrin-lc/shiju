# -*- coding: utf-8 -*-
import os
from PIL import Image
A = os.path.join(os.path.dirname(__file__), "..")
IC = os.path.join(A, "icons")
DARK = (0x17,0x14,0x0F,255)

ids = ["quanshi","shengwang","junxin","caifu","caixue","weiji",
       "dev1","dev2","dev3","dev4"]
labels = ["权势","声望","君心","财富","才学","危机","循史","微澜","改流","逆天"]

for i in ids:
    im = Image.open(os.path.join(IC, f"icon_{i}_raw.png")).convert("RGBA")
    im = im.resize((512,512), Image.LANCZOS)
    im.save(os.path.join(IC, f"icon_{i}.png"))

# 自检: 暗底拼版 + 40px缩略
cell=260; out=Image.new("RGBA",(cell*5, cell*2+60), DARK)
for idx,(i,lab) in enumerate(zip(ids,labels)):
    im=Image.open(os.path.join(IC,f"icon_{i}.png"))
    r,c=divmod(idx,5); ox,oy=c*cell,r*cell
    out.alpha_composite(im.resize((210,210),Image.LANCZOS),(ox+25,oy+10))
    out.alpha_composite(im.resize((40,40),Image.LANCZOS),(ox+60,oy+228))
out.convert("RGB").save(os.path.join(A,"_gen","b2-check-ai.png"))
print("done")
