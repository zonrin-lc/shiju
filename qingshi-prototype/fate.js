/* 《青史生存录》随机命局生成器（v1.7.0，GDD 附录 R）—— 纯逻辑，浏览器与 Node 通用。
 * 输入：五剧本数据映射 + 可复现 rng；输出：一份可直接喂给引擎的"第六剧本"数据对象。
 * 随机化范围（主线/危机/修正保留主角本，涌现的是"势"）：
 *   ① 主角：五选一（均匀）
 *   ② 初始属性：以主角 INIT 为基准，六维 ±10、危机 ±5（clamp 0–100）
 *   ③ 际遇池：五本 RANDOM_EVENTS 全量 60 个抽 12 不重复（id 重编 F-1..F-12）
 *   ④ 词条库：五本 GLOSSARY 合并（key 冲突以主角本为准）
 *   ⑤ 命局摘要：写入 chapters[0].enter.note（章首注）
 * 存档语义：随机命局不写跨会话存档——每局即一生（GDD 附录 R.3）。 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.QINGSHI_FATE = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  var ATTR_KEYS = ['quanshi', 'shengwang', 'junxin', 'caifu', 'caixue', 'weiji'];

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function ri(rng, lo, hi) { return lo + Math.floor(rng() * (hi - lo + 1)); }
  function clamp(v) { return Math.max(0, Math.min(100, v)); }

  /* 主入口：dataMap = {key: data, ...}（values 为剧本数据对象）；rng 为 () => [0,1)。
   * 返回 { data, report } —— data 为命局剧本数据；report 为命局摘要（人物/扰动/池来源）。 */
  function makeFate(dataMap, rng) {
    rng = rng || Math.random;
    var keys = Object.keys(dataMap);
    var protag = keys[Math.floor(rng() * keys.length)];
    var src = dataMap[protag];

    // 深拷贝主角本（剧本数据为纯 JSON 结构）
    var d = JSON.parse(JSON.stringify(src));

    // ① 初始属性扰动
    var jitter = {};
    ATTR_KEYS.forEach(function (k) {
      var base = d.INIT[k];
      var span = k === 'weiji' ? 5 : 10;
      var delta = ri(rng, -span, span);
      jitter[k] = delta;
      d.INIT[k] = clamp(base + delta);
    });

    // ② 际遇池：全量打散抽 12（id 重编，防跨剧本重名冲突）
    var pool = [];
    var srcCount = {};
    keys.forEach(function (k) {
      (dataMap[k].RANDOM_EVENTS || []).forEach(function (ev) { pool.push({ from: k, ev: ev }); });
    });
    var picked = [];
    for (var n = 0; n < 12 && pool.length > 0; n++) {
      var idx = Math.floor(rng() * pool.length);
      var item = pool.splice(idx, 1)[0];
      var ev = JSON.parse(JSON.stringify(item.ev));
      ev.id = 'F-' + (n + 1);
      picked.push(ev);
      srcCount[item.from] = (srcCount[item.from] || 0) + 1;
    }
    d.RANDOM_EVENTS = picked;

    // ③ 词条库合并：主角本最后覆盖（冲突以主角本为准）
    var gloss = {};
    keys.forEach(function (k) {
      var g = dataMap[k].GLOSSARY || {};
      Object.keys(g).forEach(function (t) { if (!gloss[t]) gloss[t] = g[t]; });
    });
    Object.keys(src.GLOSSARY || {}).forEach(function (t) { gloss[t] = src.GLOSSARY[t]; });
    d.GLOSSARY = gloss;

    // ④ 剧本身份与命局摘要
    var srcName = (src.SCENARIO && src.SCENARIO.name) || protag;
    d.SCENARIO = Object.assign({}, src.SCENARIO, {
      id: 'fate',
      name: srcName + ' · 随机命局',
      sub: '无人写过的命',
      recommend: '每局即一生（无存档）'
    });

    var report = {
      protag: protag, protagName: srcName,
      jitter: jitter, pool: srcCount, poolTotal: picked.length
    };
    var jt = ATTR_KEYS.map(function (k) {
      var v = jitter[k];
      return (d.ATTR_NAMES[k] || k) + (v >= 0 ? '+' : '') + v;
    }).join(' ');
    var poolDesc = keys.map(function (k) { return srcCount[k] || 0; }).join('/');
    d.CHAPTERS[0].enter = Object.assign({}, d.CHAPTERS[0].enter, {
      note: '【随机命局】' + srcName + ' ｜ 天道已重排：' + jt + ' ｜ 际遇×' + picked.length + ' 已洗入（' + poolDesc + '）｜ 此局无存档，一生即一局'
    });

    return { data: d, report: report };
  }

  return { makeFate: makeFate, mulberry32: mulberry32, ATTR_KEYS: ATTR_KEYS };
});
