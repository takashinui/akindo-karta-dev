// newsFetcher.js
import { akindoNews } from "./newsData.js";

export async function fetchExternalNews() {
  try {
    const res = await fetch(
      "https://api.rss2json.com/v1/api.json?rss_url=https://www.reuters.com/rssFeed/worldNews"
    );
    if (!res.ok) return;

    const json = await res.json();
    if (!json.items) return;

    const mapped = {};

    json.items.slice(0, 5).forEach((item, i) => {
      const date = item.pubDate.slice(0, 10);
      const id = `${date}-rss-${i}`;

      mapped[id] = {
        id,
        date,
        source: "Reuters",
        sourceURL: item.link,
        headline: item.title,
        summary: item.description,
        commentary: "",
        karutaId: "q20",
        status: "published"
      };
    });

    Object.assign(akindoNews, mapped);
  } catch (e) {
    // 失敗時は何もしない
  }
}
