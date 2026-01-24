import fs from "fs";

const RSS_URL = "https://www3.nhk.or.jp/rss/news/cat5.xml";
const OUT_PATH = "public/news.json";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set");
}

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

async function callOpenAI(title, body) {
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
          content:
            "You are a professional news editor. Output strictly valid JSON only."
        },
        {
          role: "user",
          content:
`以下のニュースについて、日本語で summary と commentary を作成してください。
必ず次のJSON形式のみで出力してください。
余分な文章や説明は一切書かないでください。

{
  "summary": "要約（3〜5行）",
  "commentary": "背景や意味づけの解説（短く）"
}

【ニュースタイトル】
${title}

【本文】
${body}`
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

  // JSONとして解釈（失敗したら例外）
  return JSON.parse(content);
}

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
