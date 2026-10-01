/* js/ui-home.js —— 主页：开局与剧本/难度/存档入口（自 index.html 内联脚本原样搬移，行为零变化） */

  function newGame(scenKey, diffKey){
    game = new E.Game(SCENARIOS[scenKey], diffKey);
    var col = loadCollection();
    game.gloss = col.gloss.slice();
    game.ach = col.ach.slice();
    return game;
  }

  /* ---------- 主页（v1.6.9 两级化：朝代页 → 剧本页） ----------
   * 朝代页：游戏名 + 卷轴式朝代选择（当前朝代居中朱印，左右露角可横移切换；
   *   仅秦可玩，汉唐宋明为占位，滑到不可用朝代时阻尼回弹）；
   * 点秦 → 剧本页：剧本选择 + 难度选择 + 入局 + 继续（存档）。 */
  var homeStage = 'dynasty';
  var selFate = false;   // 剧本页是否选中「随机命局」（v1.7.0）

  /* 朝代数据：bg 为预留的每朝代底图（当前仅秦有图，占位朝代回落到通用水墨）。
     将来补画只需在此登记，不必改渲染逻辑。 */
  var DYNASTIES = [
    { name: '秦', era: '前 221 — 前 207', open: true,  bg: 'assets/ui/bg_ink.jpg' },
    { name: '汉', era: '前 202 — 220',   open: false, bg: null },
    { name: '唐', era: '618 — 907',      open: false, bg: null },
    { name: '宋', era: '960 — 1279',     open: false, bg: null },
    { name: '明', era: '1368 — 1644',    open: false, bg: null }
  ];
  var dynIdx = 0;          // 当前朝代下标
  var DYN_ON = 0;          // 卷轴中央（当前）刻度的位置，切换后对齐到这里
  var DYN_STEP = 104;      // 刻度间距，须与 CSS .dynTick width 一致

  function homeDivider(text){
    var d = el('div','homeDivider');
    d.innerHTML = '<img src="assets/ui/divider.png" alt=""><span>'+esc(text)+'</span><img class="r" src="assets/ui/divider.png" alt="">';
    return d;
  }

  /* ---------- 朝代页：卷轴横移选择 ----------
   * 布局：一条横向刻度带，5 个朝代等距排列；卷面可拖动，松手吸附到最近刻度。
   * 当前朝代居中且盖红印；相邻朝代露出窄条；不可用（未开放）朝代字为淡墨且阻尼不可停。 */
  function renderDynastyPage(){
    main.appendChild(el('div','homeTitleImg zhi','<img src="assets/ui/title_zhi.png" alt="青史志">'));
    main.appendChild(el('div','homeSub ink','悠悠千载　青史万卷<br>若置身棋局　当如何落子'));
    main.appendChild(homeDivider('选 择 朝 代'));

    var cur = DYNASTIES[dynIdx];
    var strip = el('div','dynStrip');
    var track = el('div','dynTrack');
    DYNASTIES.forEach(function(d, i){
      var t = el('div','dynTick'+(d.open ? ' open':'') , d.name);
      t.dataset.i = i;
      t.onclick = function(){ dynGo(i, true); };
      track.appendChild(t);
    });
    // 朱印：置于 track 首位（left:52px 即第 0 刻度中央），随卷面同步横移
    var seal = el('div','dynSeal');
    seal.innerHTML = '<img src="assets/ui/frame_red.png" alt=""><span>'+esc(cur.name)+'</span>';
    if (cur.open) seal.onclick = function(){ homeStage = 'scen'; renderHome(); };
    else seal.className = 'dynSeal locked';
    track.insertBefore(seal, track.firstChild);
    strip.appendChild(track);
    main.appendChild(strip);

    // 说明随当前朝代变化
    var note = cur.open ? '秦　现在就启程' : cur.name + '　敬请期待';
    main.appendChild(el('div','homeSub ink soon', note));
    main.appendChild(el('div','dynEra', esc(cur.era)));

    bindDynScroll(strip, track);
    dynLayout(true);
  }

  /* 卷面位置 → 刻度偏移（像素） */
  function dynOffset(){ return -(dynIdx - DYN_ON) * DYN_STEP; }

  /* 应用当前卷面位移到刻度带（朱印在 track 内，随之同步，无需单独处理） */
  function dynLayout(instant){
    var track = main.querySelector('.dynTrack');
    if (!track) return;
    track.style.transition = instant ? 'none' : 'transform .38s cubic-bezier(.22,.61,.36,1)';
    track.style.transform = 'translateX(' + dynOffset() + 'px)';
  }

  /* 切换到第 i 个朝代。fromUser=true 时对不可开放朝代做阻尼回弹。 */
  function dynGo(i, fromUser){
    i = Math.max(0, Math.min(DYNASTIES.length - 1, i));
    if (fromUser && !DYNASTIES[i].open){
      // 阻尼：轻微右推后回弹到原位，提示「尚未开放」
      var track = main.querySelector('.dynTrack');
      if (track){
        track.style.transition = 'transform .16s ease-out';
        track.style.transform = 'translateX(' + (dynOffset() + (i > dynIdx ? 16 : -16)) + 'px)';
        setTimeout(function(){ dynLayout(true); dynGo(dynIdx, false); }, 170);
      }
      return;
    }
    dynIdx = i;
    // 更新朱印文字与可点状态
    var seal = main.querySelector('.dynSeal');
    if (seal){
      var cur = DYNASTIES[dynIdx];
      seal.querySelector('span').textContent = cur.name;
      seal.className = cur.open ? 'dynSeal' : 'dynSeal locked';
      seal.onclick = cur.open ? function(){ homeStage = 'scen'; renderHome(); } : null;
    }
    // 说明与年代
    var cur2 = DYNASTIES[dynIdx];
    var note = main.querySelector('.homeSub.soon');
    if (note) note.textContent = cur2.open ? '秦　现在就启程' : cur2.name + '　敬请期待';
    var era = main.querySelector('.dynEra');
    if (era) era.textContent = cur2.era;
    dynLayout(false);
  }

  /* 手势：拖动卷面，松手吸附到最近刻度；越界（不可用）时阻尼 */
  function bindDynScroll(strip, track){
    var x0 = null, y0 = null, dx = 0, moved = false, locked = false;
    function down(e){
      var p = e.touches ? e.touches[0] : e;
      x0 = p.clientX; y0 = p.clientY; dx = 0; moved = false; locked = false;
      track.style.transition = 'none';
    }
    function move(e){
      if (x0 === null) return;
      var p = e.touches ? e.touches[0] : e;
      var ddx = p.clientX - x0, ddy = p.clientY - y0;
      if (!moved){
        if (Math.abs(ddy) > Math.abs(ddx) && Math.abs(ddy) > 8){ x0 = null; return; }  // 纵向意图 → 交还页面滚动
        if (Math.abs(ddx) > 6) moved = true;
        else return;
      }
      if (e.cancelable) e.preventDefault();
      dx = ddx;
      // 阻尼：越出可用范围时位移按 0.32 衰减，边缘"拉不动"
      var raw = dynOffset() + dx;
      var min = -(DYNASTIES.length - 1 - DYN_ON) * DYN_STEP;
      var max = DYN_ON * DYN_STEP;
      var over = 0;
      if (raw > max){ over = raw - max; raw = max + over * 0.32; }
      else if (raw < min){ over = raw - min; raw = min + over * 0.32; }
      track.style.transform = 'translateX(' + raw + 'px)';
    }
    function up(){
      if (x0 === null) return;
      x0 = null;
      if (!moved) return;                    // 轻点：交给 click 处理
      // 卷面实际停在 raw 处（已被阻尼裁剪），换算回目标刻度下标
      var raw = dynOffset() + dx;
      var t = Math.round(DYN_ON - raw / DYN_STEP);
      dynGo(Math.max(0, Math.min(DYNASTIES.length - 1, t)), true);
    }
    strip.addEventListener('mousedown', down);
    strip.addEventListener('touchstart', down, { passive: true });
    window.addEventListener('mousemove', move);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('mouseup', up);
    window.addEventListener('touchend', up);
    strip.addEventListener('click', function(e){
      if (moved){ e.stopPropagation(); e.preventDefault(); moved = false; }
    }, true);
  }


  function renderScenarioPage(){
    main.appendChild(el('div','homeTitleImg','<img src="assets/ui/title.png" alt="青史生存录">'));
    // 剧本：横排竖条卡（主角立绘满铺 + 局名；选中金框高亮）
    main.appendChild(homeDivider('选 择 剧 本'));
    var scenRow = el('div','scenRow');
    Object.keys(SCENARIOS).forEach(function(k){
      var sc = SCENARIOS[k].SCENARIO;
      var juname = sc.name.split('·')[1] ? sc.name.split('·')[1].trim() : sc.name;
      var c = el('div','scenCard'+(k===selScen?' sel':''));
      c.innerHTML = '<img class="scenChar" src="assets/char/char_'+k+'.png" alt="">'+
        '<div class="scenName">'+esc(juname)+'</div>'+
        (sc.recommend && sc.recommend.indexOf('推荐') >= 0 ? '<div class="scenRec">推荐</div>' : '');
      c.onclick = function(){ selScen = k; selFate = false; renderHome(); };
      scenRow.appendChild(c);
    });
    // 随机命局（v1.7.0，GDD 附录 R）：系统自己涌出的剧本——人物/初始属性/际遇池全随机
    var fc = el('div','scenCard fate'+(selFate ? ' sel' : ''));
    fc.innerHTML = '<div class="dynPlaceholder dynPlayable">命</div><div class="scenName">随机命局</div>';
    fc.onclick = function(){ selFate = true; renderHome(); };
    scenRow.appendChild(fc);
    main.appendChild(scenRow);
    // 难度：横排三钮（图底 + 名）
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
    start.onclick = function(){
      if (selFate){ startFate(); return; }
      clearGameSave(); newGame(selScen, selDiff); game.start(); renderIntro();
    };
    main.appendChild(start);
    // 跨会话存档（GDD 6.4）：当前所选剧本有有效存档则给「继续」入口，按存档难度恢复（随机命局无存档入口）
    var sv = loadGameSave();
    if (sv && !selFate){
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
    // 返回朝代页
    var back = el('button','homeBack','‹ 改选朝代');
    back.onclick = function(){ homeStage = 'dynasty'; renderHome(); };
    main.appendChild(back);
  }

  /* 随机命局开局（v1.7.0，GDD 附录 R）：fate.js 生成"第六剧本"——人物/初始属性/际遇池全随机；
   * 每次点击都是新种子，命局不可复现、无存档，每局即一生 */
  function startFate(){
    var seed = ((Date.now() % 2147483647) ^ Math.floor(Math.random() * 2147483647)) >>> 0;
    var r = QINGSHI_FATE.makeFate(SCENARIOS, QINGSHI_FATE.mulberry32(seed));
    game = new E.Game(r.data, selDiff);
    var col = loadCollection();
    game.gloss = col.gloss.slice();
    game.ach = col.ach.slice();
    game.start();
    renderIntro();
  }

  function renderHome(){
    ttsCancel();
    document.getElementById('topbar').style.display='none';
    var app = document.getElementById('app');
    app.classList.add('home-hero');
    app.classList.toggle('home-ink', homeStage === 'dynasty');
    clear(main); clear(optBox); overlay.style.display='none';
    if (homeStage === 'dynasty') renderDynastyPage();
    else renderScenarioPage();
  }
