/* js/ui-core.js —— 基础工具与共享状态（自 index.html 内联脚本原样搬移，行为零变化） */

  var APP_VERSION = '1.7.2';   // 界面版本号唯一来源（与 package.json version 同步，test-ui-contract.js 校验）
  var D = window.GAME_DATA, E = window.QINGSHI_ENGINE;

  var selScen = 'lisi', selDiff = 'normal';
  function scenId(){ return game ? game.d.SCENARIO.id : selScen; }
  var game = null;
  var main = document.getElementById('main');
  var optBox = document.getElementById('options');
  var overlay = document.getElementById('overlay');
  var lastSettleText = null;   // 最近一次结算叙事（行动 res / 事件 res），回合页主区回显

  function el(tag, cls, html){ var e=document.createElement(tag); if(cls)e.className=cls; if(html!=null)e.innerHTML=html; return e; }  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }
  /* 叙事富文本：⟦词条⟧ → 可点按的百科入口 */
  function rich(s){ return esc(s).replace(/⟦(.+?)⟧/g, '<span class="gloss" data-t="$1">$1</span>'); }

  /* 关键 NPC 立绘（assets/char/char_<id>.png）：NPC 名 → 文件 id */
  var CHAR_IMG = {
    '李斯':'lisi','荆轲':'jingke','韩信':'hanxin','项羽':'xiangyu','陈胜':'chensheng',
    '吴广':'wuguang','范增':'fanzeng','樊於期':'fanwuqi','扶苏':'fusu','高渐离':'gaojianli',
    '韩非':'hanfei','胡亥':'huhai','季布':'jibu','蒯通':'kuaitong','刘邦':'liubang',
    '李左车':'lizuoche','龙且':'longju','蒙恬':'mengtian','漂母':'piaomu','秦舞阳':'qinwuyang',
    '太子丹':'taizidan','田光':'tianguang','王翦':'wangjian','武臣':'wuchen','项伯':'xiangbo',
    '项梁':'xiangliang','萧何':'xiaohe','嬴政':'yingzheng','虞姬':'yuji','章邯':'zhanghan',
    '赵高':'zhaogao','郑国':'zhengguo','钟离眜':'zhonglimei'
  };

  /* 「出场」立绘排：扫描叙事文本中的 ⟦NPC⟧，有立绘者在标题下出一排圆像（点按开百科弹卡） */
  function renderCast(strs){
    var seen = {}, names = [];
    (strs || []).forEach(function(s){
      var re = /⟦(.+?)⟧/g, m;
      while ((m = re.exec(s))) { var t = m[1]; if (CHAR_IMG[t] && !seen[t]) { seen[t] = 1; names.push(t); } }
    });
    if (!names.length) return null;
    var row = el('div','castRow');
    names.forEach(function(t){
      var chip = el('button','castChip');
      chip.innerHTML = '<img src="assets/char/char_'+CHAR_IMG[t]+'.png" alt="'+esc(t)+'"><span>'+esc(t)+'</span>';
      if (game.d.GLOSSARY && game.d.GLOSSARY[t]) chip.onclick = function(){ showGloss(t); };
      row.appendChild(chip);
    });
    return row;
  }
  function clear(n){ while(n.firstChild) n.removeChild(n.firstChild); if (n === main) cancelReveal(); }

  /* 防连点：点击即禁用当前选项区全部按钮（下一次渲染会重建新按钮，无需解锁） */
  function disableOpts(){ var bs = optBox.querySelectorAll('button'); for (var i = 0; i < bs.length; i++) bs[i].disabled = true; }

  /* ---------- 叙事逐句渐显（v1.5）：文本从底部区域一句一句出现；点击正文区（非词条/立绘/按钮）速显全部 ---------- */
  var SEG_DELAY = 650;   // 每句间隔（ms）
  var revealing = null;  // 进行中的渐显 {cancel}
  function cancelReveal(){ if (revealing){ revealing.cancel(); } if (typeof main !== 'undefined' && main) main.onclick = null; }
  function revealSegs(items, done){
    // items: [{cls, html}]；逐条追加到 main 并滚到底部；全部显完（或速显）后调 done
    cancelReveal();
    var i = 0, timer = null;
    function flush(){ while (i < items.length){ var it = items[i++]; main.appendChild(el('div', it.cls, it.html)); } main.scrollTop = main.scrollHeight; }
    function step(){
      if (i >= items.length){ revealing = null; main.onclick = null; if (done) done(); return; }
      var it = items[i++];
      main.appendChild(el('div', it.cls, it.html));
      main.scrollTop = main.scrollHeight;   // 新句从底部区域出现
      timer = setTimeout(step, SEG_DELAY);
    }
    revealing = { cancel: function(){ clearTimeout(timer); flush(); revealing = null; main.onclick = null; if (done) done(); } };
    main.onclick = function(e){
      if (!revealing) return;
      if (e.target && e.target.closest && e.target.closest('.gloss,.castChip,button,a')) return;
      revealing.cancel();
    };
    step();   // 首句即显
  }

  /* 收集品（图鉴/成就）跨局持久化（按剧本分区） */
  function loadCollection(){
    try { var c = JSON.parse(localStorage.getItem('qingshi_collection_v1_' + scenId())); if (c && c.gloss && c.ach) return c; } catch(e){}
    return { gloss: [], ach: [] };
  }
  function saveCollection(){
    if (!game) return;
    try { localStorage.setItem('qingshi_collection_v1_' + game.d.SCENARIO.id, JSON.stringify({ gloss: game.gloss, ach: game.ach })); } catch(e){}
  }

  /* 跨会话存档（GDD 6.4）：章首存档点，引擎 exportSave/importSave 出纯数据，存取归 UI（按剧本分区） */
  function saveGame(){
    if (!game) return;
    if (game.d.SCENARIO.id === 'fate') return;   // 随机命局：每局即一生，不写跨会话存档（GDD 附录 R.3）
    var sv = game.exportSave();   // 硬核/无快照返回 null，不写
    if (sv) try { localStorage.setItem('qingshi_save_v1_' + game.d.SCENARIO.id, JSON.stringify(sv)); } catch(e){}
  }
  function loadGameSave(){
    try { var s = JSON.parse(localStorage.getItem('qingshi_save_v1_' + scenId())); if (s && s.diffKey && s.snapshot) return s; } catch(e){}
    return null;
  }
  function clearGameSave(){ try { localStorage.removeItem('qingshi_save_v1_' + scenId()); } catch(e){} }

  /* ---------- 配音朗读（Web Speech API；不支持时按钮隐藏、全域静默降级） ---------- */
  var tts = {
    supported: (typeof window.speechSynthesis !== 'undefined') && (typeof window.SpeechSynthesisUtterance !== 'undefined'),
    on: false, rate: 1.1
  };
  var TTS_KEY = 'qingshi_tts_v1';
  function loadTts(){
    try {
      var s = JSON.parse(localStorage.getItem(TTS_KEY));
      if (s){ tts.on = !!s.on; if (s.rate === 0.9 || s.rate === 1.1) tts.rate = s.rate; }
    } catch(e){}
  }
  function saveTts(){ try { localStorage.setItem(TTS_KEY, JSON.stringify({ on: tts.on, rate: tts.rate })); } catch(e){} }
  function ttsCancel(){ if (tts.supported) try { window.speechSynthesis.cancel(); } catch(e){} }
  function ttsSpeak(text){
    if (!tts.supported || !tts.on || !text) return;
    try {
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'zh-CN'; u.rate = tts.rate;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch(e){}
  }
  /* 朗读当前叙事页：拼接主区可见纯文本（跳过按钮；选项区在 #options，天然不入） */
  function speakMain(){
    if (!tts.on) return;
    var parts = [];
    for (var i = 0; i < main.children.length; i++){
      var n = main.children[i];
      if (n.tagName === 'BUTTON') continue;
      var t = n.textContent;
      if (t) parts.push(t);
    }
    ttsSpeak(parts.join('。'));
  }
  function refreshTtsBtns(){
    var bT = document.getElementById('btnTts'), bR = document.getElementById('btnTtsRate');
    if (!tts.supported){ bT.style.display='none'; bR.style.display='none'; return; }
    bT.textContent = tts.on ? '🔊' : '🔇';
    bR.style.display = tts.on ? '' : 'none';
    bR.textContent = tts.rate < 1 ? '慢' : '常';
  }

  /* ---------- 顶栏 ---------- */
  function refreshTop(){
    document.getElementById('topbar').style.display='';
    document.getElementById('app').classList.remove('home-hero');
    var ch = game.chapter();
    var title = ch ? ch.title : '';
    // 章内进度（GDD 3.3）：回合/事件阶段显示「章节名 · 事件 x/n」，际遇/危机插入不计（引擎口径）
    if (ch && (game.phase === 'round' || game.phase === 'event')){
      var prog = game.chapterProgress();
      title += ' · 事件 ' + prog.done + '/' + prog.total;
    }
    document.getElementById('chapTitle').textContent = title;
    var band = game.devBand();
    var bd = game.d.DEV_BANDS[band];
    var fill = document.getElementById('devFill');
    fill.style.width = game.dev + '%';
    fill.style.background = bd.color;
    var bandEl = document.getElementById('devBand');
    bandEl.textContent = bd.name;
    bandEl.style.color = bd.color;
    document.getElementById('devSeal').src = 'assets/icons/icon_dev' + (band + 1) + '.png';
    var btnB = document.getElementById('btnBack');
    btnB.disabled = !game.canBacktrack();
    btnB.textContent = game.diff.backtrack>0 ? ('回溯 '+ (game.diff.backtrack - game.backtracksThisChapter)) : '回溯';
  }
