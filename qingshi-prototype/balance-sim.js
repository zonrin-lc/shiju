/* 批量平衡模拟器（GDD 第十章 平衡准则验收）
 * 用多种策略各跑 N 局 headless 对局，统计结局/通关率/评级分布，校验：
 *   准则 3：属性制衡——任何单一属性策略通关率不得 >60%
 *   准则 5：每剧本 ≥3 条通关路线（苟活 E2/E3、稳健 E4/E5、逆天 E6/E7 均应可达）
 *   准则 1：无万能最优选项（代理指标：各策略平均总分差、关键节点选项收益差）
 *   准则 2：历史惯性（代理指标：激进偏离策略的死亡率 vs 史实策略）
 * 运行：node balance-sim.js [--games 1000] [--seed 42] [--seeds 10] [--diff normal] [--scenario lisi|jingke] [--out report.json]
 */
function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
/* 多剧本：--scenario jingke|hanxin 加载对应剧本数据（默认 lisi） */
const SCEN = arg('scenario', 'lisi');
const DATA_FILES = { lisi: './game-data.js', jingke: './jingke-data.js', hanxin: './hanxin-data.js', xiangyu: './xiangyu-data.js', chensheng: './chensheng-data.js' };
const D = require(DATA_FILES[SCEN] || DATA_FILES.lisi);
const E = require('./engine.js');

/* 可复现随机源 */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const GAMES = parseInt(arg('games', '1000'), 10);
const SEED = parseInt(arg('seed', '42'), 10);
const SEEDS = Math.max(1, parseInt(arg('seeds', '1'), 10)); // 多 seed 扫描：--seeds N（N>1 时每策略总局数 = GAMES×N，可复现性由 SEED 派生保持）
const DIFF = arg('diff', 'normal');
const OUT = arg('out', null);

/* ---------- 策略：给定 {g, options:[{opt,locked,hist}], rng} 返回下标 ---------- */
function unlocked(options) {
  const r = [];
  options.forEach((o, i) => { if (!o.locked) r.push(i); });
  return r;
}
function pickBy(options, rng, score) {
  const cand = unlocked(options);
  let best = -Infinity, ties = [];
  cand.forEach(i => {
    const s = score(options[i].opt);
    if (s > best) { best = s; ties = [i]; }
    else if (s === best) ties.push(i);
  });
  return ties[Math.floor(rng() * ties.length)];
}
const devOf = o => (o.eff && o.eff.dev) || 0;
const attrOf = (o, k) => (o.eff && o.eff.attrs && o.eff.attrs[k]) || 0;

/* ---------- 规划型逆天策略（nitian）：验证"逆天线可被刻意规划达成"（准则 2 补证） ----------
 * 事件按预设路线表选（观鼠悟道 → 无害韩非 → 扶苏缓颊 → 沙丘反客为主；锁定则退 拒之 → 从之），
 * 行动卡主动经营：君心峰值 <60 优先入宫请安/托人递简（E6 需峰值≥60），危机 ≥60 优先压危机；
 * 关键卡余 1 轮时不再打行动卡，防止倒计时归零被强制提前进入抉择（如 4-2 提前弹劾韩非即全盘活埋）。 */
const NITIAN_PREFS = {
  lisi: {
  '0-1': ['驻足细想'], '0-2': ['辞去吏职'], '0-3': ['变卖家资'], '0-4': ['仓中鼠'],
  '1-1': ['潜心问学'], '1-2': ['西入秦'], '1-3': ['细察秦国民情'], '1-4': ['楚国不可为'], '1-5': ['意难平'],
  '2-1': ['埋头著文'], '2-2': ['灭诸侯'], '2-3': ['上书自辩'], '2-4': ['只做离间'],
  '3-0': ['连夜起草'], '3-1': ['拖延时日'], '3-2': ['上书——'], '3-3': ['狱中上书'],
  '4-1': ['物禁大盛'], '4-2': ['举荐韩非'], '4-3': ['独排众议'], '4-4': ['倾力推行'], '4-5-pre': ['周仆射面谀'],
  '4-5': ['官藏代焚'], '4-6': ['为扶苏缓颊'],
  'cj-yaojia': ['挺身力保'], 'cj-tuiyin': ['再留一程'],
  '5-1': ['怒斥'], '5-2': ['反客为主', '拒之。宁死', '从之'], '5-3': ['死拒', '屈服'], '5-4': ['等待命运'],
  '6-1': ['上书请减徭役'], '6-2': ['密奏二世', '察觉有诈'], '6-3': ['狱中上书', '不写了'], '6-4': ['引颈就戮']
  },
  jingke: {
  '0-1': ['还以眼色'], '0-2': ['长揖谢罪'], '0-3': ['西入燕'],
  '1-1': ['放歌相和'], '1-2': ['与论天下大势'], '1-3': ['静观时局'],
  '2-1': ['受遗命'], '2-2': ['许之'], '2-3': ['即刻治装'],
  '3-1': ['陈说利害'], '3-2': ['取真图'], '3-3': ['购徐夫人匕'], '3-4': ['以秦舞阳为副'],
  '4-1': ['和歌而去'], '4-2': ['细察秦廷关节'],
  '5-1': ['千金买通'], '5-2': ['如常进殿'], '5-3': ['笑而谢曰'], '5-4': ['揕其胸'], '5-5': ['倚柱而笑']
  },
  hanxin: {
  '0-1': ['受饭，默然铭记'], '0-2': ['俯身'], '0-3': ['杖剑从戎'],
  '1-1': ['陷阵先登'], '1-2': ['闭口不言'], '1-3': ['亡楚归汉'],
  '2-1': ['上不欲就天下乎'], '2-2': ['整肃仓廪'], '2-3': ['尽陈兵略'], '2-4': ['归而受命'], '2-5': ['汉中对'],
  '3-1': ['举兵东出'], '3-2': ['趁乱扩军'], '3-3': ['木罂缶渡河'],
  '4-1': ['背水一战'], '4-2': ['释而归之'], '4-3': ['半渡而击'],
  '5-1': ['静候汉王处分'], '5-2': ['让首功于诸将'], '5-3': ['听蒯通']
  },
  xiangyu: {
  '0-1': ['昼夜研习'], '0-2': ['悉心结交'], '0-3': ['随叔父赴府'],
  '1-1': ['召故吏豪杰'], '1-2': ['礼为上宾'], '1-3': ['立熊心为楚怀王'],
  '2-1': ['斩宋义'], '2-2': ['沉船破釜'], '2-3': ['九战破秦'],
  '3-1': ['收编为军'], '3-2': ['厉兵秣马'], '3-3': ['默然纵之'],
  '4-1': ['约法安民'], '4-2': ['尊义帝以虚名'], '4-3': ['遣使镇抚'],
  '5-1': ['乘胜穷追'], '5-2': ['察其诈'], '5-3': ['许之，而暗增戒备'],
  '6-1': ['遣骑四散'], '6-2': ['弃马步涉'], '6-3': ['并力一路'], '6-4': ['渡江再砺']
  },
  chensheng: {
  '0-1': ['恼而掷锄'], '0-2': ['接籍为屯长'], '0-3': ['与吴广深谈'],
  '1-1': ['再等等，雨停再议'], '1-2': ['因势利导'], '1-3': ['袒右称大楚'],
  '2-1': ['从民所欲'], '2-2': ['纵其自守'], '2-3': ['入据陈，开仓抚民'],
  '3-1': ['自立为王'], '3-2': ['缓图之'],
  '4-1': ['发援兵并力西进'], '4-1b': ['鸣金收兵'], '4-2': ['黜朱房胡武'],
  '5-1': ['亲赴荥阳'], '5-2': ['立诛田臧'],
  '6-1': ['弃陈南走'], '6-2': ['察其异，先收其刃'], '6-3': ['南下合流']
  }
};
const NITIAN_PREF = NITIAN_PREFS[SCEN] || NITIAN_PREFS.lisi;

const STRATEGIES = {
  random:      (c) => { const u = unlocked(c.options); return u[Math.floor(c.rng() * u.length)]; },
  hist:        (c) => { const h = c.options.findIndex(o => o.hist && !o.locked); return h >= 0 ? h : STRATEGIES.random(c); },
  devHigh:     (c) => pickBy(c.options, c.rng, o => devOf(o)),
  devLow:      (c) => pickBy(c.options, c.rng, o => -devOf(o)),
  survive:     (c) => pickBy(c.options, c.rng, o => -attrOf(o, 'weiji') * 10 + attrOf(o, 'junxin')),
  quanshi:     (c) => pickBy(c.options, c.rng, o => attrOf(o, 'quanshi')),
  shengwang:   (c) => pickBy(c.options, c.rng, o => attrOf(o, 'shengwang')),
  junxin:      (c) => pickBy(c.options, c.rng, o => attrOf(o, 'junxin')),
  caifu:       (c) => pickBy(c.options, c.rng, o => attrOf(o, 'caifu')),
  caixue:      (c) => pickBy(c.options, c.rng, o => attrOf(o, 'caixue')),
  nitian:      (c) => {
    const evId = (c.g.phase === 'endEvent' && c.g.currentEndEvent) ? c.g.currentEndEvent.id : c.g.eventId;
    const prefs = NITIAN_PREF[evId];
    if (prefs) {
      for (let p = 0; p < prefs.length; p++) {
        const i = c.options.findIndex(o => !o.locked && o.opt.t.indexOf(prefs[p]) >= 0);
        if (i >= 0) return i;
      }
    }
    return STRATEGIES.survive(c); // 未登记事件（际遇/危机插入）按求生打分兜底
  },
};
const ATTR_STRATS = ['quanshi', 'shengwang', 'junxin', 'caifu', 'caixue', 'survive'];
/* xushi 策略（v1.6.1）：每个关键事件先蓄势一次（round 阶段返回 -1 由 playOne 特判调 playXushi），
 * 事件抉择与已蓄势后的选卡均按 survive 求生打分——用于检验"永远蓄势"的收益曲线。 */
STRATEGIES.xushi = STRATEGIES.survive;

/* ---------- round 阶段选卡（行动卡回合制） ----------
 * 打分函数统一作用于 eff（事件选项与行动卡同口径）；关键卡估值 = 当前事件各未锁定选项中该策略的最优值 */
const EFF_SCORE = {
  devHigh:   eff => (eff.dev || 0),
  devLow:    eff => -(eff.dev || 0),
  survive:   eff => -((eff.attrs && eff.attrs.weiji) || 0) * 10 + ((eff.attrs && eff.attrs.junxin) || 0),
  quanshi:   eff => (eff.attrs && eff.attrs.quanshi) || 0,
  shengwang: eff => (eff.attrs && eff.attrs.shengwang) || 0,
  junxin:    eff => (eff.attrs && eff.attrs.junxin) || 0,
  caifu:     eff => (eff.attrs && eff.attrs.caifu) || 0,
  caixue:    eff => (eff.attrs && eff.attrs.caixue) || 0,
};
function pickCard(stratName, g, rng) {
  const offer = g.getOffer();
  if (stratName === 'hist') return 0; // 关键卡在则点关键卡（事件内照 hist 逻辑）
  if (stratName === 'xushi' && !g.xushi) return -1; // 蓄势策略：每个关键事件先蓄势（playOne 特判）
  if (stratName === 'xushi') stratName = 'survive'; // 已蓄势则按求生打分
  if (stratName === 'random') {
    const cand = [0]; // 4 张卡均匀随机（跳过锁定行动卡）
    for (let i = 1; i < offer.length; i++) if (!offer[i].locked) cand.push(i);
    return cand[Math.floor(rng() * cand.length)];
  }
  if (stratName === 'nitian') {
    // 关键卡余 1 轮时强制点关键卡，防倒计时归零被强制提前进入抉择
    if (g.keyRoundsLeft <= 1) return 0;
    if (SCEN === 'chensheng') {
      // 陈胜 E6 门槛（4-1 发援兵，eff 后判定）：权势 40（路线 26+eff15=41，余量靠行动卡）、
      // 才学 45（路线 37+读兵）、偏离 46（路线 51）。稀缺度：权势边际最薄，优先补权势。
      if (g.attrs.quanshi < 42) {
        for (let i = 1; i < offer.length; i++) if (offer[i].action && ['CS-ACT-22', 'CS-ACT-27', 'CS-ACT-35', 'CS-ACT-16', 'CS-ACT-20'].indexOf(offer[i].action.id) >= 0 && !offer[i].locked) return i;
      }
      if (g.attrs.caixue < 46) {
        for (let i = 1; i < offer.length; i++) if (offer[i].action && offer[i].action.id === 'CS-ACT-4' && !offer[i].locked) return i;
        for (let i = 1; i < offer.length; i++) if (offer[i].action && ['CS-ACT-17', 'CS-ACT-24'].indexOf(offer[i].action.id) >= 0 && !offer[i].locked) return i;
      }
      // 危机增速极快（发援兵+20 与高偏离修正叠加）：危机优先压舱
      if (g.attrs.weiji >= 55) {
        let best = 0, bi = 0;
        for (let i = 1; i < offer.length; i++) {
          const e = offer[i];
          if (e.locked || !e.action || !e.action.eff || !e.action.eff.attrs) continue;
          const w = e.action.eff.attrs.weiji || 0;
          if (w < best) { best = w; bi = i; }
        }
        if (bi) return bi;
      }
      // 兜底生存线（5-2 立诛田臧需君心≥50）：联络/聚义/犒赏经营君心
      if (g.attrs.junxin < 50) {
        for (let i = 1; i < offer.length; i++) if (offer[i].action && ['CS-ACT-3', 'CS-ACT-1', 'CS-ACT-32'].indexOf(offer[i].action.id) >= 0 && !offer[i].locked) return i;
      }
    } else if (SCEN === 'hanxin') {
      // 韩信 E6 门槛=权势≥70（战役才学 55/60 顺路）：权势不足优先 演兵示法/收留降卒/整训齐军
      if (g.attrs.quanshi < 70) {
        for (let i = 1; i < offer.length; i++) if (offer[i].action && ['HX-ACT-23', 'HX-ACT-30', 'HX-ACT-41'].indexOf(offer[i].action.id) >= 0 && !offer[i].locked) return i;
      }
      if (g.attrs.caixue < 60) {
        for (let i = 1; i < offer.length; i++) if (offer[i].action && offer[i].action.id === 'HX-ACT-1' && !offer[i].locked) return i;
        for (let i = 1; i < offer.length; i++) if (offer[i].action && offer[i].action.id === 'HX-ACT-4' && !offer[i].locked) return i;
      }
    } else if (SCEN === 'jingke') {
      // 荆轲 E6 门槛=才学≥65：才学不足优先 著书（JK-ACT-1）/ 读书击剑（JK-ACT-4）
      if (g.attrs.caixue < 65) {
        for (let i = 1; i < offer.length; i++) if (offer[i].action && offer[i].action.id === 'JK-ACT-1' && !offer[i].locked) return i;
        for (let i = 1; i < offer.length; i++) if (offer[i].action && offer[i].action.id === 'JK-ACT-4' && !offer[i].locked) return i;
      }
    } else if (g.peak.junxin < 60) {
      // 君心峰值不足 60（李斯 E6 门槛）：优先入宫请安（ACT-3），其次托人递简（ACT-28）
      for (let i = 1; i < offer.length; i++) if (offer[i].action && offer[i].action.id === 'ACT-3' && !offer[i].locked) return i;
      for (let i = 1; i < offer.length; i++) if (offer[i].action && offer[i].action.id === 'ACT-28' && !offer[i].locked) return i;
    }
    // 危机偏高：打出手牌中最强的危机削减卡
    if (g.attrs.weiji >= 60) {
      let best = 0, bi = 0;
      for (let i = 1; i < offer.length; i++) {
        const e = offer[i];
        if (e.locked || !e.action || !e.action.eff || !e.action.eff.attrs) continue;
        const w = e.action.eff.attrs.weiji || 0;
        if (w < best) { best = w; bi = i; }
      }
      if (bi) return bi;
    }
    return 0;
  }
  const score = EFF_SCORE[stratName];
  let keyVal = -Infinity;
  g.getOptions().forEach(o => { if (!o.locked) keyVal = Math.max(keyVal, score(o.opt.eff || {})); });
  let best = keyVal, ties = [0];
  for (let i = 1; i < offer.length; i++) {
    if (offer[i].locked) continue;
    const v = score((offer[i].action && offer[i].action.eff) || {});
    if (v > best) { best = v; ties = [i]; }
    else if (v === best) ties.push(i);
  }
  return ties[Math.floor(rng() * ties.length)];
}

/* 章末事件选项引擎不校验锁定（防御在 UI），模拟器按 req 自行过滤；
 * 章末不骰化：全 req（含属性）按硬锁过滤。章内事件走 g.getOptions()（引擎已含险招语义：
 * 属性软门槛不锁、以 risky 呈现，策略选中后由引擎内掷骰判定，seeded rng 保持确定性）。 */
function wrapOptions(g, ev) {
  return ev.options.map(o => ({ opt: o, locked: o.req ? !g.check(o.req).ok : false, hist: !!o.hist }));
}

/* ---------- 单局 ---------- */
function playOne(stratName, diffKey, rng) {
  const g = new E.Game(D, diffKey, rng);
  const pick = STRATEGIES[stratName];
  g.start();
  let guard = 0, decisions = 0;
  const keyPicks = []; // 关键节点抉择记录：[node, optionText]
  while (g.phase !== 'ending' && guard++ < 500) {
    if (g.phase === 'intro') { g.beginEvents(); continue; }
    if (g.phase === 'round') {
      const ci = pickCard(stratName, g, rng);
      if (ci === -1) { // 蓄势策略：放弃出牌（playXushi 内部照常推进倒计时与 forcedKey）
        const rx = g.playXushi();
        if (!rx) { g.playCard(0); continue; }
        decisions++;
        continue;
      }
      const r = g.playCard(ci);
      if (!r) { g.playCard(0); continue; } // 兜底：锁定等异常直接点关键卡
      decisions++;
      // r.kind==='key' → event 阶段由下方事件分支按策略选选项；
      // r.forcedKey（倒计时归零强制抉择）仅切入 event 阶段，抉择由下方事件分支按策略进行，非自动结算；
      // r.forcedEnding → phase='settle'，由 settle 分支 proceed 收束。
      continue;
    }
    if (g.phase === 'correction') { g.correctionContinue(); continue; }
    if (g.phase === 'summary') { g.proceedSummary(); continue; }
    if (g.phase === 'endEvent') {
      const options = wrapOptions(g, g.currentEndEvent);
      const i = pick({ g, options, rng });
      const ev = g.currentEndEvent;
      g.endEventChoose(i); decisions++;
      if (ev.key) keyPicks.push([D.KEY_NODE_NAMES[ev.id] || ev.title, ev.options[i].t]);
      continue;
    }
    if (g.phase === 'event') {
      const ev = g.findEvent(g.eventId);
      const options = g.getOptions();
      const i = pick({ g, options, rng });
      decisions++;
      if (ev.key) keyPicks.push([D.KEY_NODE_NAMES[ev.id] || ev.title, ev.options[i].t]);
      g.choose(i);
      continue;
    }
    if (g.phase === 'settle') { g.proceed(); continue; }
    throw new Error('未知阶段 ' + g.phase);
  }
  if (g.phase !== 'ending') throw new Error('未能在限定步数内到达结局（策略 ' + stratName + '）');
  return {
    ending: g.ending.id, variant: g.ending.variant,
    total: g.ending.total, grade: g.ending.grade,
    dev: g.dev, chapter: g.chapterIdx, decisions,
    attrs: Object.assign({}, g.attrs), keyPicks
  };
}

/* ---------- 汇总 ---------- */
const ROUTES = { '苟活': ['E2', 'E3'], '稳健': ['E4', 'E5'], '逆天': ['E6', 'E7'], '史实': ['E1'], '失败': ['E8'] };
function routeOf(endingId) {
  for (const r in ROUTES) if (ROUTES[r].indexOf(endingId) >= 0) return r;
  return '未知';
}

const stats = {};      // strat -> aggregate
const keyNodeStats = {}; // strat -> node -> optionText -> {n, sumTotal}
const errors = [];
const stratNames = Object.keys(STRATEGIES);
const t0 = Date.now();

stratNames.forEach((sn, si) => {
  stats[sn] = { games: 0, clear: 0, clearB: 0, sumTotal: 0, sumDev: 0, sumChapter: 0, endings: {}, variants: {}, grades: {}, sumAttrs: {} };
  keyNodeStats[sn] = {};
  for (let s = 0; s < SEEDS; s++) {
    for (let i = 0; i < GAMES; i++) {
      const rng = mulberry32(SEED + s * 10000019 + si * 1000003 + i);
      let r;
      try { r = playOne(sn, DIFF, rng); }
      catch (e) { errors.push(sn + ' #' + s + ':' + i + ': ' + e.message); continue; }
      const st = stats[sn];
      st.games++;
      if (r.ending !== 'E8') { st.clear++; if (r.grade === 'S' || r.grade === 'A' || r.grade === 'B') st.clearB++; }
      st.sumTotal += r.total; st.sumDev += r.dev; st.sumChapter += r.chapter;
      st.endings[r.ending] = (st.endings[r.ending] || 0) + 1;
      const v = r.ending + (r.variant ? '/' + r.variant : '');
      st.variants[v] = (st.variants[v] || 0) + 1;
      st.grades[r.grade] = (st.grades[r.grade] || 0) + 1;
      Object.keys(r.attrs).forEach(k => { st.sumAttrs[k] = (st.sumAttrs[k] || 0) + r.attrs[k]; });
      r.keyPicks.forEach(([node, t]) => {
        const ns = keyNodeStats[sn][node] = keyNodeStats[sn][node] || {};
        const os = ns[t] = ns[t] || { n: 0, sumTotal: 0 };
        os.n++; os.sumTotal += r.total;
      });
    }
  }
});

/* ---------- 报告 ---------- */
const pct = (a, b) => b ? (100 * a / b).toFixed(1) + '%' : '-';
const safeDiv = (a, b) => b ? a / b : 0;
const lines = [];
function log(s) { lines.push(s); console.log(s); }

log(`== 批量平衡模拟 ｜ 难度 ${DIFF} ｜ 每策略 ${GAMES}${SEEDS > 1 ? '×' + SEEDS + 'seed' : ''} 局 ｜ 种子 ${SEED} ｜ 耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s ==`);
log('注：总分含难度系数（剧情 ×0.8 / 普通 ×1.0 / 硬核 ×1.25），跨难度比较分数与评级无意义，仅同难度内比较。');
if (errors.length) log(`!! 引擎异常 ${errors.length} 起（详见 JSON 报告）`);

log('\n—— 策略总览（通关 = 非 E8 结局；优质通关 = 非 E8 且评级≥B）——');
log('策略        通关率    优质通关  平均总分  平均偏离  平均终局章  最常见结局');
stratNames.forEach(sn => {
  const s = stats[sn];
  const top = Object.keys(s.variants).sort((a, b) => s.variants[b] - s.variants[a])[0] || '-';
  log(`${sn.padEnd(10)}  ${pct(s.clear, s.games).padStart(7)}  ${pct(s.clearB, s.games).padStart(8)}  ${safeDiv(s.sumTotal, s.games).toFixed(1).padStart(8)}  ${safeDiv(s.sumDev, s.games).toFixed(1).padStart(8)}  ${safeDiv(s.sumChapter, s.games).toFixed(1).padStart(9)}  ${top} (${s.variants[top] || 0})`);
});

log('\n—— 结局分布（全策略合并，通关路线覆盖校验）——');
const merged = {};
stratNames.forEach(sn => Object.keys(stats[sn].endings).forEach(e => { merged[e] = (merged[e] || 0) + stats[sn].endings[e]; }));
Object.keys(ROUTES).forEach(r => {
  const n = ROUTES[r].reduce((a, e) => a + (merged[e] || 0), 0);
  log(`${r}（${ROUTES[r].join('/')}）：${n} 局`);
});

log('\n—— 准则 3：单一属性策略通关率（阈值 ≤60%；优质通关率为辅证）——');
ATTR_STRATS.forEach(sn => {
  const s = stats[sn], r = 100 * s.clear / s.games, rb = 100 * s.clearB / s.games;
  log(`${r <= 60 ? 'PASS' : 'FAIL'}  ${sn.padEnd(10)} 通关 ${r.toFixed(1)}% ｜ 优质通关 ${rb.toFixed(1)}%`);
});

log('\n—— 准则 5：三条通关路线可达性（任一策略达成即计）——');
['苟活', '稳健', '逆天'].forEach(r => {
  const n = ROUTES[r].reduce((a, e) => a + (merged[e] || 0), 0);
  log(`${n > 0 ? 'PASS' : 'FAIL'}  ${r}线达成 ${n} 局`);
});

log('\n—— 准则 1：无万能最优（代理）——');
const avg = sn => safeDiv(stats[sn].sumTotal, stats[sn].games);
const best = stratNames.slice().sort((a, b) => avg(b) - avg(a))[0];
log(`最优策略 ${best}（均分 ${avg(best).toFixed(1)}${best === 'nitian' ? '，规划型攻略上限，持上帝视角' : ''}） vs 随机 ${avg('random').toFixed(1)}，差 ${(avg(best) - avg('random')).toFixed(1)} 分`);
log('关键节点选项收益差（随机策略，样本≥30 的选项间最大均分差）：');
const kns = keyNodeStats.random;
Object.keys(kns).forEach(node => {
  const opts = Object.keys(kns[node]).filter(t => kns[node][t].n >= 30);
  if (opts.length < 2) return;
  const avgs = opts.map(t => ({ t, a: safeDiv(kns[node][t].sumTotal, kns[node][t].n), n: kns[node][t].n }));
  avgs.sort((x, y) => y.a - x.a);
  const gap = avgs[0].a - avgs[avgs.length - 1].a;
  log(`  ${node}：最优「${avgs[0].t.slice(0, 14)}」${avgs[0].a.toFixed(1)} / 最差「${avgs[avgs.length - 1].t.slice(0, 14)}」${avgs[avgs.length - 1].a.toFixed(1)}，差 ${gap.toFixed(1)}`);
});

log('\n—— 准则 2：历史惯性（代理）——');
log(`史实策略死亡率（E8）${pct(stats.hist.games - stats.hist.clear, stats.hist.games)}；激进偏离策略死亡率 ${pct(stats.devHigh.games - stats.devHigh.clear, stats.devHigh.games)}，逆天结局率 ${pct((stats.devHigh.endings.E6 || 0) + (stats.devHigh.endings.E7 || 0), stats.devHigh.games)}`);
const nitN = (stats.nitian.endings.E6 || 0) + (stats.nitian.endings.E7 || 0);
log(`${nitN > 0 ? 'PASS' : 'FAIL'}  规划型逆天策略（nitian）逆天结局率 ${pct(nitN, stats.nitian.games)}（E6:${stats.nitian.endings.E6 || 0} E7:${stats.nitian.endings.E7 || 0}），死亡率 ${pct(stats.nitian.games - stats.nitian.clear, stats.nitian.games)}，均分 ${avg('nitian').toFixed(1)}`);

log('\n—— 各策略结局明细 ——');
stratNames.forEach(sn => {
  const s = stats[sn];
  const det = Object.keys(s.variants).sort((a, b) => s.variants[b] - s.variants[a]).map(v => `${v}:${s.variants[v]}`).join(' ');
  log(`${sn.padEnd(10)} ${det}`);
});
log('\n—— 各策略评级分布 ——');
stratNames.forEach(sn => {
  const g = stats[sn].grades;
  log(`${sn.padEnd(10)} S:${g.S || 0} A:${g.A || 0} B:${g.B || 0} C:${g.C || 0} D:${g.D || 0}`);
});

if (OUT) {
  require('fs').writeFileSync(OUT, JSON.stringify({ games: GAMES, seeds: SEEDS, seed: SEED, diff: DIFF, stats, keyNodeStats, errors }, null, 2));
  console.log('\n明细已写入 ' + OUT);
}
process.exit(errors.length > 0 ? 1 : 0);
