// akindoNews.js
import { akindoNews } from "./newsData.js";
import { questions } from "./questions.js";
import { fetchExternalNews } from "./newsFetcher.js";

let current = 0;
let wired = false;

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

// ニュース一覧（表示順はキー順のまま）
function getNewsList() {
  return Object.values(akindoNews);
}

// 描画
function render() {
  const content = document.getElementById("newsContent");
  if (!content) return;

  const list = getNewsList();
  if (list.length === 0) return;

  // 範囲外防止
  current = ((current % list.length) + list.length) % list.length;

  // notice：1本目のみ表示
  const notice = document.getElementById("newsNotice");
  if (notice) notice.hidden = (current !== 0);

  const n = list[current];

  // 対応するカルタ取得
  const q = questions.find(q => q.id === n.karutaId);
  const karuta = q ? q.fullPhrase : "";
  const kana = q ? q.kana : null;
  const imageFile = kana ? kanaMap[kana] : null;

  content.innerHTML = `
    <div class="news-headline">${n.headline ?? ""}</div>

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
export function showAkindoNews() {
 fetchExternalNews();
  const nextBtn = document.getElementById("nextNewsBtn");
  if (!nextBtn) return;

  // ボタン配線は1回だけ
  if (!wired) {
    wired = true;
    nextBtn.addEventListener("click", () => {
      const list = getNewsList();
      if (list.length === 0) return;
      current = (current + 1) % list.length;
      render();
    });
  }
async function fetchExternalNews() {
  try {
    const res = await fetch("./news.json");
    if (!res.ok) return;

    const data = await res.json();
    Object.assign(akindoNews, data);
  } catch (e) {
    // 失敗時は何もしない（既存ニュースで表示）
  }
}
  
  // ニュース画面を開いたら必ず1本目から
  current = 0;
  render();
}
