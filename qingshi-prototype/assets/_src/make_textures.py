# -*- coding: utf-8 -*-
"""B组纹理: tex_bamboo.png (512x512 竖竹片+编绳+噪声) / orn_yunlei.png (512x64 横向无缝云雷纹)"""
import os
from PIL import Image, ImageDraw, ImageFilter
import random
random.seed(7)
AS = os.path.join(os.path.dirname(__file__), "..")

# ---------- B1 tex_bamboo: 竖竹片 + 编绳横线 + 噪声, 极暗可平铺 ----------
S = 512
base = (23, 20, 15)          # #17140f
img = Image.new("RGB", (S, S), base)
d = ImageDraw.Draw(img)
slat_w = 16                  # 每片竹宽
for x in range(0, S, slat_w):
    v = random.randint(-4, 4)
    col = (base[0]+v, base[1]+v, base[2]+v)
    d.rectangle([x, 0, x+slat_w-1, S], fill=col)
    # 竹片缝
    d.line([(x, 0), (x, S)], fill=(15, 12, 9))
# 横向编绳 (间隔整除 S -> 纵向无缝)
cord_every = 128
for y in range(0, S, cord_every):
    d.line([(0, y), (S, y)], fill=(40, 33, 24), width=2)
    d.line([(0, y+2), (S, y+2)], fill=(30, 25, 18), width=1)
# 噪声 (PIL 原生, 无 numpy)
nd = ImageDraw.Draw(img)
for _ in range(2600):
    x = random.randint(0, S-1); y = random.randint(0, S-1)
    v = random.randint(20, 26)
    nd.point((x, y), fill=(v, v-3, v-7))
img.save(os.path.join(AS, "text", "tex_bamboo.png"))

# ---------- B2 orn_yunlei: 512x64 横向无缝云雷纹 (描金单线, 透明底) ----------
W, H = 512, 64
gold = (201, 169, 89, 255)   # #c9a959
yu = Image.new("RGBA", (W, H), (0,0,0,0))
du = ImageDraw.Draw(yu)
cell = 64                     # 单元宽, 整除 512
ncells = W // cell
# 一个云雷纹单元: 方折回旋折线 (在 64x64 内)
def yunlei(cx):
    # 外框回字
    L = cx+14; R = cx+50; T = 14; B = 50
    # 画连续折线云雷纹 (方折 S 形)
    pts = []
    # 左竖下 -> 横 -> 折 -> 横
    du.line([(L, T+8), (L, B-8)], fill=gold, width=2)
    du.line([(L, B-8), (L+12, B-8)], fill=gold, width=2)
    du.line([(L+12, B-8), (L+12, B-20)], fill=gold, width=2)
    du.line([(L+12, B-20), (R-12, B-20)], fill=gold, width=2)
    du.line([(R-12, B-20), (R-12, T+20)], fill=gold, width=2)
    du.line([(R-12, T+20), (R, T+20)], fill=gold, width=2)
    # 顶部中横线 (与相邻单元衔接)
    du.line([(R, T+20), (R, T+8)], fill=gold, width=2)
for i in range(ncells):
    yunlei(i*cell)
yu.save(os.path.join(AS, "orn", "orn_yunlei.png"))
print("textures done")
