# -*- coding: utf-8 -*-
"""等墨法对比：统一笔宽 8.5% vs 等墨自适应（五方印并排，128px 原生宽度）。

输出：assets/_gen/probe-equalink.png
用法：python probe_equalink.py
"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from PIL import Image, ImageDraw, ImageFont
import qs_seal as S
import build_seals as B

GEN = B.GEN
SONG = "/System/Library/Fonts/Supplemental/Songti.ttc"
DISP = 130


def render(stroke_target):
    out = []
    for key, spec in S.SEAL_SPECS.items():
        im = S.compose(spec["word"], spec, spec["seed"], mode=S.MODE_BAI,
                       glyph_kw=dict(stroke_target=stroke_target))
        im = B.crop_seal(im)
        k = DISP / im.width
        out.append((spec["word"], im.resize((DISP, int(im.height * k)), Image.LANCZOS)))
    return out


def main():
    print("等墨法对比：")
    print("  逐字自适应笔宽比：")
    for ch in "循史苟活稳健逆天败局":
        r0, c0, asp = S.natural_stats(ch)
        ra = S.adaptive_stroke_ratio(ch)
        print("    %s  自然 %.4f (cov %.3f)  →  等墨 %.4f   ×%.2f" % (ch, r0, c0, ra, ra / r0))

    rows = [("统一笔宽 8.5%", render(0.085)), ("等墨自适应", render(None))]
    pad, hdr = 22, 40
    cellw = DISP + 44
    H = hdr + len(rows) * (int(DISP * 1.59) + 74) + pad
    W = pad + 5 * cellw + pad
    im = Image.new("RGB", (W, H), B.BG)
    d = ImageDraw.Draw(im)
    f = ImageFont.truetype(SONG, 13)
    ft = ImageFont.truetype(SONG, 15)
    d.text((pad, 12), "等墨法对比（白文 · 就格1.60 · %dpx 原生宽度）" % DISP, font=ft,
           fill=(232, 223, 200))
    for ri, (tag, seals) in enumerate(rows):
        y0 = hdr + ri * (int(DISP * 1.59) + 74)
        d.text((pad, y0), tag, font=f, fill=(180, 166, 140))
        for ci, (word, s) in enumerate(seals):
            x = pad + ci * cellw + 22
            im.paste(s, (x, y0 + 20), s)
    im.save(os.path.join(GEN, "probe-equalink.png"))
    print("  -> probe-equalink.png", im.size)


if __name__ == "__main__":
    main()
