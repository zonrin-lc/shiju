# -*- coding: utf-8 -*-
"""生成「帛书」纹理（绢帛底）—— 方向 A 重设计专用
输出：ui效果图/src/tex_silk.png （可平铺，1024×1024）
特征：经纬织纹 + 纤维不匀 + 霉斑(foxing) + 边缘做旧
纯 PIL，无外部素材。种子固定 → 可复现。
"""
import random
from PIL import Image, ImageDraw, ImageFilter

random.seed(20260930)
W = H = 1024
BASE = (232, 219, 191)      # 生绢米黄
BASE_D = (206, 190, 156)    # 稍暗

im = Image.new('RGB', (W, H), BASE)
px = im.load()

# ---------- 1. 经纬织纹（平纹：横竖各一组细线，间距 3px）----------
STEP = 3
for y in range(H):
    for x in range(W):
        warp = 0 if (x % STEP) else -11     # 竖线（经）
        weft = 0 if (y % STEP) else -6      # 横线（纬）
        n = warp + weft
        if n:
            r, g, b = px[x, y]
            px[x, y] = (max(0, r + n), max(0, g + n), max(0, b + n))
# ---------- 2. 大尺度色不匀（低频噪点，模拟绢帛染色不均）----------
im = im.filter(ImageFilter.GaussianBlur(9))
px = im.load()
CELL = 64
grid = [[random.randint(-9, 7) for _ in range(W // CELL + 2)] for _ in range(H // CELL + 2)]
for y in range(H):
    gy = y // CELL
    for x in range(W):
        gx = x // CELL
        n = grid[gy][gx]
        r, g, b = px[x, y]
        px[x, y] = (max(0, min(255, int(r + n))), max(0, min(255, int(g + n * 0.9))), max(0, min(255, int(b + n * 0.7))))
im = im.filter(ImageFilter.GaussianBlur(10))
px = im.load()

# ---------- 3. 纤维（随机细长浅色毛丝）----------
fib = Image.new('RGBA', (W, H), (0, 0, 0, 0))
fd = ImageDraw.Draw(fib)
for _ in range(2200):
    x = random.randint(0, W); y = random.randint(0, H)
    ang = random.uniform(0, 6.28318)                 # 任意角度
    ln = random.randint(4, 15)                        # 短纤维
    a = random.randint(5, 15)                         # 极淡
    c = (255, 253, 244, a) if random.random() < 0.6 else (126, 104, 72, a)
    x2 = x + ln * 0.985 * __import__('math').cos(ang)
    y2 = y + ln * 0.985 * __import__('math').sin(ang)
    fd.line([(x, y), (x2, y2)], fill=c, width=1)
fib = fib.filter(ImageFilter.GaussianBlur(0.3))
im = Image.alpha_composite(im.convert('RGBA'), fib).convert('RGB')

# ---------- 4. 霉斑 / 虫蛀 foxing（茶色小点，成簇）----------
sp = Image.new('RGBA', (W, H), (0, 0, 0, 0))
sd = ImageDraw.Draw(sp)
for _ in range(46):                      # 簇心
    cxp = random.randint(0, W); cyp = random.randint(0, H)
    rad = random.randint(14, 52)
    for _ in range(random.randint(6, 22)):
        ox = cxp + random.randint(-rad, rad); oy = cyp + random.randint(-rad, rad)
        rr = random.randint(2, 11)
        a = random.randint(10, 30)
        sd.ellipse([ox - rr, oy - rr, ox + rr, oy + rr], fill=(150, 112, 62, a))
sp = sp.filter(ImageFilter.GaussianBlur(6))
im = Image.alpha_composite(im.convert('RGBA'), sp).convert('RGB')

# ---------- 5. 四边做旧（更暗，模拟卷边与手泽）----------
vg = Image.new('RGBA', (W, H), (0, 0, 0, 0))
vd = ImageDraw.Draw(vg)
EDGE = 90
for i in range(EDGE):
    a = int(46 * (1 - i / EDGE) ** 2)
    vd.line([(i, 0), (i, H)], fill=(96, 76, 46, a))
    vd.line([(W - 1 - i, 0), (W - 1 - i, H)], fill=(96, 76, 46, a))
    vd.line([(0, i), (W, i)], fill=(96, 76, 46, a))
    vd.line([(0, H - 1 - i), (W, H - 1 - i)], fill=(96, 76, 46, a))
vg = vg.filter(ImageFilter.GaussianBlur(7))
im = Image.alpha_composite(im.convert('RGBA'), vg).convert('RGB')

im.save(r'D:\MUSI\SHIJU\ui效果图\src\tex_silk.png', optimize=True)
print('tex_silk.png  %dx%d  %dKB' % (W, H, __import__('os').path.getsize(r'D:\MUSI\SHIJU\ui效果图\src\tex_silk.png') // 1024))
