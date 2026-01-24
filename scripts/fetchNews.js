import fs from "fs";

const RSS_URL = "https://www3.nhk.or.jp/rss/news/cat5.xml";
const OUT_PATH = "public/news.json";

// 超軽量XML抽出（まずは2件だけの最短ルート）
function extractItems(xml, limit = 2) {
  const items = [];
  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

  for (const block of itemBlocks.slice(0, limit)) {
    const title = (block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1]
      ?? block.match(/<title>([\s\S]*?)<\/title>/)?.[1]
      ?? ""
    ).trim();

    const link = (block.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "").trim();

    const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "").trim();

    items.push({
      id: `nhk-${items.length + 1}`,
      title,
      link,
      pubDate,
      summary: "",      // ②は後でここに入れる
      commentary: ""    // ②は後でここに入れる
    });
  }

  return items;
}

async function main() {
  const res = await fetch(RSS_URL);
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);

  const xml = await res.text();
  const items = extractItems(xml, 2);

  // 出力先フォルダがないと落ちるので担保
  fs.mkdirSync("public", { recursive: true });

  const payload = {
    updated: new Date().toISOString(),
    source: "NHK RSS cat5",
    items
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2), "utf-8");

  console.log(`news.json generated: ${OUT_PATH}`);
  console.log(`items: ${items.length}`);
  for (const it of items) console.log(`- ${it.title}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
