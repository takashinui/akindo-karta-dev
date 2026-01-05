// main.js
import { questions } from "./questions.js";
import { showAkindoNews } from "./akindoNews.js"; 

// ==============================
// 必須DOMチェック（DEV用）
// ==============================
function checkRequiredDOM() {
  const requiredIds = [
    // menu / top
    "menuView",
    "dailyCardPreview",

    // game
    "gameView",
    "currentKana",
    "fullPhrase",
    "explanation",
    "cards",
    "nextButton",

    // book
    "bookView",
    "readbookRoot",

    // daily detail
    "dailyDetailView",
    "dailyDetailContent",
    "detailBackBtn",

    // news
    "newsView",
    "newsContent",
    "openNewsBtn",
    "nextNewsBtn",

    // consult
    "consultView",
    "consultViewBtn",
    "backToMenuBtn"
  ];

  const missing = requiredIds.filter(id => !document.getElementById(id));
  if (missing.length > 0) {
    console.warn("[akindo] missing required DOM:", missing.join(", "));
  }
}

// ==============================
// textarea 自動伸長
// ==============================
function autoResizeTextarea(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

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

let currentIndex = 0;
let order = [];
let hasAnswered = false;
let readbookScrollTop = 0;

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
  const wrongCandidates = allKana.filter(k => k !== correctKana);
  const wrong3 = wrongCandidates.sort(() => Math.random() - 0.5).slice(0, 3);
  const choiceKanaList = [correctKana, ...wrong3].sort(() => Math.random() - 0.5);

  choiceKanaList.forEach(k => {
    const cardDiv = document.createElement("div");
    cardDiv.className = "card";

    const img = document.createElement("img");
    img.src = "images/" + kanaToFile(k);
    img.alt = k;
    img.loading = "lazy";

    const mask = document.createElement("div");
    mask.className = "kana-mask";

    const mark = document.createElement("div");
    mark.className = "result-mark";

    const wrapper = document.createElement("div");
    wrapper.className = "image-wrapper";
    wrapper.appendChild(img);
    wrapper.appendChild(mask);

    cardDiv.appendChild(wrapper);
    cardDiv.appendChild(mark);

    cardDiv.onclick = () => {
      if (hasAnswered) return;

      if (k === correctKana) {
        hasAnswered = true;
        document.querySelectorAll(".card").forEach(c => {
          c.style.pointerEvents = "none";
        });

        mark.textContent = "◯";
        mark.classList.add("mark-correct");

        document.querySelectorAll(".kana-mask").forEach(m => {
          m.style.display = "none";
        });

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
  nextBtn.style.visibility = "visible";
  nextBtn.style.pointerEvents = "auto";

  enableNextButton();
}

let nextButtonWired = false;

function enableNextButton() {
  if (nextButtonWired) return;
  nextButtonWired = true;

  const nextBtn = document.getElementById("nextButton");
  if (!nextBtn) return;

  let locked = false;

  function goNext(e) {
    if (locked) return;
    locked = true;

    e?.preventDefault();
    e?.stopPropagation();

    nextQuestionIndex();
    showQuestion();
    window.scrollTo({ top: 0, behavior: "smooth" });

    setTimeout(() => {
      try { nextBtn.blur(); } catch (_) {}
      locked = false;
    }, 50);
  }

  if (window.PointerEvent) {
    nextBtn.addEventListener("pointerup", goNext);
  } else {
    nextBtn.addEventListener("touchend", goNext, { passive: false });
  }
  nextBtn.addEventListener("click", goNext);
}

function startGame() {
  shuffleOrder();
  currentIndex = 0;
  showQuestion();
}

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

  const consultView = document.getElementById("consultView");
  if (consultView) consultView.style.display = "none";
}

function showGame() {
  hideIfExists("menuView");
  const game = document.getElementById("gameView");
  if (game) game.hidden = false;

  hideIfExists("bookView");
  hideIfExists("dailyDetailView");
  startGame();
}

function showBook() {
  hideIfExists("menuView");
  hideIfExists("gameView");
  hideIfExists("dailyDetailView");

  const book = document.getElementById("bookView");
  if (book) book.hidden = false;

  renderReadbook();
  window.scrollTo(0, readbookScrollTop);
}

function showDailyDetail(q) {
  hideIfExists("menuView");
  hideIfExists("gameView");
  hideIfExists("bookView");

  const detail = document.getElementById("dailyDetailView");
  if (detail) detail.hidden = false;

  const container = document.getElementById("dailyDetailContent");
  container.innerHTML = `
    <img src="images/${kanaToFile(q.kana)}" class="daily-detail-image">
    <div style="font-weight:700; margin-bottom:6px;">${q.fullPhrase}</div>
    <div style="line-height:1.6;">${q.explanation}</div>
  `;
}

function getTodayKey() {
  const now = new Date();
  return now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate();
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
  img.style.width = "100%";
  img.style.cursor = "pointer";

  container.appendChild(img);
  img.addEventListener("click", () => showDailyDetail(q));
}

function renderReadbook() {
  const root = document.getElementById("readbookRoot");
  if (!root) return;

  root.innerHTML = "";
  const sorted = [...questions].sort((a, b) => a.kana.localeCompare(b.kana, "ja"));

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
    img.loading = "lazy";
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

window.addEventListener("load", () => {
  checkRequiredDOM();

  showMenu();
  renderDailyCard();

  // textarea 自動伸長の登録
  const consultTextarea = document.querySelector(".consult-textarea");
  if (consultTextarea) {
    autoResizeTextarea(consultTextarea);
    consultTextarea.addEventListener("input", () => autoResizeTextarea(consultTextarea));
  }

  const consultView = document.getElementById("consultView");
  const backToMenuBtn = document.getElementById("backToMenuBtn");

  backToMenuBtn?.addEventListener("click", () => {
    consultView.style.display = "none";
    showMenu();
  });

  document.getElementById("startGameBtn")?.addEventListener("click", showGame);
  document.getElementById("openBookBtn")?.addEventListener("click", showBook);

  document.querySelectorAll(".backToMenu")
    .forEach(btn => btn.addEventListener("click", showMenu));

  document.getElementById("detailBackBtn")?.addEventListener("click", showBook);

  const openNewsBtn = document.getElementById("openNewsBtn");
  const newsView = document.getElementById("newsView");
  const menuView = document.getElementById("menuView");

  openNewsBtn?.addEventListener("click", () => {
    menuView.hidden = true;
    newsView.hidden = false;
    showAkindoNews();
  });

  const consultViewBtn = document.getElementById("consultViewBtn");
  consultViewBtn?.addEventListener("click", () => {
    menuView.hidden = true;
    consultView.style.display = "block";
  });
});
