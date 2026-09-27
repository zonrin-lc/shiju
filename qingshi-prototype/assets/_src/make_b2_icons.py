# -*- coding: utf-8 -*-
"""
B2 图标 10 枚生成器
- 六维 6 枚: 权势/声望/君心/财富/才学/危机
- 偏离四段 4 枚: 循史/微澜/改流/逆天 (同一"水道"母题四态)
规范: 512x512 透明底, 线宽 46, round cap/join, 色板严格一致
"""
import os, math
from PIL import Image, ImageDraw

SIZE = 512
W = 46
OUT = os.path.join(os.path.dirname(__file__), "..", "icons")
os.makedirs(OUT, exist_ok=True)

GOLD  = (201, 169, 89, 255)   # c9a959
RED   = (176,  67, 47, 255)   # b0432f
TEAL  = (127, 168,160, 255)   # 7fa8a0
OCHRE = (201, 122, 58, 255)   # c97a3a

# ---------- 图元 ----------
def cubic(p0, p1, p2, p3, n=28):
    pts = []
    for i in range(n + 1):
        t = i / n
        mt = 1 - t
        x = mt**3*p0[0] + 3*mt**2*t*p1[0] + 3*mt*t**2*p2[0] + t**3*p3[0]
        y = mt**3*p0[1] + 3*mt**2*t*p1[1] + 3*mt*t**2*p2[1] + t**3*p3[1]
        pts.append((x, y))
    return pts

def seg(draw, pts, color, w=W):
    draw.line(pts, fill=color, width=w, joint="curve")
    r = w / 2.0
    for (x, y) in (pts[0], pts[-1]):
        draw.ellipse([x - r, y - r, x + r, y + r], fill=color)

def circle(draw, cx, cy, r, color, w=W):
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=color, width=w)

def dot(draw, cx, cy, r, color):
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)

def rect(draw, box, color, w=W):
    draw.rectangle(box, outline=color, width=w)

def new_canvas():
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)

def save(img, name):
    p = os.path.join(OUT, name + ".png")
    img.save(p)
    print("ok", name)

# ---------- 六维 ----------
def quanshi():
    img, d = new_canvas()
    # 印钮
    rect(d, [228, 92, 284, 142], GOLD)
    # 印面方
    rect(d, [156, 142, 356, 342], GOLD)
    # 绶带左 / 右
    seg(d, cubic((200, 342), (188, 384), (162, 402), (172, 436)), GOLD)
    seg(d, cubic((312, 342), (324, 384), (350, 402), (340, 436)), GOLD)
    save(img, "icon_quanshi")

def shengwang():
    img, d = new_canvas()
    # 柄
    rect(d, [244, 88, 268, 140], GOLD)
    # 钟身: 梯形直线 + 钟口弧
    seg(d, [(212, 140), (300, 140)], GOLD)            # 顶肩
    seg(d, [(212, 140), (178, 290)], GOLD)            # 左斜
    seg(d, [(300, 140), (334, 290)], GOLD)            # 右斜
    seg(d, cubic((178, 290), (214, 318), (298, 318), (334, 290)), GOLD)  # 钟口
    # 舌
    seg(d, [(256, 168), (256, 248)], GOLD)
    save(img, "icon_shengwang")

def junxin():
    img, d = new_canvas()
    # 冕板
    seg(d, [(112, 132), (400, 132)], GOLD)
    # 五串旒, 每串三段(留白示珠)
    for x in (158, 208, 256, 304, 354):
        seg(d, [(x, 168), (x, 200)], GOLD)
        seg(d, [(x, 218), (x, 250)], GOLD)
        seg(d, [(x, 268), (x, 300)], GOLD)
    save(img, "icon_junxin")

def caifu():
    img, d = new_canvas()
    circle(d, 256, 256, 122, GOLD)
    rect(d, [214, 214, 298, 298], GOLD)   # 方孔
    save(img, "icon_caifu")

def caixue():
    img, d = new_canvas()
    # 竹简: 展开横卷, 上下沿拉开, 左卷弧 + 两道编绳
    seg(d, [(150, 180), (320, 180)], GOLD)
    seg(d, [(150, 272), (320, 272)], GOLD)
    seg(d, cubic((150, 180), (118, 200), (118, 252), (150, 272)), GOLD)  # 左卷
    seg(d, [(208, 180), (208, 272)], GOLD)
    seg(d, [(280, 180), (280, 272)], GOLD)
    # 毛笔斜倚
    seg(d, [(372, 148), (302, 316)], GOLD)            # 笔杆
    seg(d, [(302, 316), (286, 358)], GOLD)            # 笔尖
    seg(d, [(286, 358), (314, 330)], GOLD)            # 笔锋回勾
    save(img, "icon_caixue")

def weiji():
    img, d = new_canvas()
    c = RED
    seg(d, [(108, 116), (404, 116)], c)               # 梁
    seg(d, [(256, 116), (256, 184)], c)               # 挂绳
    seg(d, [(216, 188), (296, 188)], c)               # 剑格
    # 剑身(轮廓) + 剑尖
    seg(d, [(238, 188), (238, 296)], c)
    seg(d, [(274, 188), (274, 296)], c)
    seg(d, [(238, 296), (256, 356)], c)
    seg(d, [(274, 296), (256, 356)], c)
    save(img, "icon_weiji")

# ---------- 偏离四段: 同一水道母题 ----------
def dev1():  # 循史 直道 青
    img, d = new_canvas()
    seg(d, [(256, 104), (256, 408)], TEAL)
    save(img, "icon_dev1")

def dev2():  # 微澜 微弯S 金
    img, d = new_canvas()
    seg(d, cubic((256, 106), (210, 180), (302, 250), (256, 320), 32)
        + [(256, 406)], GOLD)
    seg(d, cubic((176, 210), (196, 196), (216, 224), (236, 210)), GOLD)  # 涟漪
    seg(d, cubic((276, 310), (296, 296), (316, 324), (336, 310)), GOLD)
    save(img, "icon_dev2")

def dev3():  # 改流 分叉 赭橙
    img, d = new_canvas()
    seg(d, [(256, 106), (256, 250)], OCHRE)
    seg(d, cubic((256, 250), (214, 300), (184, 350), (172, 406)), OCHRE)
    seg(d, cubic((256, 250), (298, 300), (328, 350), (340, 406)), OCHRE)
    save(img, "icon_dev3")

def dev4():  # 逆天 倒卷+火星 朱红
    img, d = new_canvas()
    seg(d, cubic((256, 406), (256, 340), (198, 330), (210, 260), 32)
        + cubic((210, 260), (220, 200), (300, 210), (298, 150), 24)[1:], RED)
    for (x, y) in ((196, 150), (314, 188), (182, 250), (316, 300)):
        dot(d, x, y, 11, RED)   # 火星
    save(img, "icon_dev4")

for fn in (quanshi, shengwang, junxin, caifu, caixue, weiji,
           dev1, dev2, dev3, dev4):
    fn()
print("B2 done ->", OUT)
