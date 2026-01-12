// newsFetcher.js
import { akindoNews } from "./newsData.js";

const FEEDS = [
  { source: "NHK", url: "https://www3.nhk.or.jp/rss/news/cat5.xml" },
  { source: "CNN", url: "https://feeds.cnn.co.jp/rss/cnn/cnn.rdf" }
];

export async function fetchExternalNews() {
/* DEBUG CODE */ console.log("[newsFetcher] fetchExternalNews called");
  try {
    for (const feed of FEEDS) {
      const res = await fetch(feed.url);
      if (!res.ok) {
        console.warn("[newsFetcher] fetch failed:", feed.source, res.status);
        continue;
      }

      const text = await res.text();
      const xml = new DOMParser().parseFromString(text, "text/xml");
      const items = [...xml.querySelectorAll("item")];

      const mapped = {};
      items.slice(0, 5).forEach((item, i) => {
        const title = item.querySelector("title")?.textContent?.trim() ?? "";
        const link = item.querySelector("link")?.textContent?.trim() ?? "";
        const pubDate = item.querySelector("pubDate")?.textContent?.trim() ?? "";
        if (!title || !link || !pubDate) return;

        const date = pubDate.slice(0, 10); // まずは雑でOK（後で整える）
        const id = `${feed.source}-${date}-rss-${i}`;

        mapped[id] = {
          id,
          date,
          source: feed.source,
          sourceURL: link,
          headline: title,
          summary: "",        // 憲法どおり：外部要約は表示しない
          commentary: "",     // 自前生成は後工程
          karutaId: "q20",    // 仮置き（後工程）
          status: "published"
        };
      });

      Object.assign(akindoNews, mapped);
      console.log("[newsFetcher] fetched:", feed.source, Object.keys(mapped).length);
    }
  } catch (e) {
    console.warn("[newsFetcher] fetch error", e);
  }
}

}
