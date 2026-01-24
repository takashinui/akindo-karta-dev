import fs from "fs";

const outputPath = "../news.json";
const RSS_URL = "https://www3.nhk.or.jp/rss/news/cat5.xml";

async function fetchNHK() {
  const res = await fetch(RSS_URL);
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);

  const xml = await res.text();

  // 超簡易パース（NHK RSS専用）
  const items = xml.split("<item>").slice(1, 4);

  const news = {};

  items.forEach((block, i) => {
    const get = tag =>
      block.split(`<${tag}>`)[1]?.split(`</${tag}>`)[0] ?? "";

    const title = get("title");
    const link = get("link");
    const pubDate = get("pubDate");

    if (!title || !link) return;

    const date = pubDate.slice(0, 10);
    const id = `NHK-${date}-${i}`;

    news[id] = {
      id,
      date,
      source: "NHK",
      sourceURL: link,
      headline: title,
      summary: "",
      commentary: "",
      karutaId: "q20",
      status: "published"
    };
  });

  return news;
}

const news = await fetchNHK();

fs.writeFileSync(
  outputPath,
  JSON.stringify(news, null, 2),
  "utf-8"
);

console.log("news.json generated (NHK)");
