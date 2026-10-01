/* 渲染首页第 2 屏（剧本页）：点击「秦」后截图 */
const fs=require('fs'),path=require('path'),http=require('http');
const CHROME='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT=9224,REPO='D:\\MUSI\\SHIJU';
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
function serve(root,port){return new Promise(res=>{const s=http.createServer((rq,rs)=>{let p=decodeURIComponent(rq.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.normalize(path.join(root,p));fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404);rs.end();return;}rs.writeHead(200,{'Content-Type':MIME[path.extname(f).toLowerCase()]||'application/octet-stream'});rs.end(d);});});s.listen(port,'127.0.0.1',()=>res(s));});}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const srv=await serve(REPO,PORT+1);
  const browser=fs.existsSync(CHROME)?CHROME:EDGE;
  const {spawn}=require('child_process');
  const proc=spawn(browser,['--headless=new','--disable-gpu','--no-first-run','--user-data-dir=C:\\Users\\28283\\AppData\\Local\\Temp\\opencode\\cdp-s2','--remote-debugging-port='+PORT,'--window-size=460,900','about:blank'],{stdio:'ignore'});
  let ws,id=0;const pend=new Map();
  const send=(m,p,s)=>new Promise((res,rej)=>{const i=++id;pend.set(i,{res,rej});ws.send(JSON.stringify({id:i,method:m,params:p||{},sessionId:s}));});
  try{
    let ver=null;
    for(let i=0;i<60;i++){try{ver=await(await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();break;}catch(e){await sleep(250);}}
    ws=new WebSocket(ver.webSocketDebuggerUrl);
    await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
    ws.onmessage=ev=>{const m=JSON.parse(ev.data);if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);m.error?p.rej(new Error(m.error.message)):p.res(m.result);}};
    const {targetId}=await send('Target.createTarget',{url:'about:blank'});
    const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
    const S=(m,p)=>send(m,p,sessionId);
    await S('Page.enable');await S('Runtime.enable');
    await S('Emulation.setDeviceMetricsOverride',{width:460,height:900,deviceScaleFactor:2,mobile:false,screenWidth:460,screenHeight:900});
    await S('Page.navigate',{url:'http://127.0.0.1:'+(PORT+1)+'/qingshi-prototype/index.html'});
    await sleep(1800);
    // 点「秦」进剧本页
    await S('Runtime.evaluate',{expression:"document.querySelector('.dynItem.sel').click()"});
    await sleep(1500);
    const info=await S('Runtime.evaluate',{expression:"JSON.stringify({ink:document.getElementById('app').classList.contains('home-ink'),stage:'scen'})",returnByValue:true});
    console.log('剧本页状态:',info.result.value);
    const box=await S('Runtime.evaluate',{expression:"(function(){var d=document.querySelector('.device')||document.getElementById('app');var r=d.getBoundingClientRect();return JSON.stringify({x:r.x+scrollX,y:r.y+scrollY,w:r.width,h:r.height});})()",returnByValue:true});
    const b=JSON.parse(box.result.value);
    const {data}=await S('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,fromSurface:true,clip:{x:b.x,y:b.y,width:b.w,height:b.h,scale:2}});
    fs.writeFileSync(process.argv[2],Buffer.from(data,'base64'));
    console.log('saved',process.argv[2]);
  }finally{try{ws&&ws.close();}catch(e){}try{proc.kill();}catch(e){}srv.close();await sleep(200);}
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
