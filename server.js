import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';

const app = express();
const port = Number(process.env.PORT || 3000);
const TARGET = 'https://kingdom-g0f9yi.v2.appdeploy.ai';

app.get('/health', (_req, res) => res.status(200).type('text/plain').send('ok'));

app.use(async (req, res) => {
  try {
    const target = TARGET + req.originalUrl;
    const upstream = await fetch(target, {
      method: req.method,
      headers: { ...req.headers, host: new URL(TARGET).host },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
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
      html = html.replace('</head>', hideGreatGeneralTrial + '</head>');
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
