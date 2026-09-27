/* 荆轲剧本《易水寒》自动化剧本验证：脚本化选择驱动引擎，断言各路线收束到正确结局。
 * 运行：node test-jingke.js
 * 结构口径与 test-sim.js（李斯本）一致：固定 rng、随机际遇关闭单独测、trace 记录。
 */
const D = require('./jingke-data.js');
const E = require('./engine.js');

const rngHigh = () => 0.99;
const rngLow = () => 0.01;

function play(diffKey, script, rng, endScript, hook) {
  const g = new E.Game(D, diffKey, rng || rngHigh);
  g.randomOn = false;
  g.start();
  let guard = 0;
  const trace = [];
  while (g.phase !== 'ending' && guard++ < 400) {
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
  while (guard++ < 200) {
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

/* ---------- 1. 史实线 → E1 图穷匕见 ---------- */
{
  const { g, trace } = play('normal', {
    '0-1': '还以眼色', '0-2': '拂袖而去', '0-3': '西入燕',
    '1-1': '放歌相和', '1-2': '与论天下大势', '1-3': '静观时局',
    '2-1': '受遗命', '2-2': '许之', '2-3': '即刻治装',
    '3-1': '陈说利害', '3-2': '取真图', '3-3': '购徐夫人匕', '3-4': '以秦舞阳为副',
    '4-1': '和歌而去', '4-2': '细察秦廷关节',
    '5-1': '千金买通', '5-2': '如常进殿', '5-3': '笑而谢曰', '5-4': '揕其胸',
    '5-5': '倚柱而笑'
  });
  expect('史实线', g.ending, 'E1');
  if (g.dev <= 45) { pass++; } else { fail++; console.log('✘ 史实线偏离应≤45，实际 ' + g.dev); }
  const need = ['lunjian', 'gaoge', 'tianguang', 'fanshou', 'yishui', 'tuxiong', 'yaonang'];
  const miss = need.filter(a => !has(g, a));
  if (miss.length === 0) { pass++; console.log('✔ 史实线成就 7 枚全部解锁'); }
  else { fail++; console.log('✘ 史实线缺成就：' + miss.join('、')); }
  if (g.ending.review.length === 5) { pass++; } else { fail++; console.log('✘ 复盘应为 5 条，实际 ' + g.ending.review.length); }
}

/* ---------- 2a. 苟活线 → E2 邯郸棋客（不赴燕） ---------- */
{
  const { g } = play('normal', { '0-3': '算了' });
  expect('苟活线（棋客）', g.ending, 'E2', 'jiuke');
}

/* ---------- 2b. 苟活线 → E2（二连固辞） ---------- */
{
  const { g } = play('normal', { '0-3': '西入燕', '1-3': '静观时局', '2-2': '固辞' });
  expect('苟活线（固辞）', g.ending, 'E2');
  if (has(g, 'weihan')) { pass++; console.log('✔ 结局成就解锁：易水未寒'); }
  else { fail++; console.log('✘ E2 线应解锁成就 weihan'); }
}

/* ---------- 2c. 苟活线 → E2（易水弃行，需 flag 去意） ---------- */
{
  const { g, trace } = play('normal', {
    '0-1': '还以眼色', '0-2': '拂袖而去', '0-3': '西入燕',
    '1-1': '放歌相和', '1-2': '与论天下大势', '1-3': '早做去留之计',
    '2-1': '受遗命', '2-2': '许之', '2-3': '即刻治装',
    '3-1': '陈说利害', '3-2': '取真图', '3-3': '购徐夫人匕', '3-4': '以秦舞阳为副',
    '4-1': '弃行'
  });
  expect('苟活线（弃行）', g.ending, 'E2');
  if (trace.some(t => t[0] === '4-1' && t[1].indexOf('弃行') >= 0)) { pass++; console.log('✔ flag【去意】解锁 4-1-D 弃行'); }
  else { fail++; console.log('✘ 弃行选项未出现'); }
}
{
  // 对照：无去意时 4-1-D 锁定
  const g = driveTo('4-1', { '0-3': 0, '1-3': 0 });
  const d = g.getOptions().find(o => o.opt.t.indexOf('弃行') >= 0);
  if (d && d.locked) { pass++; console.log('✔ 无 flag 时弃行锁定（需 1-3-C 去意）'); }
  else { fail++; console.log('✘ 弃行锁定态异常'); }
}

/* ---------- 3. 苟活线 → E3 不辱使节（伏阙称臣） ---------- */
{
  const { g } = play('normal', {
    '0-1': '还以眼色', '0-2': '拂袖而去', '0-3': '西入燕',
    '1-1': '放歌相和', '1-2': '与论天下大势', '1-3': '静观时局',
    '2-1': '受遗命', '2-2': '许之', '2-3': '即刻治装',
    '3-1': '陈说利害', '3-2': '取真图', '3-3': '购徐夫人匕', '3-4': '以秦舞阳为副',
    '4-1': '和歌而去', '4-2': '细察秦廷关节',
    '5-1': '千金买通', '5-2': '伏阙称臣'
  });
  expect('苟活线（使节）', g.ending, 'E3');
}

/* ---------- 4. 稳健线 → E4 曹沫之约（生劫立约） ---------- */
{
  const { g } = play('normal', {
    '0-1': '还以眼色', '0-2': '长揖谢罪', '0-3': '西入燕',
    '1-1': '放歌相和', '1-2': '高谈阔论', '1-3': '投刺求见',
    '2-1': '受遗命', '2-2': '许之', '2-3': '即刻治装',
    '3-1': '陈说利害', '3-2': '取真图', '3-3': '购徐夫人匕', '3-4': '以秦舞阳为副',
    '4-1': '和歌而去', '4-2': '细察秦廷关节',
    '5-1': '以名自荐', '5-2': '如常进殿', '5-3': '笑而谢曰', '5-4': '把袖不刺'
  }, rngHigh, null, g => { if (g.eventId === '5-1') g.attrs.shengwang = Math.max(g.attrs.shengwang, 58); if (g.eventId === '5-3') g.attrs.caixue = Math.max(g.attrs.caixue, 55); }); // 声望/才学缺口由宴饮与读书经营补足——hook 模拟该结果
  expect('稳健线（曹沫）', g.ending, 'E4');
  if (has(g, 'caomo')) { pass++; console.log('✔ 结局成就解锁：曹沫再生'); }
  else { fail++; console.log('✘ E4 线应解锁成就 caomo'); }
}

/* ---------- 5. 稳健线 → E5 拂袖出秦（掷图喝破） ---------- */
{
  const { g } = play('normal', {
    '0-1': '还以眼色', '0-2': '长揖谢罪', '0-3': '西入燕',
    '1-1': '放歌相和', '1-2': '高谈阔论', '1-3': '投刺求见',
    '2-1': '受遗命', '2-2': '许之', '2-3': '即刻治装',
    '3-1': '陈说利害', '3-2': '取真图', '3-3': '购徐夫人匕', '3-4': '以秦舞阳为副',
    '4-1': '和歌而去', '4-2': '细察秦廷关节',
    '5-1': '以名自荐', '5-2': '如常进殿', '5-3': '笑而谢曰', '5-4': '拂袖而退'
  }, rngHigh, null, g => { if (g.eventId === '5-1') g.attrs.shengwang = Math.max(g.attrs.shengwang, 58); if (g.eventId === '5-3') g.attrs.caixue = Math.max(g.attrs.caixue, 55); }); // 同 E4
  expect('稳健线（拂袖）', g.ending, 'E5');
  if (has(g, 'fuyi')) { pass++; console.log('✔ 结局成就解锁：拂衣秦廷'); }
  else { fail++; console.log('✘ E5 线应解锁成就 fuyi'); }
}

/* ---------- 6. 逆天线 → E6 咸阳一击 ---------- */
{
  // 才学缺口（路线 61/65）由行动卡闭门读书/著书补足——hook 模拟该经营结果
  const { g } = play('normal', {
    '0-1': '长揖称谢', '0-2': '长揖谢罪', '0-3': '西入燕',
    '1-1': '独酌旁观', '1-2': '与论天下大势', '1-3': '静观时局',
    '2-1': '受遗命', '2-2': '许之', '2-3': '即刻治装',
    '3-1': '陈说利害', '3-2': '取真图', '3-3': '购徐夫人匕', '3-4': '以秦舞阳为副',
    '4-1': '和歌而去', '4-2': '细察秦廷关节',
    '5-1': '千金买通', '5-2': '如常进殿', '5-3': '笑而谢曰', '5-4': '揕其胸'
  }, rngHigh, null, g => { if (g.eventId === '5-3' || g.eventId === '5-4') g.attrs.caixue = Math.max(g.attrs.caixue, 70); });
  expect('逆天线（刺成）', g.ending, 'E6');
  if (has(g, 'yiji')) { pass++; console.log('✔ 结局成就解锁：咸阳一击'); }
  else { fail++; console.log('✘ E6 线应解锁成就 yiji'); }
}

/* ---------- 7. 逆天线 → E7 七创全身（渐离同往） ---------- */
{
  // 君心缺口（路线 36/40）由 JK-ACT-3 太子府问安补足——hook 模拟该经营结果
  const { g, trace } = play('normal', {
    '0-1': '还以眼色', '0-2': '长揖谢罪', '0-3': '西入燕',
    '1-1': '放歌相和', '1-2': '与论天下大势', '1-3': '投刺求见',
    '2-1': '受遗命', '2-2': '许之', '2-3': '即刻治装',
    '3-1': '陈说利害', '3-2': '取真图', '3-3': '购徐夫人匕', '3-4': '求高渐离同往',
    '4-1': '和歌而去', '4-2': '细察秦廷关节',
    '5-1': '千金买通', '5-2': '如常进殿', '5-4': '与渐离并起'
  }, rngHigh, null, g => {
    if (g.eventId === '3-4' && !g.flags['jianli-tong']) g.attrs.junxin = Math.max(g.attrs.junxin, 42);
    if (g.eventId === '5-4') g.attrs.caixue = Math.max(g.attrs.caixue, 72);
  });
  expect('逆天线（双客）', g.ending, 'E7');
  if (trace.some(t => t[0] === '5-2' && t[1].indexOf('如常进殿') >= 0) && !trace.some(t => t[0] === '5-3')) { pass++; console.log('✔ 无秦舞阳时 5-3 舞阳事件跳过'); }
  else { fail++; console.log('✘ 渐离同往线不应经过 5-3'); }
  if (has(g, 'qichuang')) { pass++; console.log('✔ 结局成就解锁：七创全身'); }
  else { fail++; console.log('✘ E7 线应解锁成就 qichuang'); }
}
{
  // 3-4-C 门槛对照：君心<40 转险招（flag 满足、属性不足）/ ≥40 解锁
  const g = driveTo('3-4', { '0-3': 0, '1-1': 0, '1-3': 1 });
  const c = g.getOptions().find(o => o.opt.t.indexOf('求高渐离同往') >= 0);
  const riskyBefore = c && !c.locked && !!c.risky;
  g.attrs.junxin = 42;
  const oAfter = g.getOptions().find(o => o.opt.t.indexOf('求高渐离同往') >= 0);
  const clearAfter = oAfter && !oAfter.locked && !oAfter.risky;
  if (riskyBefore && clearAfter) { pass++; console.log('✔ 渐离同往门槛（需 flag 高渐离 + 君心≥40）：不足转险招，达标解锁'); }
  else { fail++; console.log('✘ 渐离同往门槛异常：' + riskyBefore + '/' + clearAfter); }
}

/* ---------- 8. 失败线 → E8 上殿之变（笑谢失败） ---------- */
{
  const { g } = play('normal', {
    '0-1': '还以眼色', '0-2': '拂袖而去', '0-3': '西入燕',
    '1-1': '放歌相和', '1-2': '谦退不答', '1-3': '静观时局',
    '2-1': '受遗命', '2-2': '许之', '2-3': '即刻治装',
    '3-1': '陈说利害', '3-2': '取真图', '3-3': '购徐夫人匕', '3-4': '以秦舞阳为副',
    '4-1': '和歌而去', '4-2': '直趋咸阳',
    '5-1': '坐等召见', '5-2': '如常进殿', '5-3': '笑而谢曰'
  });
  expect('失败线（上殿）', g.ending, 'E8', 'shangdian');
}

/* ---------- 9. 失败线 → E8 易水截杀（高偏离异变） ---------- */
{
  const { g, trace } = play('normal', {
    '0-1': '长揖称谢', '0-2': '掀了这棋盘', '0-3': '西入燕',
    '1-1': '独酌旁观', '1-2': '高谈阔论', '1-3': '静观时局',
    '2-1': '闻之而惧', '2-2': '许之', '2-3': '再求宽限',
    '3-1': '不忍，另谋他途', '3-1b': '无首也要行', '3-2': '不带图', '3-3': '以常剑淬毒', '3-4': '独往',
    '4-1b': '力竭被擒'
  });
  expect('失败线（截杀）', g.ending, 'E8', 'yishui');
  if (trace.some(t => t[0] === '4-1b')) { pass++; console.log('✔ 偏离≥40 触发 N2 异变：秦谍劫案'); }
  else { fail++; console.log('✘ 未触发 4-1b 易水劫案'); }
}

/* ---------- 10. 修正事件触发（高偏离 + 必中随机） ---------- */
{
  const { trace } = play('normal', {
    '0-1': '还以眼色', '0-2': '掀了这棋盘', '0-3': '西入燕',
    '1-1': '独酌旁观', '1-2': '高谈阔论', '1-3': '早做去留之计',
    '2-1': '闻之而惧', '2-2': '许之', '2-3': '再求宽限',
    '3-1': '不忍，另谋他途', '3-1b': '无首也要行', '3-2': '不带图', '3-3': '以常剑淬毒', '3-4': '独往',
    '4-1b': '绕道潜行', '4-2': '直趋咸阳',
    '5-1': '坐等召见', '5-2': '伏阙称臣'
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
  for (let ci = 0; ci <= 5; ci++) pools.push(D.ACTIONS.filter(a => (a.chapters || [0, 5])[0] <= ci && ci <= (a.chapters || [0, 5])[1]).length);
  if (D.ACTIONS.length === 42 && bad.length === 0 && pools.every(n => n === 12)) { pass++; console.log('✔ 42 个行动数据卫生：单项 ≤±8、zg ≤±5、每章池 12（' + pools.join('/') + '）'); }
  else { fail++; console.log('✘ 行动数据卫生异常：' + (bad.join('；') || '池大小 ' + pools.join('/'))); }

  const g = new E.Game(D, 'normal', rngHigh);
  if (D.HIDDEN.init === 20 && D.SCENARIO.id === 'jingke') {
    g.start();
    const ok = g.zg === 20 && g.zgWord() === '不以为意';
    g.zg = 55;
    if (ok && g.zgWord() === '警跸森严') { pass++; console.log('✔ 秦王戒心（隐藏值）：初始 20，状态词按档位映射'); }
    else { fail++; console.log('✘ 秦王戒心映射异常'); }
  } else { fail++; console.log('✘ 剧本配置异常'); }
}

/* ---------- 12. N1 异变：声望≥55 樊於期自来（condAttrs 声望无损） ---------- */
{
  const g = driveTo('3-1', { '0-2': 1, '1-1': 0, '1-2': 2, '1-3': 1, '2-2': 0 });
  // 该路线声望：25+3+4+5+4+3+5=49 <55 — 手动抬声望构造异变（侠名经营的结果）
  g.attrs.shengwang = 60;
  g.enterChapter(3);
  if (!g.flags.fenglai) { fail++; console.log('✘ 声望≥55 未触发樊於期自来'); }
  else {
    g.beginEvents(); g.playCard(0);
    const r = g.choose(0); // 陈说利害：声望-8 + condAttrs 补 8
    const sw = r.changes.find(c => c.k === 'shengwang' && c.note);
    if (g.attrs.shengwang === 60 && sw && sw.delta === 8) { pass++; console.log('✔ 樊於期自来：借首级而声望无损（condAttrs 兑现）'); }
    else { fail++; console.log('✘ condAttrs 结算异常：shengwang=' + g.attrs.shengwang); }
  }
}

/* ---------- 13. 失宠结算入局后方生效（PERSIST.junxinFrom=2）：章首持续与即时阈值同口径 ---------- */
{
  const g = new E.Game(D, 'normal', rngHigh);
  g.randomOn = false; g.start();
  const w0 = g.attrs.weiji;
  const firedEarly = g.introNotes.some(n => n.indexOf('失宠于上') >= 0);
  // 即时阈值：序章 choose 不应触发「失宠于上」
  g.beginEvents(); g.playCard(0);
  const r0 = g.choose(0);
  const firedInstant = r0.changes.some(c => c.note === '失宠于上');
  g.attrs.junxin = 10;
  const w1 = g.attrs.weiji;
  g.enterChapter(2);
  const firedAt2 = g.introNotes.some(n => n.indexOf('失宠于上') >= 0);
  if (!firedEarly && !firedInstant && firedAt2 && g.attrs.weiji === w1 + 10) { pass++; console.log('✔ 失宠结算：序章/一章不触发（未识≠失宠），入局后正常生效'); }
  else { fail++; console.log('✘ 失宠生效口径异常：early=' + firedEarly + ' instant=' + firedInstant + ' at2=' + firedAt2 + ' weiji=' + g.attrs.weiji); }
}

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail > 0 ? 1 : 0);
