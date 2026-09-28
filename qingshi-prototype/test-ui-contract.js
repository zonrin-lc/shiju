/* UI 契约测试（v1.6.2）：跨剧本的引擎侧契约——防 UI 改版回归。
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

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail > 0 ? 1 : 0);
