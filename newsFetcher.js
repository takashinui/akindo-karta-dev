// newsFetcher.js
import { akindoNews } from "./newsData.js";
function randomKarutaId() {
  const ids = [
    "q1","q2","q3","q4","q5","q6","q7","q8","q9","q10",
    "q11","q12","q13","q14","q15","q16","q17","q18","q19","q20"
  ];
  return ids[Math.floor(Math.random() * ids.length)];
}

// 取得するRSS（NHK 経済 / CNN 国際）
const FEEDS = [
  {
    source: "NHK",
    url: "https://www3.nhk.or.jp/rss/news/cat5.xml"
  },
  {
    source: "CNN",
    url: "https://feeds.cnn.co.jp/rss/cnn/cnn.rdf"
  }
];

export async function fetchExternalNews() {
  console.log("[newsFetcher] fetchExternalNews called");

  try {
    for (const feed of FEEDS) {
      // CORS回避：allorigins の get を使う
      const proxyUrl =
        "https://api.allorigins.win/get?url=" +
        encodeURIComponent(feed.url);

      const res = await fetch(proxyUrl);
      if (!res.ok) {
        console.warn(
          "[newsFetcher] fetch failed:",
          feed.source,
          res.status
        );
        continue;
      }

      const data = await res.json();
      const xmlText = data.contents;
      if (!xmlText) continue;

      const xml = new DOMParser().parseFromString(xmlText, "text/xml");
      const items = Array.from(xml.querySelectorAll("item"));

      const mapped = {};

      // 各媒体5本まで
      items.slice(0, 5).forEach((item, i) => {
        const title =
          item.querySelector("title")?.textContent?.trim() ?? "";
        const link =
           item.querySelector("link")?.textContent?.trim() ||
           item.querySelector("link")?.getAttribute("href") ||
          "";
        const pubDate =
          item.querySelector("pubDate")?.textContent?.trim() ||
          item.querySelector("dc\\:date")?.textContent?.trim() ||
          "";

        if (!title || !link) return;
        const date = pubDate ? pubDate.slice(0, 10) : new Date().toISOString().slice(0, 10);
        const id = `${feed.source}-${date}-rss-${i}`;

        mapped[id] = {
          id,
          date,
          source: feed.source,
          sourceURL: link,
          headline: title,
          summary: "",        // 外部要約は表示しない
          commentary: "",     // 自前生成は後工程
          karutaId: randomKarutaId(),//ランダムは仮置き
          status: "published"
        };
      });

      Object.assign(akindoNews, mapped);
      console.log(
        "[newsFetcher] fetched:",
        feed.source,
        Object.keys(mapped).length
      );
    }
  } catch (e) {
    console.warn("[newsFetcher] fetch error", e);
  }
}
