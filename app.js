/* ==========================================================================
   GPT 9.0LM — app logic
   ========================================================================== */

const els = {
  promptInput: document.getElementById('promptInput'),
  modelSelect: document.getElementById('modelSelect'),
  generateBtn: document.getElementById('generateBtn'),
  generateLabel: document.getElementById('generateLabel'),
  generateArrow: document.getElementById('generateArrow'),
  uploadBtn: document.getElementById('uploadBtn'),
  fileInput: document.getElementById('fileInput'),
  refPreview: document.getElementById('refPreview'),
  refImg: document.getElementById('refImg'),
  refClear: document.getElementById('refClear'),
  canvasEmpty: document.getElementById('canvasEmpty'),
  resultsGrid: document.getElementById('resultsGrid'),
  recentList: document.getElementById('recentList'),
  gensLeft: document.getElementById('gensLeft'),
  newCreationBtn: document.getElementById('newCreationBtn'),
  searchInput: document.getElementById('searchInput'),
  upgradeBtn: document.getElementById('upgradeBtn'),
  modalOverlay: document.getElementById('modalOverlay'),
  modalClose: document.getElementById('modalClose'),
  fakeUpgradeBtn: document.getElementById('fakeUpgradeBtn'),
  lightboxOverlay: document.getElementById('lightboxOverlay'),
  lightboxImg: document.getElementById('lightboxImg'),
  lightboxClose: document.getElementById('lightboxClose'),
};

let referenceImageDataUrl = null;
let isGenerating = false;

/* ---------- persistence ---------- */
const STORE_KEY = 'pixelforge_generations';
const PLAN_KEY = 'pixelforge_plan'; // 'free' | 'pro'
const USAGE_KEY = 'pixelforge_usage'; // { date, count }

function loadGenerations() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
  catch { return []; }
}
function saveGenerations(list) {
  localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(0, 60)));
}
function getPlan() {
  return localStorage.getItem(PLAN_KEY) || 'free';
}
function todayStr() { return new Date().toISOString().slice(0, 10); }
function getUsage() {
  let u;
  try { u = JSON.parse(localStorage.getItem(USAGE_KEY)); } catch { u = null; }
  if (!u || u.date !== todayStr()) u = { date: todayStr(), count: 0 };
  return u;
}
function bumpUsage() {
  const u = getUsage();
  u.count += 1;
  localStorage.setItem(USAGE_KEY, JSON.stringify(u));
  updatePlanPill();
}
function updatePlanPill() {
  const plan = getPlan();
  const usage = getUsage();
  if (plan === 'pro') {
    els.gensLeft.parentElement.innerHTML = '<span class="plan-dot"></span> PixelForge Pro — unlimited';
  } else {
    const left = Math.max(0, PIXELFORGE_CONFIG.FREE_DAILY_LIMIT - usage.count);
    els.gensLeft.parentElement.innerHTML = `<span class="plan-dot"></span> Free plan — ${left} gens left today`;
  }
}

/* ---------- textarea auto-grow ---------- */
els.promptInput.addEventListener('input', () => {
  els.promptInput.style.height = 'auto';
  els.promptInput.style.height = Math.min(els.promptInput.scrollHeight, 140) + 'px';
});
els.promptInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleGenerate();
  }
});

/* ---------- reference image upload ---------- */
els.uploadBtn.addEventListener('click', () => els.fileInput.click());
els.fileInput.addEventListener('change', () => {
  const file = els.fileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    referenceImageDataUrl = reader.result;
    els.refImg.src = referenceImageDataUrl;
    els.refPreview.hidden = false;
  };
  reader.readAsDataURL(file);
});
els.refClear.addEventListener('click', () => {
  referenceImageDataUrl = null;
  els.fileInput.value = '';
  els.refPreview.hidden = true;
});

/* ---------- generate ---------- */
els.generateBtn.addEventListener('click', handleGenerate);

async function handleGenerate() {
  if (isGenerating) return;
  const prompt = els.promptInput.value.trim();
  if (!prompt) { els.promptInput.focus(); return; }

  const plan = getPlan();
  const usage = getUsage();
  if (plan === 'free' && usage.count >= PIXELFORGE_CONFIG.FREE_DAILY_LIMIT) {
    openModal();
    return;
  }

  els.canvasEmpty.style.display = 'none';
  isGenerating = true;
  setGeneratingUI(true);

  const card = document.createElement('div');
  card.className = 'result-card forging';
  els.resultsGrid.prepend(card);

  try {
    const imageUrl = await callImageAPI({
      prompt,
      model: els.modelSelect.value,
      referenceImage: referenceImageDataUrl,
    });

    card.classList.remove('forging');
    card.innerHTML = `<img src="${imageUrl}" alt="${escapeHtml(prompt)}"><div class="prompt-tag">${escapeHtml(prompt)}</div>`;
    card.addEventListener('click', () => openLightbox(imageUrl));

    const record = { id: Date.now(), prompt, imageUrl, model: els.modelSelect.value };
    const list = loadGenerations();
    list.unshift(record);
    saveGenerations(list);
    renderRecent();

    bumpUsage();
  } catch (err) {
    console.error('PixelForge generation failed:', err);
    card.classList.remove('forging');
    card.classList.add('error');
    card.textContent = 'Generation failed — check your API config in config.js. See console for details.';
  } finally {
    isGenerating = false;
    setGeneratingUI(false);
  }
}

function setGeneratingUI(loading) {
  els.generateBtn.disabled = loading;
  els.generateBtn.classList.toggle('loading', loading);
  els.generateLabel.textContent = loading ? 'Forging…' : 'Generate';
}

/* ---------- API adapter ----------
   Routes to Pollinations (free, no key) by default. Switch
   IMAGE_PROVIDER to "custom" in config.js once you're on a paid API,
   and fill in the "custom" branch below to match that provider's
   actual request/response shape. */
async function callImageAPI({ prompt, model, referenceImage }) {
  if (PIXELFORGE_CONFIG.IMAGE_PROVIDER === 'pollinations') {
    return callPollinations({ prompt, model });
  }
  return callCustomAPI({ prompt, model, referenceImage });
}

// Free, no-signup provider: https://pollinations.ai
// It's a plain GET that returns image bytes directly, so we just build
// the URL and preload it to confirm it actually loaded before showing it.
function callPollinations({ prompt, model }) {
  const seed = Math.floor(Math.random() * 1_000_000);
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=1024&height=1024&model=${encodeURIComponent(model || 'flux')}` +
    `&seed=${seed}&nologo=true`;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const timeout = setTimeout(() => reject(new Error('Pollinations request timed out')), 30000);
    img.onload = () => { clearTimeout(timeout); resolve(url); };
    img.onerror = () => { clearTimeout(timeout); reject(new Error('Pollinations failed to return an image')); };
    img.src = url;
  });
}

// Paid/custom API branch — fill this in once you upgrade.
async function callCustomAPI({ prompt, model, referenceImage }) {
  const res = await fetch(PIXELFORGE_CONFIG.API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(PIXELFORGE_CONFIG.API_KEY
        ? { Authorization: `Bearer ${PIXELFORGE_CONFIG.API_KEY}` }
        : {}),
    },
    body: JSON.stringify({ prompt, model, referenceImage }),
  });

  if (!res.ok) {
    throw new Error(`API request failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  // Common response shapes — adjust to match your provider:
  if (data.imageUrl) return data.imageUrl;
  if (data.image_base64) return `data:image/png;base64,${data.image_base64}`;
  if (data.data && data.data[0] && data.data[0].url) return data.data[0].url; // OpenAI-style
  if (data.data && data.data[0] && data.data[0].b64_json) return `data:image/png;base64,${data.data[0].b64_json}`;

  throw new Error('Unrecognized API response shape — edit callCustomAPI() in script.js to match your provider.');
}

/* ---------- recent / library ---------- */
function renderRecent() {
  const list = loadGenerations();
  if (!list.length) {
    els.recentList.innerHTML = '<p class="recent-empty">Nothing forged yet — your generations will land here.</p>';
    return;
  }
  els.recentList.innerHTML = '';
  list.slice(0, 25).forEach((g) => {
    const item = document.createElement('div');
    item.className = 'recent-item';
    item.innerHTML = `<img src="${g.imageUrl}" alt=""><span>${escapeHtml(g.prompt)}</span>`;
    item.addEventListener('click', () => openLightbox(g.imageUrl));
    els.recentList.appendChild(item);
  });
}

function renderLibraryGrid() {
  const list = loadGenerations();
  els.resultsGrid.innerHTML = '';
  els.canvasEmpty.style.display = list.length ? 'none' : '';
  list.forEach((g) => {
    const card = document.createElement('div');
    card.className = 'result-card';
    card.innerHTML = `<img src="${g.imageUrl}" alt="${escapeHtml(g.prompt)}"><div class="prompt-tag">${escapeHtml(g.prompt)}</div>`;
    card.addEventListener('click', () => openLightbox(g.imageUrl));
    els.resultsGrid.appendChild(card);
  });
}

/* ---------- nav ---------- */
document.querySelectorAll('.nav-item').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    renderLibraryGrid();
  });
});

els.newCreationBtn.addEventListener('click', () => {
  els.promptInput.value = '';
  els.promptInput.style.height = 'auto';
  els.resultsGrid.innerHTML = '';
  els.canvasEmpty.style.display = '';
  els.promptInput.focus();
});

els.searchInput.addEventListener('input', () => {
  const q = els.searchInput.value.trim().toLowerCase();
  const list = loadGenerations().filter((g) => g.prompt.toLowerCase().includes(q));
  els.resultsGrid.innerHTML = '';
  els.canvasEmpty.style.display = list.length ? 'none' : '';
  list.forEach((g) => {
    const card = document.createElement('div');
    card.className = 'result-card';
    card.innerHTML = `<img src="${g.imageUrl}" alt="${escapeHtml(g.prompt)}"><div class="prompt-tag">${escapeHtml(g.prompt)}</div>`;
    card.addEventListener('click', () => openLightbox(g.imageUrl));
    els.resultsGrid.appendChild(card);
  });
});

/* ---------- upgrade modal ---------- */
function openModal() { els.modalOverlay.hidden = false; }
function closeModal() { els.modalOverlay.hidden = true; }
els.upgradeBtn.addEventListener('click', openModal);
els.modalClose.addEventListener('click', closeModal);
els.modalOverlay.addEventListener('click', (e) => { if (e.target === els.modalOverlay) closeModal(); });

els.fakeUpgradeBtn.addEventListener('click', () => {
  // Demo only — wire this button to your real checkout/payment flow.
  localStorage.setItem(PLAN_KEY, 'pro');
  updatePlanPill();
  closeModal();
});

/* ---------- lightbox ---------- */
function openLightbox(src) {
  els.lightboxImg.src = src;
  els.lightboxOverlay.hidden = false;
}
function closeLightbox() { els.lightboxOverlay.hidden = true; }
els.lightboxClose.addEventListener('click', closeLightbox);
els.lightboxOverlay.addEventListener('click', (e) => { if (e.target === els.lightboxOverlay) closeLightbox(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeLightbox(); closeModal(); } });

/* ---------- utils ---------- */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ---------- init ---------- */
renderRecent();
updatePlanPill();