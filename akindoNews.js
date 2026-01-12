// akindoNews.js
import { akindoNews } from "./newsData.js";
import { questions } from "./questions.js";

let current = 0;

// ==============================
// ニュース一覧取得（日付降順）
// ==============================
function getNewsList() {
  return Object.values(akindoNews)
    .sort((a, b) => b.date.localeCompare(a.date));
}

// ==============================
// カルタ本文取得
// ==============================
function getKarutaPhrase(karutaId) {
  const q = questions.find(q => q.id === karutaId);
  return q ? q.fullPhrase : "";
}

// ==============================
// 描画
// ==============================
function render(content) {
  const list = getNewsList();
  const n = list[current];
  if (!n) return;

  // --- notice：1本目のみ表示 ---
  const notice = document.getElementById("newsNotice");
  if (notice) {
    notice.hidden = (current !== 0);
  }

  // --- 対応するカルタ取得 ---
  const q = questions.find(q => q.id === n.karutaId);
  const karuta = q ? q.fullPhrase : "";
  const kana = q ? q.kana : null;

  // --- かな → 画像ファイル対応 ---
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

  const imageFile = kana ? kanaMap[kana] : null;

  // --- 描画 ---
  content.innerHTML = `
    <div class="news-headline">
      ${n.headline}
    </div>

    <div class="news-source">
      出典：${n.source}
    </div>

    <div class="news-summary">
      ${n.summary}
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

// ==============================
// 公開関数
// ==============================
export function showAkindoNews() {
  const content = document.getElementById("newsContent");
  const nextBtn = document.getElementById("nextNewsBtn");

  if (!content || !nextBtn) return;

  current = 0;
  render(content);

  nextBtn.onclick = () => {
    const list = getNewsList();
    current = (current + 1) % list.length;
    render(content);
  };
}
