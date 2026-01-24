const RSS_URL = "https://www3.nhk.or.jp/rss/news/cat5.xml";

const res = await fetch(RSS_URL);
const text = await res.text();

console.log(text.slice(0, 500));
