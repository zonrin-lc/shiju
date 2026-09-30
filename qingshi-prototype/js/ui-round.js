/* js/ui-round.js —— 回合页与出牌/蓄势（自 index.html 内联脚本原样搬移，行为零变化） */

  /* ---------- 回合页（行动卡回合制主界面：关键事件卡 ×1 + 行动卡 ×3） ---------- */
  function renderRound(){
    ttsCancel();
    refreshTop(); clear(main); clear(optBox);
    var offer = game.getOffer();
    var key = null;
    offer.forEach(function(e){ if (e.type === 'key') key = e; });
    main.appendChild(el('div','chapKicker', game.chapter().title));
    if (lastSettleText) main.appendChild(el('div','settleEcho', rich(lastSettleText)));
    main.appendChild(el('div','roundGuide',
      '经营以蓄势——关键事件「'+esc(key ? key.title : '')+'」余 '+(key ? key.roundsLeft : 0)+' 轮后自动开启；届时抉择，须你亲定。'+
      (lastSettleText ? '' : '行动卡用完即开。')));
    offer.forEach(function(e, i){
      if (e.type === 'key'){
        // 关键事件卡（v1.5 起被动）：金边（危机插入事件赤边）+ 「史」/「！」徽标 + 倒计时——不可点，行动卡用尽（倒计时归零）自动开启抉择页
        var ev = game.findEvent(e.eventId);
        var isHist = ev && ev.options && ev.options.some(function(o){ return o.hist; });
        var c = el('div','card key passive'+(e.inserted ? ' crisis' : ''));
        c.innerHTML = '<div class="cardKicker">'+(e.inserted ? '危机迫近 · 插入事件' : '关键事件')+' ｜ 余 '+e.roundsLeft+' 轮后开启</div>'+
          '<div class="cardTitle">'+esc(e.title)+'</div>'+
          '<span class="cardBadge">'+(e.inserted || !isHist ? '!' : '史')+'</span>';
        optBox.appendChild(c);
      } else {
        // 行动卡：名称 + desc + 收益递减提示；locked 防御渲染（硬门槛不入池）；risky 险招徽章（属性软门槛）
        var a = e.action;
        var b = el('button','card'+(e.locked ? ' locked' : '')+(e.risky ? ' risky' : ''));
        var h = '<div class="cardTitle">'+esc(a ? a.name : String(e.id))+'</div>';
        if (a && a.desc) h += '<div class="cardDesc">'+esc(a.desc)+'</div>';
        if (e.diminishing) h += '<div class="cardDim">已用 '+e.usedCount+' 次 · 收益递减</div>';
        if (e.locked && e.reason) h += '<div class="cardLock">🔒 '+esc(e.reason)+'</div>';
        if (e.risky) h += '<div class="riskline">'+esc(riskText(e.risky, false))+'</div>';
        b.innerHTML = h;
        if (!e.locked) b.onclick = function(){ doPlayCard(i); };
        optBox.appendChild(b);
      }
    });
    // 蓄势卡（v1.6）：放弃本轮出牌，为下一次事件抉择蓄一分胜算（险招 +10，限一次）
    var xs = el('button','card xushi'+(game.xushi ? ' active' : ''));
    xs.innerHTML = '<div class="cardTitle">蓄势 · 静观其变</div>'+
      '<div class="cardDesc">'+(game.xushi ? '已蓄势——下一次事件抉择的险招成功率 +10' : '不出手牌，为下一次事件抉择蓄一分胜算（险招成功率 +10，无险招则落空）')+'</div>';
    if (!game.xushi) xs.onclick = function(){ disableOpts(); doXushi(); };
    optBox.appendChild(xs);
    main.scrollTop = 0;
  }

  function doXushi(){
    var r = game.playXushi();
    if (!r) return;
    showSettle('蓄势', r.text, r.changes, 0, null, null, function(){
      if (r.forcedEnding){ handleRoute(game.proceed()); return; }
      if (r.forcedKey){ renderEvent(); return; }   // 倒计时归零：进入关键事件抉择页
      handleRoute(r.route || { type: 'round' });
    });
  }

  /* ---------- 出牌 ---------- */
  function doPlayCard(i){
    disableOpts();
    var r = game.playCard(i);
    if (!r) return;
    if (r.kind === 'key'){ renderEvent(); return; }   // 关键事件卡 → 现有事件决策流
    // 行动卡：先弹行动结算
    lastSettleText = r.text;
    var actTitle = r.risk ? game.riskTitle(r) : '行动';
    showSettle(actTitle, r.text, r.changes, r.devDelta, r.achNew, null, function(){
      if (r.forcedEnding){ handleRoute(game.proceed()); return; }   // 行动致死：phase='settle'，需再 proceed 收束
      if (r.forcedKey){ renderEvent(); return; }   // 倒计时归零：强制进入关键事件，玩家亲自抉择
      handleRoute(r.route || { type: 'round' });
    });
  }
