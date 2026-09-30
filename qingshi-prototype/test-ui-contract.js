/* UI 契约测试（v1.6.8）：跨剧本的引擎侧契约——防 UI 改版回归。
 * 覆盖：硬核掷骰标题不泄露数字、回溯清蓄势/险招烧毁、分享卡标题按剧本数据驱动、
 *       全剧本 ACHIEVEMENTS 含 shiwodai（v1.5 被动关键卡后常态触发，缺条目会渲染 undefined）。
 * 运行：node test-ui-contract.js */
const E = require('./engine.js');
const FILES = { lisi: './game-data.js', jingke: './jingke-data.js', hanxin: './hanxin-data.js', xiangyu: './xiangyu-data.js', chensheng: './chensheng-data.js' };
const rngHigh = () => 0.99;

let pass = 0, fail = 0;

/* 1. 掷骰标题契约（全剧本 × 双难度）：普通含点数/成功率；硬核无数字、无百分号、只显档位词 */
{
  const digits = /\d|%/;
  Object.keys(FILES).forEach(k => {
    const D = require(FILES[k]);
    const fake = { risk: { rate: 50, roll: 31, success: true, unmet: [] } };
    const tN = new E.Game(D, 'normal', rngHigh).riskTitle(fake);
    const tH = new E.Game(D, 'hardcore', rngHigh).riskTitle(fake);
    if (/\d/.test(tN) && !digits.test(tH) && tH.indexOf('成算') >= 0) pass++;
    else { fail++; console.log('✘ [' + k + '] 掷骰标题契约：normal=' + tN + ' hardcore=' + tH); }
  });
  console.log('✔ 掷骰标题契约：5 剧本 × 双难度（普通含数字 / 硬核只显档位词）');
}

/* 2. 回溯契约（全剧本）：蓄势与险招烧毁不随回溯穿越 */
{
  Object.keys(FILES).forEach(k => {
    const D = require(FILES[k]);
    const g = new E.Game(D, 'normal', rngHigh);
    g.randomOn = false; g.start(); g.beginEvents();
    g.playXushi();
    g._burned['0-1:0'] = true;   // 模拟上一条时间线的险招烧毁
    g.backtrack();
    if (g.xushi === false && Object.keys(g._burned).length === 0) pass++;
    else { fail++; console.log('✘ [' + k + '] 回溯穿越：xushi=' + g.xushi + ' burned=' + Object.keys(g._burned).length); }
  });
  console.log('✔ 回溯契约：5 剧本 backtrack 后 xushi=false、_burned 清空');
}

/* 3. 分享卡标题契约（全剧本）：SCENARIO.name 驱动，格式「主角「局名」」，不得写死 */
{
  Object.keys(FILES).forEach(k => {
    const D = require(FILES[k]);
    const sc = D.SCENARIO;
    const title = '青史生存录 · ' + String(sc.name || '').replace(' · ', '「') + '」';
    const ok = title.indexOf('「') > 0 && title.indexOf('」') === title.length - 1 && title.indexOf(sc.protag) >= 0;
    if (ok && (k !== 'lisi' ? title.indexOf('李斯') < 0 : title.indexOf('李斯「仓鼠之局」') >= 0)) pass++;
    else { fail++; console.log('✘ [' + k + '] 分享卡标题：' + title); }
  });
  console.log('✔ 分享卡标题契约：5 剧本各自正确（无李斯硬编码）');
}

/* 4. 成就契约（全剧本）：ACHIEVEMENTS 含 shiwodai（被动关键卡后常态解锁，缺条目渲染 undefined） */
{
  Object.keys(FILES).forEach(k => {
    const D = require(FILES[k]);
    if (D.ACHIEVEMENTS && D.ACHIEVEMENTS.shiwodai) pass++;
    else { fail++; console.log('✘ [' + k + '] ACHIEVEMENTS 缺 shiwodai'); }
  });
  console.log('✔ 成就契约：5 剧本 ACHIEVEMENTS 均含「时不我待」');
}

/* 5. 版本同步契约：js/ui-core.js 的 APP_VERSION 必须与 package.json version 一致（防首页版本号再次漂移） */
{
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  const core = fs.readFileSync('./js/ui-core.js', 'utf8');
  const m = core.match(/APP_VERSION = '([^']+)'/);
  if (m && m[1] === pkg.version) { pass++; console.log('✔ 版本同步契约：APP_VERSION ' + m[1] + ' = package.json ' + pkg.version); }
  else { fail++; console.log('✘ 版本漂移：APP_VERSION=' + (m && m[1]) + ' package.json=' + pkg.version); }
}

/* 6. 成就引用契约（全剧本）：数据层所有 ach 引用必须存在于 ACHIEVEMENTS（防"幽灵成就"：引用能跑、渲染 undefined + 破图） */
{
  const ghosts = [];
  function collectAchRefs(D, out) {
    function scanEff(eff, where) {
      if (!eff || !eff.ach) return;
      if (typeof eff.ach === 'string') out.push([eff.ach, where]);
      else if (eff.ach.id) out.push([eff.ach.id, where]);
    }
    (D.CHAPTERS || []).forEach(function (ch) {
      if (ch.achOnEnter) out.push([ch.achOnEnter, 'chapter.achOnEnter']);
      (ch.events || []).forEach(function (ev) {
        (ev.options || []).forEach(function (o) { scanEff(o.eff, 'event ' + ev.id); });
      });
      (ch.endEvents || []).forEach(function (ev) {
        (ev.options || []).forEach(function (o) { scanEff(o.eff, 'endEvent ' + ev.id); });
      });
    });
    (D.RANDOM_EVENTS || []).forEach(function (ev) {
      (ev.options || []).forEach(function (o) { scanEff(o.eff, 'random ' + ev.id); });
    });
    var ce = D.CRISIS_EVENTS || {};
    (ce.plots || []).concat(ce.death ? [ce.death] : [], ce.qingsuan ? [ce.qingsuan] : []).forEach(function (ev) {
      (ev.options || []).forEach(function (o) { scanEff(o.eff, 'crisis ' + ev.id); });
    });
    (D.ACTIONS || []).forEach(function (a) { scanEff(a.eff, 'action ' + a.id); });
    Object.keys(D.ENDINGS || {}).forEach(function (id) {
      var e = D.ENDINGS[id];
      (e.ach || []).forEach(function (a) { out.push([a, 'ending ' + id]); });
      Object.keys(e.variantAch || {}).forEach(function (v) {
        e.variantAch[v].forEach(function (a) { out.push([a, 'ending ' + id + '/' + v]); });
      });
    });
  }
  Object.keys(FILES).forEach(k => {
    const D = require(FILES[k]);
    const refs = [];
    collectAchRefs(D, refs);
    const bad = refs.filter(r => !(D.ACHIEVEMENTS && D.ACHIEVEMENTS[r[0]]));
    if (bad.length === 0 && refs.length > 0) pass++;
    else { fail++; bad.forEach(r => console.log('✘ [' + k + '] 幽灵成就引用：' + r[0] + '（' + r[1] + '）')); if (refs.length === 0) console.log('✘ [' + k + '] 未扫描到任何 ach 引用（扫描器失效？）'); }
  });
  console.log('✔ 成就引用契约：5 剧本全部 ach 引用均有 ACHIEVEMENTS 条目');
}

/* 7. 回溯次数存档契约（全剧本）：普通难度回溯 1 次后，导出/导入存档仍不可再回溯（防跨会话刷新"每章 1 次"规则） */
{
  Object.keys(FILES).forEach(k => {
    const D = require(FILES[k]);
    const g = new E.Game(D, 'normal', rngHigh);
    g.randomOn = false; g.start(); g.beginEvents();
    const bt = g.backtrack();
    const locked = g.canBacktrack() === false;
    const sv = g.exportSave();
    const g2 = new E.Game(D, 'normal', rngHigh);
    const ok = sv && g2.importSave(JSON.parse(JSON.stringify(sv))) && g2.canBacktrack() === false && g2.backtracksThisChapter === 1;
    if (bt && locked && ok) pass++;
    else { fail++; console.log('✘ [' + k + '] 回溯次数存档契约：bt=' + bt + ' locked=' + locked + ' 恢复后 canBacktrack=' + g2.canBacktrack() + ' count=' + g2.backtracksThisChapter); }
  });
  console.log('✔ 回溯次数存档契约：5 剧本回溯后导出/导入，次数不重置');
}

/* 7b. 存档健壮性契约：localStorage 是不可信输入——backtracksThisChapter 非法值（字符串/负数/小数/超配额）拒收，脏 attrs/dev 拒收；合法档正常导入 */
{
  const D = require(FILES.lisi);
  const g0 = new E.Game(D, 'normal', rngHigh);
  g0.randomOn = false; g0.start(); g0.beginEvents(); g0.backtrack();
  const sv = JSON.parse(JSON.stringify(g0.exportSave()));
  let okAll = true;
  ['oops', -1, 1.5, 99].forEach(v => {  // 字符串 / 负数 / 小数 / 超配额（普通难度每章 1 次）
    const g2 = new E.Game(D, 'normal', rngHigh);
    const dirty = JSON.parse(JSON.stringify(sv)); dirty.backtracksThisChapter = v;
    if (g2.importSave(dirty) !== false) okAll = false;
  });
  // 脏 attrs / dev
  const d1 = JSON.parse(JSON.stringify(sv)); d1.snapshot.attrs.quanshi = 'oops';
  const d2 = JSON.parse(JSON.stringify(sv)); d2.snapshot.dev = -5;
  const gA = new E.Game(D, 'normal', rngHigh), gB = new E.Game(D, 'normal', rngHigh);
  if (gA.importSave(d1) !== false || gB.importSave(d2) !== false) okAll = false;
  const g3 = new E.Game(D, 'normal', rngHigh);
  const okValid = g3.importSave(JSON.parse(JSON.stringify(sv))) === true && g3.backtracksThisChapter === 1;
  if (okAll && okValid) pass++;
  else { fail++; console.log('✘ 存档健壮性契约失败：okAll=' + okAll + ' okValid=' + okValid); }
  console.log('✔ 存档健壮性契约：非法 backtracksThisChapter/attrs/dev 拒收，合法档正常导入');
}

/* 8. 成就图标契约（全剧本）：ACHIEVEMENTS 每个 id 必须有 assets/ach/ach_<id>.png（防"数据有、图没有"）。
 * 豁免清单：美术批次未交付项（已在美术资产清单 v0.2 登记、UI 有 onerror/无名目兜底），交付后从豁免中移除。 */
{
  const EXEMPT = { xiangyu: ['gai'] };
  const fs = require('fs');
  Object.keys(FILES).forEach(k => {
    const D = require(FILES[k]);
    const ex = EXEMPT[k] || [];
    const missing = Object.keys(D.ACHIEVEMENTS).filter(a => ex.indexOf(a) < 0 && !fs.existsSync('assets/ach/ach_' + a + '.png'));
    if (missing.length === 0) pass++;
    else { fail++; console.log('✘ [' + k + '] 成就图标缺失（非豁免）：' + missing.join('、')); }
  });
  console.log('✔ 成就图标契约：5 剧本 ACHIEVEMENTS 图标齐（豁免：xiangyu/gai 待美术批次）');
}

/* 9. 成就保留契约（全剧本 · v1.6.8 P1-2）：importSave 不得截断跨会话累计成就。
 * 复现：UI 侧 newGame() 先把 localStorage 累计成就灌入 game.ach，再 importSave 覆盖 → 成就丢失且写回后不可逆。 */
{
  Object.keys(FILES).forEach(k => {
    const D = require(FILES[k]);
    const g = new E.Game(D, 'normal', rngHigh);
    g.randomOn = false; g.start(); g.beginEvents();
    const inSnap = Object.keys(D.ACHIEVEMENTS)[0];
    g.unlockAch(inSnap);                                  // 快照内已解锁的一枚
    const sv = JSON.parse(JSON.stringify(g.exportSave()));
    const g2 = new E.Game(D, 'normal', rngHigh);
    const extra = Object.keys(D.ACHIEVEMENTS).find(a => sv.snapshot.ach.indexOf(a) < 0);  // 跨局累计、快照外
    g2.ach = [extra];                                     // 模拟 newGame() 灌入 localStorage 累计成就
    const ok = g2.importSave(sv) && g2.ach.indexOf(extra) >= 0 && g2.ach.indexOf(inSnap) >= 0;
    if (ok) pass++;
    else { fail++; console.log('✘ [' + k + '] 读档丢成就：extra=' + extra + ' ach=' + JSON.stringify(g2.ach)); }
  });
  console.log('✔ 成就保留契约：5 剧本 importSave 后成就为「快照 ∪ 已有」，不截断');
}

/* 9b. 脏 ach 拒收（v1.6.8 P1-2 配套）：ach 为字符串/对象/数字时 importSave 返回 false，不得因遍历抛错 */
{
  const D = require(FILES.lisi);
  const g0 = new E.Game(D, 'normal', rngHigh);
  g0.randomOn = false; g0.start(); g0.beginEvents();
  const sv = JSON.parse(JSON.stringify(g0.exportSave()));
  let ok = true;
  ['oops', { a: 1 }, 42].forEach(v => {
    const g = new E.Game(D, 'normal', rngHigh);
    const dirty = JSON.parse(JSON.stringify(sv)); dirty.snapshot.ach = v;
    if (g.importSave(dirty) !== false) ok = false;
  });
  if (ok) pass++; else { fail++; console.log('✘ 脏 ach 未拒收'); }
  console.log('✔ 脏 ach 拒收：字符串/对象/数字三种脏值均返回 false');
}

/* 10. 逆天反噬确定性契约（v1.6.8 P1-3 · 全剧本）：偏离≥71 入逆天段后，本章必遇一次反噬。
 * 修复前复用 randomChance(0.4) 作概率闸门：rng 恒高（0.999 > 0.4）时永不触发，与 GDD 附录 D #7「每章一次」不符。
 * 注：反噬仍受 randomOn 门控（与际遇共用入口，randomOn 为测试开关，正式对局恒为 true），故此处保持 randomOn 默认。 */
{
  Object.keys(FILES).forEach(k => {
    const D = require(FILES[k]);
    const g = new E.Game(D, 'normal', () => 0.999);   // rng 恒高＝旧实现下永不触发
    g.start(); g.beginEvents();
    g.dev = 90;                                        // 置于逆天段
    let fired = false;
    for (let i = 0; i < 8 && !fired; i++) {
      if (g.currentRandom && g.currentRandom.id === 'BACKLASH') { fired = true; break; }
      if (g.phase === 'round') { g.maybeRandom(); continue; }
      if (g.phase === 'event') {
        const opts = g.getOptions(); const i2 = opts.findIndex(x => !x.locked);
        if (i2 < 0) break;
        g.choose(i2); continue;
      }
      break;
    }
    if (fired) pass++;
    else { fail++; console.log('✘ [' + k + '] 逆天反噬未确定性触发（rng=0.999 时仍应触发）'); }
  });
  console.log('✔ 逆天反噬契约：5 剧本偏离≥71 时每章必遇一次（不随概率闸门）');
}

/* 11. 蓄势作用域契约（v1.6.8 P1-1 · 引擎侧）：蓄势只兑现「事件抉择」——
 * playCard 险招掷骰须用原始 rate（UI 已同步为不显示加成），且 playCard 不消耗蓄势。
 * 此用例锁死引擎语义防回归。 */
{
  const D = require(FILES.lisi);
  let n = 0;
  const dealRng = () => { n++; return (n * 0.137) % 1; };   // 变动发牌流，便于抽到软门槛卡（ACT-22 req caixue≥45）
  const g = new E.Game(D, 'normal', dealRng, { risk: () => 0.29 });
  g.randomOn = false; g.start();
  g.chapterIdx = 2; g.attrs.caixue = 0; g.attrs.caifu = 50;   // 才学压低 → 修书吕门成险招卡
  let base = null, idx = -1;
  for (let r = 0; r < 80 && idx < 0; r++) {
    g.beginRounds();
    const o = g.getOffer();
    idx = o.findIndex(e => e.type === 'action' && e.risky);
    if (idx >= 0) base = o[idx].risky.rate;
    g.actionUses = {};
  }
  if (idx < 0) { fail++; console.log('✘ 李斯第三章未抽到险招行动卡，蓄势作用域用例无法构造'); }
  else {
    g.xushi = true;
    const r = g.playCard(idx);
    if (r && r.risk && r.risk.rate === base && g.xushi === true) pass++;
    else { fail++; console.log('✘ 蓄势作用域：playCard rate=' + (r && r.risk ? r.risk.rate : '?') + '（应=原始 ' + base + '），xushi=' + g.xushi + '（应仍为 true，蓄势不被行动卡消耗）'); }
  }
  console.log('✔ 蓄势作用域契约：playCard 险招不含蓄势加成、不消耗蓄势（仅 choose 兑现 +10 并清空）');
}

/* 12. 功业计分契约（全剧本 · v1.6.8）：每个剧本必须显式声明 MERIT_MAP，
 * 且所有 eff.merit / ch.enter.merit 授予的功业名都在表内——否则 engine.js 的
 * `meritMap[m] || 8` 兜底会静默按 8 分计（历史上 lisi 即依赖该兜底，数值恰好全中但跨剧本不对称）。 */
{
  const collectMerits = (D) => {
    const out = new Set();
    const walk = (v) => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') {
        if (typeof v.merit === 'string') out.add(v.merit);
        Object.values(v).forEach(walk);
      }
    };
    walk(D.CHAPTERS); walk(D.RANDOM_EVENTS); walk(D.CORRECTIONS);
    return [...out];
  };
  Object.keys(FILES).forEach(k => {
    const D = require(FILES[k]);
    const merits = collectMerits(D);
    const unscored = merits.filter(m => !(D.MERIT_MAP && m in D.MERIT_MAP));
    if (D.MERIT_MAP && unscored.length === 0) pass++;
    else { fail++; console.log('✘ [' + k + '] MERIT_MAP 缺失或未覆盖功业：' + (D.MERIT_MAP ? unscored.join('、') : '(未声明 MERIT_MAP) 全部=' + merits.join('、'))); }
  });
  console.log('✔ 功业计分契约：5 剧本均显式声明 MERIT_MAP 且覆盖全部已授予功业');
}

/* 13. 百科词条可达性契约（全剧本 · v1.6.8）：GLOSSARY 每个词条都必须在叙事/结算文本中
 * 有 ⟦词条⟧ 标记，否则图鉴「已收录 x/N」永远无法满（此前有 10 条死条目）。 */
{
  const collectText = (D) => {
    let t = '';
    const walk = (v) => {
      if (typeof v === 'string') t += v;
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk(D.CHAPTERS); walk(D.RANDOM_EVENTS); walk(D.CORRECTIONS); walk(D.ACTIONS); walk(D.ENDINGS);
    return t;
  };
  Object.keys(FILES).forEach(k => {
    const D = require(FILES[k]);
    const text = collectText(D);
    const dead = Object.keys(D.GLOSSARY || {}).filter(t => text.indexOf('\u27e6' + t + '\u27e7') < 0);
    if (dead.length === 0) pass++;
    else { fail++; console.log('✘ [' + k + '] 死词条（无 ⟦⟧ 标记，图鉴不可收录）：' + dead.join('、')); }
  });
  console.log('✔ 百科可达性契约：5 剧本 GLOSSARY 全部有 ⟦词条⟧ 标记');
}

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail > 0 ? 1 : 0);
