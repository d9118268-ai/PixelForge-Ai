// ============================================================
// PIXELFORGE AI - PRODUCTION READY
// Supabase + Pollinations + OpenRouter
// ============================================================

// ===== YOUR SUPABASE KEYS (already filled in!) =====
const SUPABASE_URL = 'https://ovgnqsijibfgynshtizv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_2ZYiDvzzReYAcW6xQeVX-A_164sYKdz';

// ===== ADD OPENROUTER KEY HERE WHEN YOU GET IT =====
const OPENROUTER_KEY = '';
// Go to openrouter.ai, sign up, create a key, paste it above
// Example: const OPENROUTER_KEY = 'sk-or-v1-abc123...';

// ===== AUTO-DETECT =====
const HAS_SUPABASE = SUPABASE_URL && SUPABASE_ANON_KEY;
const HAS_OPENROUTER = OPENROUTER_KEY && OPENROUTER_KEY.startsWith('sk-or');

// Init Supabase
let supabase = null;
if (HAS_SUPABASE && typeof window.supabase !== 'undefined') {
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase connected!');
    } catch (e) {
        console.log('Supabase error:', e.message);
    }
}

// ===== STATE =====
var currentUser = null;
var isGenerating = false;
var isChatting = false;
var generations = JSON.parse(localStorage.getItem('pixelforge_generations') || '[]');
var chatHistory = JSON.parse(localStorage.getItem('pixelforge_chat') || '[]');
var currentBilling = 'monthly';
var isDarkMode = localStorage.getItem('pixelforge_darkmode') === 'true';

// Apply dark mode on load
if (isDarkMode) {
    document.body.classList.add('dark-mode');
    document.getElementById('darkModeToggle').textContent = '☀️';
}

// ===== DEMO RESPONSES (fallback) =====
var DEMO_RESPONSES = {
    greetings: [
        "Hey there! I am PixelForge, your AI creative assistant. I can generate stunning images from your descriptions, or we can just chat! What would you like to create today?",
        "Hello! Ready to bring your imagination to life? Just describe any image you want, and I will generate it for you instantly!",
        "Hi! I am here to help you create amazing AI art. What scene, character, or concept should we bring to life?"
    ],
    imageRelated: [
        "That sounds like an amazing concept! Let me generate that image for you right now...",
        "Great idea! I am creating that visual for you. One moment...",
        "Love that prompt! Generating your masterpiece now...",
        "Interesting vision! Let me bring it to life with AI..."
    ],
    creative: [
        "As an AI creative assistant, I specialize in turning your ideas into stunning visuals. Try describing a scene like a cyberpunk city at sunset or a dragon made of stars!",
        "I can help you explore endless creative possibilities. From photorealistic landscapes to abstract art, fantasy characters to architectural concepts -- just describe it!",
        "PixelForge is powered by cutting-edge AI image generation. Every prompt creates a unique, never-before-seen image. What shall we create?"
    ],
    help: [
        "Here is how PixelForge works: Type any image description in the box below and press Enter. I will generate a unique AI image based on your prompt. You can also ask me questions!",
        "Tips for great results: Be specific! Instead of 'a cat', try 'a fluffy orange cat wearing sunglasses, sitting on a beach chair, photorealistic, 8k'. The more detail, the better!",
        "You can generate: portraits, landscapes, concept art, logos, abstract art, characters, architecture, and more. What type of image are you in the mood for?"
    ],
    fallback: [
        "That is fascinating! While I think about that, would you like me to generate an image? Just describe what you would like to see!",
        "Interesting perspective! I am primarily an image generation AI -- want to test my creative powers? Describe any scene and I will make it real!",
        "I love where this conversation is going! Shall we channel that creativity into an image? What visual masterpiece should we create?"
    ]
};

function getDemoResponse(input) {
    var lower = input.toLowerCase();
    if (/^(hi|hello|hey|greetings|yo|sup)/.test(lower)) {
        return DEMO_RESPONSES.greetings[Math.floor(Math.random() * DEMO_RESPONSES.greetings.length)];
    }
    if (/image|picture|photo|generate|create|draw|paint|art|design|portrait|landscape|scene|character|logo|illustration|render|anime|cartoon|realistic|fantasy|cyberpunk|abstract|watercolor|sketch/.test(lower)) {
        return DEMO_RESPONSES.imageRelated[Math.floor(Math.random() * DEMO_RESPONSES.imageRelated.length)];
    }
    if (/help|how|what can you|tips|guide/.test(lower)) {
        return DEMO_RESPONSES.help[Math.floor(Math.random() * DEMO_RESPONSES.help.length)];
    }
    if (/who are you|what are you|pixel|forge|creative/.test(lower)) {
        return DEMO_RESPONSES.creative[Math.floor(Math.random() * DEMO_RESPONSES.creative.length)];
    }
    return DEMO_RESPONSES.fallback[Math.floor(Math.random() * DEMO_RESPONSES.fallback.length)];
}

// ===== DARK MODE =====
function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('pixelforge_darkmode', isDarkMode);
    document.getElementById('darkModeToggle').textContent = isDarkMode ? '☀️' : '🌙';
}

// ===== AUTH =====
function showLogin() {
    document.getElementById('tabLogin').classList.add('active');
    document.getElementById('tabSignup').classList.remove('active');
    document.getElementById('loginFormBox').style.display = 'block';
    document.getElementById('signupFormBox').style.display = 'none';
    hideAuthMessage();
}

function showSignup() {
    document.getElementById('tabLogin').classList.remove('active');
    document.getElementById('tabSignup').classList.add('active');
    document.getElementById('loginFormBox').style.display = 'none';
    document.getElementById('signupFormBox').style.display = 'block';
    hideAuthMessage();
}

function showAuthMessage(text, type) {
    var msg = document.getElementById('authMessage');
    msg.textContent = text;
    msg.className = 'auth-message ' + type;
    msg.style.display = 'block';
}

function hideAuthMessage() {
    var msg = document.getElementById('authMessage');
    msg.className = 'auth-message';
    msg.style.display = 'none';
}

function doLogin() {
    var email = document.getElementById('loginEmail').value.trim();
    var password = document.getElementById('loginPassword').value;

    if (!email) { showAuthMessage('Please enter your email', 'error'); return; }
    if (!password) { showAuthMessage('Please enter your password', 'error'); return; }

    if (supabase) {
        supabase.auth.signInWithPassword({ email: email, password: password }).then(function(result) {
            if (result.error) {
                showAuthMessage(result.error.message, 'error');
            } else {
                currentUser = result.data.user;
                enterApp();
            }
        });
    } else {
        currentUser = { email: email, id: 'demo-' + Date.now(), name: email.split('@')[0] };
        localStorage.setItem('pixelforge_user', JSON.stringify(currentUser));
        enterApp();
    }
}

function doSignup() {
    var email = document.getElementById('signupEmail').value.trim();
    var password = document.getElementById('signupPassword').value;

    if (!email) { showAuthMessage('Please enter your email', 'error'); return; }
    if (!password) { showAuthMessage('Please enter a password', 'error'); return; }
    if (password.length < 6) { showAuthMessage('Password must be at least 6 characters', 'error'); return; }

    if (supabase) {
        supabase.auth.signUp({ email: email, password: password }).then(function(result) {
            if (result.error) {
                showAuthMessage(result.error.message, 'error');
            } else {
                showAuthMessage('Check your email to confirm your account!', 'success');
            }
        });
    } else {
        currentUser = { email: email, id: 'demo-' + Date.now(), name: email.split('@')[0] };
        localStorage.setItem('pixelforge_user', JSON.stringify(currentUser));
        enterApp();
    }
}

function doGoogleLogin() {
    if (supabase) {
        supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } });
    } else {
        currentUser = { email: 'google.user@gmail.com', id: 'demo-google-' + Date.now(), name: 'Google User' };
        localStorage.setItem('pixelforge_user', JSON.stringify(currentUser));
        enterApp();
    }
}

function doLogout() {
    if (supabase) supabase.auth.signOut();
    localStorage.removeItem('pixelforge_user');
    localStorage.removeItem('pixelforge_chat');
    currentUser = null;
    chatHistory = [];
    document.getElementById('userMenu').style.display = 'none';
    document.getElementById('authOverlay').classList.remove('hidden');
    document.getElementById('authOverlay').style.display = 'flex';
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('signupEmail').value = '';
    document.getElementById('signupPassword').value = '';
    hideAuthMessage();
    showLogin();
}

function enterApp() {
    document.getElementById('authOverlay').classList.add('hidden');
    document.getElementById('authOverlay').style.display = 'none';
    updateUserUI();
    renderImages();
    loadFromSupabase();
}

function updateUserUI() {
    if (!currentUser) return;
    var email = currentUser.email || 'User';
    var initial = email[0].toUpperCase();
    document.getElementById('userAvatar').textContent = initial;
    document.getElementById('userName').textContent = currentUser.name || email.split('@')[0];
}

function toggleUserMenu() {
    var menu = document.getElementById('userMenu');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('.sidebar-footer')) {
        document.getElementById('userMenu').style.display = 'none';
    }
});

function checkSession() {
    // If Supabase is connected, check for real session first
    if (supabase) {
        supabase.auth.getSession().then(function(result) {
            if (result.data.session) {
                currentUser = result.data.session.user;
                enterApp();
                return;
            }
            // No Supabase session - check if old demo user exists
            var saved = localStorage.getItem('pixelforge_user');
            if (saved) {
                var user = JSON.parse(saved);
                // If it's a demo user and Supabase is available, force logout
                if (user.id && user.id.startsWith('demo')) {
                    console.log('Demo user found with Supabase available - clearing for real auth');
                    localStorage.removeItem('pixelforge_user');
                    localStorage.removeItem('pixelforge_chat');
                    showLoginScreen();
                } else {
                    currentUser = user;
                    enterApp();
                }
            } else {
                showLoginScreen();
            }
        });
    } else {
        // No Supabase - use demo mode
        var saved = localStorage.getItem('pixelforge_user');
        if (saved) {
            try { currentUser = JSON.parse(saved); enterApp(); } catch(e) { localStorage.removeItem('pixelforge_user'); showLoginScreen(); }
        } else {
            showLoginScreen();
        }
    }
}

function showLoginScreen() {
    document.getElementById('authOverlay').classList.remove('hidden');
    document.getElementById('authOverlay').style.display = 'flex';
}

// ===== SUPABASE SYNC =====
function loadFromSupabase() {
    if (!supabase || !currentUser) return;
    supabase.from('generations').select('data').eq('user_id', currentUser.id).single().then(function(result) {
        if (result.data && result.data.data) {
            generations = result.data.data;
            localStorage.setItem('pixelforge_generations', JSON.stringify(generations));
            renderImages();
        }
    });
}

function saveToSupabase() {
    if (!supabase || !currentUser) return;
    supabase.from('generations').upsert({
        user_id: currentUser.id,
        data: generations,
        updated_at: new Date().toISOString()
    }).then(function() { console.log('Saved to Supabase'); });
}

// ===== EXPORT =====
function showExportModal() {
    document.getElementById('exportModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.getElementById('userMenu').style.display = 'none';
}

function hideExportModal() {
    document.getElementById('exportModal').style.display = 'none';
    document.body.style.overflow = '';
}

function exportAsText() {
    var text = 'PixelForge AI - Chat Export\n========================\n\nDate: ' + new Date().toLocaleString() + '\n\n';
    for (var i = 0; i < chatHistory.length; i++) {
        var role = chatHistory[i].role === 'user' ? 'You' : 'PixelForge';
        text += role + ':\n' + chatHistory[i].content + '\n\n';
    }
    downloadFile(text, 'pixelforge-chat.txt', 'text/plain');
    hideExportModal();
}

function exportAsJSON() {
    var data = { app: 'PixelForge AI', exportedAt: new Date().toISOString(), user: currentUser ? currentUser.email : 'anonymous', messages: chatHistory };
    downloadFile(JSON.stringify(data, null, 2), 'pixelforge-chat.json', 'application/json');
    hideExportModal();
}

function exportAsMarkdown() {
    var md = '# PixelForge AI - Chat Export\n\n**Date:** ' + new Date().toLocaleString() + '\n\n---\n\n';
    for (var i = 0; i < chatHistory.length; i++) {
        var role = chatHistory[i].role === 'user' ? 'You' : 'PixelForge';
        md += '## ' + role + '\n\n' + chatHistory[i].content + '\n\n---\n\n';
    }
    downloadFile(md, 'pixelforge-chat.md', 'text/markdown');
    hideExportModal();
}

function copyToClipboard() {
    var text = '';
    for (var i = 0; i < chatHistory.length; i++) {
        var role = chatHistory[i].role === 'user' ? 'You' : 'PixelForge';
        text += role + ': ' + chatHistory[i].content + '\n\n';
    }
    navigator.clipboard.writeText(text).then(function() { alert('Chat copied to clipboard!'); hideExportModal(); })
        .catch(function() { alert('Could not copy. Try exporting as a file.'); });
}

function downloadFile(content, filename, type) {
    var blob = new Blob([content], { type: type });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
}

document.getElementById('exportModal').addEventListener('click', function(e) {
    if (e.target === document.getElementById('exportModal')) hideExportModal();
});

// ===== NAVIGATION =====
function switchView(view) {
    document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
    document.querySelectorAll('.view').forEach(function(v) { v.classList.remove('active'); });
    if (view === 'chat') { document.getElementById('navChat').classList.add('active'); document.getElementById('chatView').classList.add('active'); }
    else if (view === 'images') { document.getElementById('navImages').classList.add('active'); document.getElementById('imagesView').classList.add('active'); }
    else if (view === 'library') { document.getElementById('navLibrary').classList.add('active'); document.getElementById('libraryView').classList.add('active'); }
    if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

function newChat() {
    document.getElementById('welcomeScreen').style.display = 'block';
    document.getElementById('chatMessages').classList.remove('active');
    document.getElementById('chatMessages').innerHTML = '';
    document.getElementById('promptInput').value = '';
    chatHistory = [];
    switchView('chat');
}

function newNotebook() { alert('Notebooks coming soon!'); }

// ===== CHAT & IMAGE =====
function isImagePrompt(text) {
    return /image|picture|photo|generate|create|draw|paint|art|design|portrait|landscape|scene|character|logo|illustration|render|anime|cartoon|realistic|fantasy|cyberpunk|abstract|watercolor|sketch/.test(text.toLowerCase());
}

function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleInput(); }
}

function handleInput() {
    var prompt = document.getElementById('promptInput').value.trim();
    if (!prompt || isGenerating || isChatting) return;
    document.getElementById('welcomeScreen').style.display = 'none';
    document.getElementById('chatMessages').classList.add('active');
    addUserMessage(prompt);
    if (isImagePrompt(prompt)) generateImage(prompt);
    else sendChatMessage(prompt);
    document.getElementById('promptInput').value = '';
}

function addUserMessage(text) {
    var msg = document.createElement('div');
    msg.className = 'message';
    var initial = currentUser ? (currentUser.email[0] || 'U').toUpperCase() : 'U';
    msg.innerHTML = '<div class="message-avatar user">' + initial + '</div><div class="message-body"><p>' + escapeHtml(text) + '</p></div>';
    document.getElementById('chatMessages').appendChild(msg);
    document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight;
}

// ===== AI CHAT =====
async function sendChatMessage(prompt) {
    isChatting = true;

    var aiMsg = document.createElement('div');
    aiMsg.className = 'message';
    aiMsg.id = 'chatResponse';
    aiMsg.innerHTML = '<div class="message-avatar ai">🔮</div><div class="message-body"><div class="typing-dots"><span></span><span></span><span></span></div></div>';
    document.getElementById('chatMessages').appendChild(aiMsg);
    document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight;

    var responseText = '';

    if (HAS_OPENROUTER) {
        try {
            var res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
                        { role: 'system', content: 'You are PixelForge AI, a creative assistant. Be friendly and encouraging.' },
                        ...chatHistory.map(function(h) { return { role: h.role, content: h.content }; }),
                        { role: 'user', content: prompt }
                    ]
                })
            });
            var data = await res.json();
            responseText = data.choices?.[0]?.message?.content || getDemoResponse(prompt);
        } catch (e) {
            responseText = await tryFreeAIChat(prompt);
        }
    } else {
        responseText = await tryFreeAIChat(prompt);
    }

    chatHistory.push({ role: 'user', content: prompt });
    chatHistory.push({ role: 'assistant', content: responseText });
    if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
    localStorage.setItem('pixelforge_chat', JSON.stringify(chatHistory));

    var response = document.getElementById('chatResponse');
    response.innerHTML = '<div class="message-avatar ai">🔮</div><div class="message-body"><p>' + escapeHtml(responseText) + '</p></div>';

    isChatting = false;
    document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight;
}

// Hugging Face Inference API (free tier - no key needed for basic use)
// Fallback chain: OpenRouter → Hugging Face → Demo mode
async function tryFreeAIChat(prompt) {
    // Try Hugging Face first (free, no key for basic models)
    try {
        var res = await fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                inputs: '<s>[INST] You are PixelForge AI, a helpful creative assistant. ' + prompt + ' [/INST]',
                parameters: { max_new_tokens: 250, temperature: 0.7 }
            })
        });
        if (res.ok) {
            var data = await res.json();
            var text = data[0]?.generated_text || '';
            // Extract only the response part after [/INST]
            var parts = text.split('[/INST]');
            if (parts.length > 1) {
                var response = parts[1].trim();
                if (response.length > 10) return response;
            }
        }
    } catch (e) {
        console.log('Hugging Face failed:', e.message);
    }

    // Fallback to demo mode
    return getDemoResponse(prompt);
}

// ===== IMAGE GENERATION (Pollinations - free!) =====
function generateImage(prompt) {
    isGenerating = true;

    var aiMsg = document.createElement('div');
    aiMsg.className = 'message';
    aiMsg.id = 'aiResponse';
    aiMsg.innerHTML = '<div class="message-avatar ai">🔮</div><div class="message-body"><p>Creating your masterpiece...</p><div class="image-loading">Generating image...</div></div>';
    document.getElementById('chatMessages').appendChild(aiMsg);
    document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight;

    var encodedPrompt = encodeURIComponent(prompt);
    var seed = Math.floor(Math.random() * 100000);
    var imageUrl = 'https://image.pollinations.ai/prompt/' + encodedPrompt + '?width=1024&height=1024&seed=' + seed + '&nologo=true&enhance=true';

    var img = new Image();
    img.onload = function() {
        var response = document.getElementById('aiResponse');
        var html = '<div class="message-avatar ai">🔮</div>';
        html += '<div class="message-body">';
        html += '<p>Here is what I created for you:</p>';
        html += '<div class="message-image">';
        html += '<img src="' + imageUrl + '" alt="' + escapeHtml(prompt) + '" onclick="downloadImage(\'' + imageUrl + '\', \'' + escapeHtml(prompt) + '\')">';
        html += '</div>';
        html += '<p style="margin-top:8px;font-size:12px;color:#9aa0a6;">Click image to download</p>';
        html += '</div>';
        response.innerHTML = html;

        var gen = { id: Date.now(), prompt: prompt, imageUrl: imageUrl, seed: seed, timestamp: new Date().toISOString() };
        generations.unshift(gen);
        localStorage.setItem('pixelforge_generations', JSON.stringify(generations));
        renderImages();
        saveToSupabase();

        isGenerating = false;
        document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight;
    };

    img.onerror = function() {
        var response = document.getElementById('aiResponse');
        response.innerHTML = '<div class="message-avatar ai">🔮</div><div class="message-body"><p style="color:#d93025;">Oops! Something went wrong. Please try again.</p></div>';
        isGenerating = false;
    };

    img.src = imageUrl;
}

// ===== GALLERY =====
function renderImages() {
    var grid = document.getElementById('imagesGrid');
    var empty = document.getElementById('imagesEmpty');

    if (generations.length === 0) {
        grid.innerHTML = '';
        empty.style.display = 'flex';
        return;
    }

    empty.style.display = 'none';
    var html = '';
    for (var i = 0; i < generations.length; i++) {
        var g = generations[i];
        html += '<div class="image-card" onclick="downloadImage(\'' + g.imageUrl + '\', \'' + escapeHtml(g.prompt) + '\')">';
        html += '<img src="' + g.imageUrl + '" alt="' + escapeHtml(g.prompt) + '" loading="lazy">';
        html += '<div class="image-card-info"><p>' + escapeHtml(g.prompt) + '</p><div class="date">' + formatDate(g.timestamp) + '</div></div>';
        html += '</div>';
    }
    grid.innerHTML = html;
}

function downloadImage(url, filename) {
    var a = document.createElement('a');
    a.href = url;
    a.download = 'pixelforge-' + filename.substring(0, 30).replace(/[^a-z0-9]/gi, '-') + '.png';
    a.target = '_blank';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// ===== UPGRADE MODAL =====
function showUpgrade() {
    document.getElementById('upgradeModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function hideUpgrade() {
    document.getElementById('upgradeModal').style.display = 'none';
    document.body.style.overflow = '';
}

function switchBilling(type, btn) {
    currentBilling = type;
    document.querySelectorAll('.billing-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    document.querySelectorAll('.plan-price .amount').forEach(function(el) { el.textContent = el.getAttribute('data-' + type); });
}

document.getElementById('upgradeModal').addEventListener('click', function(e) {
    if (e.target === document.getElementById('upgradeModal')) hideUpgrade();
});

// ===== UTILITIES =====
function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(isoString) {
    var date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ===== INIT =====
checkSession();
renderImages();

window.addEventListener('resize', function() {
    if (window.innerWidth > 768) document.getElementById('sidebar').classList.remove('open');
});

console.log('PixelForge AI loaded!');
console.log('Supabase:', HAS_SUPABASE ? 'Connected' : 'Demo mode');
console.log('OpenRouter:', HAS_OPENROUTER ? 'Connected' : 'Using Pollinations text or Demo');


function switchAccount() {
    // Clear everything and show login screen
    if (supabase) supabase.auth.signOut();
    localStorage.removeItem('pixelforge_user');
    localStorage.removeItem('pixelforge_chat');
    localStorage.removeItem('pixelforge_generations');
    currentUser = null;
    chatHistory = [];
    generations = [];
    document.getElementById('userMenu').style.display = 'none';
    document.getElementById('authOverlay').classList.remove('hidden');
    document.getElementById('authOverlay').style.display = 'flex';
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('signupEmail').value = '';
    document.getElementById('signupPassword').value = '';
    hideAuthMessage();
    showLogin();
    renderImages();
}
