// akindoNews.js
import { questions } from "./questions.js";

let current = 0;
let wired = false;
let newsItems = [];

// かな → 画像ファイル対応
const kanaMap = {
  "あ": "a.jpg", "い": "i.jpg", "う": "u.jpg", "え": "e.jpg", "お": "o.jpg",
  "か": "ka.jpg", "き": "ki.jpg", "く": "ku.jpg", "け": "ke.jpg", "こ": "ko.jpg",
  "さ": "sa.jpg", "し": "si.jpg", "す": "su.jpg", "せ": "se.jpg", "そ": "so.jpg",
  "た": "ta.jpg", "ち": "ti.jpg", "つ": "tu.jpg", "て": "te.jpg", "と": "to.jpg",
  "な": "na.jpg", "に": "ni.jpg", "ぬ": "nu.jpg", "ね": "ne.jpg", "の": "no.jpg",
  "は": "ha.jpg", "ひ": "hi.jpg", "ふ": "hu.jpg", "へ": "he.jpg", "ほ": "ho.jpg",
  "ま": "ma.jpg", "み": "mi.jpg", "む": "mu.jpg", "め": "me.jpg", "も": "mo.jpg",
  "や": "ya.jpg", "ゆ": "yu.jpg", "よ": "yo.jpg",
  "ら": "ra.jpg", "り": "ri.jpg", "る": "ru.jpg", "れ": "re.jpg", "ろ": "ro.jpg",
  "わ": "wa.jpg", "を": "wo.jpg", "ん": "n.jpg"
};

// public/news.json を取得
async function loadNews() {
  try {
    const res = await fetch("./public/news.json");
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.items) ? data.items : [];
  } catch (e) {
    console.error("failed to load news.json", e);
    return [];
  }
}

// 描画
function render() {
  const content = document.getElementById("newsContent");
  if (!content) return;
  if (newsItems.length === 0) {
    content.innerHTML = "<p>ニュースがありません</p>";
    return;
  }

  // 範囲外防止
  current = ((current % newsItems.length) + newsItems.length) % newsItems.length;

  // disclaimer：1本目のみ表示
  const disclaimer = document.getElementById("newsDisclaimer");
  if (disclaimer) disclaimer.hidden = (current !== 0);

  const n = newsItems[current];

  // カルタ情報（news.json から）
  const kana = n.karta?.leadingKana ?? null;
  const karuta = n.karta?.phrase ?? "";
  const imageFile = kana ? kanaMap[kana] : null;

  content.innerHTML = `
    <div class="news-headline">${n.title ?? ""}</div>

    <div class="news-source">
      出典：${n.source ?? ""}
    </div>

    <div class="news-summary">
      ${n.summary ?? ""}
    </div>

    <div class="news-karuta">
      <strong>${karuta}</strong>
    </div>

    <div class="news-commentary">
      ${n.commentary ?? ""}
    </div>

    ${
      imageFile
        ? `<div class="news-karuta-image">
             <img src="images/${imageFile}" alt="">
           </div>`
        : ``
    }
  `;
}

// 公開関数
export async function showAkindoNews() {
  newsItems = await loadNews();

  const nextBtn = document.getElementById("nextNewsBtn");
  if (!nextBtn) return;

  // ボタン配線は1回だけ
  if (!wired) {
    wired = true;
    nextBtn.addEventListener("click", () => {
      if (newsItems.length === 0) return;
      current = (current + 1) % newsItems.length;
      render();
    });
  }

  // ニュース画面を開いたら必ず1本目から
  current = 0;
  render();
}
