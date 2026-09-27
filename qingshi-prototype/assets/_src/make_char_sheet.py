# -*- coding: utf-8 -*-
import os, glob
from PIL import Image
D = r"D:\MUSI\SHIJU\qingshi-prototype\assets\char"
files = sorted(glob.glob(os.path.join(D,"char_*.png")))
files = [f for f in files if "_raw" not in f]
cols=6; cw,ch=180,270; gap=10
rows=(len(files)+cols-1)//cols
W=cols*cw+(cols+1)*gap; H=rows*ch+(rows+1)*gap
sheet=Image.new("RGB",(W,H),(23,20,15))
from PIL import ImageDraw
dr=ImageDraw.Draw(sheet)
for i,f in enumerate(files):
    im=Image.open(f).convert("RGB").resize((cw,ch))
    r,c=divmod(i,cols)
    x=gap+c*(cw+gap); y=gap+r*(ch+gap)
    sheet.paste(im,(x,y))
    name=os.path.basename(f)[5:-4]
    dr.text((x+3,y+ch+1),name,fill=(168,154,124))
out=r"D:\MUSI\SHIJU\qingshi-prototype\assets\_gen\char_sheet.png"
sheet.save(out)
print(len(files),"chars ->",out,sheet.size)
