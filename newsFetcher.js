// newsFetcher.js
import { akindoNews } from "./newsData.js";
/* DEBUG CODE */ console.log("[newsFetcher] file loaded");

export async function fetchExternalNews() {
/* DEBUG CODE */ console.log("[newsFetcher] fetchExternalNews called");
  try {
    const res = await fetch(
      "https://api.rss2json.com/v1/api.json?rss_url=https://www.reuters.com/rssFeed/worldNews"
    );

    if (!res.ok) {
      console.warn("[newsFetcher] fetch failed: status", res.status);
      return;
    }

    const json = await res.json();
    if (!json.items || !Array.isArray(json.items)) {
      console.warn("[newsFetcher] invalid rss2json response");
      return;
    }

    const mapped = {};

    json.items.slice(0, 5).forEach((item, i) => {
      if (!item.pubDate || !item.title || !item.link) return;

      const date = item.pubDate.slice(0, 10);
      const id = `${date}-rss-${i}`;

      mapped[id] = {
        id,
        date,
        source: "Reuters",
        sourceURL: item.link,
        headline: item.title,
        summary: item.description ?? "",
        commentary: "",
        karutaId: "q20",
        status: "published"
      };
    });

    Object.assign(akindoNews, mapped);
    console.log("[newsFetcher] fetched:", Object.keys(mapped).length);

  } catch (e) {
    console.warn("[newsFetcher] fetch error", e);
  }
}
