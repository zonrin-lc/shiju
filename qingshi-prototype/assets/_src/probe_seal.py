# -*- coding: utf-8 -*-
"""印章参数实拍对比 —— 用于定版「笔宽 / 就格拉伸 / 印式」三个参数。

输出（assets/_gen/）：
  probe-ink.png     印式 × 笔宽 扫描
  probe-stretch.png 就格拉伸扫描（1.00 / 1.30 / 1.60 / 2.00）
  probe-size.png    实际显示尺寸验读（128 / 96 / 64 / 40 px，原生比例）

用法：python probe_seal.py [--quick]
"""

import os
import sys
import argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np
from PIL import Image, ImageDraw, ImageFont
import qs_seal as S

BG = (23, 20, 15)
DIM = (156, 144, 122)
SUBDIM = (108, 98, 82)
LINE = (56, 48, 40)
GEN = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_gen"))
SONG = "/System/Library/Fonts/Supplemental/Songti.ttc"
WORD = "循史"
K = S.CANVAS / S.SEAL_W          # 印面宽 600 → 画布 1024


def mk(mode, stroke, cap=(0.80, 1.60), word=WORD, key="seal_xunshi", **over):
    spec = dict(S.SEAL_SPECS[key])
    spec.update(over)
    return S.compose(word, spec, spec["seed"], mode=mode,
                     glyph_kw=dict(stroke_target=stroke, cap=cap))


def sheet(items, cols, box_w, box_h, out, seal_w=None, sub_size=12):
    """items: [(PIL.Image, tag, sub)]。seal_w 给定时按「印面宽=seal_w」缩放，
    否则按图像原生尺寸居中贴入。"""
    rows = (len(items) + cols - 1) // cols
    pad, cap_h = 20, 44
    W = cols * (box_w + pad) + pad
    H = rows * (box_h + pad + cap_h) + pad
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    f = ImageFont.truetype(SONG, sub_size)
    for i, (src, tag, sub) in enumerate(items):
        r, c = divmod(i, cols)
        x = pad + c * (box_w + pad)
        y = pad + r * (box_h + pad + cap_h)
        d.rectangle([x, y, x + box_w, y + box_h], outline=LINE)
        if seal_w:
            # 印面宽 600 要显示成 seal_w px → 整张 1024 画布缩到 seal_w*K px
            s = seal_w * K / src.width
            si = (src.resize((max(1, int(src.width * s)), max(1, int(src.height * s))),
                             Image.LANCZOS) if abs(s - 1.0) > 1e-3 else src)
        else:
            si = src
        if si.width > box_w or si.height > box_h:
            k = min(box_w / si.width, box_h / si.height)
            si = si.resize((max(1, int(si.width * k)), max(1, int(si.height * k))), Image.LANCZOS)
        im.paste(si, (x + (box_w - si.width) // 2, y + (box_h - si.height) // 2), si)
        d.text((x, y + box_h + 7), tag, font=f, fill=DIM)
        if sub:
            d.text((x, y + box_h + 7 + sub_size + 4), sub, font=f, fill=SUBDIM)
    im.save(out)
    print("  ->", os.path.basename(out), im.size)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--quick", action="store_true", help="只出尺寸验读表")
    a = ap.parse_args()
    os.makedirs(GEN, exist_ok=True)
    print("生成对比表：")

    if not a.quick:
        # ---- A. 印式 × 笔宽（就格 1.60）----
        rows = [
            (S.MODE_BAI, 0.042, "白文 · 4.2%（字库原味）", "铁线，小尺寸偏虚"),
            (S.MODE_BAI, 0.065, "白文 · 6.5%", ""),
            (S.MODE_BAI, 0.085, "白文 · 8.5%", ""),
            (S.MODE_BAI, 0.105, "白文 · 10.5%", "看 口/目 是否糊死"),
            (S.MODE_ZHU, 0.065, "朱文 · 6.5%", "阳刻＋细边栏"),
            (S.MODE_ZHU, 0.085, "朱文 · 8.5%", ""),
        ]
        items = [(mk(m, st), tag, sub) for m, st, tag, sub in rows]
        sheet(items, 3, 210, 340, os.path.join(GEN, "probe-ink.png"), seal_w=180)

        # ---- B. 就格拉伸 ----
        items = []
        for c, got in [(1.00, "自然瘦长·两侧留红"), (1.30, "原定版"), (1.60, "本版"), (2.00, "过撑")]:
            items.append((mk(S.MODE_BAI, 0.085, cap=(0.80, c)), "就格限 %.2f" % c, got))
        sheet(items, 4, 210, 340, os.path.join(GEN, "probe-stretch.png"), seal_w=180)

    # ---- C. 实际显示尺寸验读（原生比例）----
    items = []
    for m, name in [(S.MODE_BAI, "白文"), (S.MODE_ZHU, "朱文")]:
        src = mk(m, 0.085)
        for disp in (128, 96, 64):
            px = int(round(disp * K))
            items.append((src.resize((px, px), Image.LANCZOS), "%s %dpx" % (name, disp), ""))
    sheet(items, 3, 250, 400, os.path.join(GEN, "probe-size.png"))
    print("完成")


if __name__ == "__main__":
    main()
