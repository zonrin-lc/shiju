/* 调试：单局 nitian 全追踪（陈胜） */
const path = './chensheng-data.js';
const E = require('./engine.js');
const D = require(path);

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const NITIAN_PREF = {
  '0-1': ['恼而掷锄'], '0-2': ['接籍为屯长'], '0-3': ['与吴广深谈'],
  '1-1': ['再等等，雨停再议'], '1-2': ['因势利导'], '1-3': ['袒右称大楚'],
  '2-1': ['从民所欲'], '2-2': ['纵其自守'], '2-3': ['入据陈，开仓抚民'],
  '3-1': ['自立为王'], '3-2': ['缓图之'],
  '4-1': ['发援兵并力西进'], '4-1b': ['鸣金收兵'], '4-2': ['黜朱房胡武'],
  '5-1': ['亲赴荥阳'], '5-2': ['立诛田臧'],
  '6-1': ['弃陈南走'], '6-2': ['察其异，先收其刃'], '6-3': ['南下合流']
};

function pickNitian(c) {
  const evId = (c.g.phase === 'endEvent' && c.g.currentEndEvent) ? c.g.currentEndEvent.id : c.g.eventId;
  const prefs = NITIAN_PREF[evId];
  if (prefs) {
    for (let p = 0; p < prefs.length; p++) {
      const i = c.options.findIndex(o => !o.locked && o.opt.t.indexOf(prefs[p]) >= 0);
      if (i >= 0) return i;
    }
  }
  // survive 兜底
  let bi = 0, bs = -Infinity;
  c.options.forEach((o, i) => {
    if (o.locked) return;
    const e = o.opt.eff || {};
    const s = -((e.attrs && e.attrs.weiji) || 0) * 10 + ((e.attrs && e.attrs.junxin) || 0);
    if (s > bs) { bs = s; bi = i; }
  });
  return bi;
}

function pickCard(g, rng, log) {
  const offer = g.getOffer();
  if (g.keyRoundsLeft <= 1) return 0;
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
  if (g.attrs.caixue < 55) {
    for (let i = 1; i < offer.length; i++) if (offer[i].action && offer[i].action.id === 'CS-ACT-4' && !offer[i].locked) return i;
  }
  if (g.attrs.junxin < 50) {
    for (let i = 1; i < offer.length; i++) if (offer[i].action && ['CS-ACT-3', 'CS-ACT-1', 'CS-ACT-32'].indexOf(offer[i].action.id) >= 0 && !offer[i].locked) return i;
  }
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

function fmtAttrs(g) {
  const a = g.attrs;
  return `权${a.quanshi} 望${a.shengwang} 君${a.junxin} 财${a.caifu} 才${a.caixue} 危${a.weiji} 离${g.dev} 危峰${g.weijiMax !== undefined ? g.weijiMax : '?'}`;
}

const seed = Number(process.argv[2] || 42);
const rng = mulberry32(seed);
const g = new E.Game(D, 'normal', rng);
g.start();
let guard = 0;
console.log('初始:', fmtAttrs(g));
while (g.phase !== 'ending' && guard++ < 500) {
  if (g.phase === 'intro') { g.beginEvents(); continue; }
  if (g.phase === 'round') {
    const ci = pickCard(g, rng);
    const evId = g.eventId;
    const r = g.playCard(ci);
    if (!r) { g.playCard(0); continue; }
    const cardName = ci === 0 ? '[关键卡→' + evId + ']' : (g.getOffer ? '' : '');
    console.log(`round 事件${evId} 余${g.keyRoundsLeft} 打卡#${ci}${ci === 0 ? '(关键)' : ''}`, fmtAttrs(g), r.kind || '');
    continue;
  }
  if (g.phase === 'correction') {
    console.log('!! 修正:', g.currentCorrection ? (g.currentCorrection.title || g.currentCorrection.id) : '?', fmtAttrs(g));
    g.correctionContinue(); continue;
  }
  if (g.phase === 'summary') { g.proceedSummary(); continue; }
  if (g.phase === 'endEvent') {
    const ev = g.currentEndEvent;
    const options = ev.options.map(o => ({ opt: o, locked: o.req ? !g.check(o.req).ok : false }));
    const i = pickNitian({ g, options, rng });
    console.log(`章末 ${ev.id}「${ev.title}」→ ${ev.options[i].t}${options[i].locked ? '(锁定!)' : ''}`);
    g.endEventChoose(i);
    console.log('   ', fmtAttrs(g));
    continue;
  }
  if (g.phase === 'event') {
    const ev = g.findEvent(g.eventId);
    const options = g.getOptions();
    const i = pickNitian({ g, options, rng });
    console.log(`事件 ${ev.id}「${ev.title}」→ ${options[i].opt.t}${options[i].locked ? '(锁定!)' : ''}`);
    g.choose(i);
    console.log('   ', fmtAttrs(g));
    continue;
  }
  if (g.phase === 'settle') { g.proceed(); continue; }
  throw new Error('未知阶段 ' + g.phase);
}
console.log('结局:', g.ending.id, g.ending.variant || '', '总分', g.ending.total, '评级', g.ending.grade, '|', g.ending.title);
