import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { questions } from "../questions.js";
import { kartaGroups } from "../kartaGroups.js";

/**
 * ================================
 * 設定
 * ================================
 */
const NHK_RSS = "https://www3.nhk.or.jp/rss/news/cat5.xml";
const LNEWS_RSS = "https://www.lnews.jp/feed";
const GUARDIAN_RSS = "https://www.theguardian.com/world/rss";

const OUTPUT_PATH = path.resolve("../public/news.json");
const STOCK_LIMIT = 50;

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
function pickKartaByClassification(tone, term) {
  const pool = kartaGroups?.[tone]?.[term];
  if (!pool || pool.length === 0) {
    // 合意どおり：フォールバックは N-S
    return pickKartaByClassification("N", "S");
  }
  const kana = pool[Math.floor(Math.random() * pool.length)];
  const karta = questions.find((q) => q.leadingKana === kana);

  // 万一 questions 側に該当が無い場合も N-S に退避（推測ではなく安全弁）
  if (!karta) return pickKartaByClassification("N", "S");
  return karta;
}

async function fetchRSS(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (NewsFetcher/1.0)",
      "Accept": "application/rss+xml, application/xml, text/xml",
    },
  });
  if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);
  return await res.text();
}

function parseRSS(xml, limit = 5, label = "") {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
  console.log(label, "item count:", items.length);

  return items.slice(0, limit).map((item) => {
    const block = item[1];
    const title = block.match(/<title>(.*?)<\/title>/)?.[1] ?? "";
    const body =
      block.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "";
    const guidLink = block.match(/<guid[^>]*>(.*?)<\/guid>/)?.[1] ?? "";
    const link = block.match(/<link>(.*?)<\/link>/)?.[1] ?? "";

    return {
      title,
      body,
      sourceURL: guidLink || link,
    };
  });
}

/**
 * ================================
 * 正規化（重複排除用）
 * ================================
 */
function normalizeURL(url) {
  return url?.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
}

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[0-9]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .slice(0, 40);
}

/**
 * ================================
 * OpenAI
 * ================================
 */
async function callOpenAI(messages, temperature = 0.7) {
  const res = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages,
    temperature,
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
文字数は120〜180文字としてください。

【見出し】
${news.title}

【本文】
${news.body}
`;
}

/**
 * ================================
 * news classification prompt（summary を読ませる）
 * ================================
 */
function buildClassificationPrompt(summary) {
  return `
以下の要約文を、ニュースそのものの性質として分類してください。
必ず JSON のみで出力してください。

tone:
- G = 前向き・改善・発展
- B = 問題・不祥事・後退
- N = 善悪を伴わない事象・変動

term:
- S = 主な影響範囲が 1か月
- M = 主な影響範囲が 1年
- L = 主な影響範囲が 1年以上（構造的・長期）

出力形式：
{
  "tone": "G|B|N",
  "term": "S|M|L"
}

【要約文】
${summary}
`;
}

/**
 * ================================
 * classify（JSON厳格）
 * ================================
 */
async function classifyFromSummary(summary) {
  const raw = await callOpenAI(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildClassificationPrompt(summary) },
    ],
    0.0 // JSON安定のため
  );

  try {
    const obj = JSON.parse(raw);
    const tone = obj?.tone;
    const term = obj?.term;

    const okTone = tone === "G" || tone === "B" || tone === "N";
    const okTerm = term === "L" || term === "M" || term === "S";

    if (!okTone || !okTerm) return { tone: "N", term: "S" };
    return { tone, term };
  } catch {
    // 合意どおり：迷ったら N-S
    return { tone: "N", term: "S" };
  }
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
冗長を避け、簡潔な表現をしてください。丁寧さや正確さよりも、切れ味を求めます。

【あきんどカルタの精神】 
あきんどカルタという行動規範・判断基準の精神を踏まえてください。 あきんどカルタの精神とは、商売や仕事を単なる利益獲得の手段としてではなく、社会との関係性の中で営まれる営為として捉える姿勢にある。短期的な成果や派手な成功に一喜一憂するのではなく、日々の判断や行動の積み重ねが信頼を形づくるという前提に立ち、誠実さや持続性を重んじる。 そこでは、他者を批判したり正解を断定したりすることよりも、現実の複雑さを受け止め、その中で自分はどう振る舞うべきかを問い続ける態度が大切にされる。うまくいかなかった出来事や困難な状況からも学びを引き出し、次の行動につなげる視点を持つことが求められる。 あきんどカルタは、教訓を押し付けるものではなく、読む人それぞれが自分の立場や経験に引き寄せて考えるための「言葉のきっかけ」であり、仕事に向き合う心構えを静かに整えるための拠り所である。 商売や仕事を社会との関係性の中で捉え、 信頼を積み重ねる姿勢を身につけた人物が 後進に語りかけるスタンスで書いてください。 前向きだが楽観せず、考える余白を残してください。 

【カルタを主題にする】
以下のカルタの考え方に沿って、ニュースを読み解いてください。
解説文には、カルタの原文（${karta.fullPhrase}）をそのまま引用してはいけません。
commentary は関西弁のあきんど言葉で記述し、 120〜150文字としてください。

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
  /** 既存在庫を読み込み */
  let existing = { stock: [] };
  try {
    const raw = fs.readFileSync(OUTPUT_PATH, "utf-8");
    existing = JSON.parse(raw);
    if (!Array.isArray(existing.stock)) existing.stock = [];
  } catch {}

  /** 今回取得分 */
  const fetched = [];

  try {
    const xml = await fetchRSS(NHK_RSS);
    fetched.push(...parseRSS(xml, 2, "NHK").map((n) => ({ ...n, source: "NHK" })));
  } catch {}

  try {
    const xml = await fetchRSS(LNEWS_RSS);
    fetched.push(
      ...parseRSS(xml, 2, "LNEWS").map((n) => ({ ...n, source: "LNEWS" }))
    );
  } catch {}

      try {
    const xml = await fetchRSS(GUARDIAN_RSS);
    fetched.push(...parseRSS(xml, 1, "Guardian").map((n) => ({ ...n, source: "Guardian｜World" })));
  } catch {}
  


  /** 在庫マージ（新しいものを前） */
  const merged = [...fetched, ...existing.stock];

  const seen = new Set();
  const stock = [];

  for (const n of merged) {
    const key = normalizeURL(n.sourceURL) || normalizeTitle(n.title);
    if (seen.has(key)) continue;
    seen.add(key);

    stock.push({
      ...n,
      id: key,
      fetchedAt: new Date().toISOString(),
    });
  }

  const finalStock = stock.slice(0, STOCK_LIMIT);

  /** 表示用：常に最大5本 */
  const selected = [];
  for (const n of finalStock) {
    if (selected.length >= 5) break;
    selected.push(n);
  }

  /** OpenAI 生成 */
  const items = [];

  for (const news of selected) {
    const summary = await callOpenAI([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildSummaryPrompt(news) },
    ]);

    // ★ 追加：分類（summary を読ませる）
    const classification = await classifyFromSummary(summary);

    // ★ 変更：分類に一致するカルタを選ぶ
    const karta = pickKartaByClassification(classification.tone, classification.term);

    const commentary = await callOpenAI([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildCommentaryPrompt(news, karta) },
    ]);

    items.push({
      source: news.source,
      title: news.title,
      sourceURL: news.sourceURL,
      summary,
      classification, // ★ 保存する（合意）
      karta: {
        leadingKana: karta.leadingKana,
        phrase: karta.fullPhrase,
      },
      commentary,
    });
  }

  /** 書き出し */
  fs.writeFileSync(
    OUTPUT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        run: {
          ranAt: new Date().toISOString(),
          runner: process.env.GITHUB_ACTIONS ? "github-actions" : "manual",
          runId: process.env.GITHUB_RUN_ID || null,
        },
        stock: finalStock,
        items,
      },
      null,
      2
    ),
    "utf-8"
  );
}

main().catch(console.error);
