// akindoNews.js
import { akindoNewsData } from "./newsData.js";
import { questions } from "./questions.js";

let current = 0;

function getKarutaPhrase(karutaId) {
  const q = questions.find(q => q.id === karutaId);
  return q ? q.fullPhrase : "";
}

function render(content) {
  const n = akindoNewsData[current];
  const karuta = getKarutaPhrase(n.karutaId);

  content.innerHTML = `
    <div class="news-headline">${n.headline}</div>
    <div class="news-source">出典：${n.source}</div>
    <div class="news-summary">${n.summary}</div>
    <div class="news-karuta"><strong>${karuta}</strong></div>
    <div class="news-commentary">${n.commentary}</div>
      <div class="news-karuta-image">
      <img src="images/${kanaToFile(
        questions.find(q => q.id === n.karutaId)?.kana
      )}" alt="">
    </div>
  `;
}

export function showAkindoNews() {
  const content = document.getElementById("newsContent");
  const nextBtn = document.getElementById("nextNewsBtn");

  if (!content || !nextBtn) return;

  current = 0;
  render(content);

  nextBtn.onclick = () => {
    current = (current + 1) % akindoNewsData.length;
    render(content);
  };
}
