import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
app.use(express.json({ limit: '1mb' }));
const root = path.dirname(fileURLToPath(import.meta.url));

app.get('/api/health', (_, res) => res.json({
  ok: true,
  app: 'HISTORIA',
  aiConfigured: Boolean(process.env.GEMINI_API_KEY)
}));

const CIVS = {
  japan: '日本史', china: '中国史', egypt: '古代エジプト史',
  greece: '古代ギリシャ史', rome: '古代ローマ史', mongol: 'モンゴル帝国史'
};

app.post('/api/alter-history', async (req, res) => {
  const { civId, eraId, intervention, goal, previousOutcomes } = req.body || {};
  if (typeof intervention !== 'string' || !intervention.trim()) {
    return res.status(400).json({ error: '変えたい歴史を文章で入力してください。' });
  }
  if (intervention.length > 500) {
    return res.status(400).json({ error: '改変内容は500文字以内にしてください。' });
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'AI接続の準備中です。RailwayのHISTORIAサービスにGEMINI_API_KEYを設定してください。'
    });
  }

  const civilization = CIVS[civId] || '選択された文明の歴史';
  const era = typeof eraId === 'string' ? eraId : '未指定';
  const objective = typeof goal === 'string' && goal.trim() ? goal.trim() : '社会の安定と発展';
  const prior = Array.isArray(previousOutcomes) ? previousOutcomes.slice(0, 3) : [];
  const prompt = `あなたは歴史研究者兼、反実仮想歴史シミュレーションの解説者です。日本語で、教育的で具体的な回答を作ってください。
重要ルール:
- ユーザーの改変案を中心に据え、回答全体をその案に直接反応させる。改変案を無視した一般論で済ませない。
- 最初に改変案を正確に言い換え、どの史実・制度・人物・利害関係が変化の起点になるか説明する。
- 時代の実情に即した具体的な歴史的制約を扱う。分からない事実を捏造しない。史実に確信がない場合は不確実と明示する。
- 史実として確立したことと、ここでの仮想推論を区別する。架空の出来事を史実のように書かない。
- 因果関係を段階的に説明し、利益を得る集団・損をする集団、予想外の副作用、別の結果になる条件も示す。
- 年表は最低4段階（直後、数年後、10〜20年後、数十年後など）で、各段階に具体的な出来事と理由を書く。
- 政治・軍事・経済・社会・文化・外交への影響をそれぞれ具体的に分析。無関係な項目は理由を説明する。
- 学習のため、重要用語を平易に説明し、史実なら年代や人物名を可能な限り正確にする。根拠のない統計や正確すぎる予測値は作らない。
- 目標達成の可能性だけでなく、トレードオフと失敗シナリオも述べる。
- 回答の冒頭に「前提知識」を必ず作る。反実仮想の分析に必要な史実を、改変案に直結する具体例・人物・制度・年代とともに最低5項目、各項目2〜4文で説明する。一般的な時代紹介だけで終わらせない。
- 中国の秦・戦国時代を扱う場合、商鞅の変法、秦の軍事・行政・農業基盤、戦国七雄の勢力関係、統一過程、統一後の負担と秦滅亡など、選択された時期に関係する背景を必ず説明する。時代が異なる場合はその時代固有の前提知識に置き換える。
- 前提知識の各項目で「確認できる史実」と「研究上の議論」を区別し、その史実が今回の改変案にどう関係するかを明示する。
文明: ${civilization}
時代ID: ${era}
ユーザーの改変案（最優先）: 「${intervention.trim()}」
目標: ${objective}
過去の同一セッションの仮想結果（必要なら矛盾を避けるため参照）: ${JSON.stringify(prior)}

次のJSONだけを返してください。マークダウンの囲いは不要です。
{
 "title":"改変案を具体的に含む短い題名",
 "summary":"改変案がなぜ分岐点になるか、史実の背景と主な帰結を含む200〜350字程度の要約",
 "background":[{"heading":"前提知識の項目","fact":"具体的な史実・年代・制度・人物を2〜4文で説明","relevance":"その史実が今回の改変案にどう関係するか"},{"heading":"...","fact":"...","relevance":"..."},{"heading":"...","fact":"...","relevance":"..."},{"heading":"...","fact":"...","relevance":"..."},{"heading":"...","fact":"...","relevance":"..."}],
 "timeline":[{"year":"直後","title":"...","detail":"史実の制度・人物・資源に結びついた因果を説明"},{"year":"数年後","title":"...","detail":"..."},{"year":"10〜20年後","title":"...","detail":"..."},{"year":"数十年後","title":"...","detail":"..."}],
 "effects":[{"label":"政治","value":"短い評価","detail":"具体的な制度や勢力への影響"},{"label":"軍事","value":"短い評価","detail":"兵站・兵制・同盟・戦術など"},{"label":"経済","value":"短い評価","detail":"税・農業・交易・労働・財政など"},{"label":"社会","value":"短い評価","detail":"階層・生活・地域差など"},{"label":"文化","value":"短い評価","detail":"教育・宗教・言語・技術など"},{"label":"外交","value":"短い評価","detail":"周辺国・同盟・敵対勢力への反応"}],
 "causalChain":["改変案から直接起きる最初の変化","具体的な利害関係者が反応する理由","その反応が制度・戦争・経済へ波及する仕組み","長期結果と、それが起こらない条件"],
 "learningNotes":["この時代の史実について学べる具体的なポイント","重要用語や制度の意味","仮想シナリオを史実と比較して考える問い"],
 "compareToReal":"実際の歴史で何が起きたかと、その背景を説明。確実でない情報は断定しない。",
 "uncertainty":"最も不確かな前提、結果を左右する条件、別の展開の可能性"
}

JSONは指定スキーマを満たすこと。各項目は薄い一般論にせず、ユーザーの改変案に結びつけて具体的に書く。`;

  try {
    let response;
    let payload;
    let lastStatus = 0;
    let lastDetail = '';
    // Primary model can temporarily be overloaded; retry and fall back to Flash-Lite.
    for (const model of ['gemini-3.8-flash-lite', 'gemini-3.8-flash']) {
      for (let attempt = 0; attempt < 1; attempt++) {
        response = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + encodeURIComponent(apiKey),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: 'あなたは厳密で分かりやすい歴史教育AIです。史実と反実仮想を明確に分離し、ユーザーの入力を必ず中心に据えてください。' }] },
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.75,
                maxOutputTokens: 2600,
                responseMimeType: 'application/json'
              }
            }),
            signal: AbortSignal.timeout(12000)
          }
        );
        payload = await response.json();
        if (response.ok) break;
        lastStatus = response.status;
        lastDetail = payload?.error?.message || 'AI provider request failed';
        console.error('Gemini API error:', model, response.status, lastDetail);
        if (![429, 500, 502, 503, 504].includes(response.status)) break;
        // Fail fast on overload instead of keeping the user waiting.
      }
      if (response?.ok) break;
      if (lastStatus !== 429 && lastStatus !== 500 && lastStatus !== 502 && lastStatus !== 503 && lastStatus !== 504) break;
    }
    if (!response?.ok) {
      console.error('Gemini fallback exhausted:', lastStatus, lastDetail);
      return res.status(502).json({
        error: lastStatus === 429
          ? 'AIの無料利用枠に達した可能性があります。少し待って再試行してください。'
          : lastStatus === 503 || lastStatus === 504
            ? 'AIサービスが混雑しています。少し待ってもう一度試してください。'
            : 'AIサービスへの接続に失敗しました。APIキーと利用設定を確認してください。'
      });
    }
    const raw = payload?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();
    if (!raw) {
      console.error('Gemini returned no text:', JSON.stringify(payload).slice(0, 1000));
      return res.status(502).json({ error: 'AIから回答が返りませんでした。入力を少し変えて再試行してください。' });
    }
    const cleaned = raw.replace(/^\uFEFF/, '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const result = JSON.parse(cleaned);
    if (!result.title || !Array.isArray(result.background) || !Array.isArray(result.timeline) || !Array.isArray(result.effects) ||
        !Array.isArray(result.causalChain) || !Array.isArray(result.learningNotes) ||
        !result.compareToReal || !result.uncertainty) {
      throw new Error('AI output did not match the expected structure');
    }
    result.background = result.background.slice(0, 8);
    result.timeline = result.timeline.slice(0, 6);
    result.effects = result.effects.slice(0, 8);
    result.causalChain = result.causalChain.slice(0, 6);
    result.learningNotes = result.learningNotes.slice(0, 6);
    return res.json(result);
  } catch (err) {
    console.error('HISTORIA AI generation failed:', err?.message || err);
    return res.status(502).json({
      error: err?.name === 'TimeoutError'
        ? 'AIの回答に時間がかかりすぎました。もう一度試してください。'
        : 'AIの回答を処理できませんでした。入力を少し変えて再試行してください。'
    });
  }
});

app.use(express.static(path.join(root, 'dist')));
app.use((req, res) => res.sendFile(path.join(root, 'dist', 'index.html')));
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => console.log('HISTORIA listening on ' + port));
