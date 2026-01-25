import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { questions } from "../questions.js";

/**
 * ================================
 * 設定
 * ================================
 */
const NHK_RSS = "https://www3.nhk.or.jp/rss/news/cat5.xml";
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
  const res = await fetch(url);
  if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);
  return await res.text();
}

function parseRSS(xml, limit = 2) {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
  return items.slice(0, limit).map((item) => {
    const block = item[1];
    return {
      title: block.match(/<title>(.*?)<\/title>/)?.[1] ?? "",
      body:
        block.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "",
    };
  });
}

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
 * system role（共通憲法・FIX）
 * ================================
 */
const SYSTEM_PROMPT = `
You are a professional news editor.
Maintain a calm, analytical, and neutral tone.
Do not speculate beyond the given information.
Do not reproduce or closely paraphrase the original text; 
always generate an original summary in your own words.
`;

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
以下のニュースについて commentary を作成してください。

（※ あなたが FIX した指示文そのまま）
  
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
  const newsList = [];

  try {
    const nhkXML = await fetchRSS(NHK_RSS);
    newsList.push(
      ...parseRSS(nhkXML, 2).map((n) => ({ ...n, source: "NHK" }))
    );
  } catch {}

  try {
    const cnnXML = await fetchRSS(CNN_RSS);
    newsList.push(
      ...parseRSS(cnnXML, 2).map((n) => ({ ...n, source: "CNN" }))
    );
  } catch {}

  if (newsList.length === 0) return;

  const items = [];

  for (const news of newsList) {
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
