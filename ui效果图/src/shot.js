/* CDP 截图器：零依赖（Node 22 原生 WebSocket + fetch）
 * 用法：node shot.js <html文件> <输出png> [宽] [高] [deviceScaleFactor]
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9222;
const REPO = 'D:\\MUSI\\SHIJU';

// ---- 极简静态服务器（serve 仓库根，页面用相对路径取 assets） ----
function serve(root, port) {
  return new Promise(res => {
    const MIME = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.svg':'image/svg+xml', '.json':'application/json', '.woff2':'font/woff2', '.woff':'font/woff', '.ttf':'font/ttf', '.otf':'font/otf' };
    const srv = http.createServer((req, rs) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      const f = path.normalize(path.join(root, p));
      if (f !== root && !f.startsWith(root + path.sep)) { rs.writeHead(403); rs.end(); return; }
      fs.readFile(f, (e, d) => {
        if (e) { rs.writeHead(404); rs.end('nf'); return; }
        rs.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control':'no-store' });
        rs.end(d);
      });
    });
    srv.listen(port, '127.0.0.1', () => res(srv));
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const [htmlFile, outPng, wArg, hArg, dsfArg] = process.argv.slice(2);
  const W = parseInt(wArg || '390', 10), H = parseInt(hArg || '844', 10);
  const DSF = parseFloat(dsfArg || '2');
  const browser = fs.existsSync(CHROME) ? CHROME : EDGE;
  const userDir = 'C:\\Users\\28283\\AppData\\Local\\Temp\\opencode\\cdp-profile';
  fs.rmSync(userDir, { recursive: true, force: true });

  const srv = await serve(REPO, PORT + 1);
  const url = 'http://127.0.0.1:' + (PORT + 1) + '/' + htmlFile.replace(/\\/g, '/');

  const { spawn } = require('child_process');
  const proc = spawn(browser, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--hide-scrollbars', '--force-device-scale-factor=' + DSF,
    '--user-data-dir=' + userDir,
    '--remote-debugging-port=' + PORT,
    '--window-size=' + W + ',' + H,
    'about:blank'
  ], { stdio: 'ignore' });

  let ws, msgId = 0;
  const pending = new Map();
  const send = (method, params, sessionId) => new Promise((res, rej) => {
    const id = ++msgId;
    pending.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method, params: params || {}, sessionId }));
  });

  try {
    // 等 devtools 端口就绪
    let ver = null;
    for (let i = 0; i < 60; i++) {
      try { ver = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); break; } catch (e) { await sleep(250); }
    }
    if (!ver) throw new Error('devtools 未就绪');

    ws = new WebSocket(ver.webSocketDebuggerUrl);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    ws.onmessage = ev => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) {
        const p = pending.get(m.id); pending.delete(m.id);
        m.error ? p.rej(new Error(m.error.message)) : p.res(m.result);
      }
    };

    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const S = (m, p) => send(m, p, sessionId);

    await S('Page.enable');
    await S('Emulation.setDeviceMetricsOverride', {
      width: W, height: H, deviceScaleFactor: DSF, mobile: true,
      screenWidth: W, screenHeight: H
    });

    const loaded = new Promise(r => {
      const h2 = ev => {
        const m = JSON.parse(ev.data);
        if (m.method === 'Page.loadEventFired') r();
      };
      const prev = ws.onmessage;
      ws.onmessage = ev => { prev(ev); h2(ev); };
    });
    await S('Page.navigate', { url });
    await loaded;
    await sleep(1400);   // 等字体与图片解码

    // 只截取 .device（真机屏），去掉外层展台/机身框，得到干净的竖屏效果图
    const box = await S('Runtime.evaluate', {
      expression: 'JSON.stringify((function(){var d=document.querySelector(".device");if(!d)return null;var r=d.getBoundingClientRect();return {x:r.x+window.scrollX,y:r.y+window.scrollY,w:r.width,h:r.height};})())',
      returnByValue: true
    });
    let clip = null;
    if (box.result && box.result.value && box.result.value !== 'null') {
      const b = JSON.parse(box.result.value);
      clip = { x: b.x, y: b.y, width: b.w, height: b.h, scale: DSF };
    }

    const { data } = await S('Page.captureScreenshot', clip
      ? { format: 'png', captureBeyondViewport: true, fromSurface: true, clip }
      : { format: 'png', captureBeyondViewport: true, fromSurface: true });
    fs.writeFileSync(outPng, Buffer.from(data, 'base64'));
    const kb = (fs.statSync(outPng).size / 1024).toFixed(0);
    console.log('saved ' + outPng + '  (' + kb + ' KB' + (clip ? ', clip ' + clip.width + 'x' + clip.height : '') + ')');
  } finally {
    try { ws && ws.close(); } catch (e) {}
    try { proc.kill(); } catch (e) {}
    try { srv.close(); } catch (e) {}
    await sleep(300);
  }
}
main().catch(e => { console.error('ERR ' + e.message); process.exit(1); });
