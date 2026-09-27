# -*- coding: utf-8 -*-
"""B3/B5 AI 图后处理: 裁尺寸/透明底/压缩"""
import os
from PIL import Image

A = os.path.join(os.path.dirname(__file__), "..")
BG = os.path.join(A, "bg"); MS = os.path.join(A, "misc")

def white_to_alpha(im, thresh=208):
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if (r + g + b) / 3 > thresh:
                px[x, y] = (r, g, b, 0)
    return im

# hero: 960x1280 -> 960x1200 (裁顶留白), JPG q84
im = Image.open(os.path.join(BG, "bg_home_hero_raw.png")).convert("RGB")
im = im.crop((0, 80, 960, 1280))
im.save(os.path.join(BG, "bg_home_hero.jpg"), quality=84, optimize=True)
print("hero", im.size)

# share: 960x1280 -> 2:3 -> 480x720, JPG q86
im = Image.open(os.path.join(BG, "bg_share_raw.png")).convert("RGB")
w, h = im.size
nw = round(h * 2 / 3)
x0 = (w - nw) // 2
im = im.crop((x0, 0, x0 + nw, h)).resize((480, 720), Image.LANCZOS)
im.save(os.path.join(BG, "bg_share.jpg"), quality=86, optimize=True)
print("share", im.size)

# hamster: 1024 -> 512 透明底
im = white_to_alpha(Image.open(os.path.join(MS, "misc_hamster_raw.png")))
im = im.resize((512, 512), Image.LANCZOS)
im.save(os.path.join(MS, "misc_hamster.png"))
print("hamster", im.size)

# scroll: 1536x1024 取中间横条 -> 960x240 透明底
im = Image.open(os.path.join(MS, "misc_scroll_raw.png"))
w, h = im.size
cy = h // 2
th = round(w * 240 / 960)  # 保持宽高比
th = min(th, 420)
im = im.crop((0, cy - th // 2, w, cy + th // 2))
im = white_to_alpha(im)
im = im.resize((960, 240), Image.LANCZOS)
im.save(os.path.join(MS, "misc_scroll.png"))
print("scroll", im.size)
