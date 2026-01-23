import fs from "fs";

const outputPath = "../news.json";

const dummyNews = {
  "dummy-1": {
    id: "dummy-1",
    date: "2026-01-14",
    source: "SYSTEM",
    sourceURL: "",
    headline: "サーバ生成テスト",
    summary: "GitHub Actions 用のダミーニュースです。",
    commentary: "",
    karutaId: "q20",
    status: "published"
  }
};

fs.writeFileSync(
  outputPath,
  JSON.stringify(dummyNews, null, 2),
  "utf-8"
);

console.log("news.json generated (dummy)");
