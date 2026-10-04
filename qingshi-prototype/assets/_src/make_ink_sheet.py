# -*- coding: utf-8 -*-
import os, glob
from PIL import Image, ImageDraw
D = r"D:\MUSI\SHIJU\qingshi-prototype\assets\char"
files = sorted(glob.glob(os.path.join(D,"char_*_ink.png")))
cols=6; cw,ch=170,255; gap=8
rows=(len(files)+cols-1)//cols
W=cols*cw+(cols+1)*gap; H=rows*ch+(rows+1)*gap
sheet=Image.new("RGB",(W,H),(240,236,226))
dr=ImageDraw.Draw(sheet)
for i,f in enumerate(files):
    im=Image.open(f).convert("RGB").resize((cw,ch))
    r,c=divmod(i,cols)
    x=gap+c*(cw+gap); y=gap+r*(ch+gap)
    sheet.paste(im,(x,y))
    name=os.path.basename(f)[5:-8]
    dr.text((x+3,y+ch+1),name,fill=(90,80,60))
out=r"D:\MUSI\SHIJU\qingshi-prototype\assets\_gen\char_ink_sheet.png"
sheet.save(out)
print(len(files),"ink chars ->",out,sheet.size)
