// newsFetcher.js
import { akindoNews } from "./newsData.js";

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
      // CORS回避のため allorigins 経由
      const proxyUrl =
        "https://api.allorigins.win/raw?url=" +
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

      const text = await res.text();
      const xml = new DOMParser().parseFromString(text, "text/xml");
      const items = Array.from(xml.querySelectorAll("item"));

      const mapped = {};

      // ひとまず各媒体5本まで
      items.slice(0, 5).forEach((item, i) => {
        const title =
          item.querySelector("title")?.textContent?.trim() ?? "";
        const link =
          item.querySelector("link")?.textContent?.trim() ?? "";
        const pubDate =
          item.querySelector("pubDate")?.textContent?.trim() ?? "";

        if (!title || !link || !pubDate) return;

        // 日付は雑でOK（後で整える）
        const date = pubDate.slice(0, 10);
        const id = `${feed.source}-${date}-rss-${i}`;

        mapped[id] = {
          id,
          date,
          source: feed.source,
          sourceURL: link,
          headline: title,
          summary: "",        // 外部要約は使わない（憲法）
          commentary: "",     // 自前生成は後工程
          karutaId: "q20",    // 仮置き
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
