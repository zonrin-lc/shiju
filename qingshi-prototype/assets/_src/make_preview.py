# -*- coding: utf-8 -*-
"""生成印章预览页：assets/seal-preview.html

内容：
  1. 结局页实景对照（现状文字标签 vs 接入印章后）—— B1 接入选型的直接依据
  2. 五方印总览（128px 原生宽度，游戏底色 #17140f 上）
  3. 尺寸验读（128 / 96 / 64 px）
  4. 矢量单字库（10 字，笔宽可拖）
  5. 参数与证据（probe-*.png / seals-big.png）

两个必须注意的实现点：
  · 字库 SVG 必须**内联**——file:// 下 fetch 被 CORS 拦住，笔宽滑块会失效。
  · 不用 %-格式化拼模板——CSS 里的 width:100% / border-radius:50% 会撞占位符。
    改用 {{TOKEN}} 替换。

用法：python make_preview.py
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
ASSETS = os.path.abspath(os.path.join(HERE, ".."))

import qs_seal as S

CHARS = "循史苟活稳健逆天败局"
# (key, 印文, 结局名, 难度)
SEALS = [
    ("seal_xunshi", "循史", "东市之叹", "士人"),
    ("seal_gouhuo", "苟活", "兰陵归鼠", "布衣"),
    ("seal_wenjian", "稳健", "上蔡东门", "士人"),
    ("seal_nitian", "逆天", "扶苏新政", "权臣"),
    ("seal_baiju", "败局", "东门逐客", "布衣"),
]

ZHUAN_EXCERPT = ("太史公曰：斯以闾巷历诸侯，入事秦，因时推毂，遂成帝业。书同其文，郡县其地，"
                 "三代以下，治者不能易也。然知仓鼠之择，而不知税驾之期；能变天下之法，"
                 "不能变赵高之变。沙丘一言，矫诏杀嫡；督责一书，逢君之恶。")


def inline_glyphs():
    """glyphs/*.svg → <symbol>，并把 <figure> 一并生成（内联才能拖笔宽）。"""
    gdir = os.path.join(ASSETS, "glyphs")
    syms, figs = [], []
    for ch in CHARS:
        src = open(os.path.join(gdir, ch + ".svg"), encoding="utf-8").read()
        vb = re.search(r'viewBox="([^"]+)"', src).group(1)
        inner = src.split(">", 1)[1].rsplit("</svg>", 1)[0]
        syms.append('<symbol id="g-%s" viewBox="%s">%s</symbol>' % (ch, vb, inner))
        bw, bh = [float(v) for v in vb.split()[2:]]
        h = int(132 * bh / bw)
        figs.append(
            '<figure><svg viewBox="%s" width="132" height="%d" style="color:#e8dfc8">'
            '<use href="#g-%s"/></svg>'
            '<figcaption>%s<span>%.0f×%.0f</span></figcaption></figure>'
            % (vb, h, ch, ch, bw, bh))
    return "\n".join(syms), "\n".join(figs)


def main():
    syms, glyphs = inline_glyphs()

    cards = "\n".join(
        '<figure class="sealcard"><img src="seals/%s.png" width="128" alt="%s">'
        '<figcaption><b>%s</b><span>%s · %s难度</span></figcaption></figure>'
        % (k, w, w, name, diff) for k, w, name, diff in SEALS)

    sizes = "\n".join(
        '<div class="sizerow"><span class="szl">%dpx</span>%s</div>'
        % (px, "".join('<img src="seals/%s.png" style="width:%dpx">' % (k, px)
                       for k, _, _, _ in SEALS)) for px in (128, 96, 64))

    rows = []
    for k, w, _, _ in SEALS:
        sp = S.SEAL_SPECS[k]
        rows.append(
            '<tr><td class="w">%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>' % (
                w, k.replace("seal_", ""),
                " / ".join("%.3f" % S.adaptive_stroke_ratio(c) for c in w),
                " / ".join("%.3f" % S.natural_stats(c)[1] for c in w),
                sp["note"]))
    table = "\n".join(rows)

    html = (TMPL.replace("{{SYMS}}", syms)
                .replace("{{GLYPHS}}", glyphs)
                .replace("{{CARDS}}", cards)
                .replace("{{SIZES}}", sizes)
                .replace("{{TABLE}}", table)
                .replace("{{ZHUAN}}", ZHUAN_EXCERPT))
    out = os.path.join(ASSETS, "seal-preview.html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)
    print("  -> %s  (%.0f KB)" % (os.path.relpath(out, os.path.dirname(ASSETS)),
                                  len(html.encode()) / 1024))


TMPL = """<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<title>结局印章 · 生产预览</title>
<style>
  :root{--bg:#17140f;--panel:#221d15;--panel2:#2a241a;--ink:#e8dfc8;--ink-dim:#a89a7c;
        --zhu:#b0432f;--gold:#c9a959;--line:#3a3226;--qing:#7fa8a0}
  *{box-sizing:border-box}
  body{background:#0d0b08;color:var(--ink);margin:0;
       font:14px/1.7 -apple-system,"PingFang SC","Noto Sans CJK SC",sans-serif}
  .wrap{max-width:1180px;margin:0 auto;padding:40px 26px 80px}
  h1{font-size:20px;letter-spacing:4px;font-weight:600;margin:0 0 6px}
  .lead{color:var(--ink-dim);font-size:13px;margin:0 0 10px}
  .tags{margin:0 0 12px}
  .tags i{font-style:normal;display:inline-block;border:1px solid var(--line);color:var(--ink-dim);
          font-size:11px;padding:2px 9px;margin:0 6px 6px 0;border-radius:2px}
  .tags i.on{border-color:var(--zhu);color:var(--zhu)}
  h2{font-size:14px;letter-spacing:3px;color:var(--ink-dim);font-weight:600;
     margin:44px 0 16px;padding-bottom:9px;border-bottom:1px solid var(--line)}

  .phones{display:flex;gap:26px;flex-wrap:wrap}
  .phone{width:340px;background:var(--bg);border:1px solid var(--line);border-radius:10px;
         overflow:hidden;box-shadow:0 18px 44px rgba(0,0,0,.5)}
  .pbar{padding:10px 14px 8px;border-bottom:1px solid var(--line);background:var(--panel);
        font-size:12px;color:var(--ink-dim);letter-spacing:1px}
  .pmain{padding:26px 22px 30px}
  .phcap{text-align:center;color:var(--ink-dim);font-size:12px;margin:10px 0 0}

  /* 结局页样式 —— 逐条取自 index.html:131-141 */
  .endSeal{display:inline-block;border:1px solid var(--zhu);color:var(--zhu);font-size:12px;
           letter-spacing:3px;padding:3px 10px;margin-bottom:14px}
  .endName{font-size:34px;letter-spacing:8px;margin-bottom:20px}
  .endZhuan{font-size:15px;line-height:2.3;text-align:justify;color:var(--ink);
            background:var(--panel);border-left:3px solid var(--gold);
            padding:18px 18px;margin-bottom:24px}
  .scoreHead{font-size:13px;letter-spacing:4px;color:var(--ink-dim);margin:22px 0 12px}
  .scoreLine{display:flex;justify-content:space-between;font-size:13px;padding:6px 2px;
             border-bottom:1px dashed var(--line)}
  .scoreLine b{color:var(--gold);font-weight:normal}
  .totalLine{display:flex;justify-content:space-between;align-items:baseline;margin-top:16px;
             padding-top:12px;border-top:1px solid var(--line)}
  .totalLine .ts{font-size:30px;color:var(--gold)}
  .grade{font-size:30px;color:var(--zhu);border:2px solid var(--zhu);width:58px;height:58px;
         display:flex;align-items:center;justify-content:center;border-radius:50%}
  /* 新版接法（B0 建议：拆成两个节点） */
  .sealBlock{display:flex;align-items:center;gap:14px;margin-bottom:16px}
  .sealBlock img{display:block}
  .sealMeta{font-size:12px;color:var(--ink-dim);line-height:2;letter-spacing:1px}
  .sealMeta b{color:var(--zhu);font-weight:normal;letter-spacing:3px}

  .cards{display:flex;flex-wrap:wrap;gap:16px}
  .sealcard{margin:0;background:var(--bg);border:1px solid var(--line);border-radius:6px;
            padding:20px 20px 14px;text-align:center;min-width:170px}
  .sealcard img{display:block;margin:0 auto}
  .sealcard figcaption{margin-top:12px;font-size:13px}
  .sealcard figcaption span{display:block;color:var(--ink-dim);font-size:11px;margin-top:3px;
                            letter-spacing:1px}
  .sizerow{display:flex;align-items:flex-end;gap:18px;padding:14px 0;
           border-bottom:1px dashed var(--line)}
  .szl{width:52px;color:var(--ink-dim);font-size:12px;flex:none}
  table{border-collapse:collapse;width:100%;font-size:12.5px}
  th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}
  th{color:var(--ink-dim);font-weight:600;font-size:12px;letter-spacing:1px}
  td.w{color:var(--gold);font-size:15px;letter-spacing:2px;white-space:nowrap}
  td:nth-child(3),td:nth-child(4){font-family:ui-monospace,monospace;font-size:11.5px;
                                  color:var(--ink-dim);white-space:nowrap}
  .grid2{display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start}
  .grid2 figure{margin:0}
  .grid2 img{max-width:100%;display:block;border:1px solid var(--line);border-radius:4px}
  .grid2 figcaption{color:var(--ink-dim);font-size:11.5px;margin-top:7px}
  .glyphbar{display:flex;align-items:center;gap:14px;background:var(--panel);
            border:1px solid var(--line);padding:12px 16px;border-radius:6px;margin-bottom:20px;
            flex-wrap:wrap}
  input[type=range]{width:230px;accent-color:var(--zhu)}
  .glyphs{display:flex;flex-wrap:wrap;gap:14px}
  .glyphs figure{margin:0;background:var(--panel);border:1px solid var(--line);border-radius:6px;
                 padding:14px 12px 9px;text-align:center}
  .glyphs figcaption{color:var(--ink-dim);font-size:11px;margin-top:7px;letter-spacing:1px}
  .glyphs figcaption span{display:block;color:#6d6353;font-size:10px}
  .note{background:var(--panel);border-left:3px solid var(--qing);padding:14px 16px;
        font-size:13px;color:var(--ink-dim);line-height:2;margin:16px 0}
  .note b{color:var(--ink);font-weight:600}
  code{background:#2a241a;padding:1px 5px;border-radius:3px;font-size:12px;color:var(--gold)}
  .warn{border-left-color:var(--zhu)}
</style></head><body><div class="wrap">

<h1>结局印章 · 生产预览</h1>
<p class="lead">峄山碑篆体（秦小篆）+ 程序印面　｜　白文 · 等墨自适应笔宽 · 就格 1.60</p>
<div class="tags">
  <i class="on">D-1 矢量文字 + 程序 / AI 印面</i><i class="on">真字库已接入</i>
  <i>5 枚 · 10 单字全覆盖</i><i>输出 645×1024 透明底</i><i>B1 批次</i>
</div>

<h2>一 · 结局页实景对照</h2>
<div class="phones">
  <div>
    <div class="phone">
      <div class="pbar">第三章 · 沙丘</div>
      <div class="pmain">
        <div class="endSeal">循史 · 士人难度</div>
        <div class="endName">东市之叹</div>
        <div class="endZhuan">{{ZHUAN}}</div>
        <div class="scoreHead">评 分</div>
        <div class="scoreLine"><span>功业</span><b>72</b></div>
        <div class="scoreLine"><span>存续</span><b>20</b></div>
        <div class="totalLine"><span style="font-size:13px;color:var(--ink-dim)">总分</span>
          <span class="ts">631</span><span class="grade">乙</span></div>
      </div>
    </div>
    <p class="phcap">现状：<code>.endSeal</code> 是文字描边标签</p>
  </div>
  <div>
    <div class="phone">
      <div class="pbar">第三章 · 沙丘</div>
      <div class="pmain">
        <div class="sealBlock">
          <img src="seals/seal_xunshi.png" width="118" alt="循史">
          <div class="sealMeta"><b>循 史</b><br>士人难度<br>第三章 · 沙丘</div>
        </div>
        <div class="endName">东市之叹</div>
        <div class="endZhuan">{{ZHUAN}}</div>
        <div class="scoreHead">评 分</div>
        <div class="scoreLine"><span>功业</span><b>72</b></div>
        <div class="scoreLine"><span>存续</span><b>20</b></div>
        <div class="totalLine"><span style="font-size:13px;color:var(--ink-dim)">总分</span>
          <span class="ts">631</span><span class="grade">乙</span></div>
      </div>
    </div>
    <p class="phcap">接入后：印章 118px + 元信息拆节点</p>
  </div>
</div>
<div class="note warn">
  <b>接入要点（B0 已定位的 4 处代码改动之一）</b>：<code>.endSeal</code> 现在把印章文字与难度文案
  拼在<b>同一个 DOM 节点</b>里 —— <code>index.html:665</code> 的
  <code>esc(en.seal)+' · '+esc(en.diffName)+'难度'</code>。
  换成图片前必须先把节点拆成 <code>&lt;img class="sealImg"&gt;</code> +
  <code>&lt;span class="sealMeta"&gt;</code> 两个，否则难度文案会被一起替换掉。
</div>

<h2>二 · 五方印总览（128px 原生宽度）</h2>
<div class="cards">{{CARDS}}</div>
<div class="note">
  <b>几何说明</b>：二字竖排放进<b>正方</b>印面时，单字格宽高比约 2.0，字形需横向拉伸近 1.8 倍，
  「天」「史」会变形到不可辨。秦汉二字印的实际形制是竖长矩形（半通印），
  故取印面 600×980（1:1.63），单字格 600×490。输出裁剪到印面并统一为高 1024（645×1024 透明底）——
  <b>不再用 1024² 画布</b>：印面只占画布约 58% 宽，前端按 <code>width:96px</code> 缩放后
  印面只剩约 56px，与 96–128px 的显示要求直接冲突。
</div>

<h2>三 · 尺寸验读</h2>
{{SIZES}}
<div class="note">
  白文在 <b>64px</b> 仍可辨（米白字 / 朱红底，明度差大）；朱文（阳刻）在 64px 已明显发虚。
  这是最终选白文的主要依据 —— 印章显示尺寸只有 96–128px。
</div>

<h2>四 · 矢量单字库</h2>
<svg width="0" height="0" style="position:absolute">{{SYMS}}</svg>
<div class="glyphbar">笔宽 <code>stroke-width</code>
  <input id="w" type="range" min="0" max="90" value="0"><b id="wv">0</b>
  <span style="color:var(--ink-dim);font-size:12px">字库单位 · 拖动即整组加粗（矢量，不重出图）</span>
</div>
<div class="glyphs">{{GLYPHS}}</div>
<div class="note">
  10 个单字即全量字表：<b>循 史 苟 活 稳 健 逆 天 败 局</b>。5 枚印章全部复用，
  「逆」「天」二字还可直接复用到 <code>icon_dev4</code>。原理：字库里的字形本身是
  <b>描边形状</b>（细铁线 ribbon），轮廓由内外两条近平行曲线构成；对同一轮廓同时
  fill + stroke 宽度 X，等价于把 ribbon 整体外扩 X/2 —— 所以笔宽能在矢量层调，不用重新出图。
</div>

<h2>五 · 参数与依据</h2>
<div class="grid2">
  <figure><img src="_gen/probe-ink.png" width="520">
    <figcaption>印式 × 笔宽扫描：白文 4.2%（字库原味）/ 6.5% / 8.5% / 10.5%，朱文 6.5% / 8.5%</figcaption></figure>
  <figure><img src="_gen/probe-stretch.png" width="560">
    <figcaption>就格扫描：1.00 两侧留红过多 → 1.60 铺满字格</figcaption></figure>
</div>
<div class="grid2" style="margin-top:18px">
  <figure><img src="_gen/seals-big.png" width="620">
    <figcaption>五方印逐枚细节（印面宽 300px）</figcaption></figure>
  <figure><img src="_gen/probe-equalink.png" width="600">
    <figcaption>等墨法对照：上＝统一 8.5%（「稳健」糊成一团）／下＝等墨自适应</figcaption></figure>
</div>

<h2>六 · 逐枚参数</h2>
<table>
  <tr><th>印文</th><th>key</th><th>等墨笔宽（÷字高）</th><th>自然墨覆盖</th><th>印面规格</th></tr>
  {{TABLE}}
</table>
<div class="note">
  <b>等墨法</b>：10 字自然墨覆盖实测 <b>0.235–0.359</b>（1.5 倍差距）。若统一笔宽，
  「稳 / 健」（0.338 / 0.359）的墨覆盖会到 0.71，而「天」只有 0.41 —— 视觉上「稳健」明显更沉。
  篆刻的解法是「匀满」：笔画多的字收细笔道，使各字灰调一致。按 <code>cov ∝ 笔宽</code>
  解析反解每字笔宽（强度 0.7，半等墨以保可辨）。
</div>

<script>
  var w = document.getElementById('w'), v = document.getElementById('wv');
  w.oninput = function(){
    v.textContent = w.value;
    document.querySelectorAll('.glyphs svg path').forEach(function(p){
      p.setAttribute('stroke-width', w.value);
    });
  };
</script>
</div></body></html>
"""


if __name__ == "__main__":
    main()
