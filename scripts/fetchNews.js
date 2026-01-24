import fs from "fs";

const RSS_URL = "https://www3.nhk.or.jp/rss/news/cat5.xml";
const OUT_PATH = "public/news.json";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set");
}

/*
============================================================
System role (Constitution)

【日本語注釈】
あなたはプロフェッショナルなニュース編集者である。
冷静で分析的かつ中立的なトーンを維持すること。
与えられた情報を超えた推測は行わないこと。
出力は厳密に正しい JSON のみとすること。
原文を再現したり、表現を近似させたりせず、必ず自分の言葉で要約すること。（著作権抵触への配慮）

※ 日本語は人間向け注釈。
※ 実際に model に渡すのは英語部分のみ。
============================================================
*/
const SYSTEM_ROLE = `
You are a professional news editor.
Maintain a calm, analytical, and neutral tone.
Do not speculate beyond the given information.
Output strictly valid JSON only.
Do not reproduce or closely paraphrase the original text; 
always generate an original summary in your own words.

`;

/*
============================================================
Utility functions
============================================================
*/
function extractTag(block, tag) {
  return (
    block.match(new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`))?.[1] ||
    block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1] ||
    ""
  ).trim();
}

function extractItems(xml, limit = 1) {
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  return blocks.slice(0, limit).map((block, i) => ({
    id: `nhk-${i + 1}`,
    title: extractTag(block, "title"),
    body: extractTag(block, "description"),
    summary: "",
    commentary: ""
  }));
}

/*
============================================================
OpenAI call
============================================================
*/
async function callOpenAI(title, body) {
  const userPrompt = `
以下のニュースについて、日本語で summary と commentary を作成してください。
必ず次の JSON 形式のみで出力してください。
余分な文章や説明は一切書かないでください。

{
  "summary": "要約（3〜5行。事実関係を簡潔に整理）",
  "commentary": "背景や意味づけの解説（短く）"
}

【ニュースタイトル】
${title}

【本文】
${body}
`.trim();

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: SYSTEM_ROLE
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      temperature: 0.3
    })
  });

  if (!res.ok) {
    throw new Error(`OpenAI API error: ${res.status}`);
  }

  const json = await res.json();
  const content = json.choices[0].message.content;

  // JSON厳守（ここで壊れたら即落とす）
  return JSON.parse(content);
}

/*
============================================================
Main
============================================================
*/
async function main() {
  const res = await fetch(RSS_URL);
  const xml = await res.text();

  const items = extractItems(xml, 1);

  const ai = await callOpenAI(items[0].title, items[0].body);

  items[0].summary = ai.summary || "";
  items[0].commentary = ai.commentary || "";

  fs.mkdirSync("public", { recursive: true });
  fs.writeFileSync(
    OUT_PATH,
    JSON.stringify(
      {
        updated: new Date().toISOString(),
        items
      },
      null,
      2
    ),
    "utf-8"
  );

  console.log("AI summary & commentary generated");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
