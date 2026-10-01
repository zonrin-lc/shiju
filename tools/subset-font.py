import sys, os, json, glob
from fontTools.ttLib import TTFont
from fontTools import subset

sys.stdout.reconfigure(encoding='utf-8')
FONT = sys.argv[1]
OUTDIR = sys.argv[2]
PROTO = sys.argv[3]

f = TTFont(FONT, lazy=True)
cmap = f.getBestCmap()
print('== 覆盖检查 ==')
for label, chars in [('ASCII', ''.join(chr(c) for c in range(0x20, 0x7f))),
                     ('中文标点', '，。、；：？！“”‘’（）《》—…·〔〕【】'),
                     ('数字单位', '0123456789年月日世前 century')]:
    miss = [c for c in chars if ord(c) not in cmap]
    print(f'  {label}: 缺 {len(miss)}/{len(chars)}  {miss[:20]}')

# ---- 收集项目里真实出现的字符 ----
chars = set()
exts = ('*.js', '*.html', '*.json', '*.css')
files = []
for e in exts:
    files += glob.glob(os.path.join(PROTO, '**', e), recursive=True)
files = [p for p in files if 'assets' not in p.replace('\\', '/').split('/')]
for p in files:
    try:
        txt = open(p, encoding='utf-8').read()
    except Exception:
        continue
    chars.update(txt)
print(f'\n== 扫描 {len(files)} 个源文件 ==')
cjk = {c for c in chars if ord(c) > 0x2000}
print(f'  去重字符总数 {len(chars)}，其中非 ASCII {len(cjk)}')

# 基础集：常用标点与兜底汉字（拉丁/数字字体本身没有，会回退到后备字体）
base = set('，。、；：？！“”‘’（）《》〈〉—…·〔〕【】％＋－×÷°　〇')
base.update('零一二三四五六七八九十百千万亿兆')
base.update('甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥')
cmap_cps = set(cmap.keys())                 # 注意：cmap 的键是码位整数，不是字符
want = sorted({ord(c) for c in (chars | base)} & cmap_cps)
drop = sorted(c for c in (chars | base) if ord(c) not in cmap)
print(f'  字体缺失、需回退到后备字体的字符 {len(drop)} 个：{"".join(drop[:40])}')
print(f'  实际保留字形 {len(want)} 个（字体原有 {len(cmap)}）')

os.makedirs(OUTDIR, exist_ok=True)
opts = subset.Options()
opts.layout_features = ['*']
opts.name_IDs = ['*']
opts.notdef_outline = True
opts.recalc_bounds = True
opts.drop_tables += ['FFTM']
for flavor, ext in ((None, '.ttf'), ('woff2', '.woff2')):
    if flavor:
        opts.flavor = flavor
    else:
        opts.flavor = None
    font = TTFont(FONT)
    s = subset.Subsetter(options=opts)
    s.populate(unicodes=want)          # want 已是码位整数列表
    s.subset(font)
    out = os.path.join(OUTDIR, 'qijifallback' + ext)
    font.flavor = flavor
    font.save(out)
    print(f'  写出 {out}  {os.path.getsize(out)/1024/1024:.2f} MB')