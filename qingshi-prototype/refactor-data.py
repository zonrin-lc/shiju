# -*- coding: utf-8 -*-
"""game-data.js（李斯）数据层补齐：钩子/门槛/结局成就/史传尾声/隐藏 NPC 配置/剧本元信息。"""
import io, sys

P = 'game-data.js'
s = io.open(P, encoding='utf-8').read()

def rep(name, old, new, cnt=1):
    global s
    n = s.count(old)
    if n != cnt:
        print('FAIL %s: 锚点出现 %d 次（期望 %d）' % (name, n, cnt)); sys.exit(1)
    s = s.replace(old, new, cnt)
    print('ok %s' % name)

# D1: 4-5 进入钩子（N2 声望异变）
rep('D1 4-5 enterEffects',
    "        { id: '4-5', title: '焚书', key: true,",
    "        { id: '4-5', title: '焚书', key: true,\n"
    "          enterOnce: '_n2done', enterEffects: [ { if: { shengwang: 70, devMin: 46 }, setFlags: ['n2_attack'] } ],"
    )

# D2: 5-1 进入钩子（zhaogao1 → 勒索强度兑现）
rep('D2 5-1 enterEffects',
    "        { id: '5-1', title: '赵高来访',",
    "        { id: '5-1', title: '赵高来访',\n"
    "          enterOnce: '_lesuo', enterEffects: [ { if: { flag: 'zhaogao1' }, zg: 10 } ],"
    )

# D3: 3-2 上书 reqAdjust（zaoti+10 / liancao-10 / guangjiaoyou+5）
rep('D3 3-2 reqAdjust',
    "{ t: '上书——“逐客以资敌国，损民以益仇”', hist: true, req: { caixue: 50 },",
    "{ t: '上书——“逐客以资敌国，损民以益仇”', hist: true, req: { caixue: 50 },\n"
    "              reqAdjust: [ { if: { flag: 'zaoti' }, attr: 'caixue', delta: 10 }, { if: { flag: 'liancao' }, attr: 'caixue', delta: -10 }, { if: { flag: 'guangjiaoyou' }, attr: 'caixue', delta: 5 } ],")

# D4: 3-3-A 狱中书 reqAdjust（zaoti+10 / liancao-10）
rep('D4 3-3 reqAdjust',
    "{ t: '狱中上书，陈情自辩', req: { caixue: 60 },",
    "{ t: '狱中上书，陈情自辩', req: { caixue: 60 },\n"
    "              reqAdjust: [ { if: { flag: 'zaoti' }, attr: 'caixue', delta: 10 }, { if: { flag: 'liancao' }, attr: 'caixue', delta: -10 } ],")

# D5: 5-2-C 反客为主（yuwei → junxinMaxSeen+5）
rep('D5 5-2-C reqAdjust',
    "{ t: '反客为主——发真诏，迎扶苏', req: { flag: 'fusu', junxinMaxSeen: 60, notflag: 'wu_hanfei' },",
    "{ t: '反客为主——发真诏，迎扶苏', req: { flag: 'fusu', junxinMaxSeen: 60, notflag: 'wu_hanfei' },\n"
    "              reqAdjust: [ { if: { flag: 'yuwei' }, attr: 'junxinMaxSeen', delta: 5 } ],")

# D6: 5-2-D 假意从之（yuwei → caixue+5）
rep('D6 5-2-D reqAdjust',
    "{ t: '假意从之，阴图后举', req: { caixue: 65, flag: 'guanshu' },",
    "{ t: '假意从之，阴图后举', req: { caixue: 65, flag: 'guanshu' },\n"
    "              reqAdjust: [ { if: { flag: 'yuwei' }, attr: 'caixue', delta: 5 } ],")

# D7: E1 结局成就
rep('D7 E1.ach',
    "      name: '东市之叹', seal: '循史', cuncun: 20, nitian: false, devMax: 45,",
    "      name: '东市之叹', seal: '循史', cuncun: 20, nitian: false, devMax: 45, ach: ['dongmen'],")

# D8: E4 变体成就 + 史传尾声
rep('D8 E4 variantAch/zhuanAppends',
    "      name: '上蔡东门', seal: '稳健', cuncun: 95, nitian: false, devMax: 45,",
    "      name: '上蔡东门', seal: '稳健', cuncun: 95, nitian: false, devMax: 45,\n"
    "      variantAch: { kuaiji: ['jinchan'] },\n"
    "      zhuanAppends: [\n"
    "        { if: { flag: 'xiangchou' }, text: '昔年临行，翁许其父曰“儿会回来的”。数十载后，翁果归矣——诺虽迟，终未负也。' },\n"
    "        { if: { flag: 'zhizhi' }, text: '老子曰：知足不辱，知止不殆。斯晚而知之，犹愈于终不知者。' }\n"
    "      ],")

# D9: E6 结局成就
rep('D9 E6.ach',
    "      name: '扶苏新政', seal: '逆天', cuncun: 90, nitian: true, devMin: 46,",
    "      name: '扶苏新政', seal: '逆天', cuncun: 90, nitian: true, devMin: 46, ach: ['shuyumengtian'],")

# D10: 顶层剧本元信息/隐藏 NPC/史评加成/结局附加提示
old10 = """  return {
    ATTRS: ATTRS, ATTR_NAMES: ATTR_NAMES, INIT: INIT, DIFFICULTY: DIFFICULTY,"""
new10 = """  /* ============ 剧本元信息与剧本级配置（多剧本架构） ============ */
  var SCENARIO = {
    id: 'lisi', name: '李斯 · 仓鼠之局', sub: '如果你来走这一生',
    era: '约前 280 — 前 208', protag: '李斯',
    desc: '厕鼠与仓鼠之间，你选择了做仓鼠。七十年后，东市的风会不会不一样？',
    recommend: '新手向（容错高，推荐首局）'
  };
  // 主敌威胁/戒心（隐藏值）：李斯剧本 = 赵高威胁度
  var HIDDEN = {
    init: 30, name: '赵高（暗流）', showFrom: 3,
    words: [[70, '杀机毕露'], [50, '图穷匕见'], [35, '隐约不安'], [0, '敛迹藏锋']]
  };
  // 史评加成（韩非存活至结局 +10）与结局页附加提示
  var SHIPING_BONUS_FLAGS = [{ flag: 'hanfeicun', bonus: 10 }];
  var ALIVE_NOTE = { flag: 'hanfeicun', text: '韩非尚存，士林念之——史评 +10' };

  return {
    ATTRS: ATTRS, ATTR_NAMES: ATTR_NAMES, INIT: INIT, DIFFICULTY: DIFFICULTY,
    SCENARIO: SCENARIO, HIDDEN: HIDDEN, SHIPING_BONUS_FLAGS: SHIPING_BONUS_FLAGS, ALIVE_NOTE: ALIVE_NOTE,"""
rep('D10 顶层配置', old10, new10)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('ALL DONE')
