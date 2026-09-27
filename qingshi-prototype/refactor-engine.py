# -*- coding: utf-8 -*-
"""引擎多剧本化改造：把李斯专属硬编码下沉为数据驱动。替换后立刻断言锚点消失/出现。"""
import io, sys

P = 'engine.js'
s = io.open(P, encoding='utf-8').read()

def rep(name, old, new, cnt=1):
    global s
    n = s.count(old)
    if n != cnt:
        print('FAIL %s: 锚点出现 %d 次（期望 %d）' % (name, n, cnt)); sys.exit(1)
    s = s.replace(old, new, cnt)
    print('ok %s' % name)

# ---------- R1: onEventEnter 数据驱动 ----------
old1 = """  Game.prototype.onEventEnter = function () {
    if (this.eventId === '4-5' && !this.flags._n2done) {
      this.flags._n2done = true;
      if (this.attrs.shengwang >= 70 && this.dev >= 46) this.flags.n2_attack = true;
      // 君心≤30 的异变由 4-4 → 4-5-pre 前置事件承担
    }
    // GDD 4-6-C 结算注：附议重罚换赵高威胁度-10，但沙丘夜勒索强度+10——入 5-1 时一次性兑现
    // （隐藏值直接结算，不进结算条目；章首钩子先于快照执行，回溯恢复快照后不会重复兑现）
    if (this.eventId === '5-1' && this.flags.zhaogao1 && !this.flags._lesuo) {
      this.flags._lesuo = true;
      this.zg = clamp(this.zg + 10);
    }
  };"""
new1 = """  Game.prototype.onEventEnter = function () {
    var ev = this.findEvent(this.eventId);
    if (!ev || !ev.enterEffects) return;
    if (ev.enterOnce) {
      if (this.flags[ev.enterOnce]) return;
      this.flags[ev.enterOnce] = true;
    }
    var self = this;
    ev.enterEffects.forEach(function (ef) {
      if (ef.if && !self.check(ef.if).ok) return;
      if (ef.setFlags) ef.setFlags.forEach(function (f) { self.flags[f] = true; });
      if (ef.attrs) Object.keys(ef.attrs).forEach(function (k) { self.attrs[k] = clamp(self.attrs[k] + ef.attrs[k]); });
      if (ef.zg) self.zg = clamp(self.zg + ef.zg);
      if (ef.zgSet != null) self.zg = clamp(ef.zgSet);
    });
  };"""
rep('R1 onEventEnter', old1, new1)

# ---------- R2: getOptions 硬编码门槛 → reqAdjust ----------
old2_head = "      var req = o.req ? Object.assign({}, o.req) : null;\n"
old2_tail = "      var c = req ? self.check(req) : { ok: true, reason: null };"
i = s.find(old2_head, s.find('Game.prototype.getOptions'))
j = s.find(old2_tail, i)
if i < 0 or j < 0:
    print('FAIL R2: 未找到 getOptions 边界'); sys.exit(1)
mid = s[i + len(old2_head):j]
if '3-2' not in mid or 'yuwei' not in mid:
    print('FAIL R2: 中间块内容不符'); sys.exit(1)
new_mid = ("      // 数据驱动的门槛修正（节点异变/Flag 话术升级等）：opt.reqAdjust = [{ if, attr, delta }]\n"
           "      if (o.reqAdjust) {\n"
           "        req = req || {};\n"
           "        o.reqAdjust.forEach(function (ra) {\n"
           "          if (!ra.if || self.check(ra.if).ok) req[ra.attr] = (req[ra.attr] || 0) + ra.delta;\n"
           "        });\n"
           "      }\n")
s = s[:i + len(old2_head)] + new_mid + s[j:]
print('ok R2 getOptions reqAdjust')

# ---------- R3: finishEnding 结局成就数据驱动 ----------
old3 = """    if (id === 'E1') this.unlockAch('dongmen');          // 东门黄犬：达成史实结局
    if (id === 'E6') this.unlockAch('shuyumengtian');    // 吾与他，孰与蒙恬：逆天线保住扶苏与蒙恬
    if (id === 'E4' && variant === 'kuaiji') this.unlockAch('jinchan'); // 金蝉脱壳：会稽老丈
    if (id === 'E6' || id === 'E7') this.unlockAch('nitian');           // 逆天改命：达成逆天结局"""
new3 = """    // 数据驱动结局成就：ENDINGS[E].ach[] + variantAch[variant][]；逆天结局通用追加 nitian（剧本有定义时）
    var def0 = this.d.ENDINGS[id];
    var achIds = (def0 && def0.ach || []).slice();
    if (def0 && def0.variantAch && variant && def0.variantAch[variant]) achIds = achIds.concat(def0.variantAch[variant]);
    if (def0 && def0.nitian && this.d.ACHIEVEMENTS && this.d.ACHIEVEMENTS.nitian) achIds.push('nitian');
    var selfAch = this;
    achIds.forEach(function (a) { selfAch.unlockAch(a); });"""
rep('R3 finishEnding ach', old3, new3)

# ---------- R4: 史评加成数据驱动 ----------
old4 = "    var shiping = clamp(50 + this.histScore * 0.5 + (this.flags.hanfeicun ? 10 : 0));"
new4 = """    // 史评加成（数据驱动：数据顶层 SHIPING_BONUS_FLAGS = [{flag, bonus}]）
    var shipBonus = 0;
    (this.d.SHIPING_BONUS_FLAGS || []).forEach(function (sb) { if (self.flags[sb.flag]) shipBonus += sb.bonus; });
    var shiping = clamp(50 + this.histScore * 0.5 + shipBonus);"""
rep('R4 shiping bonus', old4, new4)

# buildEnding 顶部补 self（R4 依赖）
old4b = "  Game.prototype.buildEnding = function (id, variant) {\n    var def = this.d.ENDINGS[id];"
new4b = "  Game.prototype.buildEnding = function (id, variant) {\n    var self = this;\n    var def = this.d.ENDINGS[id];"
rep('R4b buildEnding self', old4b, new4b)

# ---------- R5: E4 史传尾声数据驱动 ----------
import re
m = re.search(r"    var zhuan = v \? v\.zhuan : def\.zhuan;\n    if \(id === 'E4'\) \{\n(.*?\n)*?    \}\n", s)
if not m:
    print('FAIL R5: 未找到 E4 尾声块'); sys.exit(1)
old5 = m.group(0)
new5 = """    var zhuan = v ? v.zhuan : def.zhuan;
    // 数据驱动的史传尾声叠加：ENDINGS[E].zhuanAppends = [{ if, text }]
    if (def.zhuanAppends) {
      def.zhuanAppends.forEach(function (za) {
        if (!za.if || self.check(za.if).ok) zhuan += za.text;
      });
    }
"""
s = s.replace(old5, new5, 1)
print('ok R5 zhuanAppends')

# ---------- R6: hanfeiAlive → aliveNote ----------
old6 = "      hanfeiAlive: !!this.flags.hanfeicun, // 韩非存活至结局（GDD 四章章末注），供 UI 展示"
new6 = "      aliveNote: (def.aliveNote && this.flags[def.aliveNote.flag]) ? def.aliveNote.text : null, // 结局附加提示（数据驱动）"
rep('R6 aliveNote', old6, new6)

# ---------- R7: zg 初始值与 importSave 缺省 → HIDDEN.init ----------
old7 = "    this.zg = 30;                // 赵高威胁度（隐藏值，GDD 4.3）"
new7 = "    // 主敌威胁/戒心（隐藏值，GDD 4.3；剧本经 HIDDEN 配置，李斯=赵高威胁度）\n    this.zg = (this.d.HIDDEN && this.d.HIDDEN.init != null) ? this.d.HIDDEN.init : 30;"
rep('R7 zg init', old7, new7)

old7b = "    this.zg = s.zg != null ? s.zg : 30;"
new7b = "    this.zg = s.zg != null ? s.zg : ((this.d.HIDDEN && this.d.HIDDEN.init != null) ? this.d.HIDDEN.init : 30);"
rep('R7b importSave zg', old7b, new7b)

# ---------- R8: zgWord 数据驱动 ----------
old8 = """  Game.prototype.zgWord = function () {
    var z = this.zg;
    return z >= 70 ? '杀机毕露' : z >= 50 ? '图穷匕见' : z >= 35 ? '隐约不安' : '敛迹藏锋';
  };"""
new8 = """  Game.prototype.zgWord = function () {
    var words = (this.d.HIDDEN && this.d.HIDDEN.words) || [[70, '杀机毕露'], [50, '图穷匕见'], [35, '隐约不安'], [0, '敛迹藏锋']];
    for (var i = 0; i < words.length; i++) if (this.zg >= words[i][0]) return words[i][1];
    return words[words.length - 1][1];
  };"""
rep('R8 zgWord', old8, new8)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('ALL DONE')
