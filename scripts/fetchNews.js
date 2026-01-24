import fs from "fs";

const RSS_URL = "https://www3.nhk.or.jp/rss/news/cat5.xml";
const OUT_PATH = "public/news.json";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set");
}

function extractItems(xml, limit = 1) {
  const items = [];
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

  for (const block of blocks.slice(0, limit)) {
    const title =
      (block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] ??
      block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ??
      "";

    const description =
      (block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1] ??
      block.match(/<description>([\s\S]*?)<\/description>/)?.[1] ??
      "";

    items.push({
      title: title.trim(),
      body: description.trim()
    });
  }
  return items;
}

async function callOpenAI(text) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "You summarize news briefly and add a short commentary."
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.3
    })
  });

  if (!res.ok) {
    throw new Error(`OpenAI API error: ${res.status}`);
  }

  const json = await res.json();
  return json.choices[0].message.content;
}

async function main() {
  const res = await fetch(RSS_URL);
  const xml = await res.text();
  const items = extractItems(xml, 1);

  const aiText = await callOpenAI(
    `以下のニュースを要約し、その後に一言解説を付けてください。\n\n${items[0].title}\n${items[0].body}`
  );

  const payload = {
    updated: new Date().toISOString(),
    items: [
      {
        id: "nhk-1",
        title: items[0].title,
        summary: aiText,
        commentary: ""
      }
    ]
  };

  fs.mkdirSync("public", { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2), "utf-8");

  console.log("AI summary generated");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
