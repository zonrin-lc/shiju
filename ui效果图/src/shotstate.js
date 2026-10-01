/* 带交互的截图：node shotstate.js <html相对路径> <输出前缀> <宽> <高> <dsf> "<在页面里执行的表达式>" */
const fs=require('fs'),path=require('path'),http=require('http');
const CHROME='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const REPO='D:\\MUSI\\SHIJU';
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.otf':'font/otf'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function serve(root,port){return new Promise(res=>{const s=http.createServer((rq,rs)=>{let p=decodeURIComponent(rq.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.normalize(path.join(root,p));fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404);rs.end('nf');return;}rs.writeHead(200,{'Content-Type':MIME[path.extname(f).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store'});rs.end(d);});});s.listen(port,'127.0.0.1',()=>res(s));});}
(async()=>{
  const [htmlFile,outPrefix,W0,H0,dsf0,expr]=process.argv.slice(2);
  const W=+W0||460,H=+H0||900,DSF=+dsf0||2;
  const PORT=9230;
  const srv=await serve(REPO,PORT+1);
  const browser=fs.existsSync(CHROME)?CHROME:EDGE;
  const {spawn}=require('child_process');
  const proc=spawn(browser,['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--user-data-dir=C:\\Users\\28283\\AppData\\Local\\Temp\\opencode\\cdp-s','--remote-debugging-port='+PORT,'--window-size='+W+','+H,'about:blank'],{stdio:'ignore'});
  let ws,id=0;const pend=new Map();
  const send=(m,p,s)=>new Promise((res,rej)=>{const i=++id;pend.set(i,{res,rej});ws.send(JSON.stringify({id:i,method:m,params:p||{},sessionId:s}));});
  try{
    let ver=null;
    for(let i=0;i<60;i++){try{ver=await(await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();break;}catch(e){await sleep(250);}}
    ws=new WebSocket(ver.webSocketDebuggerUrl);
    await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
    ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);m.error?p.rej(new Error(m.error.message)):p.res(m.result);}};
    const {targetId}=await send('Target.createTarget',{url:'about:blank'});
    const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
    const S=(m,p)=>send(m,p,sessionId);
    await S('Page.enable');await S('Runtime.enable');
    await S('Emulation.setDeviceMetricsOverride',{width:W,height:H,deviceScaleFactor:DSF,mobile:true,screenWidth:W,screenHeight:H});
    await S('Page.navigate',{url:'http://127.0.0.1:'+(PORT+1)+'/'+htmlFile});
    await sleep(2200);
    if(expr) await S('Runtime.evaluate',{expression:expr,awaitPromise:true});
    await sleep(900);
    const {data}=await S('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});
    const out=outPrefix+'.png';
    fs.writeFileSync(out,Buffer.from(data,'base64'));
    console.log('saved '+out+'  ('+(fs.statSync(out).size/1024|0)+' KB)');
  }finally{try{ws&&ws.close();}catch(e){}try{proc.kill();}catch(e){}srv.close();await sleep(200);}
})().catch(e=>{console.error('ERR '+e.message);process.exit(1);});