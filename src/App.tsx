import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, BookOpen, Check, ChevronDown, Clock3, Compass, Copy, Crown,
  GitBranch, Globe2, GraduationCap, History, Layers3, Menu, RotateCcw,
  Send, ShieldCheck, Sparkles, Swords, Trophy, X
} from 'lucide-react';
const api = { post: async (path: string, body: unknown) => { const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const data = await response.json(); if (!response.ok) throw new Error(data?.error || 'Request failed'); return { data }; } };

type Era = {
  id: string; name: string; years: string; startYear: number; ruler: string;
  overview: string; politics: string; society: string; economy: string;
  culture: string; deepDive?: { heading: string; body: string }[]; keyFacts: string[]; people: string[]; sources: { label: string; url: string }[];
};
type Civilization = { id: string; name: string; subtitle: string; symbol: string; overview: string; eras: Era[] };

function getDeepDive(era: Era) {
  if (era.deepDive?.length) return era.deepDive;
  const facts = era.keyFacts;
  const people = era.people.filter(p => !p.includes('特定の個人名は史料から分からない'));
  return [
    { heading: '時代の全体像と変化の背景', body: era.overview + ' この時代を理解する際は、前の時代から何が引き継がれ、何が変わったのかを比べることが大切。政治の変化だけでなく、人口・生産・交通・周辺地域との関係が重なり合って歴史の転換を生み出した。' },
    { heading: '政治・統治はどう動いたか', body: era.politics + ' 権力を持つ側が制度を整えても、実際に運用するには地方の有力者、役人、軍事力、財源などが必要だった。制度の理念と現場での実態が一致したとは限らず、地域差や時期による変化にも注意したい。' },
    { heading: '人々の暮らし・社会の変化', body: era.society + ' 政治的な決定の影響は支配者だけでなく、農民・職人・商人・兵士・宗教者などの生活にも及んだ。負担や機会は身分、地域、性別、富の違いによって異なり、社会全体が同じ速度で変化したわけではない。' },
    { heading: '生産・経済・交流のしくみ', body: era.economy + ' 食料や原材料を安定して確保し、物資・人・情報を移動させる力は、国家や地域社会の持続性を左右した。交易路や市場が広がると富や技術が流入する一方、戦争・災害・税負担・供給の途絶は暮らしや政権を不安定にすることもあった。' },
    { heading: '文化・技術と後世への影響', body: era.culture + ' 文化や技術は単独で生まれるのではなく、教育、宗教、権力者の保護、職人の知識、他地域との交流などを通じて発展する。後世から見て重要な成果も、当時の人々にとっては実用・信仰・権威・娯楽など複数の意味を持っていた。' },
    { heading: '重要な出来事・人物をどう読むか', body: 'この時代の手がかり：' + facts.join(' ') + (people.length ? ' 関連人物・集団：' + people.join('、') + '。人物の決断だけで歴史が決まったと考えず、制度・資源・同盟・反対勢力など、その行動を可能にした条件も合わせて考えよう。' : ' 個人名が分からない場合も、遺跡・遺物・文書などから社会の特徴を調べられる。') }
  ];
}

type Outcome = {
  id: string; title: string; summary: string;
  background: { heading: string; fact: string; relevance: string }[];
  timeline: { year: string; title: string; detail: string }[];
  effects: { label: string; value: string; detail: string }[];
  causalChain: string[]; learningNotes: string[]; compareToReal: string;
  uncertainty: string; intervention: string; civName: string; eraName: string;
};
type View = 'play' | 'learn' | 'worldlines' | 'challenge';
type Mode = 'standard' | 'challenge' | 'free';

const CIVILIZATIONS: Civilization[] = [
  {
    id: 'japan', name: '日本', subtitle: 'JAPAN', symbol: '日',
    overview: '列島の地理と大陸との交流を背景に、さまざまな政治体制と文化が発展した。',
    eras: [
      {id:'japan-jomon',name:'縄文時代',years:'紀元前1万年以上前〜紀元前10世紀頃（地域差あり）',startYear:-14000,ruler:'各地の集団・地域社会',overview:'土器を用いた狩猟・採集・漁労を中心とする社会。定住的な集落も発達し、地域ごとの文化差が大きかった。',politics:'後世の国家のような統一政権はなく、集落や地域間のつながりを通じて社会が営まれた。',society:'狩猟・採集・漁労と植物利用を組み合わせ、季節に応じて資源を利用した。定住度や人口規模は地域と時期によって異なる。',economy:'石器、土器、木器などを使い、黒曜石や貝製品などの広域交流も行われた。',culture:'縄文土器、土偶、漆利用、環状列石などが知られる。',keyFacts:['縄文土器は世界でも古い土器文化の一つ。','生業は狩猟・採集・漁労を基礎とし、地域差が大きい。','定住集落や広域交流が確認されている。'],people:['特定の個人名は史料から分からない'],sources:[{label:'国立歴史民俗博物館',url:'https://www.rekihaku.ac.jp/'},{label:'文化遺産オンライン',url:'https://bunka.nii.ac.jp/'}]},
      {id:'japan-kofun',name:'古墳時代',years:'3世紀中頃〜7世紀頃',startYear:250,ruler:'ヤマト王権と各地の豪族',overview:'前方後円墳などの大型古墳が各地に築かれ、ヤマト王権を中心とする政治的連合が広がった。',politics:'王権は豪族との連合や地位の授与を通じて勢力を広げた。支配の範囲や統合の度合いは地域ごとに異なった。',society:'首長層と農耕民の社会が発達し、朝鮮半島・中国大陸との交流を担う渡来系の人々も技術や知識を伝えた。',economy:'稲作を基盤に、鉄器生産、馬の利用、須恵器生産、海上・陸上交通が発達した。',culture:'前方後円墳、埴輪、須恵器、金属工芸などが代表的。',keyFacts:['大型古墳は首長間の政治関係や権威を示す。','5世紀には倭の五王に関する中国史書の記録がある。','6世紀に仏教が伝来したとされる。'],people:['倭の五王（個々の比定には議論がある）','継体天皇'],sources:[{label:'国立歴史民俗博物館',url:'https://www.rekihaku.ac.jp/'},{label:'文化遺産オンライン',url:'https://bunka.nii.ac.jp/'}]},
      {id:'japan-asuka',name:'飛鳥時代',years:'6世紀末〜710年',startYear:592,ruler:'天皇・豪族・中央政府',overview:'仏教の受容、対外交流、中央集権化の改革が進み、律令国家形成への基盤が築かれた。',politics:'推古朝や舒明・皇極朝などを経て、645年の乙巳の変後に政治改革が進んだ。大化改新の具体的な内容や実施時期には史料上の議論がある。',society:'豪族の力が強い社会から、戸籍や身分秩序を通じて人々を把握する国家への転換が進んだ。',economy:'農業生産と貢納を国家運営の基盤にし、朝鮮半島・隋唐との外交や技術交流が重要だった。',culture:'仏教寺院、飛鳥寺、法隆寺、仏像や工芸などが発展した。',keyFacts:['607年に遣隋使が派遣されたとされる。','645年に乙巳の変が起きた。','701年に大宝律令が制定された。'],people:['推古天皇','聖徳太子（厩戸王）','中大兄皇子','中臣鎌足'],sources:[{label:'奈良国立博物館',url:'https://www.narahaku.go.jp/'},{label:'国立国会図書館',url:'https://www.ndl.go.jp/'}]},
      {id:'japan-heian',name:'平安時代',years:'794〜1185年（終期には諸説）',startYear:794,ruler:'天皇・摂関家・院・武士勢力',overview:'京都を中心に宮廷文化が栄え、摂関政治から院政へと政治の形が変化し、地方では武士が台頭した。',politics:'藤原氏による摂関政治の後、上皇が院庁を通じて政治を動かす院政が広がった。地方の軍事・行政を担う武士が次第に力を強めた。',society:'貴族社会の儀礼や官職が重視される一方、地方社会では荘園や公領をめぐる権利関係が複雑化した。',economy:'荘園・公領からの収入、地方の農業生産、交易が社会を支えた。貨幣流通や都市のあり方には時期と地域による差があった。',culture:'かな文学、和歌、絵巻、浄土教などが発達し、『源氏物語』『枕草子』が生まれた。',keyFacts:['794年に平安京へ遷都した。','10〜11世紀に摂関政治が最盛期を迎えた。','12世紀後半に平氏政権と源氏が争った。'],people:['藤原道長','紫式部','清少納言','後白河法皇','平清盛'],sources:[{label:'国立国会図書館',url:'https://www.ndl.go.jp/'},{label:'文化遺産オンライン',url:'https://bunka.nii.ac.jp/'}]},
      {id:'japan-kamakura',name:'鎌倉時代',years:'1185年頃〜1333年',startYear:1185,ruler:'鎌倉幕府・将軍・執権',overview:'武士政権が成立し、御家人との主従関係を軸に政治が行われた。蒙古襲来は幕府の財政や御家人統制に大きな影響を与えた。',politics:'将軍と御家人の関係を基盤に、北条氏の執権政治が展開した。承久の乱後、幕府は西国への影響力を強めた。',society:'武士の所領支配が広がり、農村では地頭と荘園領主の権利が争われた。',economy:'農業技術や流通が発展し、宋銭などの貨幣も取引に使われた。',culture:'禅宗、浄土宗、浄土真宗、時宗、日蓮宗など新しい仏教運動が広がった。',keyFacts:['1185年頃に守護・地頭の設置が進み、武士政権の基盤となった。','1221年に承久の乱が起きた。','1274年と1281年に元軍の襲来があった。'],people:['源頼朝','北条政子','北条泰時','北条時宗'],sources:[{label:'国立国会図書館',url:'https://www.ndl.go.jp/'},{label:'文化遺産オンライン',url:'https://bunka.nii.ac.jp/'}]},
      {id:'japan-muromachi',name:'室町時代',years:'1336〜1573年',startYear:1336,ruler:'足利将軍家・守護大名',overview:'足利幕府のもとで守護大名が勢力を伸ばし、日明貿易や地域文化が発展した一方、応仁の乱以降は各地で争乱が続いた。',politics:'幕府と守護大名の関係は時期により変化し、将軍の統制力には限界があった。応仁・文明の乱後、地域権力が自立化した。',society:'惣村や自治的な地域組織が発達し、寺社・商人・職人も政治経済に関わった。',economy:'日明貿易、港町、座、市場、農業生産が発展した。',culture:'能、茶の湯の萌芽、水墨画、庭園、書院造などが発展した。',keyFacts:['1336年に足利尊氏が京都で幕府を開いた。','勘合を用いた日明貿易が行われた。','1467年に応仁・文明の乱が始まった。'],people:['足利尊氏','足利義満','足利義政','一休宗純'],sources:[{label:'国立国会図書館',url:'https://www.ndl.go.jp/'},{label:'文化遺産オンライン',url:'https://bunka.nii.ac.jp/'}]},
      {id:'japan-azuchi',name:'安土桃山時代',years:'1573〜1603年頃',startYear:1573,ruler:'織田信長・豊臣秀吉',overview:'織田信長と豊臣秀吉が統一を進め、城郭・流通・土地支配の再編が進んだ。',politics:'信長は将軍足利義昭を追放して室町幕府を終わらせ、秀吉は全国統一と大名統制を進めた。',society:'刀狩や身分統制が進んだが、地域社会の実態は一様ではなかった。',economy:'検地、城下町整備、商業政策、海外交易が統一政権の基盤となった。',culture:'豪壮な城郭建築、障壁画、茶の湯、南蛮文化が栄えた。',keyFacts:['1573年に室町幕府が終わった。','1582年に本能寺の変が起きた。','1590年に秀吉の全国統一がほぼ完成した。'],people:['織田信長','豊臣秀吉','明智光秀','千利休'],sources:[{label:'国立国会図書館',url:'https://www.ndl.go.jp/'},{label:'文化遺産オンライン',url:'https://bunka.nii.ac.jp/'}]},
      {id:'japan-taisho',name:'大正時代',years:'1912〜1926年',startYear:1912,ruler:'大正天皇・政党内閣',overview:'都市化と大衆社会が進み、政党政治や社会運動が広がる一方、第一次世界大戦後の不安定さも強まった。',politics:'政党内閣の影響力が高まり、1925年に男子普通選挙法と治安維持法が成立した。',society:'都市労働者、女性運動、労働運動などが存在感を増した。',economy:'第一次世界大戦期に輸出が伸びたが、戦後恐慌や格差などの問題も起きた。',culture:'新聞・雑誌・映画などの大衆文化が発達した。',keyFacts:['1914年に第一次世界大戦が始まった。','1918年に米騒動が起きた。','1923年に関東大震災が発生した。'],people:['原敬','吉野作造','平塚らいてう'],sources:[{label:'国立国会図書館',url:'https://www.ndl.go.jp/'}]},
      {id:'japan-showa',name:'昭和時代',years:'1926〜1989年',startYear:1926,ruler:'昭和天皇・内閣・戦後の議会政治',overview:'戦前の軍部台頭と戦争、敗戦・占領、憲法と民主制度の再編、高度経済成長を経験した時代。',politics:'戦前は軍部の影響力が強まり、戦後は日本国憲法のもとで議会制民主主義が再構築された。',society:'戦争被害と復興、高度成長、都市化、生活様式の変化が大きかった。',economy:'戦後に工業化と輸出が進み、1950〜70年代に高度経済成長を遂げたが、公害などの課題も生じた。',culture:'映画、漫画、テレビ、ポップ音楽などの大衆文化が広がった。',keyFacts:['1931年に満州事変が起きた。','1945年に日本が降伏し、戦後改革が進んだ。','1947年に日本国憲法が施行された。','1950年代半ばから高度経済成長が進んだ。'],people:['昭和天皇','吉田茂','田中角栄'],sources:[{label:'国立国会図書館',url:'https://www.ndl.go.jp/'},{label:'国立公文書館',url:'https://www.archives.go.jp/'}]},
      {id:'japan-heisei',name:'平成・令和',years:'1989年〜現在',startYear:1989,ruler:'内閣・国会・現代の制度',overview:'バブル崩壊後の長期停滞、災害、デジタル化、人口構造の変化などに対応してきた時代。',politics:'政権交代や行政改革が起き、地方分権や社会保障などが継続的な課題となった。',society:'少子高齢化、人口減少、働き方や家族形態の変化が社会に影響している。',economy:'バブル崩壊後の金融・雇用問題、グローバル化、デジタル産業への対応が重要になった。',culture:'インターネット、ゲーム、アニメ、SNSなどが生活と文化を大きく変えた。',keyFacts:['1990年代にバブル崩壊後の経済停滞が続いた。','2011年に東日本大震災が起きた。','2019年に令和へ改元した。'],people:['現代史は複数の立場や資料を比較して学ぶことが重要'],sources:[{label:'国立国会図書館',url:'https://www.ndl.go.jp/'}]},
      { id:'yayoi', name:'弥生時代', years:'紀元前900年頃〜紀元後300年頃', startYear:-900, ruler:'各地の首長・クニ', overview:'水稲農耕が広がり、集落の大規模化や金属器の利用、地域間の格差が進んだ時代。開始・終期には地域差がある。', politics:'各地にクニや首長が現れ、のちの政治的まとまりにつながる動きが見られた。', society:'稲作を基盤とする集落が広がり、共同作業や水利の管理が重要になった。', economy:'水稲農耕、漁労、狩猟、交易など。地域によって導入や普及の時期は異なる。', culture:'青銅器・鉄器、弥生土器、環濠集落などが代表的。', keyFacts:['水稲農耕は大陸から伝わり、地域差を伴いながら広がった。','青銅器と鉄器が使われるようになったが、普及の時期は一様ではない。','中国の史書には倭に関する記録が残る。'], people:['卑弥呼（後期の倭国を考えるうえで重要な人物。活動年代には議論がある）'], sources:[{label:'文化庁 文化遺産オンライン',url:'https://bunka.nii.ac.jp/'},{label:'国立歴史民俗博物館',url:'https://www.rekihaku.ac.jp/'}] },
      { id:'nara', name:'奈良時代', years:'710〜794年', startYear:710, ruler:'天皇・中央政府', overview:'平城京を都として律令国家の仕組みが整えられ、仏教文化や国史編さんが進んだ時代。', politics:'律令制度を軸に中央集権的な国家運営を進めたが、制度の運用には課題もあった。', society:'戸籍・班田収授などの制度が整えられた一方、負担や人口移動なども政治課題となった。', economy:'農業を基盤に租・庸・調などの税や労役が国家運営を支えた。', culture:'東大寺大仏、正倉院、古事記・日本書紀・万葉集などが代表的。', keyFacts:['710年に平城京へ遷都した。','8世紀に『古事記』『日本書紀』が編さんされた。','東大寺の大仏造立は聖武天皇の時代に進められた。'], people:['聖武天皇','行基','鑑真'], sources:[{label:'奈良国立博物館',url:'https://www.narahaku.go.jp/'},{label:'文化遺産オンライン',url:'https://bunka.nii.ac.jp/'}] },
      { id:'sengoku', name:'戦国時代', years:'15世紀後半〜16世紀後半（区分には諸説）', startYear:1467, ruler:'各地の戦国大名', overview:'室町幕府の権威が弱まり、大名が領国支配を強めた時代。戦乱だけでなく、城下町や流通も発展した。', politics:'大名は分国法や家臣団の統制などを通じて領国を支配した。全国統一の過程には複数の段階がある。', society:'兵農分離の進展には地域差があり、村や寺社、商人も政治・経済に関わった。', economy:'市場、港、街道、鉱山などが大名の財政や軍事を支えた。', culture:'城郭、茶の湯、能、書院造などが発展し、地域ごとの文化交流も盛んだった。', keyFacts:['応仁・文明の乱（1467〜1477年）は戦国時代の始まりの目安として扱われる。','鉄砲は16世紀に日本へ伝わり、戦術や生産に影響した。','織田信長・豊臣秀吉・徳川家康が統一過程の重要人物となった。'], people:['織田信長','豊臣秀吉','徳川家康'], sources:[{label:'奈良国立博物館・文化財情報',url:'https://www.narahaku.go.jp/'},{label:'国立国会図書館',url:'https://www.ndl.go.jp/'}] },
      { id:'edo', name:'江戸時代', years:'1603〜1867年（区分により1868年まで）', startYear:1603, ruler:'徳川将軍家・幕府と諸藩', overview:'徳川幕府のもとで比較的長期の政治的安定が続き、都市・流通・出版・学問が発達した時代。対外交流は制限されたが、完全に途絶えたわけではない。', politics:'幕府と藩が並び立つ幕藩体制。大名統制や身分秩序などを通じて支配が行われた。', society:'武士・百姓・町人などの身分区分が制度上用いられたが、実際の暮らしや社会移動は地域や時代で異なる。', economy:'農業生産、街道、海運、都市市場、貨幣経済が発達。米や商品流通が政治と財政に大きく関わった。', culture:'浮世絵、歌舞伎、俳諧、寺子屋、蘭学など多様な文化・学問が広がった。', keyFacts:['1603年、徳川家康が征夷大将軍となり江戸幕府を開いた。','1630年代に海外渡航や貿易をめぐる統制が強化された。','長崎では中国・オランダとの貿易などが続き、朝鮮・琉球・蝦夷地を通じた交流も存在した。','1730年、堂島米市場で米切手の現物取引と帳合米取引が公認された。'], people:['徳川家康','徳川吉宗','杉田玄白','伊能忠敬'], sources:[{label:'出島公式サイト「出島の歴史」',url:'https://nagasakidejima.jp/history/'},{label:'日本取引所グループ「堂島米市場」',url:'https://www.jpx.co.jp/dojima/en/'},{label:'奈良国立博物館・文化財情報',url:'https://www.narahaku.go.jp/'}] },
      { id:'meiji', name:'明治時代', years:'1868〜1912年', startYear:1868, ruler:'明治政府', overview:'明治維新後、中央集権国家の形成、制度改革、産業化、対外関係の再編が進んだ時代。', politics:'廃藩置県、憲法制定、議会開設などを通じて政治制度が変化した。', society:'学制、徴兵制、地租改正などが社会構造や人々の暮らしを大きく変えた。', economy:'鉄道・工場・銀行などの近代産業が発展したが、地域・階層による格差もあった。', culture:'西洋の技術や制度を取り入れつつ、教育・文学・美術などが変化した。', keyFacts:['1868年に明治政府が成立し、政治・社会制度の大きな改革が進んだ。','1871年に廃藩置県が行われた。','1889年に大日本帝国憲法が発布され、1890年に帝国議会が開かれた。'], people:['明治天皇','大久保利通','伊藤博文','福沢諭吉'], sources:[{label:'国立公文書館',url:'https://www.archives.go.jp/'},{label:'国立国会図書館',url:'https://www.ndl.go.jp/'}] }
    ]
  },
  {
    id:'egypt', name:'古代エジプト', subtitle:'ANCIENT EGYPT', symbol:'𓂀',
    overview:'ナイル川の農業と王権、宗教、書記文化を基盤に、長い期間にわたって多様な王朝が興亡した。',
    eras:[
      {id:'egypt-old',name:'古王国時代',years:'紀元前約2650〜2150年',startYear:-2650,ruler:'ファラオ',overview:'王権が強まり、ギザのピラミッドを含む大規模な王墓建設が行われた時代。年代は研究機関によって多少異なる。',politics:'ファラオを中心に行政・宗教・労働を組織した。',society:'農業周期とナイル川の氾濫が暮らしに深く関わった。',economy:'農業余剰と国家の徴税・労働動員が大規模建築を支えた。',culture:'ピラミッド、石造建築、墓の壁画、宗教儀礼が代表的。',keyFacts:['ギザの大ピラミッドはクフ王の墓として知られる。','古王国の年代はおおむね紀元前2650〜2150年頃とされる。','王墓や葬祭施設は王権と来世観を示す重要な資料である。'],people:['ジェセル','クフ','カフラー'],sources:[{label:'The Metropolitan Museum of Art',url:'https://www.metmuseum.org/toah/'},{label:'Rosicrucian Egyptian Museum',url:'https://www.egyptianmuseum.org/explore/time-periods'}]},
      {id:'egypt-new',name:'新王国時代',years:'紀元前約1550〜1069年',startYear:-1550,ruler:'ファラオ',overview:'エジプトが周辺地域に強い影響力を持つ帝国となり、神殿建設や外交、軍事活動が活発になった時代。',politics:'王権と神殿組織が重要な役割を持ち、周辺諸国との戦争・外交が行われた。',society:'王族、神官、役人、職人、農民など多様な集団が社会を支えた。',economy:'農業、交易、鉱物資源、征服地からの貢納などが富の基盤となった。',culture:'カルナック神殿、王家の谷、王墓美術などが代表的。',keyFacts:['新王国はおおむね紀元前1550〜1069年頃とされる。','ハトシェプストは重要な女性統治者として知られる。','アクエンアテンの宗教改革は王の死後に大きく巻き戻された。'],people:['ハトシェプスト','アクエンアテン','ツタンカーメン','ラムセス2世'],sources:[{label:'Egyptian Ministry of Tourism and Antiquities',url:'https://egymonuments.gov.eg/historical-periods/new-kingdom/'},{label:'The British Museum',url:'https://www.britishmuseum.org/learn/schools/ages-7-11/ancient-egypt/timeline-ancient-egypt'}]}
    ]
  },
  {
    id:'greece',name:'古代ギリシャ',subtitle:'ANCIENT GREECE',symbol:'Λ',
    overview:'独立したポリス（都市国家）を中心に政治・哲学・演劇・美術が発展し、地中海各地と交流した。',
    eras:[
      {id:'greece-classical',name:'古典期',years:'紀元前約480〜323年',startYear:-480,ruler:'アテナイ・スパルタなどのポリス',overview:'ペルシア戦争後、アテナイやスパルタなどのポリスが競い合い、哲学・演劇・建築が大きく発展した時代。',politics:'ポリスごとに政治制度は異なり、アテナイの民主政も参加資格が限定されていた。',society:'市民、女性、在留外国人、奴隷などで権利や立場が大きく異なった。',economy:'農業、陶器生産、海上交易、銀山などが重要だった。',culture:'哲学、悲喜劇、神殿建築、歴史叙述などが発展した。',keyFacts:['古典期は一般に紀元前480〜323年頃とされる。','アテナイの民主政は現代の普通選挙と同じ制度ではない。','アテナイとスパルタの対立はペロポネソス戦争につながった。'],people:['ペリクレス','ソクラテス','プラトン','アリストテレス'],sources:[{label:'The Metropolitan Museum of Art',url:'https://www.metmuseum.org/toah/ht/04/eusb'},{label:'National Archaeological Museum of Greece',url:'https://www.namuseum.gr/en/collection/klasiki-periodos/'}]},
      {id:'greece-hellenistic',name:'ヘレニズム時代',years:'紀元前323〜31年',startYear:-323,ruler:'後継者王国など',overview:'アレクサンドロス大王の遠征後、ギリシャ語や文化が東地中海から西アジアへ広がり、地域文化と交わった。',politics:'マケドニアやプトレマイオス朝などの王国が競い合った。',society:'都市、宮廷、学術機関を通じて人・物・知識の移動が活発になった。',economy:'広域交易、貨幣、港湾都市が経済活動を支えた。',culture:'数学、天文学、彫刻、図書館などが発展し、文化が混ざり合った。',keyFacts:['ヘレニズム時代はアレクサンドロス大王の死（紀元前323年）から紀元前31年頃までを指すことが多い。','アレクサンドリアは学問と交易の重要な中心地となった。','「ギリシャ文化が一方的に広がった」だけでなく、地域文化との相互作用があった。'],people:['アレクサンドロス大王','プトレマイオス1世','アルキメデス'],sources:[{label:'The Metropolitan Museum of Art',url:'https://www.metmuseum.org/toah/'}]}
    ]
  },
  {
    id:'rome',name:'古代ローマ',subtitle:'ANCIENT ROME',symbol:'SPQR',
    overview:'共和政から帝政へと政治体制を変えながら、地中海世界に広大な支配圏と道路・法・都市文化を築いた。',
    eras:[
      {id:'rome-republic',name:'共和政ローマ',years:'紀元前509〜27年（伝統的年代）',startYear:-509,ruler:'元老院・ magistrates・民会',overview:'王を廃したと伝えられる共和政のもと、元老院や民会などの制度が展開し、ローマはイタリア半島から地中海へ勢力を広げた。',politics:'複数の公職や元老院、民会が関わったが、政治参加や権力は平等ではなかった。',society:'貴族と平民の対立、奴隷制、市民権の拡大が社会の重要な特徴だった。',economy:'農業、戦利品、属州からの税や交易が富を生み、格差も広がった。',culture:'ローマ法、公共建築、ラテン文学などが発展した。',keyFacts:['共和政の始まりは伝統的に紀元前509年とされる。','ポエニ戦争を経てローマは地中海の大国となった。','内乱を経て、紀元前27年にアウグストゥスの元首政が始まった。'],people:['ハンニバル（対戦相手）','ユリウス・カエサル','キケロ'],sources:[{label:'The Metropolitan Museum of Art',url:'https://www.metmuseum.org/toah/'},{label:'The British Museum',url:'https://www.britishmuseum.org/'}]},
      {id:'rome-empire',name:'ローマ帝国初期',years:'紀元前27年〜紀元後約200年',startYear:-27,ruler:'皇帝・元老院',overview:'皇帝を中心とする体制のもとで、地中海世界に都市・道路・法制度が広がった時代。地域ごとに暮らしや自治のあり方は異なった。',politics:'皇帝の権限が強まる一方、元老院や都市の自治も形を変えながら存続した。',society:'市民権は段階的に広がり、自由民・解放奴隷・奴隷など多様な立場が存在した。',economy:'地中海交易、農業、鉱山、都市市場が広域経済を支えた。',culture:'道路、水道橋、浴場、円形闘技場、ラテン語・ギリシャ語文化が知られる。',keyFacts:['アウグストゥスは紀元前27年に元首政を確立した。','「パクス・ロマーナ」は一般に初期帝政期の比較的安定した時代を指す。','ローマ帝国の地域社会は言語・宗教・慣習が一様ではなかった。'],people:['アウグストゥス','トラヤヌス','ハドリアヌス'],sources:[{label:'The Metropolitan Museum of Art',url:'https://www.metmuseum.org/toah/'}]}
    ]
  },
  {
    id:'china',name:'中国',subtitle:'CHINA',symbol:'中',
    overview:'複数の王朝が交替しながら、官僚制度・文字文化・農業・交易ネットワークが長期にわたり発展した。',
    eras:[
      {id:'china-zhou',name:'殷・西周',years:'紀元前1600年頃〜紀元前771年頃',startYear:-1600,ruler:'王・諸侯・貴族',overview:'殷では甲骨文字と青銅器祭祀が発達し、西周では封建的な諸侯支配と宗族秩序が広がった。年代や初期王朝の実像には研究上の議論がある。',politics:'殷王は祭祀と軍事を結びつけた王権を持ち、西周は王族・功臣を諸侯として配置し、宗法や礼を通じて秩序を維持した。',society:'農耕民、貴族、工人などの階層があり、祭祀や戦争が政治社会の中心にあった。',economy:'黄河流域の農業、青銅器鋳造、貢納と地域間交流が重要だった。',culture:'甲骨文字、青銅器、祖先祭祀、周の礼制が後代の政治思想に影響した。',keyFacts:['殷墟から甲骨文字を刻んだ骨や亀甲が出土している。','周は殷を倒した後、諸侯を通じた支配を展開した。','西周は紀元前771年頃に大きな危機を迎えた。'],people:['武丁','紂王（後世の記述には伝説的要素もある）','周武王','周公旦'],sources:[{label:'The Metropolitan Museum of Art',url:'https://www.metmuseum.org/toah/'},{label:'Encyclopaedia Britannica',url:'https://www.britannica.com/'}]},
      {id:'china-spring',name:'春秋時代',years:'紀元前770〜約前5世紀',startYear:-770,ruler:'周王室・諸侯国',overview:'周王室の権威が弱まる中、諸侯が覇を競い、会盟や同盟を通じて秩序を保とうとした。',politics:'諸侯国の君主が実権を持ち、強国の覇者が同盟を主導した。国の内部でも卿・大夫など有力家臣が台頭した。',society:'貴族的な身分秩序が変化し、鉄器や農業技術の広がりに伴って社会も変わり始めた。',economy:'農業と手工業、都市間交易が発達し、各国は人口と資源を把握する必要を強めた。',culture:'孔子の思想は後世に大きな影響を与えた。春秋期の出来事を記す『春秋』とその解釈は儒学の伝統で重要視された。',keyFacts:['紀元前770年に周の東遷が起きたとされる。','斉桓公や晋文公などが覇者として知られる。','春秋から戦国への移行は一斉ではなく、地域差がある。'],people:['孔子','斉桓公','晋文公'],sources:[{label:'The Metropolitan Museum of Art',url:'https://www.metmuseum.org/toah/'}]},
      {id:'china-three',name:'三国時代',years:'220〜280年',startYear:220,ruler:'魏・蜀漢・呉の皇帝・君主',overview:'後漢の崩壊後、魏・蜀漢・呉が中国の主導権を争った。三国の鼎立は280年に西晋が呉を滅ぼして終わった。',politics:'魏は華北を基盤にし、蜀漢は四川盆地、呉は長江下流域を中心に統治した。正統性をめぐる主張は史料や後世の物語で異なる。',society:'戦乱や人口移動が社会を変え、豪族や有力家門が地方で影響力を持った。',economy:'農業復興と屯田、長江流域の開発、軍事補給が政権の持続に重要だった。',culture:'正史『三国志』は陳寿が3世紀末頃に編さんした。後世の『三国志演義』は史実に文学的脚色を加えた作品である。',keyFacts:['220年に曹丕が魏を建てた。','221年に劉備が蜀漢を称した。','229年に孫権が皇帝を称した。','280年に西晋が呉を滅ぼした。'],people:['曹操','曹丕','劉備','諸葛亮','孫権','司馬懿'],sources:[{label:'Encyclopaedia Britannica: Three Kingdoms',url:'https://www.britannica.com/'}]},
      {id:'china-jin',name:'晋・南北朝時代',years:'265〜589年',startYear:265,ruler:'晋・南朝諸王朝・北朝諸政権',overview:'西晋による一時的な統一の後、北方諸政権と南方王朝が並立した。人口移動、仏教の広がり、制度の変化が進んだ。',politics:'西晋は280年に統一したが、八王の乱などで弱体化し、北方の諸政権が台頭した。南では東晋と宋・斉・梁・陳などが交替した。',society:'北方から南方への移住が進み、地域社会と文化が変化した。貴族層が政治で強い影響を持つ一方、北朝では軍事・行政制度の再編が進んだ。',economy:'長江流域の開発が進み、農業や手工業の地域構造が変化した。',culture:'仏教が広まり、石窟寺院や翻訳事業が発展した。書の分野では王羲之が後世に大きな影響を与えた。',keyFacts:['265年に司馬炎が晋を建てた。','316年に西晋が滅び、東晋が南方に成立した。','北魏の孝文帝は漢化政策を進めた。','589年に隋が陳を滅ぼして再統一した。'],people:['司馬炎','王羲之','孝文帝'],sources:[{label:'The Metropolitan Museum of Art',url:'https://www.metmuseum.org/toah/'}]},
      {id:'china-sui-tang',name:'隋・唐時代',years:'581〜907年',startYear:581,ruler:'皇帝・官僚機構',overview:'隋が中国を再統一し、唐は広域の交易と国際文化が栄える帝国を築いた。後半には節度使の台頭や反乱で中央の統制が揺らいだ。',politics:'隋は科挙の制度化や大運河建設を進めたが、過大な動員などで反発を招いた。唐は律令と官僚制を整え、安史の乱後は地方軍事勢力の自立が進んだ。',society:'都市と農村、官僚・貴族・農民の関係が変化し、長安などには外国人商人や宗教者も集まった。',economy:'大運河、陸海の交易、茶・絹・陶磁器などの生産が発展した。税制は均田制・租庸調から両税法へ変化した。',culture:'仏教、詩、書、絵画、陶磁器などが発展し、東アジア諸地域との交流も活発だった。',keyFacts:['隋は589年に南北を再統一した。','唐は618年に成立した。','755年に安史の乱が始まった。','907年に唐が滅びた。'],people:['隋文帝','唐太宗','武則天','玄宗','李白','杜甫'],sources:[{label:'The Metropolitan Museum of Art',url:'https://www.metmuseum.org/toah/'}]},
      {id:'china-song',name:'宋・元時代',years:'960〜1368年',startYear:960,ruler:'宋朝皇帝・元朝皇帝',overview:'宋では商業・都市・印刷技術が発達し、元ではモンゴル支配のもとユーラシア規模の交流が進んだ。',politics:'宋は文官官僚制を重視し、軍事力や北方勢力との関係が大きな課題だった。元はモンゴル帝国の支配構造を継承しつつ、中国の行政制度を組み合わせた。',society:'都市人口や商人の存在感が増し、地域間の流通が拡大した。元代は人々を分類する制度が存在したが、地域や時期により運用は異なる。',economy:'紙幣、印刷、海上交易、商業農業が発達し、港市が国際交易の結節点となった。',culture:'活版印刷、火薬・羅針盤の発展、宋学、山水画、元曲などが知られる。',keyFacts:['960年に宋が成立した。','南宋は1127年以降、江南を中心に存続した。','1279年に元が南宋を滅ぼした。','1368年に明が元を北へ追った。'],people:['趙匡胤','王安石','朱熹','フビライ・ハン'],sources:[{label:'The Metropolitan Museum of Art',url:'https://www.metmuseum.org/toah/'}]},
      {id:'china-qing-modern',name:'清・近現代中国',years:'1644年〜現代',startYear:1644,ruler:'清朝皇帝から近現代の政府へ',overview:'清は広大な多民族帝国を築いたが、19世紀以降は列強との戦争や内乱に直面し、20世紀には王朝体制が終わり国家体制が大きく変化した。',politics:'清は皇帝権力と多民族地域ごとの統治制度を組み合わせた。19世紀の内乱と列強の圧力の中で改革が試みられ、1911年の辛亥革命で王朝が終わった。',society:'人口増加、移住、内乱、戦争が社会に影響し、近代化の過程で都市労働者や新しい教育層が増えた。',economy:'農業と国内市場を基盤にしつつ、19世紀以降は条約港や国際貿易の影響が強まった。改革開放後は工業化と世界経済への統合が進んだ。',culture:'儒学や古典文化が続く一方、近代教育・出版・科学技術・大衆文化が発展した。',keyFacts:['1644年に清が北京を支配下に置いた。','1840年に第一次アヘン戦争が始まった。','1911年に辛亥革命が起き、1912年に清が終わった。','1949年に中華人民共和国が成立した。'],people:['康熙帝','乾隆帝','洪秀全','孫文','毛沢東'],sources:[{label:'The Metropolitan Museum of Art',url:'https://www.metmuseum.org/toah/'},{label:'Encyclopaedia Britannica',url:'https://www.britannica.com/'}]},
      {id:'china-warring',name:'春秋・戦国時代',years:'紀元前770〜221年',startYear:-770,ruler:'周王室と各地の諸侯・戦国七雄',overview:'周王室の権威が弱まるなかで諸侯が競争し、戦国時代には秦・楚・斉・燕・趙・魏・韓の七雄が覇を争った。戦争の規模が拡大し、行政・軍事・農業を国家が組織する仕組みが変化した。',politics:'春秋期には覇者を中心とする同盟や会盟が重要だったが、戦国期には王号を称する国が現れ、領域を直接支配する官僚制が強まった。各国は県などを通じて土地と住民を把握し、貴族の世襲的な権力を再編した。',society:'鉄製農具や牛耕の普及には地域差があるが、農業生産の拡大と人口増加が国家の動員力を支えた。兵士・農民への課税や兵役の負担が増し、士と呼ばれる知識人・軍事専門家が諸国を渡り歩いて政策を提案した。',economy:'灌漑や開墾、鉄器利用、都市市場の成長が進んだ。国家は農業生産と人口を把握し、税・兵役・労役を通じて戦争を支えた。商人や貨幣の重要性も増したが、地域ごとの発展には差があった。',culture:'儒家・道家・墨家・法家など多様な思想が競い合った。孔子や孟子は徳と政治のあり方を論じ、商鞅ら法家系の改革者は法・賞罰・国家動員を重視した。「諸子百家」は後世の整理も含む呼称で、当時の思想は一枚岩ではない。',deepDive:[{heading:'戦国七雄と秦の位置',body:'戦国七雄は秦・楚・斉・燕・趙・魏・韓。秦は西方に位置し、関中盆地を基盤に東方へ進出した。函谷関などの地形は防御上の利点となったが、地理だけで統一できたわけではなく、改革・外交・軍事指揮が組み合わさった。'},{heading:'商鞅の変法',body:'紀元前4世紀、秦で商鞅が進めた改革は、家柄に依存した権力を弱め、軍功に応じた爵位や賞罰、戸籍・連座的な統制、農業と軍事を重視する政策を推進した。改革の細部や実施過程は史料の性格に注意が必要だが、秦の国家動員力を高めた重要な要因とされる。'},{heading:'戦争の変化',body:'戦国期の戦争は、貴族中心の戦車戦から大規模な歩兵軍と動員戦へ変化した。城郭・兵器・補給・兵員確保が勝敗を左右し、長期戦を支える行政と農業基盤が重要になった。個々の戦闘の兵数は古代史料で誇張される場合があり、数字は慎重に扱う必要がある。'},{heading:'外交と合従連衡',body:'強大化する秦に対し、他国が連合して対抗する「合従」と、秦と個別に結ぶ「連衡」という外交構想が語られた。これは単純な固定陣営ではなく、各国が自国の安全と利益を求めて同盟を組み替える状況を表す。'},{heading:'統一への道',body:'秦は紀元前230年に韓を滅ぼしたのち、趙・魏・楚・燕・斉を順次征服し、紀元前221年に統一を達成した。順序や各戦役の経緯には個別の検討が必要だが、秦王政の時代に軍事力・行政・外交が結びついたことが重要である。'}],keyFacts:['春秋時代は一般に紀元前770年から、戦国時代は紀元前5世紀頃から紀元前221年までと区分されることが多い。','戦国七雄は秦・楚・斉・燕・趙・魏・韓。','秦は紀元前230年から紀元前221年にかけて他の六国を滅ぼした。','商鞅の改革は秦の軍事・行政能力を高めた重要な要因とされる。'],people:['孔子','孟子','商鞅','蘇秦','張儀','秦王政（始皇帝）'],sources:[{label:'Encyclopaedia Britannica: Qin dynasty',url:'https://www.britannica.com/topic/Qin-dynasty'},{label:'The Metropolitan Museum of Art: China',url:'https://www.metmuseum.org/toah/'}]},
      {id:'china-qin',name:'秦王朝',years:'紀元前221〜206年',startYear:-221,ruler:'始皇帝・秦の皇帝と中央官僚',overview:'秦王政が六国を滅ぼして中国を統一し、皇帝号、郡県制、度量衡・文字などの標準化を推進した。一方で大規模な建設事業、軍事動員、刑罰や労役への反発が重なり、始皇帝の死後まもなく王朝は崩壊した。',politics:'旧来の封建的な諸侯分立を避けるため、秦は各地に郡・県を置き、中央から官吏を派遣する郡県制を広げた。皇帝を頂点に官僚が命令を伝える体制は後代の帝国統治の重要な前例となったが、地域社会の実情や地方統治の負担も問題となった。',society:'農民は農業生産を担うとともに、税、兵役、労役などの負担を負った。北方防衛施設、道路、宮殿、始皇帝陵などの大事業は国家の能力を示す一方、多くの人員と資源を必要とした。負担の実態は地域や時期によって異なり、後世の史料が秦を厳罰の国家として描く点にも注意が必要である。',economy:'農業を国家財政と動員の基盤とし、度量衡や貨幣の標準化を通じて地域間の行政・取引を整えようとした。道路網は軍隊や命令の移動を助けたが、建設・維持には労働力と資材が必要だった。標準化がどこまで一度に浸透したかは、地域差を踏まえて考える必要がある。',culture:'文字の標準化は行政命令や記録を共有するうえで重要だった。焚書坑儒として知られる政策は後世の記述に依存する部分があり、実際の規模・対象・経緯には研究上の議論がある。秦の制度は短命な王朝で終わったが、漢は多くの制度を引き継ぎ、修正しながら運用した。',deepDive:[{heading:'統一前の出発点',body:'秦は戦国七雄の一国で、紀元前230年に韓、紀元前228年に趙の主要部、紀元前225年に魏、紀元前223年に楚、紀元前222年に燕、紀元前221年に斉を滅ぼしたと整理される。戦役の細部や年次の扱いには史料批判が必要だが、秦王政が統一を完成させたことは秦史の中心的事実である。'},{heading:'始皇帝の統治改革',body:'秦王政は統一後に「皇帝」の称号を採用し、中央から官吏を派遣する郡県制を広げた。文字・度量衡・車軌などの標準化は、異なる地域を一つの行政空間として扱うことを目指した。制度の導入と現地での定着は同じではなく、実施には時間と地域差があった。'},{heading:'北方防衛と大規模事業',body:'秦は北方の防衛施設を接続・整備し、道路・宮殿・始皇帝陵などの事業を進めた。これらを後世の「万里の長城」という一つの完成した建造物と同一視するのは不正確で、秦以前の壁を含む複数の防衛施設の歴史として見る必要がある。'},{heading:'秦はなぜ短命だったのか',body:'紀元前210年に始皇帝が死去した後、後継をめぐる混乱や宮廷内の権力闘争が起き、紀元前209年には陳勝・呉広の乱が発生した。反乱は各地へ広がり、楚の旧勢力や劉邦・項羽らが台頭し、紀元前206年に秦王朝は終わった。重い負担や厳格な統治は重要な説明要因だが、それだけでなく後継問題、地方反乱、軍事指揮の崩れも合わせて考える必要がある。'},{heading:'秦の遺産',body:'秦王朝は短命でも、領域統一、郡県制、標準化などの制度的な遺産を残した。漢は秦の制度をそのまま全て維持したのではなく、儒学の位置づけや統治の正当化などを調整した。秦の崩壊は「中央集権が失敗した」という単純な話ではなく、統一国家を持続させるために統治の強さと社会的負担をどう調整するかという問題を示している。'}],keyFacts:['紀元前221年、秦王政が中国を統一し、始皇帝を称した。','秦は郡県制を広げ、文字・度量衡などの標準化を進めた。','始皇帝は紀元前210年に死去し、紀元前209年に陳勝・呉広の乱が起きた。','秦王朝は紀元前206年に終わり、漢王朝が続いた。'],people:['秦王政（始皇帝）','李斯','蒙恬','陳勝','呉広','項羽','劉邦'],sources:[{label:'Encyclopaedia Britannica: Qin dynasty',url:'https://www.britannica.com/topic/Qin-dynasty'},{label:'The Metropolitan Museum of Art: China',url:'https://www.metmuseum.org/toah/'}]},
      {id:'china-han',name:'漢王朝',years:'紀元前206〜紀元後220年',startYear:-206,ruler:'皇帝・官僚機構',overview:'秦の統一後の帝国制度を引き継ぎ、儒学・官僚制・交易が発展した王朝。前漢と後漢の間には王莽の新がある。',politics:'皇帝を頂点とする官僚制が広がり、中央と地方の関係が重要な政治課題だった。',society:'農民を基盤に、官僚・地主・商人などが社会を構成した。',economy:'農業、鉄器生産、絹などの交易が重要だった。',culture:'儒学、歴史書、紙の初期技術史などが知られる。',keyFacts:['漢王朝は一般に紀元前206年から紀元後220年までとされる。','張騫の西域派遣は後のシルクロード交易史で重要である。','紙の発明・普及は単一の瞬間ではなく、長い技術史として見る必要がある。'],people:['漢武帝','司馬遷','張騫'],sources:[{label:'The Metropolitan Museum of Art',url:'https://www.metmuseum.org/toah/'}]},
      {id:'china-ming',name:'明王朝',years:'1368〜1644年',startYear:1368,ruler:'皇帝・官僚機構',overview:'元に代わって成立し、官僚制や農業を基盤としつつ、海上交易や大規模な国家事業を展開した王朝。',politics:'皇帝権力が強く、官僚試験を通じた文官制度が国家運営を支えた。',society:'農村社会が大きな基盤であり、商業や都市文化も成長した。',economy:'農業、陶磁器生産、国内・海外交易が重要だった。',culture:'小説、陶磁器、絵画、百科事業などが発展した。',keyFacts:['明は1368年に成立し、1644年に北京が陥落した。','鄭和の航海は15世紀初頭に行われた。','明代後期には銀の流通と国際交易が財政・経済に大きく影響した。'],people:['洪武帝','永楽帝','鄭和'],sources:[{label:'The Metropolitan Museum of Art',url:'https://www.metmuseum.org/toah/'}]}
    ]
  },
  {
    id:'mongol',name:'モンゴル帝国',subtitle:'MONGOL EMPIRE',symbol:'ᠮ',
    overview:'ユーラシア各地を結ぶ広大な帝国を築き、征服と同時に交易・外交・人や技術の移動にも大きな影響を与えた。',
    eras:[
      {id:'mongol-rise',name:'帝国の拡大期',years:'1206〜13世紀後半',startYear:1206,ruler:'大ハーンと各ウルス',overview:'1206年にテムジンがチンギス・ハーンとして推戴されたことを起点に、モンゴル勢力はユーラシア各地へ拡大した。',politics:'大ハーンの権威と、各地の王族・ウルスの関係が帝国の統治を形作った。',society:'遊牧社会を基盤としつつ、征服地域の農耕民・都市住民・官僚・職人も帝国運営に関わった。',economy:'陸上交易路、駅伝制度、都市の税や生産が地域をつないだ。',culture:'多言語・多宗教の人々が帝国の領域を移動し、技術や知識の交流が起こった。',keyFacts:['1206年、テムジンがチンギス・ハーンとして推戴された。','帝国は単一の均質な国家ではなく、時代と地域により統治形態が異なった。','征服は多くの地域に破壊をもたらす一方、広域交流の条件も変えた。'],people:['チンギス・ハーン','オゴデイ','フビライ'],sources:[{label:'The Metropolitan Museum of Art',url:'https://www.metmuseum.org/toah/'},{label:'Encyclopaedia Britannica',url:'https://www.britannica.com/place/Mongol-empire'}]}
    ]
  }
];

function extraEra(civId:string,id:string,name:string,years:string,startYear:number,overview:string,keyFacts:string[],people:string[]=[]):Era {
  const civ=CIVILIZATIONS.find(c=>c.id===civId)!;
  return {id,name,years,startYear,ruler:'時期・地域により異なる',overview,politics:'政治制度や権力関係は時期・地域ごとの史料に基づいて考える。',society:'身分や立場、都市と農村、地域によって暮らしは異なった。',economy:'農業・生産・税・交易が社会を支えたが、その比重は時代ごとに変化した。',culture:'考古資料や文字史料を照らし合わせ、後世の評価と当時の実態を区別する。',keyFacts,people,sources:[{label:'The Metropolitan Museum of Art',url:'https://www.metmuseum.org/toah/'},{label:'Encyclopaedia Britannica',url:'https://www.britannica.com/'}]};
}
const EXTRA_ERAS:Record<string,Era[]> = {
 japan:[
 extraEra('japan','japan-jomon-phases','縄文時代・草創期〜早期','約1万6000年前〜紀元前4000年頃（地域差あり）',-14000,'土器の出現や定住化の進展を手がかりに、列島の先史社会を考える。',['縄文文化の始まりや変化は地域によって異なる。']),
 extraEra('japan','japan-jomon-late','縄文時代・後期〜晩期','紀元前2500年頃〜紀元前1千年紀頃（地域差あり）',-2500,'集落や祭祀、資源利用の変化を考古資料から探る時期。',['縄文から弥生への移行時期は列島全体で同時ではない。']),
 extraEra('japan','japan-yayoi-early','弥生時代前期','紀元前1千年紀頃〜（地域差あり）',-900,'水稲農耕が北部九州などから広がり始めた時期。',['稲作の開始年代や広がり方には地域差がある。']),
 extraEra('japan','japan-yayoi-middle','弥生時代中期','紀元前数世紀頃〜紀元後1世紀頃',-300,'稲作社会の拡大とともに集落の規模や地域間関係が変化した。',['青銅器・鉄器の用途や普及時期は地域差がある。']),
 extraEra('japan','japan-yayoi-late','弥生時代後期・倭国','紀元後1〜3世紀頃',100,'中国史書に倭の社会や外交に関する記録が現れる。',['卑弥呼の活動年代や邪馬台国の所在地には議論がある。'],['卑弥呼']),
 extraEra('japan','japan-kofun-early-detail','古墳時代前期','3世紀中頃〜4世紀頃',250,'大型古墳の造営が広がり、有力首長間の結びつきが強まった。',['政治統合の過程や古墳の年代には研究上の議論がある。']),
 extraEra('japan','japan-kofun-middle-detail','古墳時代中期','5世紀頃',400,'巨大古墳や大陸・朝鮮半島との交流が重要となった。',['古墳の被葬者比定は慎重に行う必要がある。']),
 extraEra('japan','japan-kofun-late-detail','古墳時代後期','6世紀〜7世紀初頭頃',500,'古墳文化の変化や仏教受容が国家形成に影響した。',['古墳時代から飛鳥時代への移行区分には幅がある。']),
 extraEra('japan','japan-asuka-reform','飛鳥時代・改革と律令国家形成','6世紀末〜710年',593,'外交・仏教受容・制度改革を通じて中央統治が変化した。',['乙巳の変は645年。改革は一度で完成したのではない。'],['推古天皇','中大兄皇子','中臣鎌足']),
 extraEra('japan','japan-hakuhou-detail','白鳳文化期','7世紀後半〜8世紀初頭（文化史上の区分）',650,'仏教美術や大陸文化との交流を考える文化史上の区分。',['文化史上の区分で、政治史の時代区分とは完全には一致しない。']),
 extraEra('japan','japan-heian-early-detail','平安時代前期','794〜10世紀頃',794,'平安京への遷都後、律令制の運用が変化し宮廷文化が発展した。',['平安時代の政治・社会は約400年の間に大きく変化した。']),
 extraEra('japan','japan-sekkan-detail','摂関政治期','10世紀後半〜11世紀後半頃',960,'藤原北家の有力者が摂政・関白として朝廷政治を主導した。',['婚姻関係や官職が貴族政治で重要な役割を果たした。'],['藤原道長','紫式部']),
 extraEra('japan','japan-insei-detail','院政期・平氏の台頭','1086〜1185年',1086,'上皇の政治参加と武士勢力の成長が並行した。',['院政期の政治は朝廷内の複数勢力と武士の関係から見る必要がある。'],['後白河法皇','平清盛']),
 extraEra('japan','japan-kamakura-early-detail','鎌倉幕府成立期','1180年代〜1221年',1180,'源頼朝を中心に武士政権が形成され、朝廷と幕府が並び立った。',['承久の乱は1221年。'],['源頼朝','北条政子']),
 extraEra('japan','japan-kamakura-late-detail','鎌倉幕府後期・元寇','13世紀中頃〜1333年',1250,'元寇や御家人の経済問題が幕府の統治に影響した。',['元軍の襲来は1274年と1281年。'],['北条時宗']),
 extraEra('japan','japan-nanbokucho-detail','南北朝時代','1336〜1392年（区分に諸説）',1336,'二つの朝廷が並び立ち、武士勢力が複雑な争いを続けた。',['南北朝の合一は一般に1392年とされる。']),
 extraEra('japan','japan-muromachi-early-detail','室町時代前期','14世紀後半〜15世紀前半',1392,'足利幕府が政治秩序を整え、対外交易や文化活動が展開した。',['将軍と守護大名の関係は時期によって変化した。'],['足利義満']),
 extraEra('japan','japan-sengoku-detail','戦国時代','15世紀後半〜16世紀後半（地域差あり）',1467,'守護大名や戦国大名が領国支配を進め、各地で勢力争いが続いた。',['応仁の乱は1467年に始まるが、戦国時代の始期には諸説ある。'],['織田信長','武田信玄','上杉謙信']),
 extraEra('japan','japan-azuchi-momoyama-detail','安土桃山時代','1568〜1600年頃（区分に幅）',1568,'織田信長と豊臣秀吉の政権形成を通じて統一が進んだ。',['統一過程は地域ごとに進み、1600年以後も政治再編が続いた。'],['織田信長','豊臣秀吉']),
 extraEra('japan','japan-edo-early-detail','江戸時代前期','1603〜17世紀中頃',1603,'幕府と藩による統治体制が整えられた。',['対外交流は制限されたが、長崎・対馬・薩摩・松前などを通じて続いた。'],['徳川家康','徳川家光']),
 extraEra('japan','japan-edo-middle-detail','江戸時代中期','18世紀頃',1700,'都市経済や出版文化が成長し、幕府財政の改革も課題となった。',['享保・寛政・天保の改革は異なる背景と内容を持つ。']),
 extraEra('japan','japan-edo-late-detail','江戸時代後期','19世紀前半〜1853年',1800,'対外関係の緊張や財政問題が強まり、幕府・諸藩の改革が試みられた。',['開国以前から外交・沿岸防備をめぐる課題が存在した。']),
 extraEra('japan','japan-bakumatsu-detail','幕末・開国と政権交代','1853〜1868年',1853,'外国船来航と条約締結を契機に国内政治の対立が深まり、政権交代へ向かった。',['ペリー来航は変化の重要な契機だが、背景はそれだけではない。'],['徳川慶喜','坂本龍馬','西郷隆盛']),
 extraEra('japan','japan-meiji-detail','明治時代','1868〜1912年',1868,'中央集権国家の形成、産業化、憲法制定と帝国議会の開設が進んだ。',['近代化には制度改革だけでなく、戦争や社会的負担も伴った。']),
 extraEra('japan','japan-taisho-detail','大正時代','1912〜1926年',1912,'政党政治や大衆文化が広がる一方、社会運動や国際情勢も政治に影響した。',['政治参加の拡大はあったが、当時の選挙権には制限があった。']),
 extraEra('japan','japan-showa-prewar-detail','昭和前期・戦時体制','1926〜1945年',1926,'恐慌と政治的緊張を経て、社会・経済が総力戦体制へ組み込まれた。',['1931年以降の戦争拡大と1941年の対米英開戦を区別して考える。']),
 extraEra('japan','japan-showa-postwar-detail','昭和後期・戦後復興と高度成長','1945〜1989年',1945,'戦後改革と復興を経て、高度経済成長と生活様式の変化が起こった。',['復興・高度成長・石油危機後は別々の段階として捉える。']),
 extraEra('japan','japan-heisei-detail','平成時代','1989〜2019年',1989,'バブル経済崩壊、少子高齢化、災害、デジタル化などを経験した。',['平成は1989年に始まり、2019年の改元で終わった。']),
 extraEra('japan','japan-reiwa-detail','令和時代','2019年〜現在',2019,'人口構造の変化やデジタル技術、災害対策、国際情勢が重要課題となっている。',['現代史では確定した事実と将来予測を分けて考える。'])
 ],
 china:[
 extraEra('china','china-xia-detail','夏王朝（伝承と考古学）','年代には諸説',-2070,'初期王朝伝承と二里頭文化などの考古資料の関係が議論される。',['夏王朝の実在や年代、二里頭文化との関係は確定していない。']),
 extraEra('china','china-shang-detail','殷（商）王朝','紀元前約1600〜1046年',-1600,'青銅器文化と甲骨文字の記録が王権や祭祀を知る手がかりとなる。',['甲骨文は商代後期の政治・祭祀研究に重要。']),
 extraEra('china','china-western-zhou-detail','西周','紀元前1046〜771年',-1046,'周王を中心とする政治秩序と諸侯の関係が展開した。',['周の年代は一般的な歴史年表に基づく目安。']),
 extraEra('china','china-spring-autumn-detail','春秋時代','紀元前770〜476年頃',-770,'周王室の権威が弱まる中、諸侯国が競争と同盟を重ねた。',['春秋時代の終期は区分方法により異なる。']),
 extraEra('china','china-warring-states-detail','戦国時代・秦の台頭','紀元前475〜221年頃',-475,'有力国が軍制・行政・財政改革を進め、秦が統一へ向かった。',['戦国七雄の勢力関係は時期ごとに変わった。'],['商鞅','秦王政']),
 extraEra('china','china-qin-detail','秦王朝','紀元前221〜206年',-221,'秦王政が中国を統一し、度量衡や文字などの標準化を進めた。',['秦の統一は紀元前221年。統一後まもなく王朝は崩壊した。'],['始皇帝']),
 extraEra('china','china-chuhan-detail','楚漢戦争','紀元前206〜202年',-206,'秦崩壊後、劉邦と項羽らの勢力が覇権を争った。',['前漢の成立は一般に紀元前202年とされる。'],['劉邦','項羽']),
 extraEra('china','china-three-kingdoms-detail','三国時代','220〜280年',220,'魏・蜀・呉が並び立ち、軍事・外交・行政を競った。',['三国の成立は220年、晋による統一は280年とされる。'],['曹操','劉備','孫権']),
 extraEra('china','china-jin-detail','西晋と東晋','265〜420年',265,'晋が一時統一した後、政権の中心が南へ移り、複数勢力が並び立った。',['西晋の統一は短期間で、316年に北方の首都が陥落した。']),
 extraEra('china','china-northern-southern-detail','南北朝時代','420〜589年',420,'南北に複数の政権が並び、仏教や制度・文化の交流が進んだ。',['南北朝は複数王朝を含む時代区分。']),
 extraEra('china','china-sui-detail','隋王朝','581〜618年',581,'南北を再統一し、大運河整備などを進めたが短命に終わった。',['隋の統一は589年。大規模事業は社会負担も生んだ。']),
 extraEra('china','china-tang-detail','唐王朝','618〜907年',618,'広域の官僚制と国際交流が発展し、長安は多文化的な都となった。',['唐の政治・経済は安史の乱以降に大きく変化した。']),
 extraEra('china','china-song-detail','宋王朝','960〜1279年',960,'商業・都市・印刷や技術が発展し、北宋と南宋で政治環境が異なった。',['北宋は1127年に南遷し、南宋は1279年に滅亡した。']),
 extraEra('china','china-yuan-detail','元王朝','1271〜1368年',1271,'モンゴル支配のもと、ユーラシア規模の交流と多様な統治が展開した。',['元の成立年は1271年、滅亡は1368年とされる。']),
 extraEra('china','china-qing-detail','清王朝','1644〜1912年',1644,'満洲の皇帝が多民族帝国を統治し、18世紀に領域が大きく広がった。',['清末には内乱・外交圧力・制度改革の課題が重なった。'])
 ],
 egypt:[
 extraEra('egypt','egypt-early-dynastic-detail','初期王朝時代','紀元前約3100〜2686年',-3100,'上下エジプトの統合を背景に初期国家制度が形成された。',['年代は一般的なエジプト学の区分に基づく目安。']),
 extraEra('egypt','egypt-old-kingdom-detail','古王国','紀元前約2686〜2181年',-2686,'ピラミッド建設で知られ、王権と行政組織が発展した。',['ピラミッド建設は複雑な労働・行政・資源動員を必要とした。']),
 extraEra('egypt','egypt-first-intermediate-detail','第一中間期','紀元前約2181〜2055年',-2181,'中央王権が弱まり地方統治者が重要性を増した。',['中間期を単なる無秩序とみなすのは単純化しすぎる。']),
 extraEra('egypt','egypt-middle-kingdom-detail','中王国','紀元前約2055〜1650年',-2055,'王権の再統合と文学・行政の発展が進んだ。',['年代には研究上の幅がある。']),
 extraEra('egypt','egypt-second-intermediate-detail','第二中間期','紀元前約1650〜1550年',-1650,'複数の政権が並び、北部ではヒクソス勢力が重要となった。',['ヒクソスの支配地域や政治関係を一様に扱わない。']),
 extraEra('egypt','egypt-new-kingdom-detail','新王国','紀元前約1550〜1070年',-1550,'エジプトの勢力が国外へ広がり、王墓や神殿建築が発展した。',['アマルナ時代など内部の変化も大きかった。'],['ハトシェプスト','アクエンアテン','ラムセス2世']),
 extraEra('egypt','egypt-late-period-detail','末期王朝時代','紀元前664〜332年',-664,'在地王朝と外国勢力の支配が交替し、地中海世界との関係が深まった。',['年代区分には異なる整理法がある。']),
 extraEra('egypt','egypt-ptolemaic-detail','プトレマイオス朝','紀元前305〜30年',-305,'ギリシャ系王朝がエジプトを統治し、アレクサンドリアが学問・交易の中心となった。',['クレオパトラ7世の死後、エジプトはローマの支配下に入った。'],['クレオパトラ7世'])
 ],
 greece:[
 extraEra('greece','greece-minoan-detail','ミノア文明','紀元前約2000〜1450年頃',-2000,'クレタ島を中心に宮殿、海上交流、独自の文字文化が発展した。',['線文字Aは現在も十分には解読されていない。']),
 extraEra('greece','greece-mycenaean-detail','ミケーネ文明','紀元前約1600〜1100年頃',-1600,'ギリシャ本土の宮殿社会が発展し、線文字Bの記録が残る。',['線文字Bは初期ギリシャ語を記した文字体系。']),
 extraEra('greece','greece-dark-age-detail','初期鉄器時代','紀元前約1100〜800年頃',-1100,'宮殿社会の崩壊後、地域社会が変化し、後のポリス形成へ向かった。',['「暗黒時代」という呼称は資料の少なさを反映し、文化がなかった意味ではない。']),
 extraEra('greece','greece-archaic-detail','アルカイック期','紀元前約800〜480年',-800,'ポリスや植民市が発展し、文字・芸術・政治制度が変化した。',['ポリスの制度は地域によって大きく異なった。'],['ソロン','ペイシストラトス']),
 extraEra('greece','greece-classical-detail','古典期','紀元前480〜323年',-480,'ペルシア戦争後、ポリス間の競争と哲学・演劇・建築の発展が進んだ。',['アテナイ民主政の参加資格は限定されていた。'],['ペリクレス','ソクラテス','プラトン']),
 extraEra('greece','greece-hellenistic-detail','ヘレニズム時代','紀元前323〜31年',-323,'アレクサンドロス大王の死後、ギリシャ語文化と各地の文化が交わった。',['文化の広がりは一方通行ではなく、地域文化との相互作用だった。'],['アレクサンドロス大王'])
 ],
 rome:[
 extraEra('rome','rome-kingdom-detail','王政ローマ（伝承上の時代）','紀元前753〜509年（伝統的年代）',-753,'ローマ建国伝承と初期都市形成を考える時期。',['初期ローマの年代や物語には後世の伝承が含まれる。']),
 extraEra('rome','rome-republic-detail','共和政ローマ','紀元前509〜27年（伝統的年代）',-509,'元老院や民会などの制度のもと、ローマは地中海へ勢力を広げた。',['政治参加や権力は市民間でも平等ではなかった。'],['ユリウス・カエサル','キケロ']),
 extraEra('rome','rome-late-republic-detail','共和政末期・内乱','紀元前133〜27年頃',-133,'社会的緊張と軍事指導者の競争が内乱を招き、元首政へ移行した。',['紀元前27年にアウグストゥスの元首政が始まった。'],['ユリウス・カエサル','アウグストゥス']),
 extraEra('rome','rome-early-empire-detail','帝政初期','紀元前27年〜紀元後約200年',-27,'皇帝と元老院、都市自治が併存し、地中海交易が発展した。',['帝国の各地域は言語・宗教・慣習が一様ではなかった。'],['アウグストゥス','トラヤヌス']),
 extraEra('rome','rome-crisis-detail','3世紀の危機','235〜284年',235,'内乱、皇帝交替、外敵への対応、経済的問題が重なった。',['地域や皇帝によって危機への対応は異なった。']),
 extraEra('rome','rome-tetrarchy-detail','四帝統治と再編','284〜337年頃',284,'ディオクレティアヌスらが帝国統治を再編し、後にコンスタンティヌスが台頭した。',['四帝統治は固定的な四分割国家として長く続いたわけではない。'],['ディオクレティアヌス','コンスタンティヌス']),
 extraEra('rome','rome-late-empire-detail','後期ローマ帝国','4〜5世紀',300,'キリスト教の制度化と政治的分裂を経て、西方帝国は5世紀に終焉した。',['西ローマ帝国の終焉は一般に476年とされるが、変化は段階的だった。'])
 ],
 mongol:[
 extraEra('mongol','mongol-unification-detail','モンゴル統一','1206年頃',1206,'テムジンが諸勢力をまとめ、チンギス・ハーンとして推戴された。',['1206年は帝国形成を考える重要な節目。'],['チンギス・ハーン']),
 extraEra('mongol','mongol-expansion-detail','モンゴル帝国の拡大','13世紀前半',1220,'征服が中央アジアなどへ広がり、各地の政治・人口・交易に大きな影響を与えた。',['征服は多くの地域に深刻な破壊と犠牲をもたらした。']),
 extraEra('mongol','mongol-fragmentation-detail','帝国の分裂と諸ウルス','13世紀後半〜14世紀',1260,'複数のハン国・ウルスが独自の政治を展開しつつ交流を続けた。',['帝国は単一の中央集権国家として一様に存続したわけではない。']),
 extraEra('mongol','mongol-yuan-detail','元王朝と中国統治','1271〜1368年',1271,'フビライの王朝が中国を統治し、モンゴル帝国の他地域とは異なる制度を発展させた。',['元の成立年は1271年、明への交替は1368年。'],['フビライ']),
 extraEra('mongol','mongol-ilkhanate-detail','イルハン朝','1256〜1335年頃',1256,'西アジアでモンゴル系王朝が統治し、地域の行政・宗教・文化と交わった。',['イルハン朝の政治と宗教政策は時期によって変化した。'])
 ]
};
for (const civ of CIVILIZATIONS) {
 const additions = EXTRA_ERAS[civ.id] || [];
 const existing = new Set(civ.eras.map(e=>e.id));
 civ.eras.push(...additions.filter(e=>!existing.has(e.id)));
}


const allEras = CIVILIZATIONS.flatMap(c => c.eras.map(e => ({...e, civName:c.name, civId:c.id, symbol:c.symbol})));
const defaultCiv = CIVILIZATIONS[0];
const defaultEra = defaultCiv.eras.find(e => e.id === 'edo')!;
const EXAMPLES = [
  '海外との交易をもっと積極的に進めていたら？',
  '教育を受けられる人を大きく増やしていたら？',
  '新しい動力技術を早い段階で導入していたら？'
];
const GOALS = ['技術力を最優先する','経済と暮らしを安定させる','文化と学問を発展させる','軍事力と領土を拡大する','社会の格差を小さくする'];

function readSaved(): Outcome[] {
  try { return JSON.parse(localStorage.getItem('historia-worldlines') || '[]') as Outcome[]; } catch { return []; }
}
function App() {
  const [view,setView] = useState<View>('play');
  const [civId,setCivId] = useState('japan');
  const [eraId,setEraId] = useState('edo');
  const [mode,setMode] = useState<Mode>('standard');
  const [goal,setGoal] = useState(GOALS[1]);
  const [intervention,setIntervention] = useState('');
  const [attempts,setAttempts] = useState(3);
  const [outcomes,setOutcomes] = useState<Outcome[]>([]);
  const [activeId,setActiveId] = useState('');
  const [savedWorlds,setSavedWorlds] = useState<Outcome[]>([]);
  const [loading,setLoading] = useState(false);
  const [errorMessage,setErrorMessage] = useState('');
  const [mobileMenu,setMobileMenu] = useState(false);
  const [quizAnswer,setQuizAnswer] = useState('');
  const [quizChecked,setQuizChecked] = useState(false);
  const [challengeText,setChallengeText] = useState('');
  const [notice,setNotice] = useState('');
  const [showMoreStudy,setShowMoreStudy] = useState(false);

  const civ = CIVILIZATIONS.find(c=>c.id===civId) || defaultCiv;
  const era = civ.eras.find(e=>e.id===eraId) || civ.eras[0];
  const current = outcomes.find(o=>o.id===activeId) || outcomes[0];
  const currentAttempts = mode==='free' ? Infinity : attempts;
  const canSubmit = intervention.trim().length>0 && currentAttempts>0 && !loading;

  useEffect(()=>{
    setSavedWorlds(readSaved());
    if ('serviceWorker' in navigator) {
      window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
    }
  },[]);

  useEffect(()=>{
    try { localStorage.setItem('historia-worldlines',JSON.stringify(savedWorlds)); } catch {}
  },[savedWorlds]);

  function chooseCiv(id:string) {
    const next=CIVILIZATIONS.find(c=>c.id===id)!;
    setCivId(id); setEraId(next.eras[0].id); setOutcomes([]); setActiveId('');
    setAttempts(mode==='challenge'?1:3); setErrorMessage('');
  }
  function chooseMode(next:Mode) {
    setMode(next); setAttempts(next==='challenge'?1:3); setOutcomes([]); setActiveId('');
  }
  function resetWorld() {
    setAttempts(mode==='challenge'?1:3); setOutcomes([]); setActiveId('');
    setIntervention(''); setErrorMessage(''); setNotice('新しい世界線を開始したよ。');
  }
  async function alterHistory() {
    if(!intervention.trim()){setErrorMessage('変えたい歴史を文章で入力してね。');return;}
    if(currentAttempts<=0){setErrorMessage('この世界線の改変回数を使い切ったよ。新しい世界線を始めてね。');return;}
    setLoading(true);setErrorMessage('');setNotice('');
    try {
      const response=await api.post('/api/alter-history',{
        civId:civ.id,eraId:era.id,intervention:intervention.trim(),goal,
        previousOutcomes:outcomes.slice(0,3).map(o=>({title:o.title,summary:o.summary}))
      });
      const data=response.data as Omit<Outcome,'id'|'intervention'|'civName'|'eraName'>;
      if(!data?.title||!Array.isArray(data.background)||!Array.isArray(data.timeline)||!Array.isArray(data.causalChain)||!Array.isArray(data.learningNotes)) throw new Error('Invalid AI response');
      const result:Outcome={...data,id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),intervention:intervention.trim(),civName:civ.name,eraName:era.name};
      setOutcomes(previous=>[result,...previous]);setActiveId(result.id);
      if(mode!=='free')setAttempts(v=>Math.max(0,v-1));
      setIntervention('');setView('play');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'AIへの接続に失敗しました。しばらく待って再試行してください。');
    } finally {setLoading(false);}
  }
  function saveWorld(outcome:Outcome) {
    setSavedWorlds(prev=>prev.some(o=>o.id===outcome.id)?prev:[outcome,...prev]);
    setNotice('世界線をこの端末に保存したよ。');
  }
  async function shareWorld(outcome:Outcome) {
    const text='HISTORIA / HISTORY HACKER\n文明：'+outcome.civName+'・'+outcome.eraName+'\n改変：'+outcome.intervention+'\n世界線：'+outcome.title+'\n'+outcome.summary+'\n\n※これはAIによる仮想歴史です。史実とは区別してください。';
    try { await navigator.clipboard.writeText(text); setNotice('世界線の共有テキストをコピーしたよ。'); }
    catch { setChallengeText(text); setView('challenge'); setNotice('共有用テキストを表示したよ。コピーして友達に送ってね。'); }
  }
  function startChallenge() {
    const pick=allEras[Math.floor(Math.random()*allEras.length)];
    const nextCiv=CIVILIZATIONS.find(c=>c.id===pick.civId)!;
    setCivId(nextCiv.id);setEraId(pick.id);setMode('challenge');setAttempts(1);
    setOutcomes([]);setActiveId('');setIntervention('');setGoal(GOALS[Math.floor(Math.random()*GOALS.length)]);
    setView('play');setNotice('お題の世界線をセットしたよ。改変は1回だけ。');
  }

  const progress=mode==='free'?100:Math.round(((mode==='challenge'?1:3)-attempts)/(mode==='challenge'?1:3)*100);
  const quiz=useMemo(()=>{
    const e=era;
    const answer=e.keyFacts[0];
    return {question:'次のうち、'+era.name+'についての学習ポイントとして正しいのはどれ？', options:[answer, 'この時代の社会・政治は世界中で完全に同じ制度だった。','この時代の出来事は、後世の歴史研究でも一切議論がない。'], correct:answer};
  },[era]);
  const activeFacts=era.keyFacts;
  const setEra=(id:string)=>{setEraId(id);setOutcomes([]);setActiveId('');setAttempts(mode==='challenge'?1:3);setErrorMessage('');};

  return <div className="app-shell">
    <aside className={'sidebar '+(mobileMenu?'sidebar-open':'')}>
      <div className="brand"><div className="brand-mark"><GitBranch size={22}/></div><div><div className="brand-name">HISTORIA</div><div className="brand-sub">HISTORY HACKER</div></div><button className="icon-btn mobile-close" onClick={()=>setMobileMenu(false)} aria-label="メニューを閉じる"><X size={18}/></button></div>
      <div className="side-label">EXPLORE THE PAST</div>
      <button className={'nav-item '+(view==='play'?'active':'')} onClick={()=>{setView('play');setMobileMenu(false);}}><Globe2 size={18}/>世界線を改変</button>
      <button className={'nav-item '+(view==='learn'?'active':'')} onClick={()=>{setView('learn');setMobileMenu(false);}}><BookOpen size={18}/>歴史を学ぶ</button>
      <button className={'nav-item '+(view==='worldlines'?'active':'')} onClick={()=>{setView('worldlines');setMobileMenu(false);}}><Layers3 size={18}/>保存した世界線 <span className="nav-count">{savedWorlds.length}</span></button>
      <button className={'nav-item '+(view==='challenge'?'active':'')} onClick={()=>{setView('challenge');setMobileMenu(false);}}><Trophy size={18}/>チャレンジ・共有</button>
      <div className="sidebar-spacer"/>
      <div className="fact-integrity"><ShieldCheck size={18}/><div><strong>FACT CHECK MODE</strong><span>固定史料と仮想を分離</span></div><span className="status-dot"/></div>
      <div className="sidebar-footer">STUDY BUILD <span>v0.2</span></div>
    </aside>
    {mobileMenu&&<button className="scrim" onClick={()=>setMobileMenu(false)} aria-label="メニューを閉じる"/>}
    <main className="main">
      <header className="topbar"><button className="icon-btn mobile-menu-btn" onClick={()=>setMobileMenu(true)} aria-label="メニューを開く"><Menu size={20}/></button><div className="breadcrumb"><span>HISTORIA</span><span className="crumb-slash">/</span><strong>{view==='play'?'HISTORY HACKER':view==='learn'?'HISTORY LIBRARY':view==='worldlines'?'SAVED WORLDLINES':'CHALLENGE MODE'}</strong></div><div className="top-status"><span className="live-dot"/><span>FACTS ≠ WHAT IF</span></div></header>
      {notice&&<div className="notice-banner"><Check size={15}/>{notice}<button onClick={()=>setNotice('')}>閉じる</button></div>}

      {view==='play'&&<div className="content">
        <section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line"/>THE ART OF ALTERNATE HISTORY</div><h1>歴史を学び、<br/><em>世界を書き換える。</em></h1><p>まずは文明と年代を選ぼう。史実を読み解き、限られた介入で別の歴史をシミュレーション。</p><div className="hero-meta"><span><GraduationCap size={14}/> STUDY FIRST</span><span className="meta-divider"/><span><Sparkles size={14}/> AI SIMULATION</span></div></div><div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="art-core"><span>{era.startYear<0?Math.abs(era.startYear)+' BCE':era.startYear}</span><small>{civ.subtitle}</small></div><div className="art-node node-a"><span>FACT</span><i/></div><div className="art-node node-b"><span>WHAT IF</span><i/></div><div className="art-node node-c"><span>LEARN</span><i/></div><div className="art-caption">ONE CHANGE<br/><strong>INFINITE PATHS</strong></div></div></section>

        <section className="selector-section"><div className="section-heading"><div><div className="eyebrow compact">01 / CIVILIZATION</div><h2>文明を選ぶ</h2></div><span className="section-note">選ぶ文明で時代と背景が変わる。</span></div><div className="civilization-grid">{CIVILIZATIONS.map(c=><button key={c.id} className={'civilization-card '+(civ.id===c.id?'selected':'')} onClick={()=>chooseCiv(c.id)}><span className="civ-symbol">{c.symbol}</span><span className="civ-title">{c.name}</span><span className="civ-subtitle">{c.subtitle}</span><span className="civ-desc">{c.overview}</span></button>)}</div></section>

        <section className="era-section"><div className="section-heading"><div><div className="eyebrow compact">02 / ERA</div><h2>開始する年代を選ぶ</h2></div><span className="section-note">{civ.name}の時代区分</span></div><div className="era-tabs">{civ.eras.map(e=><button key={e.id} className={'era-tab '+(era.id===e.id?'active':'')} onClick={()=>setEra(e.id)}><span>{e.name}</span><small>{e.years}</small></button>)}</div>
          <div className="study-panel"><div className="study-top"><div><span className="small-label">HISTORICAL BRIEFING</span><h3>{civ.name} — {era.name}</h3><span className="study-years">{era.years}</span></div><span className="fact-badge"><ShieldCheck size={13}/>史実ガイド</span></div><p className="study-overview">{era.overview}</p><div className="study-columns"><div><h4>政治・統治</h4><p>{era.politics}</p></div><div><h4>社会・暮らし</h4><p>{era.society}</p></div><div><h4>経済・交易</h4><p>{era.economy}</p></div><div><h4>文化・学問</h4><p>{era.culture}</p></div></div><section className="briefing-deep-dive"><h4>詳しい歴史解説</h4>{getDeepDive(era).map((d,i)=><article className="archive-deep-dive" key={d.heading+'-'+i}><h5>{d.heading}</h5><p>{d.body}</p></article>)}</section>
            <div className="study-facts"><h4><BookOpen size={15}/> この時代の重要ポイント</h4>{activeFacts.map((f,i)=><div className="fact-row" key={f}><span>{String(i+1).padStart(2,'0')}</span><p>{f}</p></div>)}</div>
            <div className="people-row"><strong>重要人物</strong>{era.people.map(p=><span key={p}>{p}</span>)}</div>
            <div className="source-row"><strong>参考資料</strong>{era.sources.map(s=><a href={s.url} target="_blank" rel="noreferrer" key={s.url}>{s.label} ↗</a>)}</div>
          </div>
        </section>

        <section className="mode-section"><div className="section-heading"><div><div className="eyebrow compact">03 / RULES</div><h2>プレイスタイルと目標</h2></div><span className="section-note">遊び方を選んでから介入しよう。</span></div><div className="mode-grid"><button className={'mode-card '+(mode==='standard'?'selected':'')} onClick={()=>chooseMode('standard')}><strong>標準モード</strong><span>改変3回</span><small>バランスよく試す</small></button><button className={'mode-card '+(mode==='challenge'?'selected':'')} onClick={()=>chooseMode('challenge')}><strong>チャレンジ</strong><span>改変1回</span><small>一手で未来を変える</small></button><button className={'mode-card '+(mode==='free'?'selected':'')} onClick={()=>chooseMode('free')}><strong>自由研究</strong><span>回数無制限</span><small>仮説を何度も比較</small></button></div><label className="field-label">世界線の目標<select value={goal} onChange={e=>setGoal(e.target.value)}>{GOALS.map(g=><option key={g}>{g}</option>)}</select></label></section>

        <div className="world-strip"><div className="world-main"><div className="world-icon"><Crown size={19}/></div><div><span className="small-label">CURRENT SCENARIO</span><strong>{civ.name} — {era.name}</strong><span className="world-desc">{era.years} / {era.ruler}</span></div></div><div className="world-detail"><span className="small-label">INTERVENTIONS LEFT</span><div className="attempt-row"><strong>{mode==='free'?'∞':attempts}<small>{mode==='free'?' / FREE':' / '+(mode==='challenge'?1:3)}</small></strong></div><div className="attempt-track"><span style={{width:progress+'%'}}/></div></div><button className="reset-btn" onClick={resetWorld}><RotateCcw size={15}/>新しい世界線</button></div>

        <div className="section-heading"><div><div className="eyebrow compact">04 / INTERVENTION</div><h2>歴史に介入する</h2></div><span className="section-note">改変の結果は毎回変わるAI仮説。</span></div>
        <section className="intervention-panel"><div className="panel-top"><div className="panel-step">A</div><div><strong>もしも、あの時——</strong><span>選んだ文明・時代に合わせて改変内容を考えよう。</span></div><span className="panel-tag"><Sparkles size={13}/> WHAT IF?</span></div><textarea value={intervention} onChange={e=>{setIntervention(e.target.value);setErrorMessage('');}} maxLength={500} placeholder={'例：'+era.name+'に、誰もが学べる公的な学校制度が広がっていたら？'} disabled={currentAttempts<=0||loading}/><div className="prompt-footer"><span>{intervention.length} / 500</span><span>目標：{goal}</span></div><div className="example-row"><span className="example-label">IDEAS</span>{EXAMPLES.map(ex=><button className="example-chip" key={ex} onClick={()=>setIntervention(ex)} disabled={currentAttempts<=0||loading}>{ex}</button>)}</div>{errorMessage&&<div className="error-banner" role="alert">{errorMessage}</div>}<button className="primary-btn" onClick={alterHistory} disabled={!canSubmit}><span>{loading?'世界線を計算中…':'歴史を改変する'}</span>{loading?<span className="spinner"/>:<ArrowRight size={17}/>}</button><div className="panel-disclaimer"><ShieldCheck size={14}/>AIが作るのは仮想シナリオ。史実の説明は固定データと参考資料に分けているよ。</div></section>

        {current&&<section className="result-section"><div className="section-heading"><div><div className="eyebrow compact">05 / GENERATED WORLDLINE</div><h2>改変後の歴史</h2></div><span className="hypothetical-tag"><Sparkles size={13}/>AI仮想シナリオ</span></div><div className="result-card"><div className="result-header"><div><span className="small-label">WORLDLINE {String(outcomes.indexOf(current)+1).padStart(2,'0')}</span><h3>{current.title}</h3></div><div className="result-actions"><button className="save-btn" onClick={()=>saveWorld(current)}><Check size={14}/>{savedWorlds.some(o=>o.id===current.id)?'保存済み':'保存'}</button><button className="save-btn" onClick={()=>shareWorld(current)}><Copy size={14}/>共有</button></div></div><p className="result-summary">{current.summary}</p><h4 className="subsection-title"><BookOpen size={15}/> この改変を考えるための前提知識</h4><div className="background-grid">{current.background.map((item,i)=><div className="background-card" key={item.heading+'-'+i}><span>史実の前提 {String(i+1).padStart(2,'0')}</span><strong>{item.heading}</strong><p>{item.fact}</p><div><b>今回の改変との関係</b><p>{item.relevance}</p></div></div>)}</div><div className="hypothesis-banner"><Sparkles size={14}/><p>以下は「もしも」の仮想展開。実際に起きた歴史ではありません。</p></div><h4 className="subsection-title"><GitBranch size={15}/> 分岐年表</h4><div className="timeline">{current.timeline.map((item,i)=><div className="timeline-row" key={item.year+'-'+item.title}><span className="timeline-year">{item.year}</span><span className="timeline-dot"/><div><strong>{item.title}</strong><p>{item.detail}</p></div></div>)}</div><h4 className="subsection-title"><Compass size={15}/> 変化した世界の指標（AIによる定性的推定）</h4><div className="effect-grid">{current.effects.map(effect=><div className="effect-card" key={effect.label}><span>{effect.label}</span><strong>{effect.value}</strong><p>{effect.detail}</p></div>)}</div><h4 className="subsection-title"><GitBranch size={15}/> なぜそう変わる？ 因果関係</h4><div className="causal-chain">{current.causalChain.map((step,i)=><div className="causal-step" key={step}><span>STEP {i+1}</span><p>{step}</p>{i<current.causalChain.length-1&&<ArrowRight size={14}/>}</div>)}</div><div className="learning-box"><h4><GraduationCap size={16}/> このシミュレーションから学べること</h4>{current.learningNotes.map(note=><p key={note}>• {note}</p>)}</div><div className="comparison-box"><h4><History size={16}/> 史実との比較</h4><p>{current.compareToReal}</p></div><div className="uncertainty-box"><strong>不確実性・注意点</strong><p>{current.uncertainty}</p></div></div></section>}
      </div>}

      {view==='learn'&&<div className="content archive-content"><div className="eyebrow compact">HISTORICAL KNOWLEDGE BASE</div><h1 className="page-title">歴史を、<span>深く知る。</span></h1><p className="page-intro">文明と時代を選び、政治・社会・経済・文化を比較しよう。ここにある時代概要と重要ポイントは編集済みの学習データ。AIの仮想展開とは別に表示している。</p><div className="archive-warning"><ShieldCheck size={18}/><div><strong>史実を優先する設計</strong><p>年代には研究上の幅や区分の違いがあるため、「頃」「一般に」などを使い、議論がある点はその旨を明示しています。出典の本文も必ず確認してね。</p></div></div><div className="learn-civ-grid">{CIVILIZATIONS.map(c=><section className="learn-civ" key={c.id}><div className="learn-civ-title"><span>{c.symbol}</span><div><h2>{c.name}</h2><small>{c.subtitle}</small></div></div><p>{c.overview}</p>{c.eras.map(e=><details className="learn-era" key={e.id}><summary><span><strong>{e.name}</strong><small>{e.years}</small></span><ChevronDown size={15}/></summary><div className="learn-era-body"><p>{e.overview}</p><h4>政治・統治</h4><p>{e.politics}</p><h4>社会・暮らし</h4><p>{e.society}</p><h4>経済・交易</h4><p>{e.economy}</p><h4>文化・学問</h4><p>{e.culture}</p>{<><h4>詳しい歴史解説</h4>{getDeepDive(e).map((d,i)=><article className="archive-deep-dive" key={d.heading+'-'+i}><h5>{d.heading}</h5><p>{d.body}</p></article>)}</>}<h4>重要ポイント</h4><ul>{e.keyFacts.map(f=><li key={f}>{f}</li>)}</ul><h4>重要人物</h4><p>{e.people.join('・')}</p><h4>参考資料</h4>{e.sources.map(s=><a className="source-link" href={s.url} target="_blank" rel="noreferrer" key={s.url}>{s.label} ↗</a>)}</div></details>)}</section>)}</div><section className="quiz-panel"><div className="eyebrow compact">ACTIVE RECALL</div><h2>理解度チェック</h2><p>{quiz.question}</p><div className="quiz-options">{quiz.options.map(option=><button key={option} className={'quiz-option '+(quizChecked&&option===quiz.correct?'correct':'')} onClick={()=>{setQuizAnswer(option);setQuizChecked(true);}}>{option}</button>)}</div>{quizChecked&&<p className="quiz-feedback">{quizAnswer===quiz.correct?'正解。':'もう一度、時代の重要ポイントを確認しよう。'} 正答：{quiz.correct}</p>}<button className="secondary-btn" onClick={()=>{setQuizChecked(false);setQuizAnswer('');}}>もう一度</button></section></div>}

      {view==='worldlines'&&<div className="content archive-content"><div className="eyebrow compact">YOUR ALTERNATE HISTORIES</div><h1 className="page-title">保存した<span>世界線。</span></h1><p className="page-intro">保存した世界線はこの端末に保持されるよ。ブラウザのデータを消すと保存内容も消えるので注意。</p>{savedWorlds.length===0?<div className="saved-empty"><Layers3 size={30}/><h2>まだ世界線がないよ</h2><p>文明と時代を選び、歴史を改変して「保存」を押すと、ここに並ぶよ。</p><button className="secondary-btn" onClick={()=>setView('play')}>世界線を作る <ArrowRight size={14}/></button></div>:<div className="saved-list">{savedWorlds.map(w=><article className="saved-world-card" key={w.id}><div className="saved-mark"><GitBranch size={20}/></div><div className="saved-world-body"><span className="small-label">{w.civName} / {w.eraName}</span><h2>{w.title}</h2><p>{w.summary}</p><small>改変：{w.intervention}</small></div><div className="saved-world-actions"><button className="save-btn" onClick={()=>{setCivId(CIVILIZATIONS.find(c=>c.name===w.civName)?.id||'japan');setOutcomes([w]);setActiveId(w.id);setView('play');}}>開く</button><button className="save-btn" onClick={()=>shareWorld(w)}>共有</button><button className="save-btn danger" onClick={()=>setSavedWorlds(prev=>prev.filter(x=>x.id!==w.id))}>削除</button></div></article>)}</div>}</div>}

      {view==='challenge'&&<div className="content archive-content"><div className="eyebrow compact">DAILY HACK / SHARE</div><h1 className="page-title">挑戦して、<span>比べよう。</span></h1><p className="page-intro">同じ条件でそれぞれの仮説を作り、友達と発想や因果関係を比べてみよう。共有テキストには仮想歴史であることを明記するよ。</p><section className="challenge-card"><div className="challenge-icon"><Trophy size={26}/></div><h2>ランダム歴史チャレンジ</h2><p>文明・年代・目標をランダムに選び、改変1回で世界線を作る。</p><button className="primary-btn" onClick={startChallenge}>今日のお題を引く <ArrowRight size={16}/></button></section><section className="challenge-card"><div className="eyebrow compact">CUSTOM SCENARIO</div><h2>自分のお題を作る</h2><p>友達と同じ条件を共有して、それぞれの歴史改変を比べよう。</p><textarea value={challengeText} onChange={e=>setChallengeText(e.target.value)} placeholder="例：古代ローマで、遠距離通信が発達していたら？" rows={4}/><button className="secondary-btn" onClick={async()=>{try{await navigator.clipboard.writeText('HISTORIA CHALLENGE\nお題：'+challengeText+'\n文明・時代・改変回数を同じにして遊ぼう。\nAI仮説は史実と区別してください。');setNotice('チャレンジのお題をコピーしたよ。');}catch{setNotice('コピーできなかった場合は、お題を長押ししてコピーしてね。');}}} disabled={!challengeText.trim()}><Copy size={15}/> お題をコピー</button></section><section className="challenge-card"><div className="eyebrow compact">SHARE YOUR WORLDLINE</div><h2>世界線を共有する</h2><p>生成結果の「共有」から、世界線の要約をコピーして送れるよ。現在はテキスト共有で、友達同士の自動同期やオンラインランキングは未実装。</p>{challengeText&&<textarea readOnly value={challengeText} rows={5}/>}</section><section className="challenge-card"><div className="eyebrow compact">ACHIEVEMENTS</div><h2>研究者の記録</h2><div className="achievement-list"><div className={outcomes.length+savedWorlds.length>0?'achievement unlocked':'achievement'}><Trophy size={18}/><span><strong>最初の改変</strong><small>初めて仮想世界線を生成する</small></span><b>{outcomes.length+savedWorlds.length>0?'達成':'未達成'}</b></div><div className={savedWorlds.length>=3?'achievement unlocked':'achievement'}><Layers3 size={18}/><span><strong>世界線コレクター</strong><small>3つの世界線を保存する</small></span><b>{savedWorlds.length}/3</b></div><div className={outcomes.length>=3?'achievement unlocked':'achievement'}><GraduationCap size={18}/><span><strong>因果を探る</strong><small>3回のシミュレーションを行う</small></span><b>{Math.min(outcomes.length,3)}/3</b></div></div></section></div>}
      <footer className="footer"><div className="footer-brand"><GitBranch size={16}/> HISTORIA</div><span>HISTORY IS FACT. ALTERNATE HISTORY IS A HYPOTHESIS.</span><button onClick={()=>setView('learn')}>史実アーカイブ <ArrowRight size={12}/></button></footer>
    </main>
  </div>;
}
export default App;