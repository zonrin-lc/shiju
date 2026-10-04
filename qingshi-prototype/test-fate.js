/* 随机命局生成器校验（v1.7.0，GDD 附录 R）：生成卫生 + 词条完整性 + 扰动带 + 冲突优先级 + 可玩性。
 * 运行：node test-fate.js */
const F = require('./fate.js');
const E = require('./engine.js');
const FILES = { lisi: './game-data.js', jingke: './jingke-data.js', hanxin: './hanxin-data.js', xiangyu: './xiangyu-data.js', chensheng: './chensheng-data.js' };
const DATA = {}; Object.keys(FILES).forEach(k => DATA[k] = require(FILES[k]));

let pass = 0, fail = 0;
function ok(cond, label, detail){ if (cond){ pass++; console.log('✔ ' + label); } else { fail++; console.log('✘ ' + label + (detail ? '：' + detail : '')); } }

/* 1. 生成卫生：100 局无异常，际遇恰 12、id 唯一且 F- 前缀 */
{
  let allOk = true, bad = '';
  for (let i = 0; i < 100; i++){
    const r = F.makeFate(DATA, F.mulberry32(1000 + i));
    const ids = r.data.RANDOM_EVENTS.map(e => e.id);
    if (r.data.RANDOM_EVENTS.length !== 12) { allOk = false; bad = '际遇数=' + r.data.RANDOM_EVENTS.length; break; }
    if (new Set(ids).size !== 12 || !ids.every(x => x.indexOf('F-') === 0)) { allOk = false; bad = 'id=' + ids.join(','); break; }
    if (!r.data.SCENARIO || r.data.SCENARIO.id !== 'fate') { allOk = false; bad = 'SCENARIO.id'; break; }
  }
  ok(allOk, '生成卫生：100 局际遇恰 12、id 唯一（F-1..F-12）、SCENARIO.id=fate', bad);
}

/* 2. 词条完整性：50 局中每局全部 ⟦词条⟧ 在合并 GLOSSARY 有定义 */
{
  let missing = '';
  outer:
  for (let i = 0; i < 50; i++){
    const r = F.makeFate(DATA, F.mulberry32(5000 + i));
    const s = JSON.stringify(r.data.CHAPTERS) + JSON.stringify(r.data.RANDOM_EVENTS) + JSON.stringify(r.data.CRISIS_EVENTS) + JSON.stringify(r.data.ACTIONS);
    const marks = [...new Set([...s.matchAll(/⟦(.+?)⟧/g)].map(m => m[1]))];
    const miss = marks.filter(t => !r.data.GLOSSARY[t]);
    if (miss.length) { missing = 'seed#' + i + '：' + miss.join('、'); break outer; }
  }
  ok(!missing, '词条完整性：50 局全部 ⟦词条⟧ 在合并词条库有定义', missing);
}

/* 3. 初始属性扰动带：十一维按各本 ATTRS max 计算（max/10、下限 10——现五本全维度 max=100，即 ±10）、危机 ±5、clamp 0–max */
{
  let bad = '';
  outer:
  for (let i = 0; i < 100; i++){
    const r = F.makeFate(DATA, F.mulberry32(9000 + i));
    const src = DATA[r.report.protag];
    const amax = {}; (src.ATTRS || []).forEach(a => { amax[a.k] = a.max || 100; });
    const base = src.INIT;
    for (const k of F.ATTR_KEYS){
      const mx = amax[k] || 100;
      const span = k === 'weiji' ? 5 : Math.max(10, Math.round(mx / 10));
      const v = r.data.INIT[k], b = base[k];
      if (v < Math.max(0, b - span) || v > Math.min(mx, b + span)) { bad = `seed#${i} ${r.report.protag} ${k}=${v} 基=${b} 带=±${span} 顶=${mx}`; break outer; }
    }
  }
  ok(!bad, '扰动带：100 局按各本 ATTRS max 计算（max/10、下限 10，现全维度 ±10/100）、危机 ±5、0–max 收敛', bad);
}

/* 4. 冲突词条以主角本为准（取主角本同样拥有该词条的命局验证） */
{
  let r = null;
  for (let i = 0; i < 200; i++){
    const t = F.makeFate(DATA, F.mulberry32(100 + i));
    if (t.report.protag === 'chensheng') { r = t; break; } // chensheng 本有「扶苏」且与他本冲突
  }
  ok(r && r.data.GLOSSARY['扶苏'] === DATA.chensheng.GLOSSARY['扶苏'], '冲突词条以主角本为准（扶苏 → chensheng 本定义）');
}

/* 5. 命局摘要：SCENARIO.name 含「随机命局」，章首注含「天道已重排」 */
{
  const r = F.makeFate(DATA, F.mulberry32(7));
  const note = (r.data.CHAPTERS[0].enter && r.data.CHAPTERS[0].enter.note) || '';
  ok(r.data.SCENARIO.name.indexOf('随机命局') >= 0 && note.indexOf('随机命局') >= 0 && note.indexOf('天道已重排') >= 0 && note.indexOf('无存档') >= 0,
    '命局摘要：SCENARIO 命名与章首注（' + r.data.SCENARIO.name + '）');
}

/* 6. 可玩性：3 难度 × 2 局，随机策略打到结局不死锁、结局合法 */
{
  let bad = '';
  const diffs = ['story', 'normal', 'hardcore'];
  outer:
  for (let gi = 0; gi < 2; gi++){
    for (const dk of diffs){
      const r = F.makeFate(DATA, F.mulberry32(777 + gi));
      const rng = F.mulberry32(31337 + gi * 7);
      const g = new E.Game(r.data, dk, rng);
      g.start();
      let guard = 0;
      while (g.phase !== 'ending' && guard++ < 600){
        if (g.phase === 'intro') { g.beginEvents(); continue; }
        if (g.phase === 'round') {
          const offer = g.getOffer();
          const cand = [0];
          for (let i = 1; i < offer.length; i++) if (!offer[i].locked) cand.push(i);
          const ci = cand[Math.floor(rng() * cand.length)];
          if (!g.playCard(ci)) g.playCard(0);
          continue;
        }
        if (g.phase === 'correction') { g.correctionContinue(); continue; }
        if (g.phase === 'summary') { g.proceedSummary(); continue; }
        if (g.phase === 'endEvent') {
          const ev = g.currentEndEvent;
          const u = ev.options.map((o, i) => i).filter(i => !o.req || g.check(o.req).ok);
          if (u.length) g.endEventChoose(u[Math.floor(rng() * u.length)]);
          else { bad = 'endEvent 无可选项@' + gi + '/' + dk; break outer; }
          continue;
        }
        if (g.phase === 'event') {
          const opts = g.getOptions();
          const u = opts.map((o, i) => i).filter(i => !opts[i].locked);
          if (!u.length) { bad = '事件全锁@' + g.eventId + ' ' + gi + '/' + dk; break outer; }
          g.choose(u[Math.floor(rng() * u.length)]);
          continue;
        }
        if (g.phase === 'settle') { g.proceed(); continue; }
        bad = '未知阶段 ' + g.phase; break outer;
      }
      if (g.phase !== 'ending') { bad = '未达结局@' + gi + '/' + dk + ' phase=' + g.phase; break outer; }
      if (!/^E[1-8]$/.test(g.ending.id)) { bad = '非法结局 ' + g.ending.id; break outer; }
    }
  }
  ok(!bad, '可玩性：3 难度 × 2 局随机策略均达合法结局、无死锁', bad);
}

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail > 0 ? 1 : 0);
