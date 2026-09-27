# -*- coding: utf-8 -*-
"""构建入口：出 5 枚结局印章 + 验收图

用法：
  python build_seals.py                 # 5 枚（白文，定版参数）
  python build_seals.py --mode zhu      # 5 枚（朱文，备选印式）
  python build_seals.py --big           # 额外出「单枚大图」逐字质检图

定版参数（见 assets/_gen/probe-*.png 实拍扫描）：
  mode=bai 白文 · stroke_target=0.085 · cap=1.60

输出几何：裁到印面并统一缩放到高 1024（≈645×1024 透明底）。
  ※ 不再输出 1024² 画布——印面只占 58% 宽，前端按 width:96px 缩放后
    印面只剩 56px，与清单 96–128px 的显示要求冲突。
"""
import os
import sys
import argparse
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import qs_seal as S

ASSETS = os.path.abspath(os.path.join(HERE, ".."))
SEALS = os.path.join(ASSETS, "seals")
GEN = os.path.join(ASSETS, "_gen")
BG = BGC = (23, 20, 15)          # #17140f 绢本底
DIM = DIMC = (168, 154, 124)
SONG = "/System/Library/Fonts/Supplemental/Songti.ttc"

OUT_H = 1024
CROP_M = 24                # 裁切留边（容纳糙边/崩缺/微旋转）

_FONTS = {}


def _f(size):
    if size not in _FONTS:
        _FONTS[size] = ImageFont.truetype(SONG, size)
    return _FONTS[size]


def quantize(im, colors=32):
    """调色板量化：印章本质是「双色 + alpha」，256 色 RGB 里绝大部分是渐变冗余。

    实测 158KB → 17KB（−89%）、308KB → 26KB（−92%），MAE < 1。
    代价是抗锯齿边缘的最大通道偏差约 60（32 色打不出所有中间值），
    故必须目视复核（见 --optcheck），不能只看 MAE。
    """
    return im.quantize(colors=colors, method=Image.FASTOCTREE)


def opt_check(orig_imgs, opt_imgs, out, sizes=(160, 96)):
    """量化前后并排对照：小尺寸 + 局部放大，确认边缘无硬锯齿/色带。"""
    pad, hdr, cap = 18, 40, 26
    cols = len(orig_imgs)
    cw = sizes[0] + 36
    H = hdr + pad + sum(int(s * 1024 / 645) for s in sizes) + 24 + cap + 24 + cap + pad
    W = pad + cols * (cw + pad)
    im = Image.new("RGB", (W, H), BGC)
    d = ImageDraw.Draw(im)
    d.text((pad, 12), "量化对照（上=原始 24bit ／ 下=32 色调色板）", font=_f(15),
           fill=(232, 223, 200))
    f = _f(12)
    for i in range(cols):
        x = pad + i * (cw + pad)
        y = hdr + pad
        for pair, name in ((orig_imgs[i], "原始"), (opt_imgs[i], "量化")):
            for s in sizes:
                k = s / pair.width
                r = pair.resize((s, int(pair.height * k)), Image.LANCZOS)
                im.paste(r, (x + (cw - s) // 2, y), r)
                y += r.height + 8
            y += 12
        base = os.path.splitext(os.path.basename(name_src[i]))[0]
        d.text((x, H - cap), S.SEAL_SPECS[base]["word"], font=f, fill=DIMC)
    im.save(out)
    return out


def crop_seal(im):
    """把 1024² 画布裁到印面区域并统一缩放到高 OUT_H。"""
    n = im.width
    w, h = S.SEAL_W, S.SEAL_H
    box = (int(n / 2 - w / 2 - CROP_M), int(n / 2 - h / 2 - CROP_M),
           int(n / 2 + w / 2 + CROP_M), int(n / 2 + h / 2 + CROP_M))
    c = im.crop(box)
    k = OUT_H / c.height
    return c.resize((max(1, int(round(c.width * k))), OUT_H), Image.LANCZOS)


def chip_check(canvas, spec):
    """崩缺质检：逐个 chip 校验「落点确实被凿空」。

    不用全局面积阈值——糙边/旋转本身就会让面积低于 1，阈值既会误判也会漏判。
    改为取 chip 中心向印心内缩 6% 的采样点，该点必然落在凿空圆内，应全透明。
    这条断言正是为了拦住 v2 的坐标错配 bug（chip 中心落到印面外 → 角缺失效）。
    """
    import numpy as np
    a = np.asarray(canvas.convert("RGBA"), dtype=np.uint8)[..., 3] / 255.0
    n = a.shape[0]
    w, h = S.SEAL_W, S.SEAL_H
    ox = n / 2 + spec["shift"][0] * n - w / 2      # 印面左上角
    oy = n / 2 + spec["shift"][1] * n - h / 2
    res = []
    for (u, v, r) in spec.get("chips") or []:
        px = int(ox + (u - 0.05) * w)
        py = int(oy + (v - 0.05) * h)
        px = min(max(px, 0), n - 1)
        py = min(max(py, 0), n - 1)
        res.append((r, float(a[py, px]), float(a[py, px] < 0.05)))
    return res


def contact_sheet(paths, out, sizes=(128, 64)):
    """验收图：印章按 128 / 64 px 原生宽度贴在 #17140f 上（行高按 1:1.59 实算）"""
    pad, hdr, cap, gap = 24, 46, 30, 22
    cw = 196
    seals = [Image.open(p).convert("RGBA") for p in paths]
    ratio = seals[0].height / seals[0].width
    scaled = [[(s, sz, sz, int(round(sz * ratio))) for sz in sizes] for s in seals]
    colh = sum(h for (_, _, _, h) in scaled[0]) + gap * (len(sizes) - 1)
    W = pad + len(paths) * (cw + pad)
    H = hdr + pad + colh + cap + pad
    im = Image.new("RGB", (W, H), BGC)
    d = ImageDraw.Draw(im)
    d.text((pad, 14), "结局印章验收 · 128px / 64px on #17140f", font=_f(15),
           fill=(232, 223, 200))
    f = _f(13)
    for i, (p, cols) in enumerate(zip(paths, scaled)):
        x = pad + i * (cw + pad)
        y = hdr + pad
        for (s, sw, _, sh) in cols:
            r = s.resize((sw, sh), Image.LANCZOS)
            im.paste(r, (x + (cw - sw) // 2, y), r)
            y += sh + gap
        base = os.path.splitext(os.path.basename(p))[0]
        d.text((x, H - cap), "%s  %s" % (base.replace("seal_", ""), S.SEAL_SPECS[base]["word"]),
               font=f, fill=DIMC)
    im.save(out)
    return out


def big_sheet(paths, out, px=300):
    """逐枚大图：检视字口、崩缺、裂纹等细节"""
    pad, hdr, cap = 26, 44, 26
    cw = px + 30
    seals = [Image.open(p).convert("RGBA") for p in paths]
    ratio = seals[0].height / seals[0].width
    sh = int(round(px * ratio))
    W = pad + len(paths) * (cw + pad)
    H = hdr + pad + sh + cap + pad
    im = Image.new("RGB", (W, H), BGC)
    d = ImageDraw.Draw(im)
    d.text((pad, 13), "逐枚细节（印面宽 %dpx）" % px, font=_f(15), fill=(232, 223, 200))
    f = _f(13)
    for i, p in enumerate(paths):
        s = seals[i].resize((px, sh), Image.LANCZOS)
        x = pad + i * (cw + pad)
        im.paste(s, (x + (cw - px) // 2, hdr + pad), s)
        base = os.path.splitext(os.path.basename(p))[0]
        d.text((x, H - cap), "%s  %s" % (base.replace("seal_", ""), S.SEAL_SPECS[base]["word"]),
               font=f, fill=DIMC)
    im.save(out)
    return out


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", default=S.MODE_BAI, choices=[S.MODE_BAI, S.MODE_ZHU])
    ap.add_argument("--uniform", type=float, default=None,
                    help="强制统一笔宽比（如 0.085）；不给则走等墨自适应")
    ap.add_argument("--big", action="store_true")
    a = ap.parse_args()

    kw = dict(stroke_target=a.uniform)
    tag = ("统一 %.3f" % a.uniform) if a.uniform else "等墨自适应"
    print("构建结局印章（印式=%s · 笔宽=%s）…" % (a.mode, tag))
    os.makedirs(SEALS, exist_ok=True)
    os.makedirs(GEN, exist_ok=True)
    made = []
    for key, spec in S.SEAL_SPECS.items():
        canvas = S.compose(spec["word"], spec, spec["seed"], mode=a.mode, glyph_kw=kw)
        p = os.path.join(SEALS, key + ".png")
        crop_seal(canvas).save(p)
        made.append(p)
        rs = " ".join("%s%.3f" % (c, S.adaptive_stroke_ratio(c)) for c in spec["word"])
        cc = chip_check(canvas, spec)
        flag = ""
        if cc:
            flag = "  崩缺 " + ("✓" if all(hit for _, _, hit in cc)
                              else "✗ 未命中@%s" % [(round(al, 2)) for _, al, _ in cc])
        print("  ok %-18s %-4s [%s]%s  %s"
              % (key + ".png", spec["word"], rs, flag, spec["note"]))

    sheet = contact_sheet(made, os.path.join(GEN, "seals-check.png"))
    print("  验收图 →", os.path.relpath(sheet, ASSETS))
    if a.big:
        b = big_sheet(made, os.path.join(GEN, "seals-big.png"))
        print("  细节图 →", os.path.relpath(b, ASSETS))
    print("完成，共 %d 枚" % len(made))
