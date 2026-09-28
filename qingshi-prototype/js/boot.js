/* js/boot.js —— 剧本注册、初始化与全部顶层事件绑定（自 index.html 内联脚本原样搬移，行为零变化） */

  /* 剧本注册表（多剧本架构）：key = 剧本 id */
  var SCENARIOS = { lisi: window.GAME_DATA, jingke: window.JINGKE_DATA, hanxin: window.HANXIN_DATA, xiangyu: window.XIANGYU_DATA, chensheng: window.CHENSHENG_DATA };

  loadTts();

  document.getElementById('btnTts').onclick = function(){
    tts.on = !tts.on; saveTts(); refreshTtsBtns();
    if (tts.on) speakMain(); else ttsCancel();
  };
  document.getElementById('btnTtsRate').onclick = function(){
    tts.rate = (tts.rate < 1) ? 1.1 : 0.9;   // 两档循环：慢 0.9 / 常 1.1
    saveTts(); refreshTtsBtns();
  };

  document.getElementById('btnAttrs').onclick = function(){ openDrawer('attrs'); };
  document.getElementById('btnGloss').onclick = function(){ if (game) openDrawer('gloss'); };
  document.getElementById('drawerMask').onclick = function(){ document.getElementById('drawer').className=''; };
  document.getElementById('btnBack').onclick = function(){
    if (game && game.canBacktrack()){ game.backtrack(); renderIntro(true); }
  };

  document.getElementById('glossClose').onclick = function(){ document.getElementById('glossMask').className=''; };
  document.getElementById('glossMask').onclick = function(e){ if (e.target === this) this.className=''; };

  bindGloss(main);
  bindGloss(document.getElementById('settleText'));

  document.getElementById('shareClose').onclick = function(){ document.getElementById('shareMask').className = ''; };
  document.getElementById('shareMask').onclick = function(e){ if (e.target === this) this.className = ''; };

  refreshTtsBtns();
  renderHome();
