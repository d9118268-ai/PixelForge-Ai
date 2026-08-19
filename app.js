// ============================================================
// PIXELFORGE AI - app.js
// Works out of the box with ZERO API setup!
// Plug in your keys later when ready.
// ============================================================

// ===== OPTIONAL: Add your keys here when ready =====
const SUPABASE_URL = '';      // e.g. 'https://abcdefgh.supabase.co'
const SUPABASE_ANON_KEY = ''; // e.g. 'eyJhbGciOiJIUzI1NiIs...'
const OPENROUTER_KEY = '';    // e.g. 'sk-or-v1-...'

// ===== AUTO-DETECT MODE =====
const HAS_SUPABASE = SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL !== 'https://your-project.supabase.co';
const HAS_OPENROUTER = OPENROUTER_KEY && OPENROUTER_KEY !== 'your-anon-key' && OPENROUTER_KEY.startsWith('sk-or');

let supabase = null;
if (HAS_SUPABASE && typeof window.supabase !== 'undefined') {
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase connected');
    } catch (e) {
        console.log('⚠️ Supabase failed, using demo mode');
    }
}

// ===== STATE =====
let currentUser = null;
let isGenerating = false;
let isChatting = false;
let generations = JSON.parse(localStorage.getItem('pixelforge_generations') || '[]');
let chatHistory = JSON.parse(localStorage.getItem('pixelforge_chat') || '[]');
let currentBilling = 'monthly';

// ===== DOM ELEMENTS =====
const authOverlay = document.getElementById('authOverlay');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const authMessage = document.getElementById('authMessage');
const promptInput = document.getElementById('promptInput');
const chatMessages = document.getElementById('chatMessages');
const welcomeScreen = document.getElementById('welcomeScreen');
const upgradeModal = document.getElementById('upgradeModal');
const userMenu = document.getElementById('userMenu');
const sidebar = document.getElementById('sidebar');

// ===== DEMO CHAT RESPONSES (works without any API) =====
const DEMO_RESPONSES = {
    greetings: [
        "Hey there! I'm PixelForge, your AI creative assistant. I can generate stunning images from your descriptions, or we can just chat! What would you like to create today?",
        "Hello! Ready to bring your imagination to life? Just describe any image you want, and I'll generate it for you instantly!",
        "Hi! I'm here to help you create amazing AI art. What scene, character, or concept should we bring to life?"
    ],
    imageRelated: [
        "That sounds like an amazing concept! Let me generate that image for you right now...",
        "Great idea! I'm creating that visual for you. One moment...",
        "Love that prompt! Generating your masterpiece now...",
        "Interesting vision! Let me bring it to life with AI..."
    ],
    creative: [
        "As an AI creative assistant, I specialize in turning your ideas into stunning visuals. Try describing a scene like 'a cyberpunk city at sunset' or 'a dragon made of stars'!",
        "I can help you explore endless creative possibilities. From photorealistic landscapes to abstract art, fantasy characters to architectural concepts — just describe it!",
        "PixelForge is powered by cutting-edge AI image generation. Every prompt creates a unique, never-before-seen image. What shall we create?"
    ],
    help: [
        "Here's how PixelForge works: Type any image description in the box below and press Enter. I'll generate a unique AI image based on your prompt. You can also ask me questions!",
        "Tips for great results: Be specific! Instead of 'a cat', try 'a fluffy orange cat wearing sunglasses, sitting on a beach chair, photorealistic, 8k'. The more detail, the better!",
        "You can generate: portraits, landscapes, concept art, logos, abstract art, characters, architecture, and more. What type of image are you in the mood for?"
    ],
    fallback: [
        "That's fascinating! While I think about that, would you like me to generate an image? Just describe what you'd like to see!",
        "Interesting perspective! I'm primarily an image generation AI — want to test my creative powers? Describe any scene and I'll make it real!",
        "I love where this conversation is going! Shall we channel that creativity into an image? What visual masterpiece should we create?"
    ]
};

function getDemoResponse(input) {
    const lower = input.toLowerCase();
    if (/^(hi|hello|hey|greetings|yo|sup)/.test(lower)) {
        return pickRandom(DEMO_RESPONSES.greetings);
    }
    if (/image|picture|photo|generate|create|draw|paint|make.*art|design|portrait|landscape|scene|character|logo|illustration|render|3d|anime|cartoon|realistic|fantasy|sci-fi|cyberpunk|abstract|watercolor|oil painting|sketch|concept art/.test(lower)) {
        return pickRandom(DEMO_RESPONSES.imageRelated);
    }
    if (/help|how|what can you|tips|guide/.test(lower)) {
        return pickRandom(DEMO_RESPONSES.help);
    }
    if (/who are you|what are you|pixel|forge|ai|creative/.test(lower)) {
        return pickRandom(DEMO_RESPONSES.creative);
    }
    return pickRandom(DEMO_RESPONSES.fallback);
}

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// ===== AUTH FUNCTIONS =====
function switchAuthTab(tab, btn) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    loginForm.classList.toggle('hidden', tab !== 'login');
    signupForm.classList.toggle('hidden', tab !== 'signup');
    hideAuthMessage();
}

function showAuthMessage(text, type) {
    authMessage.textContent = text;
    authMessage.className = 'auth-message ' + type;
    authMessage.style.display = 'block';
}

function hideAuthMessage() {
    authMessage.className = 'auth-message';
    authMessage.style.display = 'none';
}

// LOGIN - prevent any default form behavior
loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    e.stopPropagation();

    const btn = document.getElementById('loginBtn');
    btn.disabled = true;

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showAuthMessage('Please fill in all fields', 'error');
        btn.disabled = false;
        return;
    }

    // ALWAYS use demo mode for now (no Supabase redirect issues)
    currentUser = { 
        email: email, 
        id: 'demo-' + Date.now(),
        name: email.split('@')[0]
    };
    localStorage.setItem('pixelforge_user', JSON.stringify(currentUser));
    enterApp();
    btn.disabled = false;
});

// SIGNUP - prevent any default form behavior
signupForm.addEventListener('submit', function(e) {
    e.preventDefault();
    e.stopPropagation();

    const btn = document.getElementById('signupBtn');
    btn.disabled = true;

    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;

    if (!email || !password) {
        showAuthMessage('Please fill in all fields', 'error');
        btn.disabled = false;
        return;
    }

    if (password.length < 6) {
        showAuthMessage('Password must be at least 6 characters', 'error');
        btn.disabled = false;
        return;
    }

    // ALWAYS use demo mode
    currentUser = { 
        email: email, 
        id: 'demo-' + Date.now(),
        name: email.split('@')[0]
    };
    localStorage.setItem('pixelforge_user', JSON.stringify(currentUser));
    enterApp();
    btn.disabled = false;
});

// GOOGLE SIGN IN - demo mode only (no redirects)
function signInWithGoogle() {
    // Demo mode — no redirects, no new tabs
    currentUser = { 
        email: 'google.user@gmail.com', 
        id: 'demo-google-' + Date.now(),
        name: 'Google User'
    };
    localStorage.setItem('pixelforge_user', JSON.stringify(currentUser));
    enterApp();
}

function logout() {
    localStorage.removeItem('pixelforge_user');
    localStorage.removeItem('pixelforge_chat');
    currentUser = null;
    chatHistory = [];
    userMenu.classList.add('hidden');
    authOverlay.classList.remove('hidden');
    loginForm.reset();
    signupForm.reset();
    hideAuthMessage();

    // Reset to login tab
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-tab')[0].classList.add('active');
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
}

function enterApp() {
    authOverlay.classList.add('hidden');
    updateUserUI();
    renderImages();
}

function updateUserUI() {
    if (!currentUser) return;
    const email = currentUser.email || 'User';
    const initial = email[0].toUpperCase();
    document.getElementById('userAvatar').textContent = initial;
    document.getElementById('userName').textContent = currentUser.name || email.split('@')[0];
}

function toggleUserMenu() {
    userMenu.classList.toggle('hidden');
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('.sidebar-footer')) {
        userMenu.classList.add('hidden');
    }
});

function checkSession() {
    const saved = localStorage.getItem('pixelforge_user');
    if (saved) {
        try {
            currentUser = JSON.parse(saved);
            enterApp();
        } catch(e) {
            localStorage.removeItem('pixelforge_user');
        }
    }
}
checkSession();

// ===== NAVIGATION =====
function switchView(view) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

    if (view === 'chat') {
        document.getElementById('navChat').classList.add('active');
        document.getElementById('chatView').classList.add('active');
    } else if (view === 'images') {
        document.getElementById('navImages').classList.add('active');
        document.getElementById('imagesView').classList.add('active');
    } else if (view === 'library') {
        document.getElementById('navLibrary').classList.add('active');
        document.getElementById('libraryView').classList.add('active');
    }

    if (window.innerWidth <= 768) {
        sidebar.classList.remove('open');
    }
}

function toggleSidebar() {
    sidebar.classList.toggle('open');
}

function newChat() {
    welcomeScreen.style.display = 'block';
    chatMessages.classList.remove('active');
    chatMessages.innerHTML = '';
    promptInput.value = '';
    chatHistory = [];
    switchView('chat');
}

function newNotebook() {
    alert('Notebooks coming soon! 🚀');
}

// ===== SMART INPUT DETECTION =====
function isImagePrompt(text) {
    const imageKeywords = /image|picture|photo|generate|create|draw|paint|make.*art|design|portrait|landscape|scene|character|logo|illustration|render|3d|anime|cartoon|realistic|fantasy|sci-fi|cyberpunk|abstract|watercolor|oil painting|sketch|concept art/;
    return imageKeywords.test(text.toLowerCase());
}

function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleInput();
    }
}

async function handleInput() {
    const prompt = promptInput.value.trim();
    if (!prompt || isGenerating || isChatting) return;

    welcomeScreen.style.display = 'none';
    chatMessages.classList.add('active');

    addUserMessage(prompt);

    if (isImagePrompt(prompt)) {
        await generateImage(prompt);
    } else {
        await sendChatMessage(prompt);
    }

    promptInput.value = '';
}

function addUserMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'message';
    msg.innerHTML = `
        <div class="message-avatar user">${currentUser ? (currentUser.email[0] || 'U').toUpperCase() : 'U'}</div>
        <div class="message-body"><p>${escapeHtml(text)}</p></div>
    `;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ===== CHAT =====
async function sendChatMessage(prompt) {
    isChatting = true;

    const aiMsg = document.createElement('div');
    aiMsg.className = 'message';
    aiMsg.id = 'chatResponse';
    aiMsg.innerHTML = `
        <div class="message-avatar ai">🔮</div>
        <div class="message-body">
            <div class="chat-loading">Thinking...</div>
        </div>
    `;
    chatMessages.appendChild(aiMsg);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    let responseText = '';

    if (HAS_OPENROUTER) {
        try {
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + OPENROUTER_KEY,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.href,
                    'X-Title': 'PixelForge AI'
                },
                body: JSON.stringify({
                    model: 'deepseek/deepseek-r1:free',
                    messages: [
                        { role: 'system', content: 'You are PixelForge AI, a creative assistant that helps users generate AI images and answers their questions. Be friendly, creative, and encouraging.' },
                        ...chatHistory.map(h => ({ role: h.role, content: h.content })),
                        { role: 'user', content: prompt }
                    ]
                })
            });
            const data = await res.json();
            responseText = data.choices?.[0]?.message?.content || getDemoResponse(prompt);
        } catch (e) {
            responseText = getDemoResponse(prompt);
        }
    } else {
        await delay(800);
        responseText = getDemoResponse(prompt);
    }

    chatHistory.push({ role: 'user', content: prompt });
    chatHistory.push({ role: 'assistant', content: responseText });
    if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
    localStorage.setItem('pixelforge_chat', JSON.stringify(chatHistory));

    const response = document.getElementById('chatResponse');
    response.innerHTML = `
        <div class="message-avatar ai">🔮</div>
        <div class="message-body"><p>${escapeHtml(responseText)}</p></div>
    `;

    isChatting = false;
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ===== IMAGE GENERATION (Pollinations — always free) =====
async function generateImage(prompt) {
    isGenerating = true;

    const aiMsg = document.createElement('div');
    aiMsg.className = 'message';
    aiMsg.id = 'aiResponse';
    aiMsg.innerHTML = `
        <div class="message-avatar ai">🔮</div>
        <div class="message-body">
            <p>Creating your masterpiece...</p>
            <div class="image-loading">✨ Generating image...</div>
        </div>
    `;
    chatMessages.appendChild(aiMsg);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    const encodedPrompt = encodeURIComponent(prompt);
    const seed = Math.floor(Math.random() * 100000);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${seed}&nologo=true&enhance=true`;

    const img = new Image();
    img.onload = function() {
        const response = document.getElementById('aiResponse');
        response.innerHTML = `
            <div class="message-avatar ai">🔮</div>
            <div class="message-body">
                <p>Here's what I created for you:</p>
                <div class="message-image">
                    <img src="${imageUrl}" alt="${escapeHtml(prompt)}" onclick="downloadImage('${imageUrl}', '${escapeHtml(prompt)}')">
                </div>
                <p style="margin-top:8px;font-size:12px;color:var(--text-tertiary);">Click image to download</p>
            </div>
        `;

        const gen = {
            id: Date.now(),
            prompt: prompt,
            imageUrl: imageUrl,
            seed: seed,
            timestamp: new Date().toISOString()
        };
        generations.unshift(gen);
        localStorage.setItem('pixelforge_generations', JSON.stringify(generations));
        renderImages();

        isGenerating = false;
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    img.onerror = function() {
        const response = document.getElementById('aiResponse');
        response.innerHTML = `
            <div class="message-avatar ai">🔮</div>
            <div class="message-body">
                <p style="color:#d93025;">Oops! Something went wrong. Please try again.</p>
            </div>
        `;
        isGenerating = false;
    };

    img.src = imageUrl;
}

// ===== GALLERY =====
function renderImages() {
    const grid = document.getElementById('imagesGrid');
    const empty = document.getElementById('imagesEmpty');

    if (generations.length === 0) {
        grid.innerHTML = '';
        empty.style.display = 'flex';
        return;
    }

    empty.style.display = 'none';
    grid.innerHTML = generations.map(function(g) {
        return `
            <div class="image-card" onclick="downloadImage('${g.imageUrl}', '${escapeHtml(g.prompt)}')">
                <img src="${g.imageUrl}" alt="${escapeHtml(g.prompt)}" loading="lazy">
                <div class="image-card-info">
                    <p>${escapeHtml(g.prompt)}</p>
                    <div class="date">${formatDate(g.timestamp)}</div>
                </div>
            </div>
        `;
    }).join('');
}

function downloadImage(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pixelforge-' + filename.substring(0, 30).replace(/[^a-z0-9]/gi, '-') + '.png';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// ===== UPGRADE MODAL =====
function showUpgrade() {
    upgradeModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function hideUpgrade() {
    upgradeModal.classList.add('hidden');
    document.body.style.overflow = '';
}

function switchBilling(type, btn) {
    currentBilling = type;
    document.querySelectorAll('.billing-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    document.querySelectorAll('.plan-price .amount').forEach(function(el) {
        el.textContent = el.getAttribute('data-' + type);
    });
}

upgradeModal.addEventListener('click', function(e) {
    if (e.target === upgradeModal) hideUpgrade();
});

// ===== UTILITIES =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function delay(ms) {
    return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

// ===== INIT =====
renderImages();

window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
        sidebar.classList.remove('open');
    }
});

console.log('🔮 PixelForge AI loaded!');
console.log('Mode: Demo (no API keys needed)');