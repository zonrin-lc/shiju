/* js/ui-event.js —— 章首/事件/章末事件与抉择、路由（自 index.html 内联脚本原样搬移，行为零变化） */

  /* ---------- 章首叙事（一小节一页：整页一次渲染全部段落，底部一个「继续」进入回合） ---------- */
  function renderIntro(fromBt){
    ttsCancel();
    refreshTop(); clear(main); clear(optBox);
    saveGame();   // 每次进入章首叙事即存档（GDD 6.4；回溯恢复的章首同样覆写，语义一致）
    lastSettleText = null;
    var ch = game.chapter();
    main.appendChild(el('div','chapKicker', ch.sub || ''));
    main.appendChild(el('div','chapHead', ch.title.split('｜')[1] ? ch.title.split('｜')[1].trim() : ch.title));
    var cast0 = renderCast(ch.intro); if (cast0) main.appendChild(cast0);
    var items0 = ch.intro.map(function(s){ return { cls: 'seg', html: rich(s) }; });
    (game.introNotes||[]).forEach(function(n){ items0.push({ cls: 'noteSeg', html: esc(n) }); });
    if (fromBt) items0.push({ cls: 'noteSeg', html: '【回溯】你回到了本章开头。偏离度与已解锁的成就、图鉴不会重置——做过的事，史书都记着。' });
    revealSegs(items0, function(){
      var btn = el('button','contBtn','继 续');
      btn.onclick = function(){ disableOpts(); handleRoute(game.beginEvents()); };   // beginEvents = beginRounds 别名 → {type:'round'}
      optBox.appendChild(btn);
      speakMain();
    });
    main.scrollTop = 0;
  }

  /* ---------- 事件（整页渲染全部段落，叙事之后直接跟选项区） ---------- */
  function renderEvent(){
    ttsCancel();
    refreshTop(); clear(main); clear(optBox);
    var ev = game.findEvent(game.eventId);
    if (!ev) return;
    main.appendChild(el('div','evKicker', game.currentRandom ? '际遇 · 随机事件' : game.chapter().title.split('｜')[0].trim()));
    main.appendChild(el('div','evTitle', esc(ev.title)));
    var segs = (ev.altSegs && game.flags[ev.altSegs.flag]) ? ev.altSegs.segs : ev.segs;
    var cast1 = renderCast(segs); if (cast1) main.appendChild(cast1);
    revealSegs(segs.map(function(s){ return { cls: 'seg', html: rich(s) }; }), function(){
      renderOptions();
      speakMain();
    });
    main.scrollTop = 0;
  }

  /* 险招（GDD 附录 J）：成功率展示——普通/剧情显示百分比，硬核显示档位词（隐藏数值口径） */
  function riskWord(rate){ return rate>=70?'七成':rate>=50?'五成':rate>=40?'四成':rate>=30?'三成':rate>=20?'二成':'一成五'; }
  function riskText(risky){
    var xb = game.xushi ? 10 : 0;
    var eff = Math.min(70, risky.rate + xb);
    var t = game.diff.hideAttrs ? ('成算 '+riskWord(eff)) : ('成功率 '+eff+'%');
    if (xb) t += '（含蓄势+10）';
    var gaps = risky.unmet.map(function(u){
      return game.diff.hideAttrs ? u.name+'不足' : (u.name+' '+u.have+'/'+u.need);
    }).join('、');
    return '⚠ 险招 · '+t+'（'+gaps+'）';
  }

  function renderOptions(){
    clear(optBox);
    var opts = game.getOptions();
    // 一次性教学：首次出现「史实选项变险招」时提示——史实选择不保证史实结果（v1.6.1）
    if (!game._taughtHistRisk && opts.some(function(o){ return o.hist && o.risky; })){
      game._taughtHistRisk = true;
      optBox.appendChild(el('div','optTeach','史实选择并不保证史实结果——你继承了他的选择，却没有继承他当时的条件。'));
    }
    opts.forEach(function(o, i){
      var b = el('button','opt'+(o.locked?' locked':'')+(o.risky?' risky':''), esc(o.opt.t));
      if (o.hist) b.appendChild(el('span','histmark','史'));
      if (o.locked && o.reason) b.appendChild(el('span','lockreason','🔒 '+esc(o.reason)));
      if (o.risky) b.appendChild(el('span','riskline', esc(riskText(o.risky))));
      if (!o.locked) b.onclick = function(){ doChoose(i); };
      optBox.appendChild(b);
    });
  }

  /* ---------- 结算 ---------- */
  function doChoose(i){
    disableOpts();
    var r = game.choose(i);
    if (!r) return;
    lastSettleText = r.text;
    var title = r.risk ? game.riskTitle(r) : '';
    showSettle(title, r.text, r.changes, r.devDelta, r.achNew, r.bandUp ? r.bandName : null, function(){
      if (r.failed){
        if (r.forcedEnding){ routeAfter(); return; }   // 险招失败且惩罚致死：走结局收束
        renderOptions(); return;                        // 失败烧毁该选项，留在本事件改选
      }
      routeAfter();
    });
  }

  function routeAfter(){
    var n = game.proceed();
    handleRoute(n);
  }

  function handleRoute(n){
    if (!n) return;
    if (n.type === 'round'){
      // 每回合结算后尝试际遇（GDD 4.1/附录C）；resumed 的回合（际遇 RETURN 回来）不重复触发
      if (!n.resumed){
        var rev = game.maybeRandom();
        if (rev){ renderEvent(); return; }   // 际遇触发：phase 已转 'event'，渲染事件页
      }
      renderRound();
    }
    else if (n.type === 'event') renderEvent();
    else if (n.type === 'ending') renderEnding();
    else if (n.type === 'chapter') renderIntro();
    else if (n.type === 'endEvent') renderEndEvent();
    else if (n.type === 'correction') showCorrection(n.correction);
    else if (n.type === 'summary') renderSummary(n.summary);
    else renderRound();
  }

  /* ---------- 章末事件 ---------- */
  function renderEndEvent(){
    ttsCancel();
    refreshTop(); clear(main); clear(optBox);
    var ev = game.currentEndEvent;
    main.appendChild(el('div','evTitle', esc(ev.title)));
    revealSegs(ev.segs.map(function(s){ return { cls: 'seg', html: rich(s) }; }), function(){
      ev.options.forEach(function(o, i){
        var b = el('button','opt', esc(o.t));
        b.onclick = function(){
          disableOpts();
          var r = game.endEventChoose(i);
          showSettle('', r.text, r.changes, r.devDelta, null, null, function(){
            var n = game.proceedAfterEndEvent();
            handleRoute(n);
          });
        };
        optBox.appendChild(b);
      });
      speakMain();
    });
    main.scrollTop = 0;
  }
