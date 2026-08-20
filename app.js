/* ==========================================================================
   GPT 9.0LM — app logic
   ========================================================================== */

const els = {
  // hero (centered, empty-state) prompt box
  heroPromptInput: document.getElementById('heroPromptInput'),
  heroModelSelect: document.getElementById('heroModelSelect'),
  heroUploadBtn: document.getElementById('heroUploadBtn'),

  // docked (bottom) prompt box — shown once results exist
  promptDock: document.getElementById('promptDock'),
  promptInput: document.getElementById('promptInput'),
  modelSelect: document.getElementById('modelSelect'),
  generateBtn: document.getElementById('generateBtn'),
  generateLabel: document.getElementById('generateLabel'),
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
  composeBtn: document.getElementById('composeBtn'),
  searchInput: document.getElementById('searchInput'),
  searchTrigger: document.getElementById('searchTrigger'),
  upgradeBtn: document.getElementById('upgradeBtn'),
  modalOverlay: document.getElementById('modalOverlay'),
  modalClose: document.getElementById('modalClose'),
  fakeUpgradeBtn: document.getElementById('fakeUpgradeBtn'),
  lightboxOverlay: document.getElementById('lightboxOverlay'),
  lightboxImg: document.getElementById('lightboxImg'),
  lightboxClose: document.getElementById('lightboxClose'),

  sidebar: document.getElementById('sidebar'),
  sidebarCollapse: document.getElementById('sidebarCollapse'),
  sidebarExpand: document.getElementById('sidebarExpand'),
  greetingName: document.getElementById('greetingName'),
  userAvatar: document.getElementById('userAvatar'),
  userName: document.getElementById('userName'),
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

/* ---------- personalized name (set DISPLAY_NAME in config.js) ---------- */
(function initIdentity() {
  const name = (typeof PIXELFORGE_CONFIG !== 'undefined' && PIXELFORGE_CONFIG.DISPLAY_NAME) || 'there';
  els.greetingName.textContent = name;
  els.userName.textContent = name;
  els.userAvatar.textContent = name.charAt(0).toUpperCase();
})();

/* ---------- sidebar collapse (desktop) ---------- */
els.sidebarCollapse.addEventListener('click', () => {
  els.sidebar.classList.add('collapsed');
  els.sidebarExpand.hidden = false;
});
els.sidebarExpand.addEventListener('click', () => {
  els.sidebar.classList.remove('collapsed');
  els.sidebarExpand.hidden = true;
});

/* ---------- search row focuses the real input ---------- */
els.searchTrigger.addEventListener('click', (e) => {
  if (e.target !== els.searchInput) els.searchInput.focus();
});

/* ---------- textarea auto-grow (both boxes) ---------- */
function autoGrow(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 140) + 'px';
}
[els.promptInput, els.heroPromptInput].forEach((ta) => {
  ta.addEventListener('input', () => autoGrow(ta));
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate(ta === els.heroPromptInput ? 'hero' : 'dock');
    }
  });
});

/* ---------- reference image upload (shared by both boxes) ---------- */
function triggerUpload() { els.fileInput.click(); }
els.uploadBtn.addEventListener('click', triggerUpload);
els.heroUploadBtn.addEventListener('click', triggerUpload);
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
els.generateBtn.addEventListener('click', () => handleGenerate('dock'));

async function handleGenerate(source) {
  if (isGenerating) return;
  const activeInput = source === 'hero' ? els.heroPromptInput : els.promptInput;
  const activeModel = source === 'hero' ? els.heroModelSelect : els.modelSelect;
  const prompt = activeInput.value.trim();
  if (!prompt) { activeInput.focus(); return; }

  const plan = getPlan();
  const usage = getUsage();
  if (plan === 'free' && usage.count >= PIXELFORGE_CONFIG.FREE_DAILY_LIMIT) {
    openModal();
    return;
  }

  // first generation of the session: hide the centered hero box,
  // reveal the bottom-docked bar (mirrors the "box drops to the bottom
  // after the first message" pattern from the reference screenshots)
  els.canvasEmpty.style.display = 'none';
  els.promptDock.hidden = false;
  if (source === 'hero') {
    els.promptInput.value = prompt;
    els.modelSelect.value = activeModel.value;
    autoGrow(els.promptInput);
  }

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
    card.innerHTML = `<img src="${imageUrl}" alt="${escapeHtml(prompt)}" onerror="this.closest('.result-card').classList.add('error'); this.closest('.result-card').innerHTML='Image was blocked from loading — if you\\'re on Brave or using an ad blocker, try allowing image.pollinations.ai.';"><div class="prompt-tag">${escapeHtml(prompt)}</div>`;
    card.addEventListener('click', () => openLightbox(imageUrl));

    const record = { id: Date.now(), prompt, imageUrl, model: els.modelSelect.value };
    const list = loadGenerations();
    list.unshift(record);
    saveGenerations(list);
    renderRecent();

    bumpUsage();
  } catch (err) {
    console.error('GPT 9.0LM generation failed:', err);
    card.classList.remove('forging');
    card.classList.add('error');
    card.textContent = 'Generation failed — check your API config in config.js. See console for details.';
  } finally {
    isGenerating = false;
    setGeneratingUI(false);
    els.promptInput.value = '';
    autoGrow(els.promptInput);
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
    item.textContent = g.prompt;
    item.title = g.prompt;
    item.addEventListener('click', () => openLightbox(g.imageUrl));
    els.recentList.appendChild(item);
  });
}

function renderGrid(list) {
  els.resultsGrid.innerHTML = '';
  const hasResults = list.length > 0;
  els.canvasEmpty.style.display = hasResults ? 'none' : '';
  els.promptDock.hidden = !hasResults;
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
    renderGrid(loadGenerations());
  });
});

function resetToHero() {
  els.promptInput.value = '';
  els.heroPromptInput.value = '';
  autoGrow(els.promptInput);
  autoGrow(els.heroPromptInput);
  els.resultsGrid.innerHTML = '';
  els.promptDock.hidden = true;
  els.canvasEmpty.style.display = '';
  els.heroPromptInput.focus();
}
els.newCreationBtn.addEventListener('click', resetToHero);
els.composeBtn.addEventListener('click', resetToHero);

els.searchInput.addEventListener('input', () => {
  const q = els.searchInput.value.trim().toLowerCase();
  const list = q ? loadGenerations().filter((g) => g.prompt.toLowerCase().includes(q)) : loadGenerations();
  renderGrid(list);
});

/* ---------- upgrade modal ---------- */
function openModal() { closeLightbox(); els.modalOverlay.hidden = false; }
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
  closeModal();
  els.lightboxImg.src = src;
  els.lightboxOverlay.hidden = false;
}
function closeLightbox() { els.lightboxOverlay.hidden = true; }
els.lightboxImg.addEventListener('error', () => {
  // If the image can't load (e.g. an ad/tracker blocker like Brave Shields
  // blocking image.pollinations.ai), don't leave a dead broken-image
  // overlay stuck on screen — close it and say why.
  closeLightbox();
  alert('That image failed to load. If you\'re using Brave, an ad blocker, or a VPN, it may be blocking image.pollinations.ai — try allowing it for this site, or switch to a browser/extension setting that isn\'t blocking image requests.');
});
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