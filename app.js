// ===== CONFIG =====
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

let supabase = null;
try {
    if (window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (e) {
    console.log('Supabase not configured - running in demo mode');
}

// ===== STATE =====
let currentUser = null;
let isGenerating = false;
let generations = JSON.parse(localStorage.getItem('pixelforge_generations') || '[]');
let currentBilling = 'monthly';

// ===== DOM ELEMENTS =====
const authOverlay = document.getElementById('authOverlay');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const authMessage = document.getElementById('authMessage');
const mainApp = document.getElementById('mainApp');
const sidebar = document.getElementById('sidebar');
const promptInput = document.getElementById('promptInput');
const chatMessages = document.getElementById('chatMessages');
const welcomeScreen = document.getElementById('welcomeScreen');
const upgradeModal = document.getElementById('upgradeModal');
const userMenu = document.getElementById('userMenu');

// ===== AUTH FUNCTIONS =====
function switchAuthTab(tab, btn) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');

    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
    } else {
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
    }
    hideAuthMessage();
}

function showAuthMessage(text, type) {
    authMessage.textContent = text;
    authMessage.className = 'auth-message ' + type;
}

function hideAuthMessage() {
    authMessage.className = 'auth-message';
    authMessage.style.display = 'none';
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    btn.disabled = true;

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            showAuthMessage(error.message, 'error');
            btn.disabled = false;
        } else {
            currentUser = data.user;
            enterApp();
        }
    } else {
        // Demo mode
        currentUser = { email, id: 'demo-' + Date.now() };
        localStorage.setItem('pixelforge_user', JSON.stringify(currentUser));
        enterApp();
    }
});

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('signupBtn');
    btn.disabled = true;

    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;

    if (supabase) {
        const { data, error } = await supabase.auth.signUp({
            email, password,
            options: { emailRedirectTo: window.location.href }
        });
        if (error) {
            showAuthMessage(error.message, 'error');
        } else {
            showAuthMessage('✅ Check your email to confirm your account!', 'success');
        }
    } else {
        currentUser = { email, id: 'demo-' + Date.now() };
        localStorage.setItem('pixelforge_user', JSON.stringify(currentUser));
        enterApp();
    }
    btn.disabled = false;
});

async function signInWithGoogle() {
    if (supabase) {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.href }
        });
        if (error) showAuthMessage(error.message, 'error');
    } else {
        currentUser = { email: 'google@user.com', id: 'demo-google' };
        localStorage.setItem('pixelforge_user', JSON.stringify(currentUser));
        enterApp();
    }
}

async function logout() {
    if (supabase) await supabase.auth.signOut();
    localStorage.removeItem('pixelforge_user');
    currentUser = null;
    userMenu.classList.add('hidden');
    authOverlay.classList.remove('hidden');
    loginForm.reset();
    signupForm.reset();
    hideAuthMessage();
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
    document.getElementById('userName').textContent = email.split('@')[0];
}

function toggleUserMenu() {
    userMenu.classList.toggle('hidden');
}

// Close user menu when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.sidebar-footer')) {
        userMenu.classList.add('hidden');
    }
});

// Check session on load
async function checkSession() {
    const saved = localStorage.getItem('pixelforge_user');
    if (saved) {
        currentUser = JSON.parse(saved);
        enterApp();
        return;
    }
    if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            currentUser = session.user;
            enterApp();
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

    // Close sidebar on mobile
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
    switchView('chat');
}

function newNotebook() {
    alert('Notebooks coming soon!');
}

// ===== IMAGE GENERATION =====
function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        generateImage();
    }
}

async function generateImage() {
    const prompt = promptInput.value.trim();
    if (!prompt || isGenerating) return;

    isGenerating = true;

    // Hide welcome, show chat
    welcomeScreen.style.display = 'none';
    chatMessages.classList.add('active');

    // User message
    const userMsg = document.createElement('div');
    userMsg.className = 'message';
    userMsg.innerHTML = `
        <div class="message-avatar user">${currentUser ? (currentUser.email[0] || 'U').toUpperCase() : 'U'}</div>
        <div class="message-body"><p>${escapeHtml(prompt)}</p></div>
    `;
    chatMessages.appendChild(userMsg);

    // AI loading
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

    // Generate with Pollinations (FREE)
    const encodedPrompt = encodeURIComponent(prompt);
    const seed = Math.floor(Math.random() * 100000);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${seed}&nologo=true&enhance=true`;

    // Preload
    const img = new Image();
    img.onload = () => {
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

        // Save generation
        const gen = {
            id: Date.now(),
            prompt,
            imageUrl,
            seed,
            timestamp: new Date().toISOString()
        };
        generations.unshift(gen);
        localStorage.setItem('pixelforge_generations', JSON.stringify(generations));
        renderImages();

        isGenerating = false;
        promptInput.value = '';
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    img.onerror = () => {
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

function renderImages() {
    const grid = document.getElementById('imagesGrid');
    const empty = document.getElementById('imagesEmpty');

    if (generations.length === 0) {
        grid.innerHTML = '';
        empty.style.display = 'flex';
        return;
    }

    empty.style.display = 'none';
    grid.innerHTML = generations.map(g => `
        <div class="image-card" onclick="downloadImage('${g.imageUrl}', '${escapeHtml(g.prompt)}')">
            <img src="${g.imageUrl}" alt="${escapeHtml(g.prompt)}" loading="lazy">
            <div class="image-card-info">
                <p>${escapeHtml(g.prompt)}</p>
                <div class="date">${formatDate(g.timestamp)}</div>
            </div>
        </div>
    `).join('');
}

function downloadImage(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `pixelforge-${filename.substring(0, 30).replace(/[^a-z0-9]/gi, '-')}.png`;
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
    document.querySelectorAll('.billing-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Update prices
    document.querySelectorAll('.plan-price .amount').forEach(el => {
        el.textContent = el.getAttribute('data-' + type);
    });
}

// Close modal on overlay click
upgradeModal.addEventListener('click', (e) => {
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

// ===== INIT =====
renderImages();

// Handle resize
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        sidebar.classList.remove('open');
    }
});