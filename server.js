import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';

const app = express();
app.use(express.json({ limit: '256kb' }));
const port = Number(process.env.PORT || 3000);
const TARGET = 'https://kingdom-g0f9yi.v2.appdeploy.ai';

app.get('/health', (_req, res) => res.status(200).type('text/plain').send('ok'));

// 三軍決戦の「次の武将へ」は両プレイヤーの入力を待ってから同時に進める。
// フロント側の戦闘計算は決定的なので、同じ battleNo で両者を同期させれば
// 片側だけ先に進んでしまう同期ズレを防げる。
const groupNextSignals = new Map();
const groupNextTtlMs = 2 * 60 * 1000;

function groupNextKey(code, battleNo) {
  return `${String(code || '').toUpperCase()}|${Number(battleNo) || 0}`;
}

function pruneGroupSignals() {
  const now = Date.now();
  for (const [key, value] of groupNextSignals) {
    if (now - value.updatedAt > groupNextTtlMs) groupNextSignals.delete(key);
  }
}

app.post('/api/rooms/group-sync-next', (req, res) => {
  pruneGroupSignals();
  const code = String(req.body?.code || '').trim().toUpperCase();
  const playerId = String(req.body?.playerId || '').trim();
  const battleNo = Number(req.body?.battleNo || 0);
  if (!code || !playerId || !battleNo) return res.status(400).json({ ready: false, error: 'invalid sync request' });
  const key = groupNextKey(code, battleNo);
  const current = groupNextSignals.get(key) || { players: new Set(), updatedAt: Date.now(), ready: false };
  current.players.add(playerId);
  current.updatedAt = Date.now();
  if (current.players.size >= 2) current.ready = true;
  groupNextSignals.set(key, current);
  return res.json({ ready: current.ready });
});

app.get('/api/rooms/group-sync-next', (req, res) => {
  pruneGroupSignals();
  const code = String(req.query?.code || '').trim().toUpperCase();
  const battleNo = Number(req.query?.battleNo || 0);
  const current = groupNextSignals.get(groupNextKey(code, battleNo));
  return res.json({ ready: Boolean(current?.ready) });
});

app.use(async (req, res) => {
  try {
    const target = TARGET + req.originalUrl;
    const upstream = await fetch(target, {
      method: req.method,
      headers: { ...req.headers, host: new URL(TARGET).host },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body ?? {}),
      redirect: 'manual'
    });
    const contentType = upstream.headers.get('content-type') || '';
    const headers = {};
    upstream.headers.forEach((value, key) => {
      if (!['content-length', 'transfer-encoding', 'content-encoding', 'location'].includes(key.toLowerCase())) headers[key] = value;
    });
    if (contentType.includes('text/html')) {
      let html = await upstream.text();
      const hideGreatGeneralTrial = `<style id="kingdom-custom-removal">#championship,.championship{display:none!important}</style><script>(function(){function clean(){document.querySelectorAll('button,a,[role="button"]').forEach(function(el){if((el.textContent||'').includes('大将軍決定戦'))el.remove()});document.querySelectorAll('.online-actions').forEach(function(box){if(box.children.length===0)box.remove()})}if(document.body){clean();new MutationObserver(clean).observe(document.body,{childList:true,subtree:true})}else document.addEventListener('DOMContentLoaded',function(){clean();new MutationObserver(clean).observe(document.body,{childList:true,subtree:true})})})();</script>`;
      const groupSyncGate = `<script>(function(){const seen=new WeakSet();function hook(){const b=document.querySelector('#groupNext');if(!b||seen.has(b))return;seen.add(b);const original=b.onclick;let busy=false;const roomEl=document.querySelector('.room-pill');const badgeEl=document.querySelector('.online-badge');const codeMatch=(roomEl?.textContent||'').match(/ROOM\\s+([A-Z0-9-]+)/i);const battleMatch=(badgeEl?.textContent||'').match(/第(\\d+)戦/);const code=codeMatch?.[1]||'';const battleNo=Number(battleMatch?.[1]||0);const playerId=localStorage.getItem('kingdom-player-id')||'';b.onclick=async function(ev){if(busy)return;busy=true;ev?.preventDefault();b.disabled=true;b.textContent='相手の進軍を待っています…';if(!code||!battleNo||!playerId){busy=false;b.disabled=false;if(original)original.call(b,ev);return}try{await fetch('/api/rooms/group-sync-next',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,playerId,battleNo})});const poll=async()=>{try{const r=await fetch('/api/rooms/group-sync-next?code='+encodeURIComponent(code)+'&battleNo='+battleNo,{cache:'no-store'});const data=await r.json();if(data.ready){clearInterval(timer);if(original)original.call(b,ev);return}}catch(e){}};const timer=setInterval(poll,400);await poll();setTimeout(()=>{clearInterval(timer);if(busy&&document.body.contains(b)){busy=false;b.disabled=false;b.textContent='次の武将へ'}},90000)}catch(e){busy=false;b.disabled=false;b.textContent='次の武将へ'}}}new MutationObserver(hook).observe(document.body,{childList:true,subtree:true});hook()})();</script>`;
      html = html.replace('</head>', hideGreatGeneralTrial + groupSyncGate + '</head>');
      res.status(upstream.status).set(headers).send(html);
      return;
    }
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.status(upstream.status).set(headers).send(buffer);
  } catch (error) {
    console.error('proxy error', error);
    res.status(502).send('KINGDOM upstream unavailable');
  }
});

const server = app.listen(port, '0.0.0.0', () => console.log(`KINGDOM proxy listening on ${port}`));
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const target = `wss://kingdom-g0f9yi.v2.appdeploy.ai${url.pathname}${url.search}`;
  const upstream = new WebSocket(target);
  upstream.binaryType = 'arraybuffer';
  wss.handleUpgrade(req, socket, head, client => {
    const closeBoth = () => { try { client.close(); } catch {} try { upstream.close(); } catch {} };
    client.on('message', data => { if (upstream.readyState === WebSocket.OPEN) upstream.send(data); });
    upstream.on('message', data => { if (client.readyState === WebSocket.OPEN) client.send(data); });
    client.on('close', closeBoth);
    upstream.on('close', closeBoth);
    upstream.on('error', closeBoth);
    client.on('error', closeBoth);
  });
});
