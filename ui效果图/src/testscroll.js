/* 卷轴交互验证：抓「拖动中」「松手瞬间」「回弹后」三态，并临时解锁朝代验证真实切换 */
const fs=require('fs'),path=require('path'),http=require('http');
const CHROME='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT=9226,REPO='D:\\MUSI\\SHIJU';
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.otf':'font/otf'};
function serve(root,port){return new Promise(res=>{const s=http.createServer((rq,rs)=>{let p=decodeURIComponent(rq.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.normalize(path.join(root,p));fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404);rs.end();return;}rs.writeHead(200,{'Content-Type':MIME[path.extname(f).toLowerCase()]||'application/octet-stream'});rs.end(d);});});s.listen(port,'127.0.0.1',()=>res(s));});}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const srv=await serve(REPO,PORT+1);
  const browser=fs.existsSync(CHROME)?CHROME:EDGE;
  const {spawn}=require('child_process');
  const proc=spawn(browser,['--headless=new','--disable-gpu','--no-first-run','--user-data-dir=C:\\Users\\28283\\AppData\\Local\\Temp\\opencode\\cdp-t2','--remote-debugging-port='+PORT,'--window-size=460,900','about:blank'],{stdio:'ignore'});
  let ws,id=0;const pend=new Map();
  const send=(m,p,s)=>new Promise((res,rej)=>{const i=++id;pend.set(i,{res,rej});ws.send(JSON.stringify({id:i,method:m,params:p||{},sessionId:s}));});
  const ev=async(e)=>{const r=await S('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text+' '+(r.exceptionDetails.exception||{}).description);return r.result.value;};
  try{
    let ver=null;
    for(let i=0;i<60;i++){try{ver=await(await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();break;}catch(e){await sleep(250);}}
    ws=new WebSocket(ver.webSocketDebuggerUrl);
    await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
    ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);m.error?p.rej(new Error(m.error.message)):p.res(m.result);}};
    const {targetId}=await send('Target.createTarget',{url:'about:blank'});
    const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
    var S=(m,p)=>send(m,p,sessionId);
    await S('Page.enable');await S('Runtime.enable');await S('Log.enable');await S('Network.enable');
    const errs=[],bad=[];
    ws.addEventListener('message',e=>{const m=JSON.parse(e.data);
      if(m.method==='Runtime.exceptionThrown')errs.push(JSON.stringify(m.params.exceptionDetails.text));
      if(m.method==='Log.entryAdded'&&m.params.entry.level==='error')errs.push(m.params.entry.text);
      if(m.method==='Network.responseReceived'&&m.params.response.status>=400)
        bad.push(m.params.response.status+' '+m.params.response.url);});
    await S('Emulation.setDeviceMetricsOverride',{width:460,height:900,deviceScaleFactor:1,mobile:false});
    await S('Page.navigate',{url:'http://127.0.0.1:'+(PORT+1)+'/qingshi-prototype/index.html'});
    await sleep(1800);

    // 三态采样：按下 -> 移动中 -> 松手瞬间 -> 回弹后
    const probe=async(dx,dy)=>{
      await ev(`(function(){
        var s=document.querySelector('.dynStrip');var r=s.getBoundingClientRect();
        window.__x0=r.left+r.width/2; window.__y0=r.top+r.height/2; window.__s=s; return 1;})()`);
      await ev(`(function(){window.__fire('mousedown',window.__x0,window.__y0);return 1;})()`)
        .catch(async()=>{await ev(`window.__fire=function(t,x,y){var e=new MouseEvent(t,{bubbles:true,cancelable:true,clientX:x,clientY:y});(t==='mousedown'?window.__s:window).dispatchEvent(e);return 1;}`);await ev(`window.__fire('mousedown',window.__x0,window.__y0)`);});
      await ev(`window.__fire('mousemove',window.__x0+${dx},window.__y0+${dy||0})`);
      const mid=await state();
      await ev(`window.__fire('mouseup',window.__x0+${dx},window.__y0+${dy||0})`);
      const just=await state();
      await sleep(560);          // 必须 > dynLayout 的 .38s 过渡，否则量到动画中间态
      const after=await state();
      return {mid,just,after};
    };
    const state=async()=>await ev(`(function(){
      var tr=document.querySelector('.dynTrack');
      var ax=document.querySelector('.dynAxisTrack');
      var go=document.querySelector('.goBtn');
      var cc=document.querySelector('.dynAxisCell.cur');
      var mk=document.querySelector('.dynAxisMark');
      var a=cc?cc.getBoundingClientRect():null, b=mk?mk.getBoundingClientRect():null;
      return {idx:dynIdx, tx:tr.style.transform,
        seal:document.querySelector('.dynSeal span').textContent,
        sealCls:document.querySelector('.dynSeal').className,
        sealX:Math.round(document.querySelector('.dynSeal').getBoundingClientRect().left),
        sealTx:document.querySelector('.dynSealTrack').style.transform||'none',
        /* 黏合度：红印中心与「当前刻度」中心的偏差。0 = 严丝合缝黏在朝代上。 */
        glue:(function(){var t=document.querySelectorAll('.dynTick')[dynIdx].getBoundingClientRect();
          var s=document.querySelector('.dynSeal').getBoundingClientRect();
          return Math.round((t.left+t.width/2)-(s.left+s.width/2));})(),
        dbg:'doc='+document.documentElement.scrollLeft+' strip='+(document.querySelector('.dynStrip')||{scrollLeft:-1}).scrollLeft
             +' vv='+(window.visualViewport?Math.round(window.visualViewport.offsetLeft)+'/'+Math.round(window.visualViewport.pageLeft):'n/a')
             +' sx='+Math.round(window.scrollX)
             +' stripL='+Math.round(document.querySelector('.dynStrip').getBoundingClientRect().left)
             +' sealTrackTx='+(document.querySelector('.dynSealTrack').style.transform||'none')
             +' stripW='+Math.round(document.querySelector('.dynStrip').clientWidth)
             +' seals='+document.querySelectorAll('.dynSeal').length,
        axisTx:ax?ax.style.transform:'(无)',
        axisCur:cc?cc.textContent:'(无)',
        btn:go?go.textContent:'(无)',
        btnCls:go?go.className:'(无)',
        align:(a&&b)?Math.round(a.left+a.width/2-(b.left+b.width/2)):null};})()`);
    const row=(l,r)=>{
      console.log(l.padEnd(14),'拖动中 刻度='+String(r.mid.tx).padEnd(20)+'红印='+String(r.mid.sealTx).padEnd(22)
        +'黏合='+String(r.mid.glue).padEnd(5)+'| 松手 刻度='+String(r.just.tx).padEnd(20)+'红印='+String(r.just.sealTx).padEnd(22)
        +'| 回弹后 刻度='+String(r.after.tx).padEnd(20)+'红印='+String(r.after.sealTx).padEnd(20)+'黏合='+r.after.glue+' idx='+r.after.idx);
      if (Math.abs(r.mid.glue)>1) console.log('    !! 拖动中红印脱离当前刻度');
      if (Math.abs(r.after.glue)>1) console.log('    !! 回弹稳定后红印脱离当前刻度（glue='+r.after.glue+'）');
      // 静止态红印必须居中（偏移 0）
      if (r.after.sealTx!=='translateX(0px)') console.log('    !! 静止后红印未回到屏心');
    };

    console.log('=== 拖动与吸附 ===');
    console.log('初始'.padEnd(14), JSON.stringify(await state()));
    row('左拖150', await probe(-150));
    row('左拖-600越界', await probe(-600));
    row('右拖300', await probe(300));
    row('竖拖120', await probe(0,120));
    row('左拖40(未过阈)', await probe(-40));

    // 逐格点选：先等上一手势的 350ms 吞点击窗口过去，并确认真的切过去了
    const pick=async(i)=>{
      await sleep(420);
      await ev(`document.querySelectorAll('.dynTick')[${i}].click()`);
      await sleep(500);
      const s=await state();
      if(s.idx!==i) console.log('  !点第'+i+'格未生效（idx='+s.idx+'）');
      return s;
    };
    console.log('\n=== 逐格点选：朝代应可自由切换，年代线跟随 ===');
    for(let i=0;i<5;i++){
      const s=await pick(i);
      console.log('  第'+i+'格 ->', 'idx='+s.idx, '印='+s.seal,
        '| 红印left='+s.sealX+'(应≈178)', '['+s.dbg+']', '| 年代高亮='+s.axisCur, '| 按钮="'+s.btn+'"',
        s.btnCls.indexOf('off')>=0?'(禁用态)':'(可点)', '| tx='+s.tx, '| 黏合='+s.glue, '| 指针偏差='+s.align+'px');
      if(s.sealX<170||s.sealX>186) console.log('    !! 红印偏离屏心，sealTrack 可能被误平移');
    }

    console.log('\n=== 底部「立即启程」按钮 ===');
    const q=await pick(0);
    const qinBtn=q.btn;
    await ev(`document.querySelector('.goBtn').click()`); await sleep(300);
    const afterQin=await ev(`homeStage`);
    await ev(`document.querySelector('.homeBack').click()`); await sleep(400);
    console.log(' 秦: 按钮="'+qinBtn+'" 点击后 stage='+afterQin+'（应为 scen）');

    const h=await pick(1);
    console.log(' 汉: 按钮="'+h.btn+'" idx='+h.idx);
    await ev(`document.querySelector('.goBtn').click()`); await sleep(100);
    const nud=await ev(`(document.querySelector('.goBtn')||{}).classList?document.querySelector('.goBtn').classList.contains('nudge'):'(按钮已消失)'`);
    const afterHan=await ev(`homeStage`);
    await sleep(400);
    await ev(`(document.querySelector('.dynSeal')||{click:function(){}}).click()`); await sleep(100);
    console.log('   点击后 stage='+afterHan+'（应仍 dynasty） 按钮晃动='+nud
      +' | 点红印后 stage='+await ev(`homeStage`)+'（应仍 dynasty）');

    console.log('\n=== 年代线与刻度带同步 ===');
    console.log(' ',await ev(`(function(){
      var t=document.querySelector('.dynTrack'), a=document.querySelector('.dynAxisTrack');
      var c=document.querySelector('.dynAxisCell.cur').getBoundingClientRect();
      return 'trackTx='+t.style.transform+'  axisTx='+a.style.transform+'  当前段中心='+Math.round(c.left+c.width/2)+'px(屏心230)';})()`));

    console.log('\n=== 往返 5 次后（检测 window 监听是否累积）===');
    await ev(`document.querySelectorAll('.dynTick')[0].click()`); await sleep(480);
    for(let i=0;i<5;i++){
      await ev(`document.querySelector('.goBtn').click()`); await sleep(180);
      await ev(`document.querySelector('.homeBack').click()`); await sleep(180);
    }
    console.log(' stage=', await ev(`homeStage`), ' dynStrip数=', await ev(`document.querySelectorAll('.dynStrip').length`));
    row('往返后再拖150', await probe(-150));
    console.log('JS错误     ', errs.length?errs.filter(e=>!/favicon/.test(e)).join(' | ')||'(仅 favicon)':'(无)');
    console.log('HTTP>=400 ', bad.length?bad.join(' | '):'(无)');
  }finally{try{ws&&ws.close();}catch(e){}try{proc.kill();}catch(e){}srv.close();await sleep(200);}
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});