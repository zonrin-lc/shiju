/* 荆轲剧本《易水寒》自动化剧本验证：脚本化选择驱动引擎，断言各路线收束到正确结局。
 * 运行：node test-jingke.js
 * 结构口径与 test-sim.js（李斯本）一致：固定 rng、随机际遇关闭单独测、trace 记录。
 */
const D = require('./jingke-data.js');
const E = require('./engine.js');

const rngHigh = () => 0.99;
const rngLow = () => 0.01;

/* v1.9 疾病系统（荆轲本 ILLNESS 开启）：出牌即掷发病（ill 流）。
 * 全套件统一经 mkGame 构造 Game，默认注入 ill 流恒 0.99（≥发病率上限 0.35，永不发病），
 * 保证既有路线断言的确定性轨迹不受新增随机源干扰；疾病专项用例（#15）经 streams.ill 自注序列。 */
const ILL_NEVER = () => 0.99;
function illSeq(vals) { let i = 0; return () => vals[Math.min(i++, vals.length - 1)]; }
function mkGame(diffKey, rng, streams) {
  return new E.Game(D, diffKey, rng, Object.assign({ ill: ILL_NEVER }, streams));
}

function play(diffKey, script0, rng, endScript, hook) {
  const script = Object.assign({}, script0);   // 浅拷贝：takeScript 会消费队列，不污染调用方的字面量
  const g = mkGame(diffKey, rng || rngHigh);
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
      let idx = pickIndex(ev.options, takeScript(script, ev.id), opts);
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
  const g = mkGame('normal', rngHigh);
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

  /* 脚本取值：数组 = 同一事件的多次到访脚本（依次取用，如 2-2「二连固辞」）；
   * 非数组 = 单次指定。用完的项从 script 移除，保留其余项不变。 */
  function takeScript(script, key) {
    if (script == null) return undefined;
    var v = script[key];
    if (v == null) return undefined;
    if (Array.isArray(v)) {
      if (!v.length) { delete script[key]; return undefined; }
      var head = v[0], rest = v.slice(1);
      if (rest.length) script[key] = rest; else delete script[key];
      return head;
    }
    return v;
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
  }, rngHigh, null, g => { if (g.eventId === '5-3') g.attrs.biancai = Math.max(g.attrs.biancai, 50); }); // 5-3 笑谢路由 biancai:40（校准后）——注入 50：过笑谢（≥40）且 50+3=53<55 不进 5-4 揕胸 E6 支（xubi+biancai:55），落 5-5 收 E1；辩才缺口由演练辞令类卡经营补足，hook 模拟该结果
  expect('史实线', g.ending, 'E1');
  if (g.dev <= 45) { pass++; } else { fail++; console.log('✘ 史实线偏离应≤45，实际 ' + g.dev); }
  const need = ['lunjian', 'gaoge', 'tianguang', 'fanshou', 'yishui', 'tuxiong', 'yaonang'];
  const miss = need.filter(a => !has(g, a));
  if (miss.length === 0) { pass++; console.log('✔ 史实线成就 7 枚全部解锁'); }
  else { fail++; console.log('✘ 史实线缺成就：' + miss.join('、')); }
  if (g.ending.review.length === 5) { pass++; } else { fail++; console.log('✘ 复盘应为 5 条，实际 ' + g.ending.review.length); }
}

  /* ---------- 2a. 苟活线 → E2 邯郸棋客（不赴燕） ----------
   * v1.6.8：0-3「算了」加 notflag gainie 早退闸（对齐 lisi 0-3-B 模式）——
   * 已与盖聂「邀他同饮，化敌为友」者不再收零代价退出；默认 0-1 路径不置 flag，故本线仍可达。 */
  {
    const { g } = play('normal', { '0-3': '算了' });
    expect('苟活线（棋客）', g.ending, 'E2', 'jiuke');
  }

  /* ---------- 2a-2. 早退闸契约：已结交盖聂者不得零代价退出（v1.6.8） ---------- */
  {
    const { g, trace } = play('normal', { '0-1': '邀他同饮', '0-3': '西入燕' });
    const lockedOut = trace.every(t => t[0] !== '0-3' || t[1].indexOf('算了') < 0);
    if (lockedOut) { pass++; console.log('✔ 早退闸：与盖聂同饮结交后，0-3「算了」不可选'); }
    else { fail++; console.log('✘ 早退闸失效：结交盖聂者仍可选「算了」'); }
  }

/* ---------- 2b. 苟活线 → E2（二连固辞） ----------
 * 2-2 首次「固辞」被太子驳回（flag guci），再次到访方以「固辞不受」收束 E2（v1.6.8 P1-4）。 */
{
  const { g } = play('normal', { '0-3': '西入燕', '1-3': '静观时局', '2-2': ['固辞', '固辞不受'] });
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
  }, rngHigh, null, g => { if (g.eventId === '5-1') g.attrs.shengwang = Math.max(g.attrs.shengwang, 58); if (g.eventId === '5-3') g.attrs.biancai = Math.max(g.attrs.biancai, 55); }); // 声望/辩才缺口由宴饮与演练辞令经营补足——hook 模拟该结果（5-3 笑谢 biancai:40，校准后；5-4 把袖路由不查辩才）
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
  }, rngHigh, null, g => { if (g.eventId === '5-1') g.attrs.shengwang = Math.max(g.attrs.shengwang, 58); if (g.eventId === '5-3') g.attrs.biancai = Math.max(g.attrs.biancai, 55); }); // 同 E4（辩才缺口由演练辞令经营补足；校准后 5-3 笑谢仅需 biancai:40，拂袖路由本身不查辩才）
  expect('稳健线（拂袖）', g.ending, 'E5');
  if (has(g, 'fuyi')) { pass++; console.log('✔ 结局成就解锁：拂衣秦廷'); }
  else { fail++; console.log('✘ E5 线应解锁成就 fuyi'); }
}

/* ---------- 6. 逆天线 → E6 咸阳一击 ---------- */
{
  // 辩才缺口由演练辞令类卡经营补足——hook 模拟该经营结果。校准后档位：5-3 笑谢 biancai:40；
  // 5-4 揕胸 E6 支 xubi+biancai:55+zgMax:49，E7 支 biancai:60——E6 注入档 [55,60)：钳上界 59（≥60 进 E7 判定支）
  const { g } = play('normal', {
    '0-1': '长揖称谢', '0-2': '长揖谢罪', '0-3': '西入燕',
    '1-1': '独酌旁观', '1-2': '与论天下大势', '1-3': '静观时局',
    '2-1': '受遗命', '2-2': '许之', '2-3': '即刻治装',
    '3-1': '陈说利害', '3-2': '取真图', '3-3': '购徐夫人匕', '3-4': '以秦舞阳为副',
    '4-1': '和歌而去', '4-2': '细察秦廷关节',
    '5-1': '千金买通', '5-2': '如常进殿', '5-3': '笑而谢曰', '5-4': '揕其胸'
  }, rngHigh, null, g => { if (g.eventId === '5-3' || g.eventId === '5-4') { g.attrs.biancai = Math.max(g.attrs.biancai, 55); if (g.attrs.biancai > 59) g.attrs.biancai = 59; } });
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
    if (g.eventId === '5-4') g.attrs.biancai = Math.max(g.attrs.biancai, 60); // 5-4 并起→E7 路由 biancai:60（校准后，原 70）——辩才缺口由演练辞令类卡经营补足
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
  }, rngHigh, null, g => { if (g.eventId === '5-3') g.attrs.biancai = Math.min(g.attrs.biancai, 36); }); // 辩才经济校准后 5-3 门槛 50→40，该线天然 41–44+笑谢 eff+3 反过门——压低 biancai 保住 shangdian 覆盖：引擎先结算 eff 再判路由（36+3=39<40），笑谢失败死在上殿
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
  const ZG_WHITE = { 'JK-ACT-21': 3, 'JK-ACT-41': -4 }; // 威胁值白名单：仅此两卡可挂 eff.zg 且值固定
  D.ACTIONS.forEach(a => {
    const eff = a.eff || {};
    Object.keys(eff.attrs || {}).forEach(k => { if (Math.abs(eff.attrs[k]) > 8) bad.push(a.id + ' ' + k); });
    if (eff.zg && ZG_WHITE[a.id] !== eff.zg) bad.push(a.id + ' zg=' + eff.zg);
    if (eff.flags || eff.rmflags || eff.hist || eff.merit || eff.ach) bad.push(a.id + ' 干扰结局树字段');
    if (eff.dev) bad.push(a.id + ' dev');
  });
  const pools = [];
  for (let ci = 0; ci <= 5; ci++) pools.push(D.ACTIONS.filter(a => (a.chapters || [0, 5])[0] <= ci && ci <= (a.chapters || [0, 5])[1]).length);
  if (D.ACTIONS.length === 56 && bad.length === 0 && pools.every(n => n === 16)) { pass++; console.log('✔ 56 个行动数据卫生（卡牌 v2）：单项 ≤±8、dev 恒 0、无 flags/hist/merit/ach/rmflags、zg 白名单（JK-ACT-21 +3 / JK-ACT-41 -4）、每章池 16（' + pools.join('/') + '）'); }
  else { fail++; console.log('✘ 行动数据卫生异常：' + (bad.join('；') || '池大小 ' + pools.join('/') + ' 总数 ' + D.ACTIONS.length)); }

  const g = mkGame('normal', rngHigh);
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
  const g = mkGame('normal', rngHigh);
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

/* ---------- 14. 年龄系统（v1.9，AGE init 30）：章首定龄 30/31/34/35/36/36，低龄段无【春秋渐高】衰减注、体魄不衰减 ---------- */
{
  const ages = [30, 31, 34, 35, 36, 36];
  let okAll = true; const detail = [];
  for (let ci = 0; ci < ages.length; ci++) {
    const g = mkGame('normal', rngHigh);
    g.randomOn = false; g.start();
    const t0 = g.attrs.tupo;
    g.enterChapter(ci);
    const noNote = !g.introNotes.some(n => n.indexOf('春秋渐高') >= 0);
    if (!(g.age === ages[ci] && g.attrs.tupo === t0 && noNote)) { okAll = false; detail.push('c' + ci + '=' + g.age + '/' + g.attrs.tupo + (noNote ? '' : '/有衰减注')); }
  }
  if (okAll) { pass++; console.log('✔ 章首定龄：' + ages.join('/') + '，低龄段无【春秋渐高】衰减注、体魄不衰减'); }
  else { fail++; console.log('✘ 章首定龄异常：' + detail.join('、')); }
}

/* ---------- 15. 疾病闭环（v1.9，ILLNESS cost 3 / heal 5）：大病 onset → 治病卡自动发放 → 治愈；体魄归零 → E8/baobing「病殁客舍」 ---------- */
{
  // (a) 大病 onset：ill 流 0.0（<发病率）+ 0.0（<大病率）→ major，当即体魄-5/危机+3
  const g = mkGame('normal', rngHigh, { ill: illSeq([0.0, 0.0]) });
  g.randomOn = false; g.start(); g.beginEvents();
  const t0 = g.attrs.tupo;
  g.offer = [{ type: 'key' }, { type: 'action', id: 'JK-ACT-1' }];
  const r1 = g.playCard(1);
  const onset = g.ill && g.ill.type === 'major' && g.attrs.tupo === t0 - 5
    && r1.changes.some(c => c.k === 'tupo' && c.delta === -5 && c.note && c.note.indexOf('沉疴') >= 0)
    && r1.changes.some(c => c.k === 'weiji' && c.delta === 3 && c.note);
  // (b) 治病卡自动发放（不占行动池）→ 选它清病、财富-3、体魄+5、倒计时照常推进
  const offer = g.getOffer();
  const ci = offer.findIndex(o => o.action && o.action.id === '__cure__');
  const c0 = g.attrs.caifu, t1 = g.attrs.tupo, rl0 = g.keyRoundsLeft;
  const r2 = ci > 0 ? g.playCard(ci) : null;
  const cured = ci > 0 && offer[ci].action.name === '求医问药' && r2 && g.ill === null
    && g.attrs.caifu === c0 - 3 && g.attrs.tupo === t1 + 5 && g.keyRoundsLeft === rl0 - 1;
  if (onset && cured) { pass++; console.log('✔ 疾病闭环：大病 onset（体魄-5/危机+3）→「求医问药」自动发放 → 治愈（财富 ' + c0 + '→' + g.attrs.caifu + '、体魄+5、清病、倒计时 ' + rl0 + '→' + g.keyRoundsLeft + '）'); }
  else { fail++; console.log('✘ 疾病闭环异常：' + JSON.stringify({ onset, cured, ill: g.ill })); }
  // (c) 病亡：体魄 1 持大病 drain → 体魄归零 → 强制结局 E8/baobing「病殁客舍」
  const gd = mkGame('normal', rngHigh);
  gd.randomOn = false; gd.start(); gd.beginEvents();
  gd.ill = { type: 'major' }; gd.attrs.tupo = 1;
  gd.offer = [{ type: 'key' }, { type: 'action', id: 'JK-ACT-1' }];
  const rd = gd.playCard(1);
  const dead = rd && rd.forcedEnding === true;
  gd.proceed();
  if (dead && gd.ending && gd.ending.id === 'E8' && gd.ending.variant === 'baobing' && gd.ending.name === '病殁客舍') { pass++; console.log('✔ 病亡：体魄归零 → E8/baobing「病殁客舍」'); }
  else { fail++; console.log('✘ 病亡异常：' + JSON.stringify({ dead, end: gd.ending && (gd.ending.id + '/' + gd.ending.variant) })); }
}

/* ---------- 16. 无收益递减（卡牌 v2，ACTION_RULES.diminish=false）：同卡连用 3 次收益逐次完全相同，getOffer diminishing 恒 false ---------- */
{
  const g = mkGame('normal', rngHigh);
  g.randomOn = false; g.start(); g.beginEvents();
  const deltas = [], useCounts = [];
  for (let k = 0; k < 3; k++) {
    g.offer = [{ type: 'key' }, { type: 'action', id: 'JK-ACT-1' }]; // 著书立说：才学+3/声望+1/危机+2
    const r = g.playCard(1);
    useCounts.push(r.useCount);
    deltas.push(['caixue', 'shengwang', 'weiji'].map(kk => r.changes.find(c => c.k === kk).delta).join('/'));
  }
  g.offer = [{ type: 'key' }, { type: 'action', id: 'JK-ACT-1' }];
  const oUsed = g.getOffer()[1];
  if (useCounts.join(',') === '1,2,3' && deltas.every(d => d === '3/1/2') && oUsed.usedCount === 3 && oUsed.diminishing === false) { pass++; console.log('✔ 无递减：JK-ACT-1 连用 3 次收益逐次相同（才学+3/声望+1/危机+2），diminishing 恒 false、useCount 照计'); }
  else { fail++; console.log('✘ 无递减异常：' + JSON.stringify({ useCounts, deltas, dim: oUsed.diminishing })); }
}

/* ---------- 17. 政绩经济存在性（v1.9）：卡侧恰 3 源（JK-ACT-22+1/49+2/51+2）、事件侧 2-2/3-1 hist 各 +5、全书零 req.zhengji ---------- */
{
  const zj = {};
  D.ACTIONS.forEach(a => { if (a.eff && a.eff.attrs && a.eff.attrs.zhengji) zj[a.id] = a.eff.attrs.zhengji; });
  const cardsOk = JSON.stringify(zj) === JSON.stringify({ 'JK-ACT-22': 1, 'JK-ACT-49': 2, 'JK-ACT-51': 2 });
  const zjEvents = [];
  D.CHAPTERS.forEach(ch => (ch.events || []).forEach(ev => ev.options.forEach(o => { if (o.eff && o.eff.attrs && o.eff.attrs.zhengji) zjEvents.push(ev.id + ':' + o.eff.attrs.zhengji + (o.hist ? ':hist' : '')); })));
  const eventsOk = JSON.stringify(zjEvents.slice().sort()) === JSON.stringify(['2-2:5:hist', '3-1:5:hist']);
  let reqZj = 0;
  D.CHAPTERS.forEach(ch => (ch.events || []).forEach(ev => ev.options.forEach(o => { if (o.req && o.req.zhengji != null) reqZj++; })));
  if (cardsOk && eventsOk && reqZj === 0) { pass++; console.log('✔ 政绩经济存在性：卡侧恰 3 源（JK-ACT-22+1/49+2/51+2），事件侧 2-2/3-1 hist 各+5，全书零 req.zhengji'); }
  else { fail++; console.log('✘ 政绩经济异常：' + JSON.stringify({ zj, zjEvents, reqZj })); }
}

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail > 0 ? 1 : 0);
