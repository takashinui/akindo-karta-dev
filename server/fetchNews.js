import fs from "fs";
import fetch from "node-fetch";
import { DOMParser } from "xmldom";

const outputPath = "../news.json";

// 取得するRSS（まずは1本だけ）
const RSS = {
  source: "NHK",
  url: "https://www3.nhk.or.jp/rss/news/cat5.xml"
};

async function fetchNHK() {
  const res = await fetch(RSS.url);
  if (!res.ok) {
    throw new Error(`fetch failed: ${res.status}`);
  }

  const xmlText = await res.text();
  const xml = new DOMParser().parseFromString(xmlText, "text/xml");
  const items = Array.from(xml.getElementsByTagName("item"));

  const news = {};

  items.slice(0, 3).forEach((item, i) => {
    const title =
      item.getElementsByTagName("title")[0]?.textContent ?? "";
    const link =
      item.getElementsByTagName("link")[0]?.textContent ?? "";
    const pubDate =
      item.getElementsByTagName("pubDate")[0]?.textContent ?? "";

    if (!title || !link) return;

    const date = pubDate
      ? pubDate.slice(0, 10)
      : new Date().toISOString().slice(0, 10);

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

(async () => {
  try {
    const nhkNews = await fetchNHK();

    fs.writeFileSync(
      outputPath,
      JSON.stringify(nhkNews, null, 2),
      "utf-8"
    );

    console.log("news.json generated (NHK)");
  } catch (e) {
    console.error(e);
  }
})();
