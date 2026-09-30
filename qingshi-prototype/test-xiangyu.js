/* 项羽剧本《霸王之局》自动化剧本验证。运行：node test-xiangyu.js
 * 结构口径与 test-sim.js / test-jingke.js / test-hanxin.js 一致。 */
const D = require('./xiangyu-data.js');
const E = require('./engine.js');

const rngHigh = () => 0.99;
const rngLow = () => 0.01;

function play(diffKey, script, rng, endScript, hook) {
  const g = new E.Game(D, diffKey, rng || rngHigh);
  g.randomOn = false;
  g.start();
  let guard = 0;
  const trace = [];
  while (g.phase !== 'ending' && guard++ < 500) {
    if (hook) hook(g);
    if (g.phase === 'intro') { g.beginEvents(); continue; }
    if (g.phase === 'round') {
      const offer = g.getOffer();
      const keyId = offer[0].eventId;
      if (script[keyId] != null) { g.playCard(0); continue; }
      let ai = -1;
      for (let i = 1; i < offer.length; i++) if (!offer[i].locked && !offer[i].risky && offer[i].usedCount === 0) { ai = i; break; }
      if (ai < 0) for (let i = 1; i < offer.length; i++) if (!offer[i].locked && !offer[i].risky) { ai = i; break; }
      if (ai < 0) ai = 0;
      const r = g.playCard(ai);
      if (!r) { g.playCard(0); continue; }
      if (r.kind === 'action' && r.forcedKey) trace.push([keyId, '（倒计时归零·强制抉择）', g.dev]);
      continue;
    }
    if (g.phase === 'correction') { trace.push(['修正', g.correction.title, g.dev]); g.correctionContinue(); continue; }
    if (g.phase === 'summary') { g.proceedSummary(); continue; }
    if (g.phase === 'endEvent') {
      const ev = g.currentEndEvent;
      const idx = pickIndex(ev.options, script[ev.id] != null ? script[ev.id] : (endScript && endScript[ev.id]));
      if (idx == null) throw new Error('章末事件 ' + ev.id + ' 没有可用选择');
      trace.push([ev.id, ev.options[idx].t, g.dev]);
      g.endEventChoose(idx);
      continue;
    }
    if (g.phase === 'event') {
      const ev = g.findEvent(g.eventId);
      const opts = g.getOptions();
      let idx = pickIndex(ev.options, script[ev.id], opts);
      if (idx == null) throw new Error('事件 ' + ev.id + ' 没有可用选择（script 未指定或全部锁定）');
      trace.push([ev.id, ev.options[idx].t, g.dev]);
      g.choose(idx);
      continue;
    }
    if (g.phase === 'settle') { g.proceed(); continue; }
    throw new Error('未知阶段 ' + g.phase);
  }
  if (g.phase !== 'ending') throw new Error('未能在限定步数内到达结局');
  return { g, trace };
}

function driveTo(stopId, picks) {
  // corr 流注入 0.99：修正改走 corr 流后，保持本 helper"不遇概率修正"的原口径（契约：只适用于不遇章末事件/修正的路线）
  const g = new E.Game(D, 'normal', rngHigh, { corr: rngHigh });
  g.randomOn = false;
  g.start();
  let guard = 0;
  while (guard++ < 300) {
    if (g.phase === 'event' && g.eventId === stopId) return g;
    if (g.phase === 'intro') { g.beginEvents(); continue; }
    if (g.phase === 'round') { g.playCard(0); continue; }
    if (g.phase === 'summary') { g.proceedSummary(); continue; }
    if (g.phase === 'event') {
      const opts = g.getOptions();
      let i = picks && picks[g.eventId];
      if (i == null) { for (let k = 0; k < opts.length; k++) if (!opts[k].locked) { i = k; break; } }
      if (i == null) throw new Error('事件 ' + g.eventId + ' 全部锁定');
      g.choose(i);
      continue;
    }
    if (g.phase === 'settle') { g.proceed(); continue; }
    throw new Error('driveTo 遇意外阶段 ' + g.phase + '（' + g.eventId + '）');
  }
  throw new Error('driveTo 未能在限定步数内到达 ' + stopId);
}

function pickIndex(options, want, wrapped) {
  if (want == null) {
    if (wrapped) { for (let i = 0; i < wrapped.length; i++) if (!wrapped[i].locked) return i; return null; }
    return 0;
  }
  if (typeof want === 'number') return want;
  for (let i = 0; i < options.length; i++) {
    const t = options[i].t || options[i].opt && options[i].opt.t;
    if (t && t.indexOf(want) >= 0) {
      if (wrapped && wrapped[i].locked) return null;
      return i;
    }
  }
  return null;
}

let pass = 0, fail = 0;
function expect(name, actual, wantId, wantVariant) {
  const ok = actual.id === wantId && (wantVariant === undefined || actual.variant === wantVariant);
  if (ok) { pass++; console.log(`✔ ${name} → ${actual.id}${actual.variant ? '/' + actual.variant : ''}「${actual.name}」 总分 ${actual.total} 评级 ${actual.grade} 偏离 ${actual.dev}`); }
  else { fail++; console.log(`✘ ${name} 期望 ${wantId}/${wantVariant || '-'}，实际 ${actual.id}/${actual.variant || '-'}「${actual.name}」`); }
}
function has(g, ach) { return g.ach.includes(ach); }

/* ---------- 1. 史实线 → E1 乌江自刎 ---------- */
{
  const { g } = play('normal', {
    '0-1': '昼夜研习', '0-2': '悉心结交', '0-3': '随叔父赴府',
    '1-1': '召故吏豪杰', '1-2': '礼为上宾', '1-3': '立熊心为楚怀王',
    '2-1': '斩宋义', '2-2': '沉船破釜', '2-3': '九战破秦',
    '3-1': '夜击坑之', '3-2': '厉兵秣马', '3-3': '默然纵之',
    '4-1': '收宝货妇女而东', '4-2': '密令英布等杀之江中', '4-3': '遣使镇抚',
    '5-1': '乘胜穷追', '5-2': '捕风捉影', '5-3': '许之，引兵东归',
    '6-1': '溃围南出', '6-2': '弃马步涉', '6-3': '分骑四向', '6-4': '我何渡为'
  });
  expect('史实线', g.ending, 'E1');
  if (g.dev <= 45) { pass++; } else { fail++; console.log('✘ 史实线偏离应≤45，实际 ' + g.dev); }
  const need = ['wanrendi', 'yafu', 'zidii', 'duojun', 'pofu', 'julu', 'hongmen', 'bawang', 'pengcheng', 'honggou', 'dongcheng', 'wujiang'];
  const miss = need.filter(a => !has(g, a));
  if (miss.length === 0) { pass++; console.log('✔ 史实线成就 12 枚全部解锁'); }
  else { fail++; console.log('✘ 史实线缺成就：' + miss.join('、')); }
  if (g.ending.review.length === 5) { pass++; console.log('✔ 复盘 5 条（安阳/新安/鸿门/鸿沟/乌江）'); }
  else { fail++; console.log('✘ 复盘应为 5 条，实际 ' + g.ending.review.length); }
}

/* ---------- 2. 苟活线 → E2 会稽老卒（不预兵事） ----------
 * v1.6.8：0-3「不预兵事」加 notflag wanrendi 早退闸（对齐 lisi 0-3-B 模式）——
 * 已「学万人敌 / 观始皇渡浙江」立志者不再收零代价退出。故此线须先在 0-1 走「以力代学」。 */
{
  const { g } = play('normal', { '0-1': '以力代学', '0-3': '不预兵事' });
  expect('苟活线（老卒）', g.ending, 'E2');
}

/* ---------- 2-2. 早退闸契约：已立志者不得零代价退出（v1.6.8） ---------- */
{
  const { g, trace } = play('normal', { '0-1': '昼夜研习', '0-3': '随叔父赴府' });
  const lockedOut = trace.every(t => t[0] !== '0-3' || t[1].indexOf('不预兵事') < 0);
  if (lockedOut) { pass++; console.log('✔ 早退闸：学万人敌立志后，0-3「不预兵事」不可选'); }
  else { fail++; console.log('✘ 早退闸失效：立志者仍可选「不预兵事」'); }
}

/* ---------- 3. 苟活线 → E3 执戟余生（咸阳后事了拂衣） ---------- */
{
  const { g, trace } = play('normal', {
    '0-3': '随叔父赴府',
    '1-1': '召故吏豪杰', '1-2': '礼为上宾', '1-3': '立熊心为楚怀王',
    '2-1': '斩宋义', '2-2': '沉船破釜', '2-3': '九战破秦',
    '3-1': '夜击坑之', '3-2': '厉兵秣马', '3-3': '默然纵之',
    '4-1': '事了拂衣'
  });
  expect('苟活线（拂衣）', g.ending, 'E3');
}

/* ---------- 4. 逆天线 → E7 垓下无楚（鸿门杀刘） ---------- */
{
  const { g } = play('normal', {
    '0-1': '观始皇渡浙江', '0-2': '比武立威', '0-3': '随叔父赴府',
    '1-1': '召故吏豪杰', '1-2': '以客卿待之', '1-3': '不立虚名，自号为长',
    '2-1': '斩宋义', '2-2': '沉船破釜', '2-3': '九战破秦',
    '3-1': '收编为军', '3-2': '缓兵三日', '3-3': '举玦为号'
  });
  expect('逆天线（杀刘）', g.ending, 'E7');
}

/* ---------- 5. 稳健线 → E5 霸王之业（不许鸿沟，成皋决胜） ---------- */
{
  const { g } = play('normal', {
    '0-1': '昼夜研习', '0-2': '悉心结交', '0-3': '随叔父赴府',
    '1-1': '召故吏豪杰', '1-2': '礼为上宾', '1-3': '立熊心为楚怀王',
    '2-1': '斩宋义', '2-2': '沉船破釜', '2-3': '九战破秦',
    '3-1': '收编为军', '3-2': '厉兵秣马', '3-3': '默然纵之',
    '4-1': '约法安民', '4-2': '尊义帝以虚名', '4-3': '遣使镇抚',
    '5-1': '乘胜穷追', '5-2': '察其诈', '5-3': '提兵再决胜负'
  });
  expect('稳健线（王业）', g.ending, 'E5');
}

/* ---------- 6. 稳健线 → E4 鸿沟真和（失范增后的成皋决胜） ---------- */
{
  const { g } = play('normal', {
    '0-1': '昼夜研习', '0-2': '悉心结交', '0-3': '随叔父赴府',
    '1-1': '召故吏豪杰', '1-2': '礼为上宾', '1-3': '立熊心为楚怀王',
    '2-1': '斩宋义', '2-2': '沉船破釜', '2-3': '九战破秦',
    '3-1': '收编为军', '3-2': '厉兵秣马', '3-3': '默然纵之',
    '4-1': '约法安民', '4-2': '尊义帝以虚名', '4-3': '遣使镇抚',
    '5-1': '乘胜穷追', '5-2': '捕风捉影', '5-3': '提兵再决胜负'
  });
  expect('稳健线（真和）', g.ending, 'E4');
}

/* ---------- 7. 逆天线 → E6 江东再砺（乌江渡江） ---------- */
{
  const { g } = play('normal', {
    '0-1': '昼夜研习', '0-2': '悉心结交', '0-3': '随叔父赴府',
    '1-1': '召故吏豪杰', '1-2': '礼为上宾', '1-3': '立熊心为楚怀王',
    '2-1': '斩宋义', '2-2': '沉船破釜', '2-3': '九战破秦',
    '3-1': '收编为军', '3-2': '厉兵秣马', '3-3': '默然纵之',
    '4-1': '约法安民', '4-2': '尊义帝以虚名', '4-3': '遣使镇抚',
    '5-1': '乘胜穷追', '5-2': '察其诈', '5-3': '许之，而暗增戒备',
    '6-1': '遣骑四散', '6-2': '弃马步涉', '6-3': '并力一路', '6-4': '渡江再砺'
  });
  expect('逆天线（渡江）', g.ending, 'E6');
}

/* ---------- 8a. 失败线 → E8 安阳之诛（忍而不发） ---------- */
{
  const { g } = play('normal', {
    '0-3': '随叔父赴府',
    '1-1': '召故吏豪杰', '1-2': '礼为上宾', '1-3': '立熊心为楚怀王',
    '2-1': '忍而不发'
  });
  expect('失败线（安阳）', g.ending, 'E8', 'anyang');
}

/* ---------- 8b. 失败线 → E8 固陵之溃（留船半渡巨鹿败） ---------- */
{
  const { g } = play('normal', {
    '0-1': '昼夜研习', '0-2': '悉心结交', '0-3': '随叔父赴府',
    '1-1': '召故吏豪杰', '1-2': '礼为上宾', '1-3': '立熊心为楚怀王',
    '2-1': '斩宋义', '2-2': '留船半渡', '2-3': '九战破秦'
  });
  expect('失败线（固陵）', g.ending, 'E8', 'guling');
}

/* ---------- 8c. 失败线 → E8 阴陵之泽（背泽一战而没） ---------- */
{
  const { g } = play('normal', {
    '0-1': '昼夜研习', '0-2': '比武立威', '0-3': '随叔父赴府',
    '1-1': '纵兵大掠', '1-2': '礼为上宾', '1-3': '立熊心为楚怀王',
    '2-1': '斩宋义', '2-2': '沉船破釜', '2-3': '九战破秦',
    '3-1': '夜击坑之', '3-2': '厉兵秣马', '3-3': '默然纵之',
    '4-1': '收宝货妇女而东', '4-2': '密令英布等杀之江中', '4-3': '陈兵示威',
    '5-1': '乘胜穷追', '5-2': '捕风捉影', '5-3': '许之，引兵东归',
    '6-1': '溃围南出', '6-2': '背泽一战'
  });
  expect('失败线（阴陵）', g.ending, 'E8', 'yinling');
}

/* ---------- 9. N1 异变：偏离≥40 宋义先动手（altSegs + 斩宋义免权势门槛） ---------- */
{
  const g = driveTo('2-1', { '0-1': 2, '0-2': 2, '1-1': 1, '1-2': 2, '1-3': 1 });
  g.dev = 45;
  g.enterChapter(2);
  if (!g.flags.songyiqiang) { fail++; console.log('✘ 宋义先动异变未触发'); }
  else {
    g.beginEvents(); g.playCard(0);
    const ev = g.findEvent('2-1');
    const segs = (ev.altSegs && g.flags[ev.altSegs.flag]) ? ev.altSegs.segs : ev.segs;
    const alt = segs[0].indexOf('宋义没有抬头') >= 0;
    const r = g.choose(0); // 斩宋义：异变 flag 免 quanshi 20 门槛
    g.proceed();
    if (alt && r && g.eventId === '2-2') { pass++; console.log('✔ 宋义先动异变：文本换体，斩宋义改由异变兜底'); }
    else { fail++; console.log('✘ 异变处理异常'); }
  }
}

/* ---------- 10. 修正事件触发（高偏离 + 必中随机） ---------- */
{
  const { trace } = play('normal', {
    '0-1': '观始皇渡浙江', '0-2': '比武立威', '0-3': '随叔父赴府',
    '1-1': '纵兵大掠', '1-2': '以武夫轻之', '1-3': '不立虚名，自号为长',
    '2-1': '引兵绕开宋义', '2-2': '留船半渡', '2-3': '与诸侯合兵同进',
    '3-1': '尽数遣散', '3-2': '缓兵三日', '3-3': '留刘为质',
    '4-1': '约法安民', '4-2': '废为庶人', '4-3': '陈兵示威',
    '5-1': '胜而不穷', '5-2': '捕风捉影', '5-3': '许之，而暗增戒备',
    '6-1': '遣骑四散', '6-2': '背泽一战', '6-3': '并力一路', '6-4': '回身再战'
  }, rngLow);
  const corr = trace.filter(t => t[0] === '修正').length;
  if (corr > 0) { pass++; console.log(`✔ 修正事件触发 ${corr} 次（高偏离线）`); }
  else { fail++; console.log('✘ 高偏离线未触发任何修正事件'); }
}

/* ---------- 11. 词条完整性 + 行动池卫生 + 剧本配置 ---------- */
{
  const s = JSON.stringify(D.CHAPTERS) + JSON.stringify(D.RANDOM_EVENTS) + JSON.stringify(D.CRISIS_EVENTS) + JSON.stringify(D.ACTIONS);
  const marks = [...new Set([...s.matchAll(/⟦(.+?)⟧/g)].map(m => m[1]))];
  const missing = marks.filter(t => !D.GLOSSARY[t]);
  if (missing.length === 0 && Object.keys(D.GLOSSARY).length >= 18) { pass++; console.log('✔ 百科词条：' + marks.length + ' 种标记全部有定义，词条库 ' + Object.keys(D.GLOSSARY).length + ' 条'); }
  else { fail++; console.log('✘ 词条缺定义：' + missing.join('、')); }

  const bad = [];
  D.ACTIONS.forEach(a => {
    const eff = a.eff || {};
    Object.keys(eff.attrs || {}).forEach(k => { if (Math.abs(eff.attrs[k]) > 8) bad.push(a.id + ' ' + k); });
    if (eff.zg && Math.abs(eff.zg) > 5) bad.push(a.id + ' zg');
    if (eff.flags || eff.rmflags || eff.hist || eff.merit) bad.push(a.id + ' 干扰结局树字段');
    if (eff.dev) bad.push(a.id + ' dev');
  });
  const pools = [];
  for (let ci = 0; ci <= 6; ci++) pools.push(D.ACTIONS.filter(a => (a.chapters || [0, 6])[0] <= ci && ci <= (a.chapters || [0, 6])[1]).length);
  if (D.ACTIONS.length === 48 && bad.length === 0 && pools.every(n => n === 12)) { pass++; console.log('✔ 48 个行动数据卫生：单项 ≤±8、zg ≤±5、每章池 12（' + pools.join('/') + '）'); }
  else { fail++; console.log('✘ 行动数据卫生异常：' + (bad.join('；') || '池大小 ' + pools.join('/'))); }

  let badach = [];
  Object.values(D.ENDINGS).forEach(e => {
    (e.ach || []).forEach(a => { if (!D.ACHIEVEMENTS[a]) badach.push(a); });
    Object.values(e.variantAch || {}).flat().forEach(a => { if (!D.ACHIEVEMENTS[a]) badach.push(a); });
  });
  if (badach.length === 0) { pass++; } else { fail++; console.log('✘ 结局成就悬挂引用：' + badach.join('、')); }

  const g = new E.Game(D, 'normal', rngHigh);
  g.start();
  const ok = g.zg === 15 && g.zgWord() === '诸侯畏服';
  g.zg = 55;
  if (ok && g.zgWord() === '叛者四起') { pass++; console.log('✔ 诸侯离心（隐藏值）：初始 15，状态词按档位映射'); }
  else { fail++; console.log('✘ 诸侯离心映射异常'); }
}

/* ---------- 12. 失宠规则按剧本关闭（PERSIST.junxinShichong=false）：项羽君心=天下人望，惩罚由诸侯离心承担 ---------- */
{
  const g = new E.Game(D, 'normal', rngHigh);
  g.randomOn = false; g.start();
  g.attrs.junxin = 10;
  const w1 = g.attrs.weiji;
  g.enterChapter(1);
  const firedAt1 = g.introNotes.some(n => n.indexOf('失宠于上') >= 0);
  g.beginEvents(); g.playCard(0);
  const r0 = g.choose(0);
  const firedInstant = r0.changes.some(c => c.note === '失宠于上');
  // 人望崩坏的惩罚经由 zg 呈现（坑降+10 / 弑义帝+15 已埋点，见 test 1 史实线）
  const g2 = driveTo('4-2', {});
  const z0 = g2.zg;
  g2.choose(1); // 密令英布等杀之江中 → zg+15
  if (!firedAt1 && !firedInstant && g.attrs.weiji === w1 && g2.zg === z0 + 15) { pass++; console.log('✔ 失宠规则按剧本关闭：君心触底不失宠，惩罚由诸侯离心承担'); }
  else { fail++; console.log('✘ 失宠关闭口径异常：at1=' + firedAt1 + ' instant=' + firedInstant + ' weiji=' + g.attrs.weiji + ' zg=' + z0 + '→' + g2.zg); }
}

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail > 0 ? 1 : 0);
