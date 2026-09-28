/* js/ui-home.js —— 主页：开局与剧本/难度/存档入口（自 index.html 内联脚本原样搬移，行为零变化） */

  function newGame(scenKey, diffKey){
    game = new E.Game(SCENARIOS[scenKey], diffKey);
    var col = loadCollection();
    game.gloss = col.gloss.slice();
    game.ach = col.ach.slice();
    return game;
  }

  /* ---------- 主页 ---------- */
  function renderHome(){
    ttsCancel();
    document.getElementById('topbar').style.display='none';
    document.getElementById('app').classList.add('home-hero');
    clear(main); clear(optBox); overlay.style.display='none';
    main.appendChild(el('div','homeTitle','青史生存录'));
    main.children[0].style.cssText = 'font-size:38px;letter-spacing:9px;margin-top:44px';
    main.appendChild(el('div','homeSub','如果你来走这一生 ｜ v' + APP_VERSION));
    main.appendChild(el('div','homeSub','—— 选 择 剧 本 ——'));
    var scenCards = [];
    Object.keys(SCENARIOS).forEach(function(k){
      var sc = SCENARIOS[k].SCENARIO;
      var c = el('div','diffCard'+(k===selScen?' sel':''),
        '<div class="dn">'+sc.name+'</div><div class="dd">'+sc.era+' ｜ '+sc.desc+'<br>'+sc.recommend+'</div>');
      var bgMap = {lisi:'assets/bg/bg_home_hero.jpg',jingke:'assets/bg/bg_card_jingke.jpg',hanxin:'assets/bg/bg_card_hanxin.jpg',xiangyu:'assets/bg/bg_card_xiangyu.jpg',chensheng:'assets/bg/bg_card_chensheng.jpg'};
      if (bgMap[k]){ c.style.backgroundImage='linear-gradient(rgba(23,20,15,.80),rgba(23,20,15,.90)),url("'+bgMap[k]+'")'; c.style.backgroundSize='cover'; c.style.backgroundPosition='center'; }
      c.onclick = function(){ selScen=k; scenCards.forEach(function(x){x.el.className='diffCard';}); c.className='diffCard sel'; renderHome(); };
      scenCards.push({el:c,k:k}); main.appendChild(c);
    });
    main.appendChild(el('div','homeSub','—— 选 择 难 度 ——'));
    var cards = [];
    ['story','normal','hardcore'].forEach(function(k){
      var df = SCENARIOS[selScen].DIFFICULTY[k];
      var c = el('div','diffCard'+(k===selDiff?' sel':''), '<div class="dn">'+df.n+'</div><div class="dd">'+df.desc+'</div>');
      c.onclick = function(){ selDiff=k; cards.forEach(function(x){x.el.className='diffCard';}); c.className='diffCard sel'; };
      cards.push({el:c,k:k}); main.appendChild(c);
    });
    var start = el('button','bigBtn','入 局');
    start.onclick = function(){ clearGameSave(); newGame(selScen, selDiff); game.start(); renderIntro(); };
    main.appendChild(start);
    // 跨会话存档（GDD 6.4）：当前所选剧本有有效存档则给「继续」入口，按存档难度恢复
    var sv = loadGameSave();
    if (sv){
      var SD = SCENARIOS[selScen];
      var svdf = SD.DIFFICULTY[sv.diffKey], svch = SD.CHAPTERS[sv.chapterIdx];
      var svLabel = '继 续 · 本章开局';
      if (svdf && svch) svLabel += '（'+svdf.n+' · '+svch.title.split('｜')[0].trim()+'）';
      var cont = el('button','ghostBtn', esc(svLabel));
      cont.onclick = function(){
        newGame(selScen, sv.diffKey);
        if (game.importSave(sv)) renderIntro();
        else { clearGameSave(); renderHome(); }   // 坏存档：清除并回到主页
      };
      main.appendChild(cont);
    }
  }
