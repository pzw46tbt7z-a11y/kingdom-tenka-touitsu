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
      const groupPickVisibility = `<script>(function(){let roomCode='';const originalFetch=window.fetch.bind(window);window.fetch=async function(input,init){try{const url=typeof input==='string'?input:input?.url||'';if(url.includes('/api/rooms/group-roster')||url.includes('/api/rooms/group-pick')||url.includes('/api/rooms/group-confirm')){const body=typeof init?.body==='string'?JSON.parse(init.body):null;if(body?.code)roomCode=String(body.code).toUpperCase()}}catch(e){}return originalFetch(input,init)};const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));const roleLine=(roles,role)=>{const name=Object.entries(roles||{}).find(([,v])=>v===role)?.[0];return name?'✅ '+role+'：'+esc(name):'⬜ '+role+'：選択待ち'};let lastSignature='';async function refresh(){if(!roomCode)return;const waiting=[...document.querySelectorAll('.waiting')].find(el=>(el.textContent||'').includes('相手の選択中'));if(!waiting)return;try{const r=await originalFetch('/api/rooms/'+encodeURIComponent(roomCode),{cache:'no-store'});if(!r.ok)return;const room=await r.json();const group=room.group;if(!group?.roles)return;const mineKey=room.host?.id===localStorage.getItem('kingdom-player-id')?'host':'guest';const enemyKey=mineKey==='host'?'guest':'host';const roles=['先鋒','副将','大将'];const signature=roles.map(role=>role+':'+(Object.entries(group.roles[enemyKey]||{}).find(([,v])=>v===role)?.[0]||'')).join('|');if(signature===lastSignature&&document.querySelector('#group-live-picks'))return;lastSignature=signature;let box=document.querySelector('#group-live-picks');if(!box){box=document.createElement('div');box.id='group-live-picks';box.style.cssText='margin:16px 0;padding:16px;border:1px solid #d5ad55;border-radius:14px;background:linear-gradient(135deg,#21160c,#0d0d0f);color:#fff0bd;text-align:left';waiting.parentElement?.insertBefore(box,waiting)}box.innerHTML='<strong style="display:block;text-align:center;margin-bottom:10px">相手軍の現在編成</strong>'+roles.map(role=>'<div style="padding:5px 0">'+roleLine(group.roles[enemyKey],role)+'</div>').join('')}catch(e){}}new MutationObserver(()=>refresh()).observe(document.body,{childList:true,subtree:true});setInterval(refresh,500);refresh()})();</script>`;
      const groupPickRecovery = `<script>(function(){let roomCode='';let lastTurn=-1;const originalFetch=window.fetch.bind(window);window.fetch=async function(input,init){try{const url=typeof input==='string'?input:input?.url||'';if(url.includes('/api/rooms/group-roster')||url.includes('/api/rooms/group-pick')||url.includes('/api/rooms/group-confirm')){const body=typeof init?.body==='string'?JSON.parse(init.body):null;if(body?.code)roomCode=String(body.code).toUpperCase()}}catch(e){}return originalFetch(input,init)};function shownTurn(){const el=[...document.querySelectorAll('.waiting')].find(e=>(e.textContent||'').includes('第')&&(e.textContent||'').includes('選択を待っています'));const m=(el?.textContent||'').match(/第(\\d+)選択を待っています/);return m?Number(m[1]):0}async function recover(){if(!roomCode)return;const waiting=[...document.querySelectorAll('.waiting')].find(e=>(e.textContent||'').includes('選択を待っています'));if(!waiting)return;try{const r=await originalFetch('/api/rooms/'+encodeURIComponent(roomCode)+'?t='+Date.now(),{cache:'no-store'});if(!r.ok)return;const room=await r.json();const turn=Number(room.group?.turn??0);const phase=room.group?.phase;if(turn!==lastTurn)lastTurn=turn;const visible=shownTurn();if(phase==='confirm'||phase==='battle'||turn+1>visible){location.reload()}}catch(e){}}setInterval(recover,700);recover()})();</script>`;
      const groupBattlePolish = `<script>(function(){let roomCode='';let lastSig='';const originalFetch=window.fetch.bind(window);window.fetch=async function(input,init){try{const url=typeof input==='string'?input:input?.url||'';if(url.includes('/api/rooms/group-roster')||url.includes('/api/rooms/group-pick')||url.includes('/api/rooms/group-confirm')){const body=typeof init?.body==='string'?JSON.parse(init.body):null;if(body?.code)roomCode=String(body.code).toUpperCase()}}catch(e){}return originalFetch(input,init)};const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));function playerNames(room){return{host:String(room?.host?.name||room?.host?.displayName||'プレイヤー1'),guest:String(room?.guest?.name||room?.guest?.displayName||'プレイヤー2')}}function renameArmyLabels(names){const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);for(const node of nodes){const value=node.nodeValue||'';if(value.includes('A軍')||value.includes('B軍'))node.nodeValue=value.replaceAll('A軍',names.host).replaceAll('B軍',names.guest)}}function reorderRoleGroups(){const order=['先鋒','副将','大将'];const all=[...document.querySelectorAll('body *')];for(const el of all){const children=[...el.children];if(children.length!==3)continue;const roleChildren=children.map(child=>{const text=(child.textContent||'').replace(/\\s+/g,'');return order.findIndex(role=>text.includes(role))});if(roleChildren.every(index=>index>=0)&&new Set(roleChildren).size===3){const sorted=[...children].sort((a,b)=>roleChildren[children.indexOf(a)]-roleChildren[children.indexOf(b)]);if(sorted.some((child,index)=>child!==children[index]))sorted.forEach(child=>el.appendChild(child))}}}async function refresh(){if(!roomCode)return;try{const r=await originalFetch('/api/rooms/'+encodeURIComponent(roomCode)+'?t='+Date.now(),{cache:'no-store'});if(!r.ok)return;const room=await r.json();const phase=room.group?.phase;if(phase!=='battle')return;const names=playerNames(room);const sig=phase+'|'+names.host+'|'+names.guest;renameArmyLabels(names);reorderRoleGroups();if(sig!==lastSig){lastSig=sig;setTimeout(()=>{renameArmyLabels(names);reorderRoleGroups()},150)}}catch(e){}}new MutationObserver(refresh).observe(document.body,{childList:true,subtree:true});setInterval(refresh,700);refresh()})();</script>`;
      html = html.replace('</head>', hideGreatGeneralTrial + groupSyncGate + groupPickVisibility + groupPickRecovery + groupBattlePolish + '</head>');
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
