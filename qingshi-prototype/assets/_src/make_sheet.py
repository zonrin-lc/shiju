# -*- coding: utf-8 -*-
import os, glob
from PIL import Image
ACH = os.path.join(os.path.dirname(__file__), "..", "ach")
ids = sorted([os.path.basename(p)[:-4] for p in glob.glob(os.path.join(ACH,"ach_*.png")) if "_raw" not in p])
cell, gap = 128, 8
cols = 8
rows = (len(ids)+cols-1)//cols
W = cols*cell + (cols+1)*gap
H = rows*cell + (rows+1)*gap
sheet = Image.new("RGB",(W,H),(23,20,15))
for i,cid in enumerate(ids):
    im = Image.open(os.path.join(ACH,cid+".png")).convert("RGB").resize((cell,cell))
    r,c = divmod(i,cols)
    sheet.paste(im,(gap+c*(cell+gap), gap+r*(cell+gap)))
out = os.path.join(ACH,"..","_gen","ach_sheet_v02.png")
sheet.save(out)
print(len(ids),"icons ->",out, sheet.size)
