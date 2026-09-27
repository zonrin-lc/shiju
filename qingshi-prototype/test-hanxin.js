/* 韩信剧本《兵仙之局》自动化剧本验证。运行：node test-hanxin.js
 * 结构口径与 test-sim.js / test-jingke.js 一致。 */
const D = require('./hanxin-data.js');
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

/* ---------- 1. 史实线 → E1 钟室之斩 ---------- */
{
  const { g, trace } = play('normal', {
    '0-1': '立誓', '0-2': '俯身', '0-3': '杖剑从戎',
    '1-1': '陷阵先登', '1-2': '数数献策', '1-3': '亡楚归汉',
    '2-1': '上不欲就天下乎', '2-2': '整肃仓廪', '2-3': '尽陈兵略', '2-4': '归而受命', '2-5': '汉中对',
    '3-1': '举兵东出', '3-2': '收拢溃兵', '3-3': '木罂缶渡河',
    '4-1': '背水一战', '4-2': '师事之', '4-3': '半渡而击',
    '5-1': '静候汉王处分', '5-2': '独当一面', '5-3': '汉王遇我厚',
    '6-1': '报德雪怨并施', '6-2': '收而庇之', '6-3': '持钟离眜首级往谒', '6-4': '勉其反', '6-5': '入贺'
  });
  expect('史实线', g.ending, 'E1');
  if (g.dev <= 45) { pass++; } else { fail++; console.log('✘ 史实线偏离应≤45，实际 ' + g.dev); }
  const need = ['kuaxia', 'piaomu', 'xiaohe', 'dengtan', 'chencang', 'beishui', 'zuoche', 'longju', 'qiwang', 'zhongshi'];
  const miss = need.filter(a => !has(g, a));
  if (miss.length === 0) { pass++; console.log('✔ 史实线成就 10 枚全部解锁'); }
  else { fail++; console.log('✘ 史实线缺成就：' + miss.join('、')); }
  if (g.ending.review.length === 5) { pass++; console.log('✔ 复盘 5 条（登坛/背水/请封/蒯通/陈豨）'); }
  else { fail++; console.log('✘ 复盘应为 5 条，实际 ' + g.ending.review.length); }
}

/* ---------- 2a. 苟活线 → E2 漂母之钓（不投军） ---------- */
{
  const { g } = play('normal', { '0-3': '守钓不问世事' });
  expect('苟活线（守钓）', g.ending, 'E2');
}

/* ---------- 2b. 苟活线 → E2（萧何月下二连执意要走） ---------- */
{
  const { g } = play('normal', {
    '0-3': '杖剑从戎', '1-3': '亡楚归汉',
    '2-1': '上不欲就天下乎', '2-2': '整肃仓廪', '2-3': '尽陈兵略', '2-4': '执意要走'
  });
  expect('苟活线（终走）', g.ending, 'E2');
}

/* ---------- 3. 苟活线 → E3 楚营郎中（留楚不去） ---------- */
{
  const { g } = play('normal', { '0-3': '杖剑从戎', '1-3': '留楚不去' });
  expect('苟活线（留楚）', g.ending, 'E3');
}

/* ---------- 4. 逆天线 → E6 三分之局（听蒯通） ---------- */
{
  // 权势缺口（路线 66/70）由行动卡演兵/整训补足——hook 模拟该经营结果
  const { g } = play('normal', {
    '0-1': '受饭，默然铭记', '0-2': '俯身', '0-3': '杖剑从戎',
    '1-1': '陷阵先登', '1-2': '闭口不言', '1-3': '亡楚归汉',
    '2-1': '上不欲就天下乎', '2-2': '整肃仓廪', '2-3': '尽陈兵略', '2-4': '归而受命', '2-5': '汉中对',
    '3-1': '举兵东出', '3-2': '趁乱扩军', '3-3': '木罂缶渡河',
    '4-1': '背水一战', '4-2': '释而归之', '4-3': '半渡而击',
    '5-1': '静候汉王处分', '5-2': '让首功于诸将', '5-3': '听蒯通'
  }, rngHigh, null, g => { if (g.eventId === '5-3') g.attrs.quanshi = Math.max(g.attrs.quanshi, 72); });
  expect('逆天线（三分）', g.ending, 'E6');
}

/* ---------- 5. 逆天线 → E7 易帜之夏（阳从阴蓄 + 陈豨内应） ---------- */
{
  // 才学（65）与权势（75）缺口由读书与演兵经营补足——hook 模拟该结果
  const { g } = play('normal', {
    '0-1': '受饭，默然铭记', '0-2': '俯身', '0-3': '杖剑从戎',
    '1-1': '陷阵先登', '1-2': '闭口不言', '1-3': '亡楚归汉',
    '2-1': '上不欲就天下乎', '2-2': '整肃仓廪', '2-3': '尽陈兵略', '2-4': '归而受命', '2-5': '汉中对',
    '3-1': '举兵东出', '3-2': '趁乱扩军', '3-3': '木罂缶渡河',
    '4-1': '背水一战', '4-2': '释而归之', '4-3': '半渡而击',
    '5-1': '静候汉王处分', '5-2': '独当一面', '5-3': '阳从阴蓄',
    '6-4': '勉其反'
  }, rngHigh, null, g => {
    if (g.eventId === '5-3') { g.attrs.caixue = Math.max(g.attrs.caixue, 66); g.attrs.quanshi = Math.max(g.attrs.quanshi, 72); }
    if (g.eventId === '6-4') g.attrs.quanshi = Math.max(g.attrs.quanshi, 76);
  });
  expect('逆天线（易帜）', g.ending, 'E7');
}

/* ---------- 6. 稳健线 → E5 学道全身（请解兵权） ---------- */
{
  const { g } = play('normal', {
    '0-1': '立誓', '0-2': '俯身', '0-3': '杖剑从戎',
    '1-1': '陷阵先登', '1-2': '数数献策', '1-3': '亡楚归汉',
    '2-1': '上不欲就天下乎', '2-2': '整肃仓廪', '2-3': '尽陈兵略', '2-4': '归而受命', '2-5': '汉中对',
    '3-1': '举兵东出', '3-2': '收拢溃兵', '3-3': '木罂缶渡河',
    '4-1': '背水一战', '4-2': '师事之', '4-3': '半渡而击',
    '5-1': '静候汉王处分', '5-2': '独当一面', '5-3': '请解兵权归老'
  });
  expect('稳健线（学道）', g.ending, 'E5');
  if (has(g, 'xuedao')) { pass++; console.log('✔ 结局成就解锁：学道全身'); }
  else { fail++; console.log('✘ E5 线应解锁成就 xuedao'); }
}

/* ---------- 7. 稳健线 → E4 王于齐土（三分不成退而自固） ---------- */
{
  // 同 E6 路线但不经营权势（66<70）→ 三分判定失败 → E4
  const { g } = play('normal', {
    '0-1': '受饭，默然铭记', '0-2': '俯身', '0-3': '杖剑从戎',
    '1-1': '陷阵先登', '1-2': '闭口不言', '1-3': '亡楚归汉',
    '2-1': '上不欲就天下乎', '2-2': '整肃仓廪', '2-3': '尽陈兵略', '2-4': '归而受命', '2-5': '汉中对',
    '3-1': '举兵东出', '3-2': '趁乱扩军', '3-3': '木罂缶渡河',
    '4-1': '背水一战', '4-2': '释而归之', '4-3': '半渡而击',
    '5-1': '静候汉王处分', '5-2': '让首功于诸将', '5-3': '听蒯通'
  });
  expect('稳健线（齐土）', g.ending, 'E4');
}

/* ---------- 8a. 失败线 → E8 云梦之缚（发兵拒捕） ---------- */
{
  const { g } = play('normal', {
    '0-1': '立誓', '0-2': '俯身', '0-3': '杖剑从戎',
    '1-1': '陷阵先登', '1-2': '数数献策', '1-3': '亡楚归汉',
    '2-1': '上不欲就天下乎', '2-2': '整肃仓廪', '2-3': '尽陈兵略', '2-4': '归而受命', '2-5': '汉中对',
    '3-1': '举兵东出', '3-2': '收拢溃兵', '3-3': '木罂缶渡河',
    '4-1': '背水一战', '4-2': '师事之', '4-3': '半渡而击',
    '5-1': '静候汉王处分', '5-2': '独当一面', '5-3': '汉王遇我厚',
    '6-1': '报德雪怨并施', '6-2': '收而庇之', '6-3': '发兵拒捕'
  });
  expect('失败线（拒捕）', g.ending, 'E8', 'yunmeng');
}

/* ---------- 8b. 失败线 → E8 云梦之缚（疑心≥70 往谒被擒） ---------- */
{
  const { g } = play('normal', {
    '0-1': '立誓', '0-2': '俯身', '0-3': '杖剑从戎',
    '1-1': '陷阵先登', '1-2': '数数献策', '1-3': '亡楚归汉',
    '2-1': '上不欲就天下乎', '2-2': '整肃仓廪', '2-3': '尽陈兵略', '2-4': '归而受命', '2-5': '汉中对',
    '3-1': '举兵东出', '3-2': '趁乱扩军', '3-3': '木罂缶渡河',
    '4-1': '背水一战', '4-2': '师事之', '4-3': '半渡而击',
    '5-1': '再遣使催封', '5-2': '独当一面', '5-3': '汉王遇我厚',
    '6-1': '报德雪怨并施', '6-2': '收而庇之', '6-3': '持钟离眜首级往谒'
  }, rngHigh, null, g => { if (g.eventId === '6-3') g.zg = Math.max(g.zg, 70); }); // 疑心累积（催封+扩军+修正共同作用）——hook 收口
  expect('失败线（往谒）', g.ending, 'E8', 'yunmeng');
}

/* ---------- 8c. 失败线 → E8 谋泄之诛（xuli 反迹败露） ---------- */
{
  const { g } = play('normal', {
    '0-1': '立誓', '0-2': '俯身', '0-3': '杖剑从戎',
    '1-1': '陷阵先登', '1-2': '数数献策', '1-3': '亡楚归汉',
    '2-1': '上不欲就天下乎', '2-2': '整肃仓廪', '2-3': '尽陈兵略', '2-4': '归而受命', '2-5': '汉中对',
    '3-1': '举兵东出', '3-2': '收拢溃兵', '3-3': '木罂缶渡河',
    '4-1': '背水一战', '4-2': '师事之', '4-3': '半渡而击',
    '5-1': '静候汉王处分', '5-2': '独当一面', '5-3': '阳从阴蓄',
    '6-4': '勉其反', '6-5': '入贺'
  }, rngHigh, null, g => { if (g.eventId === '5-3') g.attrs.caixue = Math.max(g.attrs.caixue, 66); });
  expect('失败线（谋泄）', g.ending, 'E8', 'mouxie');
}

/* ---------- 8d. 失败线 → E8 潍水覆军（才学不足连番失利，单骑而逃） ---------- */
{
  const { g, trace } = play('normal', {
    '0-1': '不食', '0-2': '拔剑而起', '0-3': '杖剑从戎',
    '1-1': '陷阵先登', '1-2': '当众争锋', '1-3': '亡楚归汉',
    '2-1': '上不欲就天下乎', '2-2': '敷衍度日', '2-3': '以退为进', '2-4': '归而受命', '2-5': '答以守成之策',
    '3-1': '举兵东出', '3-1b': '血战拔城', '3-2': '收拢溃兵', '3-3': '正面强攻',
    '4-1': '背水一战', '4-1b': '单骑而逃'
  });
  expect('失败线（覆军）', g.ending, 'E8', 'weishui');
  if (trace.some(t => t[0] === '3-1b') && trace.some(t => t[0] === '4-1b')) { pass++; console.log('✔ 战役判定数组：才学不足连入兜底线（陈仓苦战→背水覆军）'); }
  else { fail++; console.log('✘ 兜底线流转异常'); }
}

/* ---------- 9. N1/N2 异变触发（声望≥45 萧何先闻 / 偏离≥46 李左车策被用） ---------- */
{
  const g1 = new E.Game(D, 'normal', rngHigh);
  g1.randomOn = false; g1.start();
  g1.attrs.shengwang = 50;
  g1.enterChapter(2);
  if (g1.flags.hexianwen && g1.introNotes.some(n => n.indexOf('萧何') >= 0)) { pass++; console.log('✔ N1 异变：声望≥45 萧何先闻'); }
  else { fail++; console.log('✘ N1 异变未触发'); }
  const g2 = new E.Game(D, 'normal', rngHigh);
  g2.randomOn = false; g2.start();
  g2.dev = 50;
  g2.enterChapter(4);
  if (g2.flags.zuochece && g2.introNotes.some(n => n.indexOf('李左车') >= 0)) { pass++; console.log('✔ N2 异变：偏离≥46 陈馀听李左车策'); }
  else { fail++; console.log('✘ N2 异变未触发'); }
}

/* ---------- 10. 修正事件触发（高偏离 + 必中随机） ---------- */
{
  const { trace } = play('normal', {
    '0-1': '不食', '0-2': '拔剑而起', '0-3': '杖剑从戎',
    '1-1': '陷阵先登', '1-2': '当众争锋', '1-3': '亡楚归汉',
    '2-1': '上不欲就天下乎', '2-2': '敷衍度日', '2-3': '以退为进', '2-4': '归而受命', '2-5': '答以守成之策',
    '3-1': '兵分两路', '3-2': '趁乱扩军', '3-3': '正面强攻',
    '4-1': '据险缓图', '4-2': '斩之示众', '4-3': '深沟高垒',
    '5-1': '再遣使催封', '5-2': '让首功于诸将', '5-3': '听蒯通'
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
  const ok = g.zg === 15 && g.zgWord() === '尚无猜忌';
  g.zg = 55;
  if (ok && g.zgWord() === '猜忌日深') { pass++; console.log('✔ 刘邦疑心（隐藏值）：初始 15，状态词按档位映射'); }
  else { fail++; console.log('✘ 刘邦疑心映射异常'); }
}

/* ---------- 12. 失宠结算归汉后方生效（PERSIST.junxinFrom=2） ---------- */
{
  const g = new E.Game(D, 'normal', rngHigh);
  g.randomOn = false; g.start();
  const firedEarly = g.introNotes.some(n => n.indexOf('失宠于上') >= 0);
  g.beginEvents(); g.playCard(0);
  const r0 = g.choose(0);
  const firedInstant = r0.changes.some(c => c.note === '失宠于上');
  g.attrs.junxin = 10;
  const w1 = g.attrs.weiji;
  g.enterChapter(2);
  const firedAt2 = g.introNotes.some(n => n.indexOf('失宠于上') >= 0);
  if (!firedEarly && !firedInstant && firedAt2 && g.attrs.weiji === w1 + 10) { pass++; console.log('✔ 失宠结算：序章/一章不触发（未识≠失宠），归汉后正常生效'); }
  else { fail++; console.log('✘ 失宠生效口径异常：early=' + firedEarly + ' instant=' + firedInstant + ' at2=' + firedAt2 + ' weiji=' + g.attrs.weiji); }
}

/* ---------- 13. 破魏之役不再死循环：才学不足 → 3-3b 再渡（单次兜底下落） ---------- */
{
  const g = new E.Game(D, 'normal', rngHigh);
  g.randomOn = false; g.start(); g.enterChapter(3); g.eventId = '3-3';
  g.attrs.caixue = 40; // < 55，木罂缶首战不成
  g.beginRounds(); g.playCard(0);
  g.choose(0); g.proceed();
  const at33b = g.eventId === '3-3b';
  g.playCard(0); g.choose(0); g.proceed(); // 二次渡河 → 章末结算（3-3b 为本章末事件）
  const advanced = g.phase === 'summary' || g.phase === 'endEvent';
  if (at33b && advanced) {
    pass++; console.log('✔ 破魏之役：才学不足落 3-3b 再渡，二次渡河后入章末结算（无自指死循环）');
  } else { fail++; console.log('✘ 3-3b 兜底异常：' + g.eventId + ' ' + g.phase); }
}

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail > 0 ? 1 : 0);
