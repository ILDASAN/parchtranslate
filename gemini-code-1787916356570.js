// Structure de données locale pour les classeurs et pages
let binders = [
  { id: '1', name: 'Potions Avancées', pages: [] },
  { id: '2', name: 'Botanique & Sortilèges', pages: [] }
];
let activeBinderId = '1';

document.addEventListener('DOMContentLoaded', () => {
  renderBinders();
});

// Create a new Binder (Grimoire)
function createNewBinder() {
  const name = prompt("Nom du nouveau Grimoire :");
  if (name) {
    const newBinder = { id: Date.now().toString(), name, pages: [] };
    binders.push(newBinder);
    activeBinderId = newBinder.id;
    renderBinders();
  }
}

// Render list of Binders
function renderBinders() {
  const list = document.getElementById('binder-list');
  list.innerHTML = '';
  
  binders.forEach(binder => {
    const li = document.createElement('li');
    li.className = `p-3 rounded-lg cursor-pointer flex justify-between items-center transition ${binder.id === activeBinderId ? 'bg-amber-600/20 text-amber-400 font-bold border border-amber-600/40' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`;
    li.onclick = () => { activeBinderId = binder.id; renderBinders(); };
    li.innerHTML = `
      <span>📚 ${binder.name}</span>
      <span class="text-xs bg-slate-900 px-2 py-1 rounded text-slate-400">${binder.pages.length} p.</span>
    `;
    list.appendChild(li);
  });
}

// Processing the uploaded image
async function processImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  const spinner = document.getElementById('loading-spinner');
  const outputContainer = document.getElementById('output-container');
  spinner.classList.remove('hidden');
  outputContainer.classList.add('hidden');

  const image = new Image();
  image.src = URL.createObjectURL(file);

  image.onload = async () => {
    // 1. Détection automatique si c'est une double page (Ratio largeur/hauteur > 1.2)
    const isDoublePage = image.width / image.height > 1.2;

    if (isDoublePage) {
      const [leftCanvas, rightCanvas] = splitImage(image);
      const leftText = await runOCR(leftCanvas);
      const rightText = await runOCR(rightCanvas);

      displayParsedPage('page-left-content', leftText, leftCanvas.toDataURL());
      displayParsedPage('page-right-content', rightText, rightCanvas.toDataURL());
      document.getElementById('page-right-wrapper').classList.remove('hidden');
    } else {
      const text = await runOCR(image);
      displayParsedPage('page-left-content', text, image.src);
      document.getElementById('page-right-wrapper').classList.add('hidden');
    }

    spinner.classList.add('hidden');
    outputContainer.classList.remove('hidden');
  };
}

// Séparer une double page en 2 canvas distincts
function splitImage(image) {
  const halfWidth = image.width / 2;

  const canvasLeft = document.createElement('canvas');
  canvasLeft.width = halfWidth;
  canvasLeft.height = image.height;
  const ctxLeft = canvasLeft.getContext('2d');
  ctxLeft.drawImage(image, 0, 0, halfWidth, image.height, 0, 0, halfWidth, image.height);

  const canvasRight = document.createElement('canvas');
  canvasRight.width = halfWidth;
  canvasRight.height = image.height;
  const ctxRight = canvasRight.getContext('2d');
  ctxRight.drawImage(image, halfWidth, 0, halfWidth, image.height, 0, 0, halfWidth, image.height);

  return [canvasLeft, canvasRight];
}

// Extraction OCR via Tesseract.js
async function runOCR(imageSource) {
  const worker = await Tesseract.createWorker('fra');
  const ret = await worker.recognize(imageSource);
  await worker.terminate();
  return ret.data.text;
}

// Analyse du texte brute et mise en page magique (Titres colorés, paragraphes, images)
function displayParsedPage(elementId, text, imageSrc) {
  const container = document.getElementById(elementId);
  container.innerHTML = '';

  // Insertion de l'image extraite
  const imgElement = document.createElement('img');
  imgElement.src = imageSrc;
  imgElement.className = "w-full h-auto rounded-lg mb-4 border border-amber-600/30 shadow-md";
  container.appendChild(imgElement);

  // Découpage du texte en paragraphes
  const paragraphs = text.split('\n\n').filter(p => p.trim() !== '');

  paragraphs.forEach((pText, index) => {
    const lines = pText.split('\n');
    const paragraphDiv = document.createElement('div');
    paragraphDiv.className = "mb-4 space-y-1";

    lines.forEach((line, lineIdx) => {
      // Si c'est la première ligne du bloc, on la traite comme entête/titre
      if (lineIdx === 0 && line.length < 60) {
        const heading = document.createElement('h3');
        heading.className = "text-lg font-bold text-amber-500 magic-font mt-2 border-b border-amber-600/20 pb-1";
        heading.innerText = line;
        paragraphDiv.appendChild(heading);
      } else {
        const p = document.createElement('p');
        p.className = "text-slate-300 leading-relaxed text-sm";
        p.innerText = line;
        paragraphDiv.appendChild(p);
      }
    });

    container.appendChild(paragraphDiv);
  });
}