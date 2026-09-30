const fs = require('fs');
const path = require('path');
const http = require('http');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9223, REPO = 'D:\\MUSI\\SHIJU';
const MIME = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml' };
function serve(root, port){ return new Promise(res=>{ const s=http.createServer((rq,rs)=>{ let p=decodeURIComponent(rq.url.split('?')[0]); if(p==='/')p='/index.html'; const f=path.normalize(path.join(root,p)); fs.readFile(f,(e,d)=>{ if(e){rs.writeHead(404);rs.end();return;} rs.writeHead(200,{'Content-Type':MIME[path.extname(f).toLowerCase()]||'application/octet-stream'}); rs.end(d); }); }); s.listen(port,'127.0.0.1',()=>res(s)); }); }
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const page = process.argv[2];
  const expr = process.argv[3];
  const srv = await serve(REPO, PORT+1);
  const browser = fs.existsSync(CHROME)?CHROME:EDGE;
  const {spawn}=require('child_process');
  const proc = spawn(browser,['--headless=new','--disable-gpu','--no-first-run','--user-data-dir=C:\\Users\\28283\\AppData\\Local\\Temp\\opencode\\cdp-dbg','--remote-debugging-port='+PORT,'--window-size=460,900','about:blank'],{stdio:'ignore'});
  let ws,id=0; const pend=new Map();
  const send=(m,p,s)=>new Promise((res,rej)=>{const i=++id;pend.set(i,{res,rej});ws.send(JSON.stringify({id:i,method:m,params:p||{},sessionId:s}));});
  try{
    let ver=null;
    for(let i=0;i<60;i++){ try{ver=await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();break;}catch(e){await sleep(250);} }
    ws=new WebSocket(ver.webSocketDebuggerUrl);
    await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
    ws.onmessage=ev=>{const m=JSON.parse(ev.data); if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);m.error?p.rej(new Error(m.error.message)):p.res(m.result);}};
    const {targetId}=await send('Target.createTarget',{url:'about:blank'});
    const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
    const S=(m,p)=>send(m,p,sessionId);
    await S('Page.enable'); await S('Runtime.enable');
    await S('Emulation.setDeviceMetricsOverride',{width:460,height:900,deviceScaleFactor:1,mobile:false});
    await S('Page.navigate',{url:'http://127.0.0.1:'+(PORT+1)+'/'+page});
    await sleep(1600);
    const r = await S('Runtime.evaluate',{expression:expr,returnByValue:true});
    console.log(JSON.stringify(r.result.value,null,1));
  } finally { try{ws&&ws.close();}catch(e){} try{proc.kill();}catch(e){} srv.close(); await sleep(200); }
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
