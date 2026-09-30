/* 陈胜剧本《首义之局》自动化剧本验证。运行：node test-chensheng.js
 * 结构口径与其他套件一致。 */
const D = require('./chensheng-data.js');
const E = require('./engine.js');

const rngHigh = () => 0.99;
const rngLow = () => 0.01;

function play(diffKey, script, rng, endScript, hook, streams) {
  const g = new E.Game(D, diffKey, rng || rngHigh, streams);
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
  const g = new E.Game(D, 'normal', rngHigh);
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

/* ---------- 1. 史实线 → E1 下城父之变 ---------- */
{
  const { g } = play('normal', {
    '0-1': '笑而不辩', '0-2': '接籍为屯长', '0-3': '与吴广深谈',
    '1-1': '定计：诈称扶苏', '1-2': '因势利导', '1-3': '袒右称大楚',
    '2-1': '严立军纪', '2-2': '立斩葛婴', '2-3': '入据陈，开仓抚民',
    '3-1': '自立为王', '3-2': '四路并出',
    '4-1': '听其自战', '4-2': '信用如故',
    '5-1': '不问，坐观成败', '5-2': '听之任之',
    '6-1': '弃陈南走', '6-2': '不疑，仍使驾车'
  });
  expect('史实线', g.ending, 'E1');
  if (g.dev <= 45) { pass++; } else { fail++; console.log('✘ 史实线偏离应≤45，实际 ' + g.dev); }
  const need = ['honghu', 'fusu', 'yushu', 'jiegan', 'tanyou', 'zhangchu', 'shouyi', 'xiachufu'];
  const miss = need.filter(a => !has(g, a));
  if (miss.length === 0) { pass++; console.log('✔ 史实线成就 8 枚全部解锁'); }
  else { fail++; console.log('✘ 史实线缺成就：' + miss.join('、')); }
  if (g.ending.review.length === 5) { pass++; console.log('✔ 复盘 5 条（杀尉/称王/叩关/荥阳/下城父）'); }
  else { fail++; console.log('✘ 复盘应为 5 条，实际 ' + g.ending.review.length); }
}

/* ---------- 2a. 苟活线 → E2 陇上归耕（连夜亡去） ----------
 * v1.6.8：0-2「连夜亡去」加 notflag honghu 早退闸（对齐 lisi 0-3-B 模式）——
 * 已「笑而不辩」在胸中者不再收零代价退出。故此线须先在 0-1 走「恼而掷锄」。 */
{
  const { g } = play('normal', { '0-1': '恼而掷锄', '0-2': '连夜亡去' });
  expect('苟活线（亡去）', g.ending, 'E2');
}

/* ---------- 2a-2. 早退闸契约：已蓄志者不得零代价退出（v1.6.8） ---------- */
{
  const { g, trace } = play('normal', { '0-1': '笑而不辩', '0-2': '接籍为屯长' });
  const lockedOut = trace.every(t => t[0] !== '0-2' || t[1].indexOf('连夜亡去') < 0);
  if (lockedOut) { pass++; console.log('✔ 早退闸：笑而不辩蓄志后，0-2「连夜亡去」不可选'); }
  else { fail++; console.log('✘ 早退闸失效：蓄志者仍可选「连夜亡去」'); }
}

/* ---------- 2b. 苟活线 → E2（失期散伙） ---------- */
{
  const { g } = play('normal', { '0-2': '接籍为屯长', '1-1': '散了吧' });
  expect('苟活线（散伙）', g.ending, 'E2');
}

/* ---------- 3. 苟活线 → E3 陈县富户（下城父弃车易服） ---------- */
{
  const { g } = play('normal', {
    '0-1': '笑而不辩', '0-2': '接籍为屯长', '0-3': '与吴广深谈',
    '1-1': '定计：诈称扶苏', '1-2': '因势利导', '1-3': '袒右称大楚',
    '2-1': '严立军纪', '2-2': '责而赦之', '2-3': '入据陈，开仓抚民',
    '3-1': '自立为王', '3-2': '四路并出',
    '4-1': '听其自战', '4-2': '信用如故',
    '5-1': '不问，坐观成败', '5-2': '听之任之',
    '6-1': '弃陈南走', '6-2': '弃车易服'
  });
  expect('苟活线（富户）', g.ending, 'E3');
}

/* ---------- 4. 稳健线 → E4 张楚中兴（保吴广走到底） ---------- */
{
  const { g } = play('normal', {
    '0-1': '笑而不辩', '0-2': '接籍为屯长', '0-3': '与吴广深谈',
    '1-1': '定计：诈称扶苏', '1-2': '因势利导', '1-3': '袒右称大楚',
    '2-1': '严立军纪', '2-2': '责而赦之', '2-3': '入据陈，开仓抚民',
    '3-1': '自立为王', '3-2': '缓图之',
    '4-1': '令周文持重', '4-2': '黜朱房胡武',
    '5-1': '亲赴荥阳', '5-2': '立诛田臧',
    '6-1': '弃陈南走', '6-2': '察其异，先收其刃', '6-3': '南下合流'
  });
  expect('稳健线（中兴）', g.ending, 'E4');
  if (has(g, 'zhongxing')) { pass++; console.log('✔ 结局成就解锁：张楚中兴'); }
  else { fail++; console.log('✘ E4 线应解锁成就 zhongxing'); }
}

/* ---------- 5. 稳健线 → E5 王而不王（三让王号，保守善终） ---------- */
{
  const { g } = play('normal', {
    '0-1': '笑而不辩', '0-2': '接籍为屯长', '0-3': '与吴广深谈',
    '1-1': '定计：诈称扶苏', '1-2': '因势利导', '1-3': '袒右称大楚',
    '2-1': '严立军纪', '2-2': '责而赦之', '2-3': '入据陈，开仓抚民',
    '3-1': '三让王号', '3-2': '四路并出',
    '4-1': '令周文持重', '4-2': '黜朱房胡武',
    '5-1': '亲赴荥阳', '5-2': '立诛田臧',
    '6-1': '弃陈南走', '6-2': '察其异，先收其刃', '6-3': '南下合流'
  });
  expect('稳健线（不王）', g.ending, 'E5');
  if (has(g, 'buwang')) { pass++; console.log('✔ 结局成就解锁：王而不王'); }
  else { fail++; console.log('✘ E5 线应解锁成就 buwang'); }
}

/* ---------- 6. 逆天线 → E6 直捣咸阳（发援兵并力西进） ---------- */
{
  // 权势（60）与才学（55）缺口由操练/读书经营补足——hook 模拟该结果
  const { g } = play('normal', {
    '0-1': '恼而掷锄', '0-2': '接籍为屯长', '0-3': '与吴广深谈',
    '1-1': '再等等，雨停再议', '1-2': '因势利导', '1-3': '袒右称大楚',
    '2-1': '严立军纪', '2-2': '纵其自守', '2-3': '入据陈，开仓抚民',
    '3-1': '三让王号', '3-2': '四路并出',
    '4-1': '发援兵并力西进'
  }, rngHigh, null, g => { if (g.eventId === '4-1') { g.attrs.quanshi = Math.max(g.attrs.quanshi, 62); g.attrs.caixue = Math.max(g.attrs.caixue, 56); } });
  expect('逆天线（咸阳）', g.ending, 'E6');
}

/* ---------- 7. 逆天线 → E7 诸侯之长（不王 + 联盟 + 达标） ---------- */
{
  const { g } = play('normal', {
    '0-1': '笑而不辩', '0-2': '接籍为屯长', '0-3': '与吴广深谈',
    '1-1': '定计：诈称扶苏', '1-2': '因势利导', '1-3': '袒右称大楚',
    '2-1': '严立军纪', '2-2': '责而赦之', '2-3': '入据陈，开仓抚民',
    '3-1': '三让王号', '3-2': '约诸侯并力',
    '4-1': '令周文持重', '4-2': '黜朱房胡武',
    '5-1': '亲赴荥阳', '5-2': '立诛田臧',
    '6-1': '弃陈南走', '6-2': '察其异，先收其刃', '6-3': '南下合流'
  }, rngHigh, null, null, { corr: rngHigh }); // 修正改走 corr 流：注入 0.99 保持原口径（概率档不触发、必选档取池末项），维持盟主线达标
  expect('逆天线（盟主）', g.ending, 'E7');
}

/* ---------- 8a. 失败线 → E8 大泽之雨（杀尉而散） ---------- */
{
  const { g } = play('normal', { '0-2': '接籍为屯长', '1-1': '定计：诈称扶苏', '1-2': '因势利导', '1-3': '杀尉而散' });
  expect('失败线（散）', g.ending, 'E8', 'daze');
}

/* ---------- 8b. 失败线 → E8 大泽之雨（盟誓无人应） ---------- */
{
  const { g } = play('normal', {
    '0-1': '恼而掷锄', '0-2': '称病求免', '0-3': '只带队，不多言',
    '1-1': '再等等，雨停再议', '1-2': '不用机巧，直告利害', '1-3': '袒右称大楚'
  });
  expect('失败线（无应）', g.ending, 'E8', 'daze');
}

/* ---------- 8c. 失败线 → E8 戏亭之溃（死战不退） ---------- */
{
  const { g } = play('normal', {
    '0-1': '笑而不辩', '0-2': '接籍为屯长', '0-3': '与吴广深谈',
    '1-1': '定计：诈称扶苏', '1-2': '因势利导', '1-3': '袒右称大楚',
    '2-1': '严立军纪', '2-2': '责而赦之', '2-3': '入据陈，开仓抚民',
    '3-1': '自立为王', '3-2': '四路并出',
    '4-1': '发援兵并力西进', '4-1b': '死战不退'
  });
  expect('失败线（戏亭）', g.ending, 'E8', 'xiting');
}

/* ---------- 8d. 失败线 → E8 荥阳之帐（分田臧兵，亲征反噬） ---------- */
{
  const { g, trace } = play('normal', {
    '0-1': '笑而不辩', '0-2': '接籍为屯长', '0-3': '与吴广深谈',
    '1-1': '定计：诈称扶苏', '1-2': '因势利导', '1-3': '袒右称大楚',
    '2-1': '严立军纪', '2-2': '责而赦之', '2-3': '入据陈，开仓抚民',
    '3-1': '自立为王', '3-2': '四路并出',
    '4-1': '听其自战', '4-2': '信用如故',
    '5-1': '亲赴荥阳', '5-2': '分田臧兵', '5-2b': '亲征田臧'
  });
  expect('失败线（荥阳）', g.ending, 'E8', 'yingyang');
  if (trace.some(t => t[0] === '5-2b')) { pass++; console.log('✔ 田臧反噬线到达 5-2b'); }
  else { fail++; console.log('✘ 未进入 5-2b'); }
}

/* ---------- 9. N1/N2 异变触发（众心 / 宽察 / 章邯提前） ---------- */
{
  const g1 = new E.Game(D, 'normal', rngHigh);
  g1.randomOn = false; g1.start();
  g1.attrs.junxin = 50;
  g1.enterChapter(1);
  if (g1.flags.zhongxin && g1.introNotes.some(n => n.indexOf('人心') >= 0)) { pass++; console.log('✔ N1 异变：君心≥45 众心可用'); }
  else { fail++; console.log('✘ N1 异变未触发'); }
  const g2 = new E.Game(D, 'normal', rngHigh);
  g2.randomOn = false; g2.start();
  g2.dev = 45;
  g2.enterChapter(4);
  if (g2.flags.zhanghan && g2.introNotes.some(n => n.indexOf('章邯') >= 0)) { pass++; console.log('✔ N2 异变：偏离≥40 章邯提前'); }
  else { fail++; console.log('✘ N2 异变未触发'); }
}

/* ---------- 10. 修正事件触发（高偏离 + 必中随机） ---------- */
{
  const { trace } = play('normal', {
    '0-1': '恼而掷锄', '0-2': '接籍为屯长', '0-3': '与吴广深谈',
    '1-1': '定计：诈称扶苏', '1-2': '不用机巧，直告利害', '1-3': '袒右称大楚',
    '2-1': '从民所欲', '2-2': '纵其自守', '2-3': '纵兵三日',
    '3-1': '暂缓王号', '3-2': '缓图之',
    '4-1': '令周文持重', '4-2': '留其名，收其权',
    '5-1': '以王命切责田臧', '5-2': '分田臧兵', '5-2b': '亲征田臧'
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
  const ok = g.zg === 15 && g.zgWord() === '众心如一';
  g.zg = 55;
  if (ok && g.zgWord() === '各怀异心') { pass++; console.log('✔ 诸将离心（隐藏值）：初始 15，状态词按档位映射'); }
  else { fail++; console.log('✘ 诸将离心映射异常'); }
}

/* ---------- 12. 失宠结算称王后方生效（PERSIST.junxinFrom=3） ---------- */
{
  const g = new E.Game(D, 'normal', rngHigh);
  g.randomOn = false; g.start();
  g.attrs.junxin = 10;
  g.enterChapter(2);
  const firedAt2 = g.introNotes.some(n => n.indexOf('失宠于上') >= 0);
  const w1 = g.attrs.weiji;
  g.enterChapter(3);
  const firedAt3 = g.introNotes.some(n => n.indexOf('失宠于上') >= 0);
  if (!firedAt2 && firedAt3 && g.attrs.weiji === w1 + 10) { pass++; console.log('✔ 失宠结算：称王前不触发，立政权后正常生效'); }
  else { fail++; console.log('✘ 失宠生效口径异常：at2=' + firedAt2 + ' at3=' + firedAt3 + ' weiji=' + g.attrs.weiji); }
}

/* ---------- 13. 险招定制失败：5-2 立诛田臧 effFail/resFail（GDD 附录 J） ---------- */
{
  // 险招骰改走 risk 流：常量骰经 streams.risk 注入（0.8 → roll 81）
  const g = new E.Game(D, 'normal', () => 0.8, { risk: () => 0.8 });
  g.randomOn = false; g.start(); g.enterChapter(5); g.eventId = '5-2';
  g.flags.wuguang = true; g.attrs.junxin = 40; // 需 50，差 10 → 30%
  g.beginRounds(); g.playCard(0);
  const opts = g.getOptions();
  const r = g.choose(1); // roll = floor(0.8*100)+1 = 81 ＞ 30 → 失败
  if (opts[1].risky && opts[1].risky.rate === 30 && r && r.failed === true
    && r.text.indexOf('没能走出田臧') >= 0
    && r.changes.some(c => c.k === 'weiji' && c.delta === 8) && r.changes.some(c => c.k === 'junxin' && c.delta === -3)
    && g.phase === 'event' && g.getOptions()[1].locked === true) {
    pass++; console.log('✔ 险招定制失败：立诛田臧 roll 81 ＞ 30，resFail/effFail（危机+8 君心-3）生效，选项烧毁');
  } else { fail++; console.log('✘ 定制险招异常：' + JSON.stringify({ rate: opts[1].risky && opts[1].risky.rate, failed: r && r.failed, phase: g.phase })); }
}

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail > 0 ? 1 : 0);
