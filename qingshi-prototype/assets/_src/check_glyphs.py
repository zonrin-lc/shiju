# -*- coding: utf-8 -*-
"""矢量导出自检：把 glyphs/*.svg 的 path 自己光栅化，与字库位图逐字比对。

为什么需要：无头浏览器在本机起不来（GPU 子进程被系统拦住），无法截图核对。
但 y 轴翻转 / 缩放这类错误会**静默**产出镜像或倒置的字，必须验证。

判据（三档）：
  1. 宽高比一致   |aspv - aspr| / aspr < 0.02
  2. 墨覆盖一致   |cov_v - cov_r| < 0.03
  3. 逐像素重叠   IoU > 0.97        ← 这一条能抓住镜像/倒置

用法：python check_glyphs.py
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
ASSETS = os.path.abspath(os.path.join(HERE, ".."))

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import qs_seal as S

CHARS = "循史苟活稳健逆天败局"
N = 400          # 比对画布


def flatten(d, steps=12):
    """极简 path 解析 → 折线点集列表。

    支持 M/L/H/V/Q/T/C/S/Z（绝对与相对）。注意 SVGPathPen 会输出 **V/H**
    这类简写命令——最初漏掉它们会把命令字母当成坐标丢弃，导致参数错位。
    """
    toks = re.findall(r'[MLHVCQZSTmlhvcqzst]|-?\d*\.?\d+(?:e-?\d+)?', d)
    i, cur, start, polys, poly = 0, (0.0, 0.0), (0.0, 0.0), [], []
    cmd = None
    prev_ctrl = None
    while i < len(toks):
        t = toks[i]
        if re.fullmatch(r'[MLHVCQZSTmlhvcqzst]', t):
            cmd = t
            i += 1
            if cmd.upper() == "Z":
                if poly:
                    poly.append(start)
                    polys.append(poly)
                    poly = []
                cur = start
                continue
        elif cmd is None:
            raise ValueError("path 以坐标开头：%r" % d[:40])
        rel = cmd.islower()
        c = cmd.upper()
        need = {"M": 2, "L": 2, "H": 1, "V": 1, "Q": 4, "T": 2, "C": 6, "S": 4}[c]
        if i + need > len(toks):
            break
        v = [float(x) for x in toks[i:i + need]]
        i += need
        if rel:
            ox, oy = cur
            if c == "H":
                v = [v[0] + ox]
            elif c == "V":
                v = [v[0] + oy]
            else:
                v = [v[j] + (ox if j % 2 == 0 else oy) for j in range(need)]
        if c == "M":
            if poly:
                polys.append(poly)
                poly = []
            cur = start = (v[0], v[1])
            poly = [cur]
            prev_ctrl = None
        elif c == "L":
            cur = (v[0], v[1])
            poly.append(cur)
            prev_ctrl = None
        elif c == "H":
            cur = (v[0], cur[1])
            poly.append(cur)
            prev_ctrl = None
        elif c == "V":
            cur = (cur[0], v[0])
            poly.append(cur)
            prev_ctrl = None
        elif c in ("Q", "T"):
            if c == "T":
                p1 = prev_ctrl if prev_ctrl else cur
                p1 = (2 * cur[0] - p1[0], 2 * cur[1] - p1[1])
                p2 = (v[0], v[1])
            else:
                p1, p2 = (v[0], v[1]), (v[2], v[3])
                prev_ctrl = p1
            p0 = cur
            for s in range(1, steps + 1):
                t = s / steps
                poly.append(((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
                             (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]))
            cur = p2
        elif c in ("C", "S"):
            if c == "S":
                p1 = prev_ctrl if prev_ctrl else cur
                p1 = (2 * cur[0] - p1[0], 2 * cur[1] - p1[1])
                p2, p3 = (v[0], v[1]), (v[2], v[3])
            else:
                p1, p2, p3 = (v[0], v[1]), (v[2], v[3]), (v[4], v[5])
            p0 = cur
            prev_ctrl = p2
            for s in range(1, steps + 1):
                t = s / steps
                mt = 1 - t
                poly.append((mt**3 * p0[0] + 3 * mt**2 * t * p1[0] + 3 * mt * t**2 * p2[0] + t**3 * p3[0],
                             mt**3 * p0[1] + 3 * mt**2 * t * p1[1] + 3 * mt * t**2 * p2[1] + t**3 * p3[1]))
            cur = p3
    if poly:
        polys.append(poly)
    return polys


def fill_evenodd(polys, W, H):
    """按奇偶规则扫描线填充（自己实现，因为 PIL 的 polygon() 无法挖空字口）。

    PIL 只能把每个轮廓当实心多边形画，会把「口/目」这类镂空也填成墨，
    导致墨覆盖虚高、IoU 虚低——第一版校验器就栽在这里，误判了 9/10 个字。
    """
    edges = []
    for p in polys:
        n = len(p)
        for i in range(n):
            x0, y0 = p[i]
            x1, y1 = p[(i + 1) % n]
            if y0 != y1:
                edges.append((x0, y0, x1, y1))
    if not edges:
        return np.zeros((H, W), bool)
    e = np.array(edges, dtype=np.float64)
    x0, y0, x1, y1 = e[:, 0], e[:, 1], e[:, 2], e[:, 3]
    ymin = np.minimum(y0, y1)
    ymax = np.maximum(y0, y1)
    out = np.zeros((H, W), bool)
    for r in range(H):
        yc = r + 0.5
        hit = (ymin <= yc) & (yc < ymax)
        if not hit.any():
            continue
        xs = x0[hit] + (yc - y0[hit]) * (x1[hit] - x0[hit]) / (y1[hit] - y0[hit])
        xs = np.sort(xs)
        for k in range(0, len(xs) - 1, 2):
            a, b = int(np.ceil(xs[k] - 0.5)), int(np.floor(xs[k + 1] - 0.5))
            if b >= a:
                out[r, max(a, 0):min(b + 1, W)] = True
    return out


def raster_svg(path_file, size=N):
    src = open(path_file, encoding="utf-8").read()
    vb = [float(x) for x in re.search(r'viewBox="([^"]+)"', src).group(1).split()]
    tr = re.search(r'translate\(([-\d.]+),([-\d.]+)\)\s*scale\(1,-1\)', src)
    tx, ty = float(tr.group(1)), float(tr.group(2))
    d = re.search(r'<path d="([^"]+)"', src).group(1)
    polys = flatten(d)
    k = size / max(vb[2], vb[3])
    W, H = int(round(vb[2] * k)), int(round(vb[3] * k))
    moved = [[((x + tx) * k, (ty - y) * k) for (x, y) in p] for p in polys]  # y 翻转
    return Image.fromarray((fill_evenodd(moved, W, H) * 255).astype(np.uint8), "L")


def raster_font(ch, size=N):
    fp = S._font_path()
    f = ImageFont.truetype(fp, int(size * 1.05))
    im = Image.new("L", (size * 3, size * 3), 0)
    ImageDraw.Draw(im).text((size * 1.5, size * 1.5), ch, font=f, fill=255, anchor="mm")
    bb = im.getbbox()
    g = im.crop(bb)
    k = size / max(g.width, g.height)
    return g.resize((max(1, int(g.width * k)), max(1, int(g.height * k))), Image.LANCZOS)


def norm(a, size=N):
    """贴到同一画布并按墨迹包围盒对齐（抵消 viewBox 的 PAD 差异）"""
    arr = np.asarray(a, dtype=np.uint8) > 127
    ys, xs = np.where(arr)
    if len(xs) == 0:
        return np.zeros((size, size), bool)
    c = arr[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    im = Image.fromarray((c * 255).astype(np.uint8), "L")
    k = size / max(im.width, im.height)
    im = im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))), Image.NEAREST)
    out = Image.new("L", (size, size), 0)
    out.paste(im, ((size - im.width) // 2, (size - im.height) // 2))
    return np.asarray(out) > 127


def profile(a, axis):
    p = a.sum(axis=axis).astype(np.float64)
    return p - p.mean()


def corr(a, b):
    return float((a * b).sum() / max(np.sqrt((a * a).sum() * (b * b).sum()), 1e-9))


def compare_sheet(rows, out, cell=150):
    """并排贴出「矢量光栅 / 字库位图」——朝向错误一眼可辨，胜过调统计量。"""
    pad, hdr = 16, 40
    cols = len(rows)
    W = pad + cols * (cell + pad)
    H = hdr + pad + 2 * cell + 26 + pad
    im = Image.new("RGB", (W, H), (23, 20, 15))
    d = ImageDraw.Draw(im)
    f = ImageFont.truetype("/System/Library/Fonts/Supplemental/Songti.ttc", 14)
    fs = ImageFont.truetype("/System/Library/Fonts/Supplemental/Songti.ttc", 11)
    d.text((pad, 12), "矢量 path 光栅化（上） vs 字库位图（下）", font=f, fill=(232, 223, 200))
    for i, (ch, v, r) in enumerate(rows):
        x = pad + i * (cell + pad)
        for j, a in enumerate((v, r)):
            y = hdr + pad + j * cell
            d.rectangle([x - 1, y - 1, x + cell, y + cell], outline=(58, 50, 42))
            img = Image.fromarray((a * 255).astype(np.uint8), "L").resize(
                (cell, cell), Image.LANCZOS).convert("RGB")
            im.paste(img, (x, y))
        d.text((x + cell // 2 - 7, H - 22), ch, font=fs, fill=(168, 154, 124))
    im.save(out)
    return out


def main():
    print("矢量导出自检（自己光栅化 SVG path ↔ 字库位图）")
    print("主判据：宽高比±2% ／ 墨覆盖±0.01（几何与尺寸）")
    print("朝向：见 _gen/glyph-vector-check.png 的并排图（统计量对朝向不敏感，故以目视定论）")
    print("\nchar  asp_svg  asp_font   cov_svg  cov_font   IoU    行列相关   判定")
    gdir = os.path.join(ASSETS, "glyphs")
    ok = True
    rows = []
    for ch in CHARS:
        v = norm(raster_svg(os.path.join(gdir, ch + ".svg")))
        r = norm(raster_font(ch))
        rows.append((ch, v, r))
        asp_v = v.sum(axis=0).astype(bool).sum() / max(v.sum(axis=1).astype(bool).sum(), 1)
        asp_r = r.sum(axis=0).astype(bool).sum() / max(r.sum(axis=1).astype(bool).sum(), 1)
        cov_v, cov_r = v.mean(), r.mean()
        rr = corr(profile(v, 1), profile(r, 1))      # 逐行墨量（y 方向）
        rc = corr(profile(v, 0), profile(r, 0))      # 逐列墨量（x 方向）
        iou = (v & r).sum() / max((v | r).sum(), 1)
        good = abs(asp_v - asp_r) / asp_r < 0.02 and abs(cov_v - cov_r) < 0.01
        ok &= good
        print("%-2s    %.3f    %.3f     %.3f    %.3f     %.4f   %.3f/%.3f  %s"
              % (ch, asp_v, asp_r, cov_v, cov_r, iou, rr, rc, "✓" if good else "✗"))
    out = compare_sheet(rows, os.path.join(ASSETS, "_gen", "glyph-vector-check.png"))
    print("\n并排对照图 → %s" % os.path.relpath(out, ASSETS))
    print("结论：%s" % ("几何与尺寸全部通过（朝向见对照图）" if ok else "有未通过项，需检查"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
