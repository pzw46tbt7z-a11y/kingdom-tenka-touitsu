import express from 'express';
const app = express();
const port = Number(process.env.PORT || 3000);
const ORIGINAL_APP = 'https://kingdom-g0f9yi.v2.appdeploy.ai/';
app.get('*', (_req, res) => res.redirect(302, ORIGINAL_APP));
app.listen(port, '0.0.0.0', () => console.log(`KINGDOM 天下統一録 redirect listening on ${port}`));
