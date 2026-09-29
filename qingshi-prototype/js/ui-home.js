/* js/ui-home.js —— 主页：开局与剧本/难度/存档入口（自 index.html 内联脚本原样搬移，行为零变化） */

  function newGame(scenKey, diffKey){
    game = new E.Game(SCENARIOS[scenKey], diffKey);
    var col = loadCollection();
    game.gloss = col.gloss.slice();
    game.ach = col.ach.slice();
    return game;
  }

  /* ---------- 主页（v1.6.7 按效果图重做：全幅城墙底图 + 剧本竖条卡横排 + 难度横排图钮） ---------- */
  function homeDivider(text){
    var d = el('div','homeDivider');
    d.innerHTML = '<img src="assets/ui/divider.png" alt=""><span>'+esc(text)+'</span><img class="r" src="assets/ui/divider.png" alt="">';
    return d;
  }
  function renderHome(){
    ttsCancel();
    document.getElementById('topbar').style.display='none';
    document.getElementById('app').classList.add('home-hero');
    clear(main); clear(optBox); overlay.style.display='none';
    main.appendChild(el('div','homeTitleImg','<img src="assets/ui/title.png" alt="青史生存录">'));
    main.appendChild(el('div','homeSub','如果你来走这一生 ｜ v' + APP_VERSION));
    // 剧本：横排竖条卡（主角立绘满铺 + 局名；选中金框高亮）。
    // 注：效果图原为「1 可玩 + 4 敬请期待（汉唐宋明占位）」，实际五剧本全可玩，按实况还原
    main.appendChild(homeDivider('选 择 剧 本'));
    var scenRow = el('div','scenRow');
    Object.keys(SCENARIOS).forEach(function(k){
      var sc = SCENARIOS[k].SCENARIO;
      var juname = sc.name.split('·')[1] ? sc.name.split('·')[1].trim() : sc.name;
      var c = el('div','scenCard'+(k===selScen?' sel':''));
      c.innerHTML = '<img class="scenChar" src="assets/char/char_'+k+'.png" alt="">'+
        '<div class="scenName">'+esc(juname)+'</div>'+
        (sc.recommend && sc.recommend.indexOf('推荐') >= 0 ? '<div class="scenRec">推荐</div>' : '');
      c.onclick = function(){ selScen = k; renderHome(); };
      scenRow.appendChild(c);
    });
    main.appendChild(scenRow);
    // 难度：横排三钮（图底 + 名；说明文字按效果图不列——详情见 GDD 6.2）
    main.appendChild(homeDivider('选 择 难 度'));
    var diffRow = el('div','diffRow');
    ['story','normal','hardcore'].forEach(function(k){
      var df = SCENARIOS[selScen].DIFFICULTY[k];
      var b = el('button','diffBtn'+(k===selDiff?' sel':''), esc(df.n));
      b.onclick = function(){ selDiff = k; renderHome(); };
      diffRow.appendChild(b);
    });
    main.appendChild(diffRow);
    var start = el('button','startImgBtn','<img src="assets/ui/btn_ruju.png" alt="入局">');
    start.onclick = function(){ clearGameSave(); newGame(selScen, selDiff); game.start(); renderIntro(); };
    main.appendChild(start);
    // 跨会话存档（GDD 6.4）：当前所选剧本有有效存档则给「继续」入口，按存档难度恢复
    var sv = loadGameSave();
    if (sv){
      var SD = SCENARIOS[selScen];
      var svdf = SD.DIFFICULTY[sv.diffKey], svch = SD.CHAPTERS[sv.chapterIdx];
      var svLabel = '继 续 · 本章开局';
      if (svdf && svch) svLabel += '（'+svdf.n+' · '+svch.title.split('｜')[0].trim()+'）';
      var cont = el('button','contImgBtn', esc(svLabel));
      cont.onclick = function(){
        newGame(selScen, sv.diffKey);
        if (game.importSave(sv)) renderIntro();
        else { clearGameSave(); renderHome(); }   // 坏存档：清除并回到主页
      };
      main.appendChild(cont);
    }
  }
