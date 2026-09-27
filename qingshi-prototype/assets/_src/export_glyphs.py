# -*- coding: utf-8 -*-
"""篆书单字库 → SVG 矢量轮廓（D-1 的「矢量文字」那一半）

为什么需要：印章与 `icon_dev4`（逆天）都要用到同一批 10 个篆字。位图在
24–40px 会糊，且改画幅要重出；矢量一次导出，任意尺寸锐利，且笔宽可由
CSS 控制——形如：

    <svg viewBox="0 0 620 1000"><path d="…" fill="currentColor"
         stroke="currentColor" stroke-width="24" stroke-linejoin="round"/></svg>

原理：字库里的字形本身就是**描边形状**（细铁线 ribbon），其轮廓由内外两条
近平行曲线构成。给该轮廓同时 fill + stroke 宽度 X，等价于把 ribbon 整体
外扩 X/2——所以笔宽可以在矢量层直接调，不必重出图。

输出：
  assets/glyphs/<char>.svg    10 个单字（viewBox = 字形紧包围盒，y 已翻转）
  assets/glyphs/index.html    一览（含笔宽滑块，直接看加粗效果）

用法：python export_glyphs.py
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

import qs_seal as S

ASSETS = os.path.abspath(os.path.join(HERE, ".."))
OUT = os.path.join(ASSETS, "glyphs")
CHARS = "循史苟活稳健逆天败局"
PAD = 40.0          # 包围盒外扩（字体单位），避免 stroke 被裁


def glyph_path(font, ch):
    cmap = font.getBestCmap()
    name = cmap.get(ord(ch))
    if not name:
        raise KeyError("字库缺字：%s" % ch)
    gs = font.getGlyphSet()
    glyph = gs[name]

    bp = BoundsPen(gs)
    glyph.draw(bp)
    x0, y0, x1, y1 = bp.bounds

    pen = SVGPathPen(gs)
    glyph.draw(pen)
    return pen.getCommands(), (x0, y0, x1, y1)


def build():
    fp = S._font_path()
    font = TTFont(fp, fontNumber=0)
    upem = font["head"].unitsPerEm
    cmap = font.getBestCmap()
    os.makedirs(OUT, exist_ok=True)
    print("字库 %s  upem=%d  字形数=%d" % (os.path.basename(fp), upem, len(cmap)))

    index = []
    for ch in CHARS:
        d, (x0, y0, x1, y1) = glyph_path(font, ch)
        bx, by = x0 - PAD, y0 - PAD
        bw, bh = (x1 - x0) + PAD * 2, (y1 - y0) + PAD * 2
        # 字库坐标 y 向上；SVG y 向下 → 翻转并把包围盒原点移到 0,0
        svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %.1f %.1f">\n'
               '  <g transform="translate(%.1f,%.1f) scale(1,-1)">\n'
               '    <path d="%s" fill="currentColor" stroke="currentColor"\n'
               '          stroke-width="0" stroke-linejoin="round" stroke-linecap="round"/>\n'
               '  </g>\n</svg>\n') % (bw, bh, -bx, y1 + PAD, d)
        with open(os.path.join(OUT, ch + ".svg"), "w", encoding="utf-8") as f:
            f.write(svg)
        r0, c0, asp = S.natural_stats(ch)
        index.append((ch, round(bw, 1), round(bh, 1), round(bw / bh, 3),
                      round(S.adaptive_stroke_ratio(ch), 4)))
        print("  ok %s.svg  viewBox %.0f×%.0f  aspect %.3f  自然笔宽%.4f → 等墨%.4f"
              % (ch, bw, bh, bw / bh, r0, index[-1][4]))

    rows = "\n".join(
        '<figure><svg viewBox="0 0 %s %s" width="132" height="%d" style="color:#e8dfc8">'
        '<use href="#g-%s"/></svg>'
        '<figcaption>%s<span>%s×%s</span></figcaption></figure>'
        % (bw, bh, int(132 * bh / bw), ch, ch, bw, bh) for ch, bw, bh, _, _ in index)
    defs = "\n".join(
        '<symbol id="g-%s" viewBox="0 0 %s %s">%s</symbol>' % (ch, bw, bh,
            open(os.path.join(OUT, ch + ".svg"), encoding="utf-8").read()
                 .split(">", 1)[1].rsplit("</svg>", 1)[0]
                 .replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %s %s">' % (bw, bh), "")
                 .replace("</g>\n", "</g>")
            )
        for ch, bw, bh, _, _ in index)

    html = HTML_TMPL % (defs, rows)
    with open(os.path.join(OUT, "index.html"), "w", encoding="utf-8") as f:
        f.write(html)
    print("  -> glyphs/index.html")


HTML_TMPL = """<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>篆书单字库 · 矢量</title>
<style>
  body{background:#17140f;color:#e8dfc8;font:14px/1.7 -apple-system,"PingFang SC",sans-serif;
       margin:0;padding:32px}
  h1{font-size:17px;font-weight:600;letter-spacing:2px;margin:0 0 6px}
  p.sub{color:#a89a7c;font-size:12px;margin:0 0 22px}
  .bar{display:flex;align-items:center;gap:12px;background:#221d15;border:1px solid #3a3226;
       padding:12px 16px;border-radius:6px;margin-bottom:26px;font-size:13px}
  input[type=range]{width:260px;accent-color:#b0432f}
  .grid{display:flex;flex-wrap:wrap;gap:14px}
  figure{margin:0;background:#221d15;border:1px solid #3a3226;border-radius:6px;
         padding:16px 14px 10px;text-align:center}
  figure svg{display:block;margin:0 auto}
  figcaption{color:#a89a7c;font-size:11px;margin-top:8px;letter-spacing:1px}
  figcaption span{display:block;color:#6d6353;font-size:10px}
</style></head><body>
<h1>篆书单字库 · 矢量轮廓</h1>
<p class="sub">峄山碑篆体 → SVG path ｜ fill + stroke 同色时，stroke-width 即「笔宽」</p>
<div class="bar">笔宽 stroke-width <input id="w" type="range" min="0" max="80" value="0">
  <b id="wv">0</b> <span style="color:#a89a7c">（字库单位，PAD 区内可自由加粗）</span></div>
<svg width="0" height="0" style="position:absolute">%s</svg>
<div class="grid">%s</div>
<script>
  var w = document.getElementById('w'), v = document.getElementById('wv');
  w.oninput = function(){
    v.textContent = w.value;
    document.querySelectorAll('figure svg').forEach(function(s){
      var p = s.querySelector('path'); if (p) p.setAttribute('stroke-width', w.value);
    });
  };
</script>
</body></html>
"""

if __name__ == "__main__":
    build()
