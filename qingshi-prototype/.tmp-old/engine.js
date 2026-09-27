/* 《青史生存录》原型引擎 —— 纯逻辑，浏览器与 Node 通用（UI 只负责渲染与调用）
 *
 * 驱动模型：行动卡回合制（v0.9.5；v1.3.1 修订关键卡超时语义）
 *   每章：章首 intro → 回合循环（phase 'round'）→ 章末（endEvent/correction/summary）。
 *   每回合发 4 张卡：关键事件卡 ×1（当前 eventId，限时 KEY_CARD_ROUNDS 回合，
 *   倒计时归零未点则强制进入该事件抉择页——玩家阅读后必须亲自选择，不再自动循史）+ 普通行动卡 ×3
 *  （本章行动池随机抽取，同章重复使用同一行动收益递减）。剧本事件的决策流（getOptions/choose/proceed）
 *   保持不变，只是事件不再自动接续，而是一律回到回合（round）重新发卡。
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.QINGSHI_ENGINE = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  function clamp(v) { return Math.max(0, Math.min(100, Math.round(v))); }

  /* 关键事件卡限时（回合数）：每打出一张行动卡 -1；归零强制进入关键事件抉择页（玩家亲选，见 playCard） */
  var KEY_CARD_ROUNDS = 3;

  function Game(data, diffKey, rng) {
    this.d = data;
    this.diffKey = diffKey;
    this.diff = data.DIFFICULTY[diffKey];
    this.rng = rng || Math.random;
    this.resetAll();
  }

  Game.prototype.resetAll = function () {
    this.attrs = Object.assign({}, this.d.INIT);
    this.dev = 0;
    this.flags = {};
    this.histScore = 0;          // 史评原始分
    this.merits = [];            // 功业标记
    this.ach = [];               // 成就
    this.keyChoices = [];        // 复盘
    this.peak = { quanshi: this.attrs.quanshi, junxin: this.attrs.junxin };
    this.coef = 1;               // 回溯惩罚系数
    this.backtracksThisChapter = 0;
    this.chapterIdx = -1;
    this.eventId = null;
    this.phase = 'home';
    this.introNotes = [];
    this.pendingEndEvents = [];
    this.currentEndEvent = null;
    this.correction = null;
    this.ending = null;
    this.snapshot = null;
    // 回合制状态
    this.offer = null;           // 当前回合发牌：[{type:'key'}, {type:'action', id}...]
    this.keyRoundsLeft = 0;      // 关键事件卡剩余限时（回合）
    this.actionUses = {};        // 本章各行动已用次数（收益递减依据，n 从 1 计）
    // 随机际遇
    this.randomOn = true;
    this.randomChance = 0.4;   // 每回合触发际遇的概率
    this.randomMax = 2;        // 每章至多触发次数
    this.chapterDeck = [];
    this.randomCount = 0;
    this.currentRandom = null;
    this.pendingEventId = null;
    this._skipRandom = false;
    // 百科图鉴与隐藏 NPC 值
    this.gloss = [];             // 已解锁百科词条（回溯不重置，GDD 6.4）
    // 主敌威胁/戒心（隐藏值，GDD 4.3；剧本经 HIDDEN 配置，李斯=赵高威胁度）
    this.zg = (this.d.HIDDEN && this.d.HIDDEN.init != null) ? this.d.HIDDEN.init : 30;
    this.chapterDev = [];        // 本章偏离归因（章末结算页，GDD 5.4）
    this._corrShown = null;      // 本章触发的修正事件标题
    this._backlashDone = false;  // 逆天段章中反噬，每章一次（GDD 5.2）
    this._newAch = [];           // 最近一次结算新解锁的成就
    this._crisisPlotPending = false; // 危机 70–89：本章待注入一次构陷际遇（GDD 4.1）
    this.passedEvents = {};      // 本章已通过（choose 结算后离开）的剧本事件 id 集合（章内进度，GDD 3.3）
    this._chapterStartId = null; // 本章实际起始剧本事件（startAlt 解析后；进度分母口径用）
  };

  Game.prototype.start = function () { this.enterChapter(0); };

  Game.prototype.chapter = function () { return this.d.CHAPTERS[this.chapterIdx]; };

  Game.prototype.findEvent = function (id) {
    if (this.currentRandom && this.currentRandom.id === id) return this.currentRandom;
    var evs = this.chapter().events;
    for (var i = 0; i < evs.length; i++) if (evs[i].id === id) return evs[i];
    return null;
  };

  Game.prototype.devBand = function (dev) {
    var bands = this.d.DEV_BANDS, v = (dev == null ? this.dev : dev);
    for (var i = 0; i < bands.length; i++) if (v <= bands[i].max) return i;
    return bands.length - 1;
  };

  var FLAG_REASONS = {
    fusu: '需要扶苏的信任', guanshu: '需要序章观鼠悟道', liuzheng: '需要沙丘留证',
    hanfeicun: '需要韩非尚在', ziwu: '需要自污保身', mibao: '需要宫中密报',
    guangjiaoyou: '需要广交游', shouxi: '当前处境不适用', piaobo: '已经漂泊过一遭',
    lianmeng: '需要已密联蒙恬', mtdi: '蒙恬已生敌意'
  };

  /* ---------- 条件判定 ---------- */
  Game.prototype.check = function (cond) {
    if (!cond) return true;
    var self = this, ok = true, reason = null;
    var names = this.d.ATTR_NAMES;
    Object.keys(cond).forEach(function (k) {
      if (!ok) return;
      var v = cond[k];
      if (k === 'flag') { if (!self.flags[v]) { ok = false; reason = FLAG_REASONS[v] || '需要特定经历'; } }
      else if (k === 'notflag') { if (self.flags[v]) { ok = false; reason = '与已有经历冲突'; } }
      else if (k === 'anyflag') {
        var has = v.some(function (f) { return self.flags[f]; });
        if (!has) { ok = false; reason = FLAG_REASONS[v[0]] || '需要特定经历'; }
      }
      else if (k === 'weijiMax') { if (self.attrs.weiji > v) { ok = false; reason = '危机须≤' + v; } }
      else if (k === 'quanshiMax') { if (self.attrs.quanshi > v) { ok = false; reason = '权势须≤' + v; } }
      else if (k === 'junxinMax') { if (self.attrs.junxin > v) { ok = false; reason = '君心须≤' + v; } }
      else if (k === 'zgMax') { if (self.zg > v) { ok = false; reason = ''; } }
      else if (k === 'junxinMaxSeen') { if (self.peak.junxin < v) { ok = false; reason = '君心峰值须≥' + v; } }
      else if (k === 'minChapter') { if (self.chapterIdx < v) { ok = false; reason = '当前处境不适用'; } }
      else if (k === 'devMin') { if (self.dev < v) { ok = false; reason = '需偏离≥' + v + '（改流之势）'; } }
      else if (k === 'devMax') { if (self.dev > v) { ok = false; reason = '需偏离≤' + v; } }
      else if (names[k]) { if (self.attrs[k] < v) { ok = false; reason = names[k] + '须≥' + v; } }
    });
    return { ok: ok, reason: reason };
  };

  /* ---------- 进入章节 ---------- */
  Game.prototype.enterChapter = function (idx) {
    this.chapterIdx = idx;
    this.backtracksThisChapter = 0;
    var ch = this.chapter();
    this.introNotes = [];
    if (ch.enter) {
      if (ch.enter.merit && this.merits.indexOf(ch.enter.merit) < 0) this.merits.push(ch.enter.merit);
      if (ch.enter.note) this.introNotes.push(ch.enter.note);
    }
    // 节点异变
    if (ch.mutations) {
      var self = this;
      ch.mutations.forEach(function (m) {
        if (self.check(m.if).ok) {
          if (m.flag) self.flags[m.flag] = true;
          if (m.setAttrs) Object.keys(m.setAttrs).forEach(function (k) { self.attrs[k] = m.setAttrs[k]; });
          // capAttrs：只降不升的置值（如 N1"籍没其家"——籍没只抄不补，财富高于上限才封至上限，贫寒者不反向补贴）
          if (m.capAttrs) Object.keys(m.capAttrs).forEach(function (k) { if (self.attrs[k] > m.capAttrs[k]) self.attrs[k] = m.capAttrs[k]; });
          if (m.note) self.introNotes.push(m.note);
        }
      });
    }
    // GDD 4.1 章首持续结算：高值风险以"每章"粒度生效（危机正增量乘难度系数 diff.wj，GDD 4.4）
    // 失宠规则为朝堂语境（需"有君可失"）——剧本可经 PERSIST.junxinFrom 设定生效起始章、
    // PERSIST.junxinShichong=false 整体关闭（项羽：君心=天下人望，惩罚由诸侯离心 zg 承担）
    var wj = this.diff.wj, dWj;
    var jxFrom = (this.d.PERSIST && this.d.PERSIST.junxinFrom != null) ? this.d.PERSIST.junxinFrom : 0;
    var shichongOn = !(this.d.PERSIST && this.d.PERSIST.junxinShichong === false);
    if (this.attrs.quanshi >= 80) { dWj = Math.round(5 * wj); this.attrs.weiji = clamp(this.attrs.weiji + dWj); this.introNotes.push('【树大招风】权势过盛，君主猜忌日深——危机+' + dWj + '。'); }
    if (this.attrs.junxin <= 15 && shichongOn && this.chapterIdx >= jxFrom) { dWj = Math.round(10 * wj); this.attrs.weiji = clamp(this.attrs.weiji + dWj); this.introNotes.push('【失宠于上】君心已冷，构陷者众——危机+' + dWj + '。'); }
    if (this.attrs.caifu <= 0) { this.attrs.shengwang = clamp(this.attrs.shengwang - 5); this.introNotes.push('【门客散去】无钱养士，门前冷落——声望-5。'); }
    if (this.attrs.shengwang >= 80 && this.attrs.junxin < 40 && !this.flags._gonggao) { this.flags._gonggao = true; dWj = Math.round(10 * wj); this.attrs.weiji = clamp(this.attrs.weiji + dWj); this.introNotes.push('【功高震主】你的名望已越过人臣的界限——危机+' + dWj + '。'); }
    if (this.attrs.caifu >= 90 && !this.flags._jiyu) { this.flags._jiyu = true; dWj = Math.round(8 * wj); this.attrs.weiji = clamp(this.attrs.weiji + dWj); this.introNotes.push('【宗室觊觎】你的家产引来了宗室的目光——危机+' + dWj + '。'); }
    // GDD 4-5-A 设计备注：污名·焚书（wu_fenshu）——士人集团永久敌意。第五/六章章首兑现：
    // 首次入章一次性警示，此后每章声望-3 持续侵蚀（声望非危机，不乘难度系数，GDD 4.4 口径）
    if (this.flags.wu_fenshu && idx >= 5) {
      if (!this.flags._wfsWarn) { this.flags._wfsWarn = true; this.introNotes.push('【污名·焚书】士林至今以焚书之议罪你——辩白无用，这份敌意会伴你走到局终。'); }
      this.attrs.shengwang = clamp(this.attrs.shengwang - 3);
      this.introNotes.push('【士林侧目】焚书之议，士林视你为仇——声望-3。');
    }
    if (ch.achOnEnter) this.unlockAch(ch.achOnEnter);
    this.chapterDev = [];
    this._corrShown = null;
    this._backlashDone = false;
    this.passedEvents = {};   // 章内进度（GDD 3.3）随章重置
    // 回合制与随机际遇的章内状态（须在起始事件与危机判定之前重置）
    this.offer = null;
    this.keyRoundsLeft = KEY_CARD_ROUNDS;
    this.actionUses = {};
    this.randomCount = 0;
    this.currentRandom = null;
    this.pendingEventId = null;
    this._crisisPlotPending = false;
    var self = this;
    this.chapterDeck = (this.d.RANDOM_EVENTS || []).filter(function (e) {
      return idx >= e.chapters[0] && idx <= e.chapters[1];
    }).slice();
    // 起始事件（支持条件起始，如 3-0 密报）
    var start = ch.start;
    if (ch.startAlt) {
      for (var i = 0; i < ch.startAlt.length; i++) {
        if (this.check(ch.startAlt[i].if).ok) { start = ch.startAlt[i].start; break; }
      }
    }
    this._chapterStartId = start;   // 章内进度分母口径（chapterProgress）依据实际起点调整
    // GDD 4.1 危机高值：≥90 章首替换为死亡判定事件（RETURN 返回原起始事件）；
    // 70–89 置一次性标记，由 maybeRandom 在章内注入一次构陷/暗杀际遇
    if (this.attrs.weiji >= 90 && this.d.CRISIS_EVENTS && this.d.CRISIS_EVENTS.death) {
      var dev0 = JSON.parse(JSON.stringify(this.d.CRISIS_EVENTS.death));
      this.pendingEventId = start;
      this.currentRandom = dev0;
      this.eventId = dev0.id;
    } else if (this.diffKey === 'hardcore' && this.flags.tanmo && !this.flags._tanmo_qs &&
               idx >= 4 && idx <= 5 && this.d.CRISIS_EVENTS && this.d.CRISIS_EVENTS.qingsuan) {
      // GDD 8 章 2-4-C 设计备注：持【贪墨】在硬核难度下触发后续清算事件（第四/五章章首，
      // 一次性，复用危机事件的插入/RETURN 机制，_tanmo_qs 防重；死亡判定优先于清算）
      this.flags._tanmo_qs = true;
      this.pendingEventId = start;
      this.currentRandom = this.d.CRISIS_EVENTS.qingsuan;
      this.eventId = this.d.CRISIS_EVENTS.qingsuan.id;
      if (this.attrs.weiji >= 70) this._crisisPlotPending = true;
    } else {
      this.eventId = start;
      if (this.attrs.weiji >= 70) this._crisisPlotPending = true;
    }
    this.onEventEnter(); // 起始事件同样过进入钩子（5-1 勒索兑现等）
    // 存档点（异变应用、起始事件与危机判定确定之后再拍快照）
    this.snapshot = this.makeSnapshot();
    this.phase = 'intro';
  };

  Game.prototype.makeSnapshot = function () {
    return {
      attrs: Object.assign({}, this.attrs),
      dev: this.dev,
      flags: Object.assign({}, this.flags),
      histScore: this.histScore,
      merits: this.merits.slice(),
      ach: this.ach.slice(),
      keyChoices: this.keyChoices.slice(),
      peak: Object.assign({}, this.peak),
      zg: this.zg,
      eventId: this.eventId,
      // 章首死亡判定/构陷注入的插入状态一并入快照，保证回溯语义一致
      pendingEventId: this.pendingEventId,
      currentRandom: this.currentRandom,
      crisisPlotPending: this._crisisPlotPending,
      // 回合制状态（章首快照时点：倒计时满、行动未用、进度清零；offer 不入快照，恢复后由 beginRounds 重发）
      keyRoundsLeft: this.keyRoundsLeft,
      actionUses: Object.assign({}, this.actionUses),
      passed: Object.assign({}, this.passedEvents)
    };
  };

  /* 章内进度（GDD 3.3）：done = 本章已通过（choose 结算后离开）的剧本事件数，
   * total = 本章 events 数；startAlt 条件起点跳过了 ch.start 指向的事件（如未获密报则 3-0
   * 不出现），分母相应减一。际遇/危机插入（currentRandom 非空）与章末事件不计。 */
  Game.prototype.chapterProgress = function () {
    var ch = this.chapter();
    var total = ch ? ch.events.length : 0;
    if (ch && this._chapterStartId && this._chapterStartId !== ch.start) total -= 1;
    return { done: Object.keys(this.passedEvents).length, total: Math.max(total, 1) };
  };

  /* intro → 回合 的入口（保留旧名 beginEvents，兼容既有调用） */
  Game.prototype.beginEvents = function () { return this.beginRounds(); };

  /* ---------- 回合发牌 ----------
   * 以当前 eventId 为关键事件卡（限时 keyRoundsLeft 回合），
   * 从本章可用行动池随机补 3 张行动卡（同轮不重复）。
   * 行动池 = ACTIONS 中 chapters 覆盖本章（字段缺失时按 [0,6] 处理）且 req 当前满足者。 */
  Game.prototype.beginRounds = function () {
    var self = this;
    var pool = (this.d.ACTIONS || []).filter(function (a) {
      var chs = a.chapters || [0, 6];
      if (self.chapterIdx < chs[0] || self.chapterIdx > chs[1]) return false;
      return a.req ? self.check(a.req).ok : true;
    });
    var picks = [];
    var n = Math.min(3, pool.length);
    for (var k = 0; k < n; k++) {
      var idx = Math.floor(this.rng() * pool.length);
      picks.push(pool.splice(idx, 1)[0]);
    }
    this.offer = [{ type: 'key' }];
    picks.forEach(function (a) { self.offer.push({ type: 'action', id: a.id }); });
    this.phase = 'round';
    return { type: 'round' };
  };

  /* 当前回合手牌（UI 渲染用）：关键卡带倒计时，行动卡带 req 锁定与递减提示。
   * 行动卡 locked 仅由 req 决定（行动不限每章一次，重复用只是收益递减）。 */
  Game.prototype.getOffer = function () {
    if (!this.offer) return [];
    var self = this;
    return this.offer.map(function (e) {
      if (e.type === 'key') {
        var ev = self.findEvent(self.eventId);
        return {
          type: 'key', eventId: self.eventId,
          title: ev ? ev.title : String(self.eventId),
          inserted: !!self.currentRandom,   // 关键卡为危机插入事件（如章首 C-DEATH）时为 true
          roundsLeft: self.keyRoundsLeft
        };
      }
      var a = null;
      (self.d.ACTIONS || []).forEach(function (x) { if (x.id === e.id) a = x; });
      var c = a && a.req ? self.check(a.req) : { ok: true, reason: null };
      var used = self.actionUses[e.id] || 0;
      return { type: 'action', action: a, locked: !c.ok, reason: c.reason || null, usedCount: used, diminishing: used > 0 };
    });
  };

  /* ---------- 出牌 ---------- */
  Game.prototype.playCard = function (i) {
    if (this.phase !== 'round' || !this.offer) return null;
    var entry = this.offer[i];
    if (!entry) return null;
    if (entry.type === 'key') {
      // 关键事件卡：进入现有事件决策流（onEventEnter 钩子在事件到达时已走过，幂等）。
      // 倒计时重置语义：本事件 choose 结算后由 proceed 为下一事件重建 offer（倒计时回满）。
      this.phase = 'event';
      return { kind: 'key' };
    }
    // ---- 行动卡 ----
    var a = null;
    (this.d.ACTIONS || []).forEach(function (x) { if (x.id === entry.id) a = x; });
    if (!a) return null;
    var c = a.req ? this.check(a.req) : { ok: true };
    if (!c.ok) return null;
    var useN = (this.actionUses[a.id] || 0) + 1;   // 本章第 n 次使用（n 从 1 计）
    this.actionUses[a.id] = useN;
    var eff = this._scaleActionEff(a.eff || {}, useN);
    var changes = this.applyEff(eff);
    var r = {
      kind: 'action', id: a.id, text: a.res, changes: changes,
      devDelta: eff.dev || 0, useCount: useN,
      achNew: null, bandUp: false, bandName: null,
      forcedEnding: false
    };
    // 主动行动结算同样过死亡判定（GDD 4.1）；致死则置 _next，UI 据 forcedEnding 调 proceed 收束
    var forcedEnding = this.checkDeath();
    if (forcedEnding) {
      this._next = forcedEnding;
      this.phase = 'settle';
      r.forcedEnding = true;
      return r;
    }
    // 回合推进：关键事件卡倒计时 -1；归零则强制进入关键事件抉择页（玩家亲自选择，不再自动循史）
    this.keyRoundsLeft--;
    if (this.keyRoundsLeft <= 0) {
      var opts0 = this.getOptions(), anyOpen = false;
      for (var oi = 0; oi < opts0.length; oi++) if (!opts0[oi].locked) { anyOpen = true; break; }
      if (anyOpen) {
        this.phase = 'event';
        r.forcedKey = true;   // UI：行动结算浮层「继续」后直接进入关键事件抉择页（renderEvent）
        // 成就「时不我待」：首次被倒计时赶上——历史不替你翻页，但会催你翻页
        if (this.unlockAch('shiwodai')) {
          var nm0 = this.d.ACHIEVEMENTS.shiwodai;
          if (nm0) r.achNew = r.achNew ? r.achNew + '、' + nm0 : nm0;
        }
      } else {
        // 极端兜底：当前事件全部选项锁定（不应出现）——倒计时重置，避免死锁
        this.keyRoundsLeft = 1;
        this.beginRounds();
        r.route = { type: 'round' };
      }
    } else {
      this.beginRounds();
      r.route = { type: 'round' };
    }
    return r;
  };

  /* 收益递减：同章第 n 次使用同一行动（n 从 1 计），eff.attrs 中的"收益项"逐次减半、
   * 向 0 方向收敛且下限 ±1；代价项（危机正值、其余属性负值）不变。
   * 收益项 = 非危机属性的正值、危机的负值。递减只作用 eff.attrs，condAttrs/zg/dev/hist 不动。 */
  Game.prototype._scaleActionEff = function (eff, n) {
    var scaled = JSON.parse(JSON.stringify(eff || {}));
    if (!scaled.attrs || n <= 1) return scaled;
    var div = Math.pow(2, n - 1);
    Object.keys(scaled.attrs).forEach(function (k) {
      var v = scaled.attrs[k];
      if (k === 'weiji') {
        if (v < 0) scaled.attrs[k] = Math.min(-1, -Math.floor(Math.abs(v) / div));
      } else if (v > 0) {
        scaled.attrs[k] = Math.max(1, Math.floor(v / div));
      }
    });
    return scaled;
  };

  /* ---------- 事件进入钩子（节点内动态异变） ---------- */
  Game.prototype.onEventEnter = function () {
    var ev = this.findEvent(this.eventId);
    if (!ev || !ev.enterEffects) return;
    if (ev.enterOnce) {
      if (this.flags[ev.enterOnce]) return;
      this.flags[ev.enterOnce] = true;
    }
    var self = this;
    ev.enterEffects.forEach(function (ef) {
      if (ef.if && !self.check(ef.if).ok) return;
      if (ef.setFlags) ef.setFlags.forEach(function (f) { self.flags[f] = true; });
      if (ef.attrs) Object.keys(ef.attrs).forEach(function (k) { self.attrs[k] = clamp(self.attrs[k] + ef.attrs[k]); });
      if (ef.zg) self.zg = clamp(self.zg + ef.zg);
      if (ef.zgSet != null) self.zg = clamp(ef.zgSet);
    });
  };

  /* ---------- 选项列表（含动态门槛调整与锁定原因） ---------- */
  Game.prototype.getOptions = function () {
    var ev = this.findEvent(this.eventId);
    var self = this;
    return ev.options.map(function (o) {
      var req = o.req ? Object.assign({}, o.req) : null;
      // 数据驱动的门槛修正（节点异变/Flag 话术升级等）：opt.reqAdjust = [{ if, attr, delta }]
      if (o.reqAdjust) {
        req = req || {};
        o.reqAdjust.forEach(function (ra) {
          if (!ra.if || self.check(ra.if).ok) req[ra.attr] = (req[ra.attr] || 0) + ra.delta;
        });
      }
      var c = req ? self.check(req) : { ok: true, reason: null };
      return { opt: o, locked: !c.ok, reason: c.reason, hist: !!o.hist };
    });
  };

  /* ---------- 选择 ---------- */
  Game.prototype.choose = function (i) {
    var ev = this.findEvent(this.eventId);
    var opts = this.getOptions();
    var entry = opts[i];
    if (!entry || entry.locked) return null;
    var o = entry.opt;
    // 章内进度：剧本事件（非际遇/危机插入）choose 结算即视为"已通过"
    if (!this.currentRandom && this.eventId) this.passedEvents[this.eventId] = true;
    var beforeBand = this.devBand();
    var changes = this.applyEff(o.eff || {});
    // 章末偏离归因（际遇不产偏离，自然不入账）
    var devDelta0 = (o.eff && o.eff.dev) || 0;
    if (devDelta0 > 0) this.chapterDev.push({ ev: ev.title, t: o.t, dev: devDelta0 });
    // 复盘记录
    if (ev.key) {
      var histOpt = null;
      ev.options.forEach(function (x) { if (x.hist) histOpt = x; });
      this.keyChoices.push({
        node: this.d.KEY_NODE_NAMES[ev.id] || ev.title,
        you: o.t,
        hist: histOpt ? histOpt.t : '—',
        isHist: !!o.hist,
        dev: (o.eff && o.eff.dev) || 0
      });
    }
    var afterBand = this.devBand();
    var self = this;
    var achNew = (this._newAch || []).map(function (a) { return self.d.ACHIEVEMENTS[a]; }).filter(Boolean).join('、') || null;
    // 死亡判定（GDD 4.1：危机≥100 致死；非致命难度钳到 95。赵高威胁度≥70 为族诛，否则刺杀）
    var forcedEnding = this.checkDeath();
    this._next = forcedEnding || this.resolveTo(o.to);
    this.phase = 'settle';
    return {
      text: o.res || '',
      changes: changes,
      devDelta: (o.eff && o.eff.dev) || 0,
      achNew: achNew,
      bandUp: afterBand > beforeBand,
      bandName: this.d.DEV_BANDS[afterBand].name,
      forcedEnding: !!forcedEnding
    };
  };

  /* ---------- 公共死亡判定：致死返回结局路由（proceed 可直接收束），否则返回 null ---------- */
  Game.prototype.checkDeath = function () {
    if (this.attrs.weiji < 100) return null;
    if (this.diff.lethal) return { type: 'ending', ending: 'E8', variant: this.zg >= 70 ? 'zuzhu' : 'cike' };
    this.attrs.weiji = 95;
    return null;
  };

  Game.prototype.applyEff = function (eff) {
    var changes = [], self = this;
    this._newAch = [];
    var names = this.d.ATTR_NAMES;
    if (eff.attrs) {
      Object.keys(eff.attrs).forEach(function (k) {
        var v = eff.attrs[k];
        if (k === 'weiji' && v > 0) v = Math.round(v * self.diff.wj);
        self.attrs[k] = clamp(self.attrs[k] + v);
        var chg = { k: k, label: names[k], delta: v };
        // eff.notes = { 属性键: 注记 }：给普通 attrs 结算条目挂注记（渲染同 condAttrs 的 note；
        // 用于 Flag 兑现类设计备注的结算体现，如 4-6-C 蒙恬生隙、5-1-D 北联蒙恬）
        if (eff.notes && eff.notes[k]) chg.note = eff.notes[k];
        changes.push(chg);
      });
    }
    if (eff.setAttrs) {
      Object.keys(eff.setAttrs).forEach(function (k) {
        var old = self.attrs[k];
        self.attrs[k] = clamp(eff.setAttrs[k]);
        var d = self.attrs[k] - old;
        if (d !== 0) changes.push({ k: k, label: names[k], delta: d });
      });
    }
    // 条件增益（Flag 兑现类设计备注，如 2-2-A 需【知秦】增益、2-4 亲政后【王知我】权势+10）：
    // eff.condAttrs = [{ if:{...}, attrs:{...}, note:'…' }]，条件满足才结算，note 进结算条目
    if (eff.condAttrs) {
      eff.condAttrs.forEach(function (ca) {
        if (ca.if && !self.check(ca.if).ok) return;
        Object.keys(ca.attrs || {}).forEach(function (k) {
          var v = ca.attrs[k];
          if (k === 'weiji' && v > 0) v = Math.round(v * self.diff.wj);
          self.attrs[k] = clamp(self.attrs[k] + v);
          changes.push({ k: k, label: names[k], delta: v, note: ca.note });
        });
      });
    }
    // GDD 4.2：偏离度只增不减，负增量无效
    if (eff.dev > 0) {
      this.dev = Math.min(100, this.dev + eff.dev);
    }
    if (eff.flags) eff.flags.forEach(function (f) { self.flags[f] = true; });
    if (eff.rmflags) eff.rmflags.forEach(function (f) { delete self.flags[f]; });
    if (eff.zg) this.zg = clamp(this.zg + eff.zg);           // 赵高威胁度（隐藏，不进结算条目）
    if (eff.zgSet != null) this.zg = clamp(eff.zgSet);
    if (eff.hist) this.histScore += eff.hist;
    if (eff.merit && this.merits.indexOf(eff.merit) < 0) this.merits.push(eff.merit);
    // 成就：字符串为直接解锁；{id, if} 在数值生效后判定门槛（如书同文需声望≥60）
    if (eff.ach) {
      if (typeof eff.ach === 'string') this.unlockAch(eff.ach);
      else if (eff.ach.id && (!eff.ach.if || this.check(eff.ach.if).ok)) this.unlockAch(eff.ach.id);
    }
    if (this.attrs.quanshi > this.peak.quanshi) this.peak.quanshi = this.attrs.quanshi;
    if (this.attrs.junxin > this.peak.junxin) this.peak.junxin = this.attrs.junxin;
    // 属性触阈值隐性规则（危机正增量乘难度系数 diff.wj，GDD 4.4）
    var wj = this.diff.wj, dT;
    var jxFrom2 = (this.d.PERSIST && this.d.PERSIST.junxinFrom != null) ? this.d.PERSIST.junxinFrom : 0;
    var shichongOn2 = !(this.d.PERSIST && this.d.PERSIST.junxinShichong === false);
    if (this.attrs.quanshi >= 80 && !this.flags._caizhi) { this.flags._caizhi = true; dT = Math.round(8 * wj); this.attrs.weiji = clamp(this.attrs.weiji + dT); changes.push({ k: 'weiji', label: '危机', delta: dT, note: '权势过盛，君主猜忌' }); }
    if (this.attrs.junxin <= 15 && shichongOn2 && this.chapterIdx >= jxFrom2 && !this.flags._shichong) { this.flags._shichong = true; dT = Math.round(10 * wj); this.attrs.weiji = clamp(this.attrs.weiji + dT); changes.push({ k: 'weiji', label: '危机', delta: dT, note: '失宠于上' }); }
    if (this.attrs.caifu <= 0 && !this.flags._menke) { this.flags._menke = true; this.attrs.shengwang = clamp(this.attrs.shengwang - 5); changes.push({ k: 'shengwang', label: '声望', delta: -5, note: '门客散去' }); }
    // GDD 6.3 阈值状态提示：危机首次 ≥70 / ≥90 各提示一次（只加 note，不改数值）
    if (this.attrs.weiji >= 70 && !this.flags._liuyan) { this.flags._liuyan = true; changes.push({ k: 'weiji', label: '危机', delta: 0, note: '流言四起，你已身处流言中心' }); }
    if (this.attrs.weiji >= 90 && !this.flags._mingxuan) { this.flags._mingxuan = true; changes.push({ k: 'weiji', label: '危机', delta: 0, note: '命悬一线' }); }
    return changes;
  };

  Game.prototype.unlockAch = function (id) {
    if (this.ach.indexOf(id) >= 0) return false;
    this.ach.push(id);
    if (this._newAch) this._newAch.push(id);
    return true;
  };

  Game.prototype.resolveTo = function (to) {
    if (to == null) return { type: 'none' };
    if (typeof to === 'string') {
      if (to === 'NEXT') return { type: 'chapterEnd' };
      if (to === 'RETURN') return { type: 'return' };
      return { type: 'event', eventId: to };
    }
    if (Array.isArray(to)) {
      for (var i = 0; i < to.length; i++) {
        if (!to[i].if || this.check(to[i].if).ok) return this.resolveTo(to[i].to);
      }
      // GDD 9.1 判定树 #9：条件数组全部未命中（罕见异常态）→ E8【狱中死】兜底
      return { type: 'ending', ending: 'E8' };
    }
    if (to.ending) return { type: 'ending', ending: to.ending, variant: to.variant || null };
    return { type: 'none' };
  };

  /* ---------- 结算后推进（回合制：事件不再自动接续，一律回到回合重发牌） ---------- */
  Game.prototype.proceed = function () {
    var n = this._next;
    this._next = null;
    if (!n) return this.chapterEnd();
    if (n.type === 'event') {
      // 下一剧本事件成为新的关键事件卡：倒计时回满，重发一回合
      this.eventId = n.eventId;
      this.onEventEnter();
      this.keyRoundsLeft = KEY_CARD_ROUNDS;
      this.beginRounds();
      return { type: 'round' };
    }
    if (n.type === 'return') {
      // 际遇/危机插入结束：回到被插入的剧本事件并重发一回合。
      // 插入本身不耗回合——关键卡倒计时回满（"际遇不消耗决策点"，GDD 附录 C.1 精神的回合制口径）
      this.eventId = this.pendingEventId;
      this.pendingEventId = null;
      this.currentRandom = null;
      this._skipRandom = true;
      this.onEventEnter();
      this.keyRoundsLeft = KEY_CARD_ROUNDS;
      this.beginRounds();
      return { type: 'round', resumed: true };
    }
    if (n.type === 'ending') { this.finishEnding(n.ending, n.variant); return { type: 'ending' }; }
    if (n.type === 'chapterEnd') return this.chapterEnd();
    // 空路由兜底：回到当前事件的回合（不应出现，防御性处理）
    this.beginRounds();
    return { type: 'round' };
  };

  /* ---------- 章末：章末事件 → 修正 → 下一章 ---------- */
  Game.prototype.chapterEnd = function () {
    var ch = this.chapter();
    var self = this;
    if (ch.endEvents && !this._endEventsChecked) {
      this._endEventsChecked = true;
      this.pendingEndEvents = ch.endEvents.filter(function (e) { return self.check(e.if).ok; });
    }
    if (this.pendingEndEvents && this.pendingEndEvents.length > 0) {
      this.currentEndEvent = this.pendingEndEvents.shift();
      this.phase = 'endEvent';
      return { type: 'endEvent', event: this.currentEndEvent };
    }
    this._endEventsChecked = false;
    // 历史修正
    var band = this.devBand();
    if (band > 0) {
      var pool = this.d.CORRECTIONS.filter(function (c) { return self.dev >= c.minDev && self.dev <= c.maxDev; });
      if (pool.length > 0) {
        var roll = this.rng();
        var anyChance = pool.some(function (c) { return roll < c.chance; });
        if (anyChance || band >= 2) {
          var c = pool[Math.floor(this.rng() * pool.length)];
          var eff = JSON.parse(JSON.stringify(c.eff));
          if (eff.attrs) Object.keys(eff.attrs).forEach(function (k) { if (k === 'weiji' && eff.attrs[k] > 0) eff.attrs[k] = Math.round(eff.attrs[k] * self.diff.corr); });
          var changes = this.applyEff(eff);
          var forced = this.checkDeath();
          this.correction = { title: c.title, segs: c.segs, changes: changes, forced: forced };
          this._corrShown = c.title;
          this.phase = 'correction';
          return { type: 'correction', correction: this.correction };
        }
      }
    }
    return this.makeSummary();
  };

  Game.prototype.endEventChoose = function (i) {
    var ev = this.currentEndEvent;
    var o = ev.options[i];
    var changes = this.applyEff(o.eff || {});
    var devDelta0 = (o.eff && o.eff.dev) || 0;
    if (devDelta0 > 0) this.chapterDev.push({ ev: ev.title, t: o.t, dev: devDelta0 });
    this.currentEndEvent = null;
    // 章末事件结算同样过死亡判定（GDD 4.1）；致死则强制收束，UI 据 forcedEnding 路由
    var forcedEnding = this.checkDeath();
    var r = { text: o.res, changes: changes, devDelta: (o.eff && o.eff.dev) || 0, forcedEnding: !!forcedEnding };
    this._next = forcedEnding || (o.to ? this.resolveTo(o.to) : null);
    this.phase = 'settle';
    return r;
  };

  Game.prototype.proceedAfterEndEvent = function () {
    if (this._next) return this.proceed();
    return this.chapterEnd();
  };

  Game.prototype.correctionContinue = function () {
    if (this.correction && this.correction.forced) {
      this.finishEnding(this.correction.forced.ending, this.correction.forced.variant);
      return { type: 'ending' };
    }
    this.correction = null;
    return this.makeSummary();
  };

  /* ---------- 章末结算页（GDD 3.1/5.4：偏离归因 + 属性总览 + 修正说明） ---------- */
  Game.prototype.makeSummary = function () {
    var snapAttrs = (this.snapshot && this.snapshot.attrs) || this.d.INIT;
    var attrDelta = {}, self = this;
    Object.keys(this.d.ATTR_NAMES).forEach(function (k) {
      var d = self.attrs[k] - (snapAttrs[k] != null ? snapAttrs[k] : 0);
      if (d !== 0) attrDelta[k] = d;
    });
    var next = this.d.CHAPTERS[this.chapterIdx + 1] || null;
    this.phase = 'summary';
    return {
      type: 'summary',
      summary: {
        chapter: this.chapter().title,
        devLog: this.chapterDev.slice(),
        attrDelta: attrDelta,
        corrTitle: this._corrShown,
        notes: this.chapter().summaryNotes || [],
        nextTitle: next ? next.title : null,
        bandName: this.d.DEV_BANDS[this.devBand()].name,
        dev: this.dev
      }
    };
  };

  Game.prototype.proceedSummary = function () {
    return this.nextChapter();
  };

  Game.prototype.nextChapter = function () {
    if (this.chapterIdx + 1 < this.d.CHAPTERS.length) {
      this.enterChapter(this.chapterIdx + 1);
      return { type: 'chapter', chapter: this.chapter() };
    }
    return { type: 'none' };
  };

  /* ---------- 回溯 ---------- */
  Game.prototype.canBacktrack = function () {
    if (this.phase === 'home') return false;
    if (this.diff.backtrack === 0) return false;
    if (this.diff.backtrack > 0 && this.backtracksThisChapter >= this.diff.backtrack) return false;
    return !!this.snapshot;
  };

  Game.prototype.backtrack = function () {
    if (!this.canBacktrack()) return false;
    var s = this.snapshot;
    var keepDev = Math.max(s.dev, this.dev); // 偏离度不重置
    var keepAch = this.ach.slice();          // 已解锁成就/图鉴不重置（GDD 6.4）
    this.attrs = Object.assign({}, s.attrs);
    this.flags = Object.assign({}, s.flags);
    this.histScore = s.histScore;
    this.merits = s.merits.slice();
    this.ach = s.ach.slice();
    keepAch.forEach(function (a) { if (this.ach.indexOf(a) < 0) this.ach.push(a); }, this);
    this.keyChoices = s.keyChoices.slice();
    this.peak = Object.assign({}, s.peak);
    this.zg = s.zg != null ? s.zg : this.zg;
    this.dev = keepDev;
    this.eventId = s.eventId;
    this.pendingEventId = s.pendingEventId || null;
    this.currentRandom = s.currentRandom || null;
    this._crisisPlotPending = !!s.crisisPlotPending;
    // 回合制状态随快照恢复（offer 不存，回到 intro 后由 beginRounds 重发）
    this.keyRoundsLeft = s.keyRoundsLeft != null ? s.keyRoundsLeft : KEY_CARD_ROUNDS;
    this.actionUses = Object.assign({}, s.actionUses || {});
    this.passedEvents = Object.assign({}, s.passed || {});
    this.offer = null;
    this.backtracksThisChapter++;
    this.coef = Math.round(this.coef * 0.98 * 100) / 100;
    this.pendingEndEvents = [];
    this.currentEndEvent = null;
    this.correction = null;
    this._endEventsChecked = false;
    this.chapterDev = [];
    this._corrShown = null;
    this._backlashDone = false;
    this.phase = 'intro';
    return true;
  };

  /* ---------- 跨会话存档（GDD 6.4；引擎只出纯数据方法，存取/localStorage 归 UI 管） ----------
   * 存档语义 = 章首存档点，与回溯共用 snapshot 结构。*/

  // 剧情/普通难度（有回溯额度）且已有章首快照时导出纯 JSON 对象；硬核或无快照返回 null
  Game.prototype.exportSave = function () {
    if (this.diff.backtrack === 0) return null;
    if (!this.snapshot) return null;
    var s = JSON.parse(JSON.stringify(this.snapshot));
    // currentRandom 是整只事件对象：序列化只存其 id，恢复时按 id 从事件池重建（见 importSave）
    s.currentRandomId = this.snapshot.currentRandom ? this.snapshot.currentRandom.id : null;
    delete s.currentRandom;
    return { diffKey: this.diffKey, chapterIdx: this.chapterIdx, snapshot: s };
  };

  // 从 RANDOM / CRISIS 事件池按 id 重建插入事件（BACKLASH 为临时构造对象，不在池中）
  Game.prototype._findInsertEvent = function (id) {
    var pools = [this.d.RANDOM_EVENTS || []];
    if (this.d.CRISIS_EVENTS) {
      pools.push(this.d.CRISIS_EVENTS.plots || []);
      if (this.d.CRISIS_EVENTS.death) pools.push([this.d.CRISIS_EVENTS.death]);
      if (this.d.CRISIS_EVENTS.qingsuan) pools.push([this.d.CRISIS_EVENTS.qingsuan]);
    }
    for (var i = 0; i < pools.length; i++)
      for (var j = 0; j < pools[i].length; j++)
        if (pools[i][j].id === id) return pools[i][j];
    return null;
  };

  // 恢复到存档所示章的章首状态；校验失败返回 false
  Game.prototype.importSave = function (obj) {
    if (!obj || typeof obj !== 'object') return false;
    if (obj.diffKey !== this.diffKey) return false;   // 存档与难度绑定（难度系数不同，不可串档）
    if (typeof obj.chapterIdx !== 'number' || !this.d.CHAPTERS[obj.chapterIdx]) return false;
    var s = obj.snapshot;
    if (!s || !s.attrs) return false;
    // 逐项还原章首状态（口径同 backtrack，但不扣回溯系数、不计回溯次数）
    this.chapterIdx = obj.chapterIdx;
    this.attrs = Object.assign({}, s.attrs);
    this.dev = s.dev || 0;
    this.flags = Object.assign({}, s.flags || {});
    this.histScore = s.histScore || 0;
    this.merits = (s.merits || []).slice();
    this.ach = (s.ach || []).slice();
    this.keyChoices = (s.keyChoices || []).slice();
    this.peak = Object.assign({}, s.peak || {});
    this.zg = s.zg != null ? s.zg : ((this.d.HIDDEN && this.d.HIDDEN.init != null) ? this.d.HIDDEN.init : 30);
    this.eventId = s.eventId;
    this.pendingEventId = s.pendingEventId || null;
    this._crisisPlotPending = !!s.crisisPlotPending;
    this.keyRoundsLeft = s.keyRoundsLeft != null ? s.keyRoundsLeft : KEY_CARD_ROUNDS;
    this.actionUses = Object.assign({}, s.actionUses || {});
    this.passedEvents = Object.assign({}, s.passed || {});
    this.offer = null;
    // 章内进度分母口径：快照未存起点 id，按存档语义还原（有插入事件时 pendingEventId 即剧本起点）
    this._chapterStartId = s.pendingEventId || s.eventId || null;
    // 插入事件按 id 重建；查不到（如 BACKLASH）则回退到被插入的剧本事件并清空插入状态——
    // 反噬/际遇在插入时刻尚未结算，回到原事件重走一次即可，语义安全
    var rid = s.currentRandomId || null;
    var rev = rid ? this._findInsertEvent(rid) : null;
    if (rid && !rev) { this.eventId = this.pendingEventId || this.eventId; this.pendingEventId = null; }
    this.currentRandom = rev;
    // 章内状态按章首语义重置，并重建本章际遇牌堆（enterChapter 的同款过滤）
    this.backtracksThisChapter = 0;
    this.randomCount = 0;
    this.chapterDeck = (this.d.RANDOM_EVENTS || []).filter(function (e) {
      return obj.chapterIdx >= e.chapters[0] && obj.chapterIdx <= e.chapters[1];
    }).slice();
    this.chapterDev = [];
    this._corrShown = null;
    this._backlashDone = false;
    this.pendingEndEvents = [];
    this.currentEndEvent = null;
    this.correction = null;
    this._endEventsChecked = false;
    this.introNotes = [];
    this._newAch = [];
    this._skipRandom = false;
    // 以还原后的状态重拍快照，本章内的回溯仍回到同一章首点
    this.snapshot = this.makeSnapshot();
    this.phase = 'intro';
    return true;
  };

  /* ---------- 结局 ---------- */
  Game.prototype.finishEnding = function (id, variant) {
    this._newAch = [];
    // 数据驱动结局成就：ENDINGS[E].ach[] + variantAch[variant][]；逆天结局通用追加 nitian（剧本有定义时）
    var def0 = this.d.ENDINGS[id];
    var achIds = (def0 && def0.ach || []).slice();
    if (def0 && def0.variantAch && variant && def0.variantAch[variant]) achIds = achIds.concat(def0.variantAch[variant]);
    if (def0 && def0.nitian && this.d.ACHIEVEMENTS && this.d.ACHIEVEMENTS.nitian) achIds.push('nitian');
    var selfAch = this;
    achIds.forEach(function (a) { selfAch.unlockAch(a); });
    this.ending = this.buildEnding(id, variant);
    var self = this;
    this.ending.achNew = (this._newAch || []).map(function (a) { return self.d.ACHIEVEMENTS[a]; }).filter(Boolean).join('、') || null;
    this.phase = 'ending';
  };

  Game.prototype.buildEnding = function (id, variant) {
    var self = this;
    var def = this.d.ENDINGS[id];
    var v = variant && def.variants ? def.variants[variant] : null;
    var meritScore = 0;
    var meritMap = this.d.MERIT_MAP || { '长史': 5, '廷尉': 8, '丞相': 20, '郡县': 15, '书同文': 15 }; // 剧本可覆写（MERIT_MAP）
    this.merits.forEach(function (m) { meritScore += meritMap[m] || 8; });
    var gongye = clamp(this.peak.quanshi * 0.6 + meritScore);
    var cuncun = def.cuncun;
    // GDD 四章章末注：韩非存活至结局，史评 +10（clamp 前计入）
    // 史评加成（数据驱动：数据顶层 SHIPING_BONUS_FLAGS = [{flag, bonus}]）
    var shipBonus = 0;
    (this.d.SHIPING_BONUS_FLAGS || []).forEach(function (sb) { if (self.flags[sb.flag]) shipBonus += sb.bonus; });
    var shiping = clamp(50 + this.histScore * 0.5 + shipBonus);
    if (def.seal === '循史') shiping = Math.max(shiping, 35); // 成为正史本身，史评有下限
    var yingxiang = clamp(this.dev * 0.6 + gongye * 0.4); // 历史影响 = 改写幅度 + 功业高度
    var raw = 0.35 * gongye + 0.25 * cuncun + 0.20 * shiping + 0.20 * yingxiang;
    var total = raw * this.diff.coef * (def.nitian ? 1.15 : 1) * this.coef;
    total = Math.round(total);
    var grade = total >= 85 ? 'S' : total >= 70 ? 'A' : total >= 55 ? 'B' : total >= 40 ? 'C' : 'D';
    var devC = this.dev;
    var epilogue;
    if (devC <= 20) epilogue = '你完整复刻了他的一生，包括他的错误。史书翻到今天，仍写着你的名字与骂名。历史给了你所有提示，你决定照抄一遍——这也是一种玩法。';
    else if (devC <= 45) epilogue = '你在大势之内做了几次小小的挣扎。史书的正文没有变，但字里行间，多了几处只有你知道的批注。';
    else epilogue = '史官的笔追不上你。从某个抉择开始，这就成了一段无人见过的新历史——无论结局如何，它属于你。';
    // GDD 8 章 0-4-B / 4-1-A 设计备注：乡愁（xiangchou）与知止（zhizhi）影响 E4 史传尾声，两段可叠加
    var zhuan = v ? v.zhuan : def.zhuan;
    // 数据驱动的史传尾声叠加：ENDINGS[E].zhuanAppends = [{ if, text }]
    if (def.zhuanAppends) {
      def.zhuanAppends.forEach(function (za) {
        if (!za.if || self.check(za.if).ok) zhuan += za.text;
      });
    }
    // GDD 4-5-B 设计备注：焚书折中（zhezhong）——E4/E6 史传追加尾声句（官藏代焚，书得不绝）
    if ((id === 'E4' || id === 'E6') && this.flags.zhezhong) zhuan += '史又曰：焚书之议起，斯以官藏代焚，典籍得不绝于灰烟。天下读书人受其赐而不知，斯亦终不自言。';
    return {
      id: id, variant: variant,
      name: v ? v.name : def.name,
      seal: def.seal,
      zhuan: zhuan,
      nitian: def.nitian,
      aliveNote: (function () { var an = def.aliveNote || self.d.ALIVE_NOTE; return (an && self.flags[an.flag]) ? an.text : null; })(), // 结局附加提示（数据驱动）
      scores: { gongye: gongye, cuncun: cuncun, shiping: shiping, yingxiang: yingxiang },
      merits: this.merits.slice(),
      dev: this.dev,
      total: total, grade: grade,
      diffName: this.diff.n,
      review: this.keyChoices.slice(),
      epilogue: epilogue
    };
  };

  /* ---------- 随机际遇 ----------
   * 由 UI 在每回合结算后（phase 'round'）或进入事件后（phase 'event'）调用；
   * 触发则当前事件被替换为际遇事件（phase 转 'event'），际遇选项 to:'RETURN'
   * 结算后由 proceed 回到被插入的剧本事件并重发一回合。 */
  Game.prototype.maybeRandom = function () {
    if (this._skipRandom) { this._skipRandom = false; return null; }
    var inPlay = (this.phase === 'event' || this.phase === 'round');
    // GDD 4.1 危机 70–89：每章确定性注入一次构陷/暗杀际遇（不走概率、不占 randomCount 配额）
    if (this._crisisPlotPending && inPlay && !this.currentRandom) {
      var ppool = (this.d.CRISIS_EVENTS && this.d.CRISIS_EVENTS.plots) || [];
      if (ppool.length > 0) {
        this._crisisPlotPending = false;
        var pev = ppool[Math.floor(this.rng() * ppool.length)];
        this.pendingEventId = this.eventId;
        this.eventId = pev.id;
        this.currentRandom = pev;
        this.phase = 'event';
        return pev;
      }
    }
    if (!this.randomOn) return null;
    if (!inPlay || this.currentRandom) return null;
    // 逆天段（偏离≥71）：章中随机反噬一次，复用际遇插入机制（GDD 5.2）
    if (!this._backlashDone && this.devBand() >= 3 && this.rng() < this.randomChance) {
      this._backlashDone = true;
      var bpool = this.d.CORRECTIONS.filter(function (c) { return c.minDev >= 71; });
      if (bpool.length > 0) {
        var bc = bpool[Math.floor(this.rng() * bpool.length)];
        var bev = { id: 'BACKLASH', title: bc.title, segs: bc.segs,
          options: [{ t: '咬牙撑住', res: '你挺过了这一波反噬——代价已经付清，路还要继续走。', eff: JSON.parse(JSON.stringify(bc.eff)), to: 'RETURN' }] };
        this.pendingEventId = this.eventId;
        this.eventId = bev.id;
        this.currentRandom = bev;
        this.phase = 'event';
        return bev;
      }
    }
    if (this.randomCount >= this.randomMax || this.chapterDeck.length === 0) return null;
    if (this.rng() >= this.randomChance) return null;
    // 从章内牌堆抽取（不重复），动态条件不满足则跳过本次
    var idx = Math.floor(this.rng() * this.chapterDeck.length);
    var ev = this.chapterDeck.splice(idx, 1)[0];
    if (ev.cond && !this.check(ev.cond).ok) return null;
    this.pendingEventId = this.eventId;
    this.eventId = ev.id;
    this.currentRandom = ev;
    this.randomCount++;
    this.phase = 'event';
    return ev;
  };

  /* 状态词（硬核模式） */
  Game.prototype.attrWord = function (k) {
    var def = null;
    this.d.ATTRS.forEach(function (a) { if (a.k === k) def = a; });
    var v = this.attrs[k];
    for (var i = 0; i < def.words.length; i++) if (v >= def.words[i][0]) return def.words[i][1];
    return def.words[def.words.length - 1][1];
  };

  /* 赵高威胁度的模糊状态词（剧情/普通难度可见，GDD 4.4） */
  Game.prototype.zgWord = function () {
    var words = (this.d.HIDDEN && this.d.HIDDEN.words) || [[70, '杀机毕露'], [50, '图穷匕见'], [35, '隐约不安'], [0, '敛迹藏锋']];
    for (var i = 0; i < words.length; i++) if (this.zg >= words[i][0]) return words[i][1];
    return words[words.length - 1][1];
  };

  return { Game: Game, KEY_CARD_ROUNDS: KEY_CARD_ROUNDS };
});
