import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { questions } from "../questions.js";

/**
 * ================================
 * 設定
 * ================================
 */
const NIKKEI_RSS = "https://www.nikkei.com/rss/news/basic.xml";
const NHK_RSS = "https://www3.nhk.or.jp/rss/news/cat5.xml"; // 経済
const LNEWS_RSS = "https://www.lnews.jp/feed";
const CNN_RSS = "https://rss.cnn.com/rss/money_latest.rss";

const OUTPUT_PATH = path.resolve("../public/news.json");

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * ================================
 * ユーティリティ
 * ================================
 */
function pickRandomKarta() {
  const index = Math.floor(Math.random() * questions.length);
  return questions[index];
}

async function fetchRSS(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (NewsFetcher/1.0)",
      "Accept": "application/rss+xml, application/xml, text/xml"
    }
  });
  if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);
  return await res.text();
}


function parseRSS(xml, limit = 5, label = "") {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
  console.log(label, "item count:", items.length);

  return items.slice(0, limit).map((item) => {
    const block = item[1];
    const title =
      block.match(/<title>(.*?)<\/title>/)?.[1] ?? "";
    const body =
      block.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "";
    const guidLink =
      block.match(/<guid[^>]*>(.*?)<\/guid>/)?.[1] ?? "";
    const link =
      block.match(/<link>(.*?)<\/link>/)?.[1] ?? "";
    return {
      title,
      body,
      sourceURL: guidLink || link,
    };
  });
}

/**
 * ================================
 * 重複排除
 * ================================
 */
function normalizeURL(url) {
  return url
    ?.replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .toLowerCase();
}

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[0-9]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .slice(0, 30);
}

/**
 * ================================
 * OpenAI
 * ================================
 */
async function callOpenAI(messages) {
  const res = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages,
    temperature: 0.7,
  });
  return res.choices[0].message.content.trim();
}

/**
 * ================================
 * system role（共通憲法）
 * ================================
 */
const SYSTEM_PROMPT = `
You are a professional news editor.
Maintain a calm, analytical, and neutral tone.
Do not speculate beyond the given information.
Do not reproduce or closely paraphrase the original text; 
always generate an original summary in your own words.
`;
/*
* 【日本語注釈】
* あなたはプロフェッショナルなニュース編集者である。
* 冷静で分析的かつ中立的なトーンを維持すること。
* 与えられた情報を超えた推測は行わないこと。
* 出力は厳密に正しい JSON のみとすること。
* 原文を再現したり、表現を近似させたりせず、必ず自分の言葉で要約すること。（著作権抵触への配慮）
* ※ 日本語は人間向け注釈。実際に model に渡すのは英語部分のみ。
*/

/**
 * ================================
 * summary prompt
 * ================================
 */
function buildSummaryPrompt(news) {
  return `
以下のニュースを要約してください。
事実関係を中心に、評価や断定は避けてください。
原文をなぞらず、著作権に配慮して言い換えてください。
文字数は150〜200文字としてください。

【見出し】
${news.title}

【本文】
${news.body}
`;
}

/**
 * ================================
 * commentary prompt
 * ================================
 */
function buildCommentaryPrompt(news, karta) {
  return `
  以下のニュースについて 以下の方針に基づきcommentary を作成してください。

【一般的事項】
個別の企業・人物・組織に対する批判や非難は行わず、 政治的または宗教的な立場を表明しないでください。 出来事を評価・断定せず、構造や環境を落ち着いて示してください。

【あきんどカルタの精神】 
あきんどカルタという行動規範・判断基準の精神を踏まえてください。 あきんどカルタの精神とは、商売や仕事を単なる利益獲得の手段としてではなく、社会との関係性の中で営まれる営為として捉える姿勢にある。短期的な成果や派手な成功に一喜一憂するのではなく、日々の判断や行動の積み重ねが信頼を形づくるという前提に立ち、誠実さや持続性を重んじる。 そこでは、他者を批判したり正解を断定したりすることよりも、現実の複雑さを受け止め、その中で自分はどう振る舞うべきかを問い続ける態度が大切にされる。うまくいかなかった出来事や困難な状況からも学びを引き出し、次の行動につなげる視点を持つことが求められる。 あきんどカルタは、教訓を押し付けるものではなく、読む人それぞれが自分の立場や経験に引き寄せて考えるための「言葉のきっかけ」であり、仕事に向き合う心構えを静かに整えるための拠り所である。 商売や仕事を社会との関係性の中で捉え、 信頼を積み重ねる姿勢を身につけた人物が 後進に語りかけるスタンスで書いてください。 前向きだが楽観せず、考える余白を残してください。 

【カルタを主題にする】
以下のカルタを「レンズ」として用い、 ニュースそのものを主題として解説してください。 commentary は関西弁のあきんど言葉で記述し、 150〜200文字としてください。

【ニュース】
見出し：${news.title}
本文：${news.body}

【あきんどカルタ】
${karta.fullPhrase}
${karta.explanation}
`;
}

/**
 * ================================
 * main
 * ================================
 */
async function main() {
  const buckets = {
    nikkei: [],
    nhk: [],
    reuters: [],
    lnews: [],
    cnn: [],
  };

try {
  const xml = await fetchRSS(NIKKEI_RSS);
  console.log("NIKKEI items:", [...xml.matchAll(/<item>/g)].length);
  buckets.nikkei = parseRSS(xml, 5, "NIKKEI")
  .map(n => ({ ...n, source: "NIKKEI" }));

} catch (e) {
  console.error("NIKKEI ERROR", e.message);
}

  try {
    const xml = await fetchRSS(NHK_RSS);
    buckets.nhk = parseRSS(xml, 3, "NHK")
  .map(n => ({ ...n, source: "NHK" }));
  } catch (e)  {
     console.error("NHK ERROR", e);
  }


  try {
    const xml = await fetchRSS(LNEWS_RSS);
    buckets.lnews = parseRSS(xml, 3, "LNEWS")
  .map(n => ({ ...n, source: "LNEWS" }));

  } catch (e)  {
     console.error("LNEWS ERROR", e);
  }

  try {
    const xml = await fetchRSS(CNN_RSS);
    console.log("=== CNN RSS length ===", xml.length);
    buckets.cnn = parseRSS(xml, 2, "CNN")
  .map(n => ({ ...n, source: "CNN" }));
    console.log("=== CNN parseRSS(1) ===", parseRSS(xml, 1));
  } catch (e)  {
     console.error("CNN ERROR", e);
  }

  // 媒体優先順で合成
  const ordered = [
    ...buckets.nikkei,
    ...buckets.nhk,
    ...buckets.reuters,
    ...buckets.lnews,
    ...buckets.cnn,
  ];

  // 重複排除
  const seenURL = new Set();
  const seenTitle = new Set();
  const deduped = [];

  for (const news of ordered) {
    const u = normalizeURL(news.sourceURL);
    const t = normalizeTitle(news.title);

    if (u && seenURL.has(u)) continue;
    if (t && seenTitle.has(t)) continue;

    if (u) seenURL.add(u);
    if (t) seenTitle.add(t);

    deduped.push(news);
  }

  // 本数ルール適用
  const selected = [
    ...deduped.filter(n => n.source === "NIKKEI").slice(0, 2),
    ...deduped.filter(n => n.source === "NHK").slice(0, 1),
    ...deduped.filter(n => n.source === "REUTERS").slice(0, 1),
    ...deduped.filter(n => n.source === "LNEWS").slice(0, 1),
  ];

  // CNN は取れたら +1
  const cnnOne = deduped.find(n => n.source === "CNN");
  if (cnnOne) selected.push(cnnOne);

  if (selected.length === 0) return;

  const items = [];

  for (const news of selected) {
    const summary = await callOpenAI([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildSummaryPrompt(news) },
    ]);

    const selectedKarta = pickRandomKarta();

    const commentary = await callOpenAI([
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: buildCommentaryPrompt(news, selectedKarta),
      },
    ]);

    items.push({
      source: news.source,
      title: news.title,
      sourceURL: news.sourceURL,
      summary,
      karta: {
        leadingKana: selectedKarta.leadingKana,
        phrase: selectedKarta.fullPhrase,
      },
      commentary,
    });
  }

  fs.writeFileSync(
    OUTPUT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        items,
      },
      null,
      2
    ),
    "utf-8"
  );
}

main().catch(console.error);
