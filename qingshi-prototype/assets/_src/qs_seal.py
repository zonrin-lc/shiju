# -*- coding: utf-8 -*-
"""印章合成器 v3 —— 《青史生存录》结局印章（A 节，5 枚）

产线（D-1 已定：矢量文字 + 程序/AI 印面纹理）
  · 文字层：**真篆书字库**「峄山碑篆体」矢量轮廓 → 目标笔宽加粗 → 就格变形
  · 印面层：朱红石纹 + 糙边 + 崩缺 + 裂纹 + 落墨不匀（程序生成；可换 AI 印面）

────────────────────────────────────────────────────────────────
v2 → v3 变更（用户安装篆书字体后的重做）
────────────────────────────────────────────────────────────────
1. 字形源更换：手绘缪篆（qs_glyphs.py）**弃用**（1024px 下「循」「史」
   不可辨，已证伪）→ 改用峄山碑篆体（秦小篆，李斯一路）。10 字全覆盖。
2. 笔宽改为**按目标值反解**：峄山碑是铁线篆，实测自然笔宽仅为字高的
   4.2%，直接印成白文会在 96–128px 显示尺寸下糊掉。现按每字实测自然
   笔宽，反解 PIL stroke_width，把笔宽精确顶到 STROKE_TARGET。
3. 就格上限放开：小篆天然宽高比 0.70，字格 600×490 宽高比 1.22。
   旧 cap=1.30 只铺满 67% 宽度（两侧空 33%）。提升到 1.60，按汉印
   「就格匀满」的做法把字撑满字格。
4. 新增印式 `mode`：
     · "bai" 白文（阴刻）——朱红实心印面 + 米白字形。秦汉官印正体，
       与 GDD 秦汉题材、以及清单里的 AI 印面提示词（intaglio）一致。
     · "zhu" 朱文（阳文）——朱红字形 + 朱红细边栏 + 透明地。铁线篆
       的传统印式，小字更清透。
5. 新增 `plate` 入参：可传入 AI 生成的印面底图（无文字），程序纹理
   自动降级为叠加层，实现「AI 出材质 / 矢量出文字」的解耦。
6. 新增**等墨法自适应笔宽**（`stroke_target=None`）：10 字自然墨覆盖
   实测 0.235–0.359（1.5 倍差距），统一笔宽会让「稳/健」比「天」沉得多。
   按 cov ∝ 笔宽 解析反解每字笔宽，使五方印灰调一致——即篆刻的「匀满」。

输出：assets/seals/seal_*.png（1024×1024 透明底）
"""

import math
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# ================================================================ 0. 配置
CANVAS = 1024
GLYPH_SS = 2

# 篆书字库（用户 2026-09-20 安装）。峄山碑篆体：秦小篆，等宽铁线。
ZHUAN_FONT = "/Users/apple/Library/Fonts/yishanbeizhuanti.ttf"
ZHUAN_FALLBACKS = [
    os.path.expanduser("~/Library/Fonts/yishanbeizhuanti.ttf"),
    "/System/Library/Fonts/Supplemental/Yishanbei.ttf",
]

INK = np.array([232.0, 223.0, 200.0], dtype=np.float32)   # #e8dfc8 米白（白文"露绢"）

SEAL_W = 600.0
SEAL_H = 980.0
CORNER_R = 12.0
FIT = 0.90
STRETCH_CAP = (0.80, 1.60)   # 就格上下限；小篆 0.70 → 需 1.5 上下才铺满字格

STROKE_TARGET = 0.085        # 目标笔宽 / 字高（统一档；stroke_target=None 时走等墨自适应）
STROKE_COV_TARGET = 0.50     # 等墨法：目标墨覆盖率（字形 bbox 内墨面积占比）
STROKE_COV_EXP = 0.70        # 等墨强度（0=不调，1=完全等墨）
STROKE_CLAMP = (0.052, 0.118)  # 笔宽比上下限（下限保 64px 可辨，上限防字口糊死）
FRAME_W = 0.030              # 朱文边栏宽度 / 印面宽
MODE_BAI = "bai"             # 白文（阴刻）
MODE_ZHU = "zhu"             # 朱文（阳文）


def _font_path():
    for p in [ZHUAN_FONT] + ZHUAN_FALLBACKS:
        if os.path.exists(p):
            return p
    raise FileNotFoundError("未找到篆书字库，请确认峄山碑篆体已安装到 ~/Library/Fonts/")


# ================================================================ 1. 字形层
_NAT_CACHE = {}


def natural_stats(ch, ref=1000):
    """实测该字的 (自然笔宽/字高, 墨覆盖率, 长宽比)。峄山碑为等宽铁线，逐字实测更稳。

    估法：笔画近似等宽带带，面积 A≈w·L、周长 P≈2L，故 w≈2A/P。
    """
    if ch in _NAT_CACHE:
        return _NAT_CACHE[ch]
    f = ImageFont.truetype(_font_path(), ref)
    im = Image.new("L", (ref * 2, ref * 2), 0)
    ImageDraw.Draw(im).text((ref, ref), ch, font=f, fill=255, anchor="mm")
    bb = im.getbbox()
    if not bb:
        _NAT_CACHE[ch] = (0.05, 0.29, 0.75)
        return _NAT_CACHE[ch]
    ink = np.asarray(im.crop(bb), dtype=np.uint8) > 127
    a = float(ink.sum())
    p = np.pad(ink, 1)
    c = p[1:-1, 1:-1]
    per = float(((p[:-2, 1:-1] & ~c) | (p[2:, 1:-1] & ~c) |
                 (p[1:-1, :-2] & ~c) | (p[1:-1, 2:] & ~c)).sum())
    bw, bh = bb[2] - bb[0], bb[3] - bb[1]
    _NAT_CACHE[ch] = (2.0 * a / max(per, 1) / bh, a / float(bw * bh), bw / bh)
    return _NAT_CACHE[ch]


def natural_stroke_ratio(ch, ref=1000):
    return natural_stats(ch, ref)[0]


def adaptive_stroke_ratio(ch, target=STROKE_COV_TARGET, exp=STROKE_COV_EXP,
                          clamp=STROKE_CLAMP):
    """等墨法反解笔宽比：覆盖率与笔宽成正⽐（cov ≈ c0·w/w0），故 w = w0·(covT/c0)^exp。

    理由：10 字自然墨覆盖实测 0.235–0.359（1.5 倍差距），统一笔宽会让
    「稳/健」（0.34/0.36）比「天」（0.27）沉得多。篆刻用「匀满」解决——
    笔画多的字收细笔道，使各字灰调一致。exp 为强度，0.7 为半等墨（保可辨）。
    """
    r0, c0, _ = natural_stats(ch)
    r = r0 * (target / max(c0, 1e-6)) ** exp
    return min(max(r, clamp[0]), clamp[1])


def _scale_pair(bw, bh, cw, ch_, fit, cap):
    sx, sy = cw * fit / bw, ch_ * fit / bh
    lo, hi = cap
    if sx / sy > hi:
        sx = sy * hi
    if sx / sy < lo:
        sx = sy * lo
    return sx, sy


def mask_zhuan(ch, cw, ch_, fit=FIT, stroke_target=STROKE_TARGET,
               cap=STRETCH_CAP, ss=GLYPH_SS):
    """峄山碑骨架 → 笔宽加粗到目标 → 就格变形 → 铺入 (cw, ch_) 字格。

    stroke_target 为「目标笔宽 / 字高」；传 None 则走等墨自适应（推荐，
    逐字反解使各字灰调一致）。0.085 档实际 stroke_width ≈ 字号的 2.3%
    （PIL 的 stroke 向两侧扩张，直径增量为 2×stroke_width）。
    """
    r_t = adaptive_stroke_ratio(ch) if stroke_target is None else stroke_target
    size = int(max(cw, ch_) * 2.6 * ss)
    font = ImageFont.truetype(_font_path(), size)
    pad = int(size * 0.34)
    big = Image.new("L", (size + pad * 2, size + pad * 2), 0)
    d = ImageDraw.Draw(big)

    # 先量自然字形，反解需要的 stroke_width
    d.text((big.width / 2, big.height / 2), ch, font=font, fill=255, anchor="mm")
    bb0 = big.getbbox()
    if not bb0:
        return Image.new("L", (int(cw), int(ch_)), 0)
    gh0 = bb0[3] - bb0[1]
    nat = natural_stroke_ratio(ch) * gh0
    tgt = r_t * gh0
    sw = int(round(max(0.0, (tgt - nat) / 2.0)))

    big = Image.new("L", (size + pad * 2, size + pad * 2), 0)
    d = ImageDraw.Draw(big)
    d.text((big.width / 2, big.height / 2), ch, font=font, fill=255, anchor="mm",
           stroke_width=sw, stroke_fill=255)

    bb = big.getbbox()
    if not bb:
        return Image.new("L", (int(cw), int(ch_)), 0)
    big = big.crop(bb)

    sx, sy = _scale_pair(big.width, big.height, cw, ch_, fit, cap)
    out = big.resize((max(1, int(big.width * sx)), max(1, int(big.height * sy))),
                     Image.LANCZOS)
    canvas = Image.new("L", (int(cw), int(ch_)), 0)
    canvas.paste(out, ((canvas.width - out.width) // 2, (canvas.height - out.height) // 2))
    return canvas


def text_layer(word, spec, n, w=SEAL_W, h=SEAL_H, glyph_kw=None):
    """把 word 逐字铺入竖排二字格，返回整幅 n×n 的字形覆盖层（0..1 float）。"""
    glyph_kw = glyph_kw or {}
    cw, ch_ = w, h / max(1, len(word))
    fit = FIT * spec.get("text_scale", 1.0)
    lay = Image.new("L", (n, n), 0)
    for i, ch in enumerate(word):
        m = mask_zhuan(ch, cw, ch_, fit=fit, **glyph_kw)
        x0 = int(n / 2 - cw / 2 + spec["shift"][0] * n)
        y0 = int(n / 2 - h / 2 + i * ch_ + spec["shift"][1] * n)
        lay.paste(m, (x0, y0), m)
    return np.asarray(lay, dtype=np.float32) / 255.0


# ================================================================ 2. 印面层
def noise(n, cells, seed, blur=0.0):
    rng = np.random.default_rng(seed)
    im = Image.fromarray((rng.random((cells, cells)) * 255).astype(np.uint8), "L")
    im = im.resize((n, n), Image.BICUBIC)
    if blur:
        im = im.filter(ImageFilter.GaussianBlur(blur))
    a = np.asarray(im, dtype=np.float32) / 255.0
    return a - a.mean()


def fbm(n, seed, blur=3.0):
    return (0.50 * noise(n, 180, seed, blur) +
            0.30 * noise(n, 56, seed + 1, blur * 1.6) +
            0.20 * noise(n, 14, seed + 2, blur * 3.0))


def crack_mask(n, seed, count=2):
    rng = np.random.default_rng(seed)
    im = Image.new("L", (n, n), 0)
    d = ImageDraw.Draw(im)
    for _ in range(count):
        x, y = rng.uniform(0.08, 0.92) * n, rng.uniform(0.08, 0.92) * n
        pts, ang = [(x, y)], rng.uniform(0, math.tau)
        for _ in range(int(rng.integers(4, 8))):
            ang += rng.uniform(-0.9, 0.9)
            step = rng.uniform(0.03, 0.09) * n
            x, y = x + math.cos(ang) * step, y + math.sin(ang) * step
            pts.append((x, y))
        d.line(pts, fill=255, width=max(1, int(rng.uniform(1.2, 2.2))))
    return np.asarray(im.filter(ImageFilter.GaussianBlur(1.1)), dtype=np.float32) / 255.0


def _sd_round_box(n, w, h, spec):
    """圆角矩形有符号距离场（负=内）。"""
    ax = np.arange(n, dtype=np.float32)
    hw, hh = w / 2, h / 2
    cx = n / 2 + spec["shift"][0] * n
    cy = n / 2 + spec["shift"][1] * n
    qx = np.abs(ax[None, :] - cx) - (hw - CORNER_R)
    qy = np.abs(ax[:, None] - cy) - (hh - CORNER_R)
    return (np.sqrt(np.maximum(qx, 0) ** 2 + np.maximum(qy, 0) ** 2) +
            np.minimum(np.maximum(qx, qy), 0.0) - CORNER_R)


def chip_field(n, spec, seed, w, h):
    """崩缺遮罩（1=保留，0=凿去）。

    chips 用**印面相对坐标** (u, v, r)：u / v 为印面宽 / 高的比例
    （0.5,0.5 为印心，1.0,1.0 为右下角），r 为印面宽的比例。
    ⚠️ v2 曾用画布归一化坐标，导致 600 宽的印面落在画布 0.207–0.793
    区间时，写在 0.855 的「右下角崩缺」落到印面**外侧**而失效——
    实测 seal_baiju 只被削掉一条边缝，角缺完全没出现。故改为印面相对。
    """
    ax = np.arange(n, dtype=np.float32)
    m = np.ones((n, n), dtype=np.float32)
    for (u, v, r) in spec.get("chips") or []:
        cx = n / 2 + spec["shift"][0] * n + (u - 0.5) * w
        cy = n / 2 + spec["shift"][1] * n + (v - 0.5) * h
        rr = r * w * (1.00 + 0.40 * noise(n, 16, seed + 21, 3.0))
        dist = np.sqrt((ax[None, :] - cx) ** 2 + (ax[:, None] - cy) ** 2)
        m *= np.clip(0.5 + (dist - rr), 0.0, 1.0)
    return m


def build_field(n, spec, seed, w=SEAL_W, h=SEAL_H):
    """白文印面：实心朱红（软边遮罩 + 亮度场 + 边吃墨 + 麻点 + 裂纹 + 落墨不匀）"""
    sd = _sd_round_box(n, w, h, spec)
    edge_n = (0.6 * noise(n, 90, seed + 11, 6.0) + 0.4 * noise(n, 26, seed + 12, 2.0))
    alpha = np.clip(0.5 - (sd + spec["ragged"] * edge_n), 0.0, 1.0)

    if spec.get("chips"):
        alpha *= chip_field(n, spec, seed, w, h)

    tex = fbm(n, seed, 3.0)
    lum = 1.0 + 0.055 * tex
    lum *= (1.0 - 0.10 * np.clip(1.0 - np.abs(sd) / 4.5, 0, 1))
    lum *= (1.0 - 0.09 * np.clip((noise(n, 420, seed + 31, 0.4) - 1.05) * 1.6, 0, 1))
    lum *= (1.0 - 0.12 * np.clip(crack_mask(n, seed + 41, spec.get("cracks", 2)) * 1.4, 0, 1))

    patch = np.clip((noise(n, 34, seed + 51, 4.0) - 0.85) * 2.2, 0, 1) * spec.get("wear", 0.4)
    return alpha, lum, patch


def build_frame(n, spec, seed, w=SEAL_W, h=SEAL_H):
    """朱文边栏：只保留一圈细边框（外侧糙边 + 内侧吃墨）。"""
    sd = _sd_round_box(n, w, h, spec)
    bw = FRAME_W * w
    edge_n = (0.6 * noise(n, 90, seed + 11, 6.0) + 0.4 * noise(n, 26, seed + 12, 2.0))
    outer = np.clip(0.5 - (sd + spec["ragged"] * edge_n), 0.0, 1.0)      # 印面外形
    inner = np.clip(0.5 - (sd + bw + spec["ragged"] * 0.55 * edge_n), 0.0, 1.0)
    ring = np.clip(outer - inner, 0.0, 1.0)
    if spec.get("chips"):
        ring *= chip_field(n, spec, seed, w, h)
    lum = 1.0 + 0.055 * fbm(n, seed, 3.0)
    lum *= (1.0 - 0.12 * np.clip(crack_mask(n, seed + 41, spec.get("cracks", 2)) * 1.4, 0, 1))
    patch = np.clip((noise(n, 34, seed + 51, 4.0) - 0.85) * 2.2, 0, 1) * spec.get("wear", 0.4)
    return ring, lum, patch


# ================================================================ 3. 合成
def compose(word, spec, seed, mode=MODE_BAI, glyph_kw=None, plate=None,
            w=SEAL_W, h=SEAL_H):
    """合成一枚印章。

    mode="bai" 白文：朱红实心印面，字形处露出米白（阴刻）。
    mode="zhu" 朱文：透明地 + 朱红字形 + 朱红细边栏（阳刻）。
    plate      可选，AI 生成的印面底图（RGBA，无文字）。给定时程序纹理降级。
    """
    n = CANVAS
    base = np.array(spec["color"], dtype=np.float32)
    tm = text_layer(word, spec, n, w=w, h=h, glyph_kw=glyph_kw)

    if mode == MODE_ZHU:
        ring, lum, patch = build_frame(n, spec, seed, w=w, h=h)
        field = np.maximum(tm, ring)
        rgb = base[None, None, :] * lum[..., None]
        # 字口略深，模拟刀口积墨
        rgb *= (1.0 - 0.06 * np.clip(field - tm, 0, 1))[..., None]
        out = np.empty((n, n, 4), dtype=np.uint8)
        out[..., :3] = np.clip(rgb, 0, 255).astype(np.uint8)
        out[..., 3] = (np.clip(np.clip(field * 1.12, 0, 1) * (1.0 - 0.42 * patch), 0, 1) * 255).astype(np.uint8)
        im = Image.fromarray(out, "RGBA")
    else:
        if plate is not None:
            plate = plate.convert("RGBA")
            if plate.size != (n, n):
                plate = plate.resize((n, n), Image.LANCZOS)
            pa = np.asarray(plate, dtype=np.float32).copy()
            alpha = pa[..., 3] / 255.0
            lum = np.clip(pa[..., :3].mean(axis=2) / max(base.mean(), 1e-3), 0.4, 1.6)
            patch = np.zeros((n, n), dtype=np.float32)
        else:
            alpha, lum, patch = build_field(n, spec, seed, w=w, h=h)
        tmc = np.clip(tm * 1.12, 0, 1)
        rgb = base[None, None, :] * lum[..., None]
        rgb *= (1.0 - tmc[..., None])
        rgb += INK[None, None, :] * tmc[..., None]
        out = np.empty((n, n, 4), dtype=np.uint8)
        out[..., :3] = np.clip(rgb, 0, 255).astype(np.uint8)
        out[..., 3] = (np.clip(alpha * (1.0 - 0.42 * patch), 0, 1) * 255).astype(np.uint8)
        im = Image.fromarray(out, "RGBA")

    if spec.get("rot"):
        im = im.rotate(spec["rot"], resample=Image.BICUBIC, expand=False)
    return im


# ================================================================ 4. 5 枚印章规格
SEAL_SPECS = {
    "seal_xunshi": dict(word="循史", color=(176, 67, 47), ragged=2.2, chips=[], rot=0.0,
                        shift=(0.0, 0.0), text_scale=0.96, wear=0.45, cracks=2, seed=101,
                        note="端正古拙·残破最轻·印面居中"),
    "seal_gouhuo": dict(word="苟活", color=(176, 67, 47), ragged=3.0, chips=[], rot=-1.6,
                        shift=(-0.020, 0.012), text_scale=0.93, wear=0.60, cracks=3, seed=202,
                        note="笔意收敛·印面略偏一侧如草草钤就"),
    "seal_wenjian": dict(word="稳健", color=(176, 67, 47), ragged=1.8, chips=[], rot=0.0,
                         shift=(0.0, 0.0), text_scale=1.00, wear=0.28, cracks=1, seed=303,
                         note="印面端正饱满·残破最少"),
    "seal_nitian": dict(word="逆天", color=(186, 62, 44), ragged=3.4, chips=[], rot=2.4,
                        shift=(0.008, -0.008), text_scale=1.06, wear=0.55, cracks=3, seed=404,
                        note="笔势张扬冲边·印面微倾斜·气势最烈"),
    "seal_baiju": dict(word="败局", color=(154, 58, 42), ragged=5.2, chips=[(1.00, 0.99, 0.155)],
                       rot=0.0, shift=(0.0, 0.0), text_scale=0.95, wear=0.85, cracks=4, seed=505,
                       note="残破最重·右下角崩缺·朱色略沉"),
}


def build_all(outdir, mode=MODE_BAI, glyph_kw=None, verbose=True):
    os.makedirs(outdir, exist_ok=True)
    made = []
    for key, spec in SEAL_SPECS.items():
        im = compose(spec["word"], spec, spec["seed"], mode=mode, glyph_kw=glyph_kw)
        path = os.path.join(outdir, key + ".png")
        im.save(path)
        made.append(path)
        if verbose:
            print("  ok %-18s %-4s %s" % (key + ".png", spec["word"], spec["note"]))
    return made
