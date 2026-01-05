// main.js
import { questions } from "./questions.js";
import { showAkindoNews } from "./akindoNews.js";

// ==============================
//  かな → ファイル名
// ==============================
function kanaToFile(k) {
  const map = {
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
  return map[k];
}

// ==============================
//  状態
// ==============================
let currentIndex = 0;
let order = [];
let hasAnswered = false;
let readbookScrollTop = 0;

// ==============================
//  共通ユーティリティ
// ==============================
function hideIfExists(id) {
  const el = document.getElementById(id);
  if (el) el.hidden = true;
}

function showMenu() {
  const menu = document.getElementById("menuView");
  if (menu) menu.hidden = false;

  hideIfExists("gameView");
  hideIfExists("bookView");
  hideIfExists("dailyDetailView");
  hideIfExists("newsView");

  const consult = document.getElementById("consultView");
  if (consult) consult.style.display = "none";
}

// ==============================
//  今日の1枚
// ==============================
function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function getTodayCardIndex() {
  const key = "todayCard-" + getTodayKey();
  const saved = localStorage.getItem(key);
  if (saved !== null) return Number(saved);

  const index = Math.floor(Math.random() * questions.length);
  localStorage.setItem(key, index);
  return index;
}

function renderDailyCard() {
  const container = document.getElementById("dailyCardPreview");
  if (!container) return;

  container.innerHTML = "";

  const q = questions[getTodayCardIndex()];
  const img = document.createElement("img");
  img.src = "images/" + kanaToFile(q.kana);
  img.alt = q.kana;
  img.loading = "lazy";

  container.appendChild(img);

  img.addEventListener("click", () => {
    showDailyDetail(q);
  });
}

// ==============================
//  4択カルタ
// ==============================
function shuffleOrder() {
  order = [...Array(questions.length).keys()];
  order.sort(() => Math.random() - 0.5);
}

function nextQuestionIndex() {
  currentIndex++;
  if (currentIndex >= questions.length) {
    currentIndex = 0;
    shuffleOrder();
  }
}

function startGame() {
  shuffleOrder();
  currentIndex = 0;
  showQuestion();
}

function showGame() {
  hideIfExists("menuView");
  const game = document.getElementById("gameView");
  if (game) game.hidden = false;

  hideIfExists("bookView");
  hideIfExists("dailyDetailView");
  hideIfExists("newsView");

  startGame();
}

function showQuestion() {
  hasAnswered = false;

  const q = questions[order[currentIndex]];
  const kanaEl = document.getElementById("currentKana");
  const fullPhraseEl = document.getElementById("fullPhrase");
  const explanationEl = document.getElementById("explanation");
  const nextBtn = document.getElementById("nextButton");

  kanaEl.textContent = q.leadingKana;
  fullPhraseEl.textContent = "";
  explanationEl.style.display = "none";
  explanationEl.textContent = "";
  nextBtn.style.display = "none";

  createCards(q);
}

function createCards(q) {
  const cardsEl = document.getElementById("cards");
  cardsEl.innerHTML = "";

  const correctKana = q.kana;
  const allKana = questions.map(x => x.kana);
  const wrong3 = allKana.filter(k => k !== correctKana)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  const choiceKanaList = [correctKana, ...wrong3]
    .sort(() => Math.random() - 0.5);

  choiceKanaList.forEach(k => {
    const cardDiv = document.createElement("div");
    cardDiv.className = "card";

    const wrapper = document.createElement("div");
    wrapper.className = "image-wrapper";

    const img = document.createElement("img");
    img.src = "images/" + kanaToFile(k);
    img.alt = k;

    const mask = document.createElement("div");
    mask.className = "kana-mask";

    const mark = document.createElement("div");
    mark.className = "result-mark";

    wrapper.appendChild(img);
    wrapper.appendChild(mask);
    cardDiv.appendChild(wrapper);
    cardDiv.appendChild(mark);

    cardDiv.onclick = () => {
      if (hasAnswered) return;

      if (k === correctKana) {
        hasAnswered = true;
        mark.textContent = "◯";
        mark.classList.add("mark-correct");

        document.querySelectorAll(".kana-mask")
          .forEach(m => m.style.display = "none");

        showFullPhraseAndExplanation(q);
      } else {
        mark.textContent = "✕";
        mark.classList.add("mark-wrong");
      }
    };

    cardsEl.appendChild(cardDiv);
  });
}

function showFullPhraseAndExplanation(q) {
  const fullPhraseEl = document.getElementById("fullPhrase");
  const explanationEl = document.getElementById("explanation");
  const nextBtn = document.getElementById("nextButton");

  fullPhraseEl.textContent = q.fullPhrase;
  explanationEl.textContent = q.explanation;
  explanationEl.style.display = "block";

  nextBtn.style.display = "block";
  enableNextButton();
}

// Safari対策込み
let nextButtonWired = false;
function enableNextButton() {
  if (nextButtonWired) return;
  nextButtonWired = true;

  const nextBtn = document.getElementById("nextButton");
  if (!nextBtn) return;

  nextBtn.addEventListener("click", () => {
    nextQuestionIndex();
    showQuestion();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// ==============================
//  読本
// ==============================
function showBook() {
  hideIfExists("menuView");
  hideIfExists("gameView");
  hideIfExists("dailyDetailView");
  hideIfExists("newsView");

  const book = document.getElementById("bookView");
  if (book) book.hidden = false;

  renderReadbook();
  window.scrollTo(0, readbookScrollTop);
}

function renderReadbook() {
  const root = document.getElementById("readbookRoot");
  if (!root) return;

  root.innerHTML = "";

  const sorted = [...questions].sort((a, b) =>
    a.kana.localeCompare(b.kana, "ja")
  );

  sorted.forEach(q => {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "12px";
    row.style.padding = "6px 0";
    row.style.cursor = "pointer";
    row.style.borderBottom = "1px solid #ddd";

    const img = document.createElement("img");
    img.src = "images/" + kanaToFile(q.kana);
    img.className = "readbook-thumb";

    const title = document.createElement("div");
    title.textContent = q.fullPhrase;
    title.style.fontSize = "14px";
    title.style.fontWeight = "600";

    row.appendChild(img);
    row.appendChild(title);

    row.addEventListener("click", () => {
      readbookScrollTop = window.scrollY;
      showDailyDetail(q);
    });

    root.appendChild(row);
  });
}

// ==============================
//  今日の1枚 詳細
// ==============================
function showDailyDetail(q) {
  hideIfExists("menuView");
  hideIfExists("gameView");
  hideIfExists("bookView");
  hideIfExists("newsView");

  const detail = document.getElementById("dailyDetailView");
  if (detail) detail.hidden = false;

  const container = document.getElementById("dailyDetailContent");
  container.innerHTML = `
    <img src="images/${kanaToFile(q.kana)}" class="daily-detail-image">
    <div style="font-weight:700; margin-bottom:6px;">${q.fullPhrase}</div>
    <div style="line-height:1.6;">${q.explanation}</div>
  `;
}

// ==============================
//  ニュース
// ==============================
function showNews() {
  hideIfExists("menuView");
  hideIfExists("gameView");
  hideIfExists("bookView");
  hideIfExists("dailyDetailView");

  const news = document.getElementById("newsView");
  if (news) news.hidden = false;

  showAkindoNews();
}

// ==============================
//  相談室
// ==============================
function showConsult() {
  hideIfExists("menuView");
  hideIfExists("gameView");
  hideIfExists("bookView");
  hideIfExists("dailyDetailView");
  hideIfExists("newsView");

  const consult = document.getElementById("consultView");
  if (consult) consult.style.display = "block";
}

// textarea 自動伸長
function autoResizeTextarea(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = textarea.scrollHeight + "px";
}

// ==============================
//  初期化
// ==============================
window.addEventListener("load", () => {
  showMenu();
  renderDailyCard();

  document.getElementById("startGameBtn")
    ?.addEventListener("click", showGame);

  document.getElementById("openBookBtn")
    ?.addEventListener("click", showBook);

  document.getElementById("openNewsBtn")
    ?.addEventListener("click", showNews);

  document.getElementById("consultViewBtn")
    ?.addEventListener("click", showConsult);

  document.getElementById("backToMenuBtn")
    ?.addEventListener("click", showMenu);

  document.querySelectorAll(".backToMenu")
    .forEach(btn => btn.addEventListener("click", showMenu));

  const textarea = document.querySelector(".consult-textarea");
  if (textarea) {
    textarea.addEventListener("input", () => autoResizeTextarea(textarea));
  }
});
