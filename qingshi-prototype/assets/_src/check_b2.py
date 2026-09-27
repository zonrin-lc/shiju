# -*- coding: utf-8 -*-
"""B2 图标自检: 暗底拼版 + 24/40px 缩略"""
import os
from PIL import Image

D = os.path.join(os.path.dirname(__file__), "..", "icons")
GEN = os.path.join(os.path.dirname(__file__), "..", "_gen")
BG = (0x17, 0x14, 0x0F, 255)

names = [
    "icon_quanshi", "icon_shengwang", "icon_junxin", "icon_caifu",
    "icon_caixue", "icon_weiji",
    "icon_dev1", "icon_dev2", "icon_dev3", "icon_dev4",
]
labels = ["权势","声望","君心","财富","才学","危机","循史","微澜","改流","逆天"]

cols = 5
cell = 260
rows = 2
W_, H_ = cols*cell, rows*cell + 120
sheet = Image.new("RGBA", (W_, H_), BG)

for i, (n, lab) in enumerate(zip(names, labels)):
    im = Image.open(os.path.join(D, n + ".png")).convert("RGBA")
    r, c = divmod(i, cols)
    ox, oy = c*cell, r*cell
    # 大版 200
    big = im.resize((200, 200), Image.LANCZOS)
    sheet.alpha_composite(big, (ox+30, oy+10))
    # 40 / 24 缩略
    sheet.alpha_composite(im.resize((40,40), Image.LANCZOS), (ox+40, oy+215))
    sheet.alpha_composite(im.resize((24,24), Image.LANCZOS), (ox+110, oy+231))

out = os.path.join(GEN, "b2-check.png")
sheet.convert("RGB").save(out)
print("saved", out)
