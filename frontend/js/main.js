import './background.js';

const API_BASE = 'http://localhost:5000/api';

let currentUser = null;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    fetchProjects();
    fetchAnalytics();
    setupStaticListeners();
    checkAuth();
    checkBackendHealth();
});

async function checkBackendHealth() {
    try {
        const res = await fetch(`${API_BASE}/projects?limit=1`);
        if (!res.ok) throw new Error('Backend not responding correctly');
        console.log('Backend connected successfully');
    } catch (err) {
        console.error('Backend connection failed:', err);
        alert('Warning: Backend server (localhost:5000) is not reachable. Please ensure the server is running.');
    }
}

function setupStaticListeners() {
    document.getElementById('analyze-btn').addEventListener('click', generateInnovation);
    document.getElementById('repo-search').addEventListener('input', handleSearchInput);
    document.getElementById('filter-domain').addEventListener('change', fetchProjects);
    document.getElementById('filter-year').addEventListener('change', fetchProjects);

    document.querySelector('.close-modal').addEventListener('click', hideAuthModal);
    document.getElementById('to-signup').addEventListener('click', () => showAuthModal('signup'));
    document.getElementById('to-login').addEventListener('click', () => showAuthModal('login'));

    document.getElementById('login-submit').addEventListener('click', login);
    document.getElementById('signup-submit').addEventListener('click', signup);

    document.getElementById('google-login').addEventListener('click', (e) => {
        console.log('Google Login Clicked');
        loginWithGoogle();
    });
    document.getElementById('google-signup').addEventListener('click', (e) => {
        console.log('Google Signup Clicked');
        loginWithGoogle();
    });

    // Forgot Password Listeners
    document.getElementById('to-forgot-password').addEventListener('click', () => showAuthModal('forgot'));
    document.querySelectorAll('.back-to-login').forEach(btn => {
        btn.addEventListener('click', () => showAuthModal('login'));
    });
    document.getElementById('forgot-submit').addEventListener('click', handleForgotPassword);
    document.getElementById('reset-submit').addEventListener('click', handleResetPassword);

    // Hero Section Buttons Integration
    document.querySelector('.hero-btns .btn-primary').addEventListener('click', () => {
        document.getElementById('generate').scrollIntoView({ behavior: 'smooth' });
    });
    document.querySelector('.hero-btns .btn-outline').addEventListener('click', () => {
        document.getElementById('repository').scrollIntoView({ behavior: 'smooth' });
    });

    // Close suggestions on click outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-bar')) {
            document.getElementById('search-suggestions').classList.add('hidden');
        }
    });

    // Initial Navbar listeners
    setupAuthListeners();
}

function setupAuthListeners() {
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (loginBtn) loginBtn.onclick = () => showAuthModal('login');
    if (signupBtn) signupBtn.onclick = () => showAuthModal('signup');
    if (logoutBtn) logoutBtn.onclick = logout;
}

// --- Auth Functions ---

function hideAuthModal() {
    document.getElementById('auth-modal').classList.add('hidden');
}

function showAuthModal(type) {
    document.getElementById('auth-modal').classList.remove('hidden');
    const forms = ['login-form', 'signup-form', 'forgot-password-form', 'reset-password-form'];
    forms.forEach(f => {
        const el = document.getElementById(f);
        if (el) el.classList.add('hidden');
    });

    if (type === 'signup') document.getElementById('signup-form').classList.remove('hidden');
    else if (type === 'forgot') document.getElementById('forgot-password-form').classList.remove('hidden');
    else if (type === 'reset') document.getElementById('reset-password-form').classList.remove('hidden');
    else document.getElementById('login-form').classList.remove('hidden');
}

function validateEmail(email) {
    return String(email)
        .toLowerCase()
        .match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
}

async function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!validateEmail(email)) return alert('Please enter a valid email address.');

    console.log('Attempting Login for:', email);
    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        console.log('Login Response:', data);
        if (res.ok) {
            currentUser = data.user;
            localStorage.setItem('user', JSON.stringify(currentUser));
            updateAuthUI();
            hideAuthModal();
            alert('Login Successful! Welcome back.');
        } else {
            alert('Login Failed: ' + data.message);
        }
    } catch (err) {
        console.error('Login Error:', err);
        alert('Network Error: Could not connect to the backend server at ' + API_BASE + '. Please ensure the server is running on port 5000.');
    }
}

async function signup() {
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    if (!name || !email || !password) return alert('Please fill all fields');
    if (!validateEmail(email)) return alert('Please enter a valid email address.');

    console.log('Attempting Signup for:', email);
    try {
        const res = await fetch(`${API_BASE}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        console.log('Signup Response:', data);
        if (res.ok) {
            alert('Account created successfully! You can now login.');
            showAuthModal('login');
        } else {
            alert('Signup Failed: ' + data.message);
        }
    } catch (err) {
        console.error('Signup Error:', err);
        alert('Network Error: Could not connect to the backend server. Please ensure the server is running.');
    }
}

async function handleForgotPassword() {
    const email = document.getElementById('forgot-email').value;
    if (!validateEmail(email)) return alert('Please enter a valid email address.');

    try {
        const res = await fetch(`${API_BASE}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (res.ok) {
            alert(data.message + " (Simulation: Token is " + data.token + ")");
            showAuthModal('reset');
            document.getElementById('reset-token').value = data.token;
        } else {
            alert(data.message);
        }
    } catch (err) { console.error(err); }
}

async function handleResetPassword() {
    const email = document.getElementById('forgot-email').value;
    const token = document.getElementById('reset-token').value;
    const newPassword = document.getElementById('reset-new-password').value;

    if (!newPassword) return alert('Please enter a new password.');

    try {
        const res = await fetch(`${API_BASE}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, token, newPassword })
        });
        const data = await res.json();
        if (res.ok) {
            alert(data.message);
            showAuthModal('login');
        } else {
            alert(data.message);
        }
    } catch (err) { console.error(err); }
}

async function loginWithGoogle() {
    console.log('--- Google Login Sequence Started ---');
    // Simulated Google Callback Data
    const mockGoogleData = {
        name: 'Google User',
        email: 'user@gmail.com',
        googleId: 'google_' + Date.now()
    };

    try {
        const res = await fetch(`${API_BASE}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mockGoogleData)
        });
        const data = await res.json();
        console.log('Google Auth Response:', data);
        if (res.ok) {
            currentUser = data.user;
            localStorage.setItem('user', JSON.stringify(currentUser));
            updateAuthUI();

            console.log('Hiding Auth Modal now...');
            hideAuthModal();

            alert(`Welcome, ${currentUser.name}! You are now signed in via Google.`);
        } else {
            alert('Google Auth Failed: ' + data.message);
        }
    } catch (err) {
        console.error('Google Auth Error:', err);
        alert('Network Error: Could not connect to the backend server. Please ensures it is running.');
    }
}

function checkAuth() {
    const saved = localStorage.getItem('user');
    if (saved) {
        currentUser = JSON.parse(saved);
        updateAuthUI();
    }
}

function updateAuthUI() {
    const authContainer = document.querySelector('.nav-auth');
    if (currentUser) {
        authContainer.innerHTML = `
            <span style="margin-right: 15px; color: var(--accent)">Hi, ${currentUser.name}</span>
            <button class="btn btn-outline" id="logout-btn">Logout</button>
        `;
    } else {
        authContainer.innerHTML = `
            <button class="btn btn-outline" id="login-btn">Login</button>
            <button class="btn btn-primary" id="signup-btn">Sign Up</button>
        `;
    }
    setupAuthListeners();
}

function logout() {
    currentUser = null;
    localStorage.removeItem('user');
    updateAuthUI();
}

// --- Search & Suggestions ---

function handleSearchInput(e) {
    const q = e.target.value;
    if (q.length < 2) {
        const list = document.getElementById('search-suggestions');
        if (list) list.classList.add('hidden');
        return;
    }
    fetchSuggestions(q);
    debounce(fetchProjects, 500)();
}

async function fetchSuggestions(q) {
    try {
        const res = await fetch(`${API_BASE}/projects/suggestions?q=${q}`);
        const data = await res.json();
        renderSuggestions(data);
    } catch (err) { console.error(err); }
}

function renderSuggestions(data) {
    const list = document.getElementById('search-suggestions');
    if (!list) return;

    if (data.length === 0) {
        list.classList.add('hidden');
        return;
    }
    list.classList.remove('hidden');
    list.innerHTML = data.map(item => `
        <div class="suggestion-item" data-id="${item.id}">
            <strong>${item.title}</strong>
            <span class="domain-tag">${item.domain}</span>
        </div>
    `).join('');

    list.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
            document.getElementById('repo-search').value = item.querySelector('strong').textContent;
            list.classList.add('hidden');
            fetchProjects();
        });
    });
}

// --- API Calls ---

async function fetchProjects() {
    const searchEl = document.getElementById('repo-search');
    const domainEl = document.getElementById('filter-domain');
    const yearEl = document.getElementById('filter-year');

    if (!searchEl || !domainEl || !yearEl) return;

    const search = searchEl.value;
    const domain = domainEl.value;
    const year = yearEl.value;

    const params = new URLSearchParams({ search, domain, year });
    try {
        const response = await fetch(`${API_BASE}/projects?${params}`);
        const projects = await response.json();
        renderProjects(projects);
    } catch (err) {
        console.error('Error fetching projects:', err);
    }
}

async function generateInnovation() {
    const text = document.getElementById('project-input').value;
    if (!text) return;

    if (!currentUser) {
        alert('Please login to use the AI Generator');
        showAuthModal('login');
        return;
    }

    const loader = document.getElementById('loader');
    const outputSection = document.getElementById('output-section');

    loader.classList.remove('hidden');
    outputSection.classList.add('hidden');

    try {
        // Simulated AI delay
        await new Promise(r => setTimeout(r, 2000));

        const response = await fetch(`${API_BASE}/projects/generate-idea`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_title: text, problem_statement: text })
        });
        const innovation = await response.json();
        renderInnovation(innovation);
    } catch (err) {
        console.error('Error generating innovation:', err);
    } finally {
        loader.classList.add('hidden');
    }
}

async function fetchAnalytics() {
    try {
        const response = await fetch(`${API_BASE}/analytics`);
        const data = await response.json();
        const totalEl = document.getElementById('total-projects');
        if (totalEl) totalEl.textContent = data.totalProjects;
        renderCharts(data);
    } catch (err) {
        console.error('Error fetching analytics:', err);
    }
}

// --- Rendering ---

function renderProjects(projects) {
    const grid = document.getElementById('project-grid');
    if (!grid) return;

    grid.innerHTML = projects.map(p => `
        <div class="project-card glass glass-hover">
            <div class="project-meta">
                <span>${p.domain}</span>
                <span class="innovation-badge">${p.innovation_score}% Innovation</span>
            </div>
            <h3>${p.project_title}</h3>
            <p>${p.limitations}</p>
            <div style="margin-top: 15px; color: var(--text-dim); font-size: 0.85rem">
                <strong>Algorithm:</strong> ${p.algorithms_used.join(', ')}
            </div>
            <button class="btn btn-outline" style="margin-top: 15px; width: 100%" onclick="alert('Domain: ${p.domain}\\nAlgorithm: ${p.algorithms_used}\\nGap: ${p.research_gap}')">View Details</button>
        </div>
    `).join('');
}

function renderInnovation(data) {
    const outputSection = document.getElementById('output-section');
    if (!outputSection) return;

    outputSection.classList.remove('hidden');
    outputSection.innerHTML = `
        <div class="innovation-result glass">
            <div class="result-header">
                <h3 class="gradient-text">${data.enhanced_title}</h3>
                <div class="score-pill">Score: ${data.innovation_score}/100</div>
            </div>
            <div class="result-body">
                <div class="result-item">
                    <h4><i class="fas fa-lightbulb"></i> Research Gap Identified</h4>
                    <p>${data.research_gap}</p>
                </div>
                <div class="result-item">
                    <h4><i class="fas fa-code"></i> Suggested Architecture</h4>
                    <p><strong>Algorithms:</strong> ${data.suggested_algorithms.join(', ')}</p>
                    <p><strong>Tech Stack:</strong> ${data.suggested_technologies.join(', ')}</p>
                </div>
                <div class="result-item">
                    <h4><i class="fas fa-chart-line"></i> Scalability & Future</h4>
                    <p>${data.scalability_suggestion}</p>
                </div>
            </div>
            <div class="confidence-bar">
                <div class="bar-fill" style="width: ${data.ai_confidence}%"></div>
                <span>AI Confidence: ${data.ai_confidence}%</span>
            </div>
        </div>
    `;
}

function renderCharts(data) {
    const domainCanvas = document.getElementById('domain-chart');
    const trendCanvas = document.getElementById('trend-chart');
    const algoCanvas = document.getElementById('algo-chart');

    if (!domainCanvas || !trendCanvas || !algoCanvas) return;

    const ctxDomain = domainCanvas.getContext('2d');
    new Chart(ctxDomain, {
        type: 'doughnut',
        data: {
            labels: data.domainDistribution.map(d => d._id),
            datasets: [{
                data: data.domainDistribution.map(d => d.count),
                backgroundColor: ['#8b5cf6', '#3b82f6', '#06b6d4', '#ec4899', '#f59e0b']
            }]
        },
        options: { plugins: { legend: { labels: { color: 'white' } } }, cutout: '70%' }
    });

    const ctxAlgo = algoCanvas.getContext('2d');
    new Chart(ctxAlgo, {
        type: 'bar',
        data: {
            labels: data.algorithmUsage.map(a => a._id),
            datasets: [{
                label: 'Usage Count',
                data: data.algorithmUsage.map(a => a.count),
                backgroundColor: '#3b82f6'
            }]
        },
        options: {
            indexAxis: 'y',
            scales: {
                y: { ticks: { color: 'white', font: { size: 10 } } },
                x: { ticks: { color: 'white' }, grid: { color: 'rgba(255,255,255,0.1)' } }
            },
            plugins: { legend: { display: false } }
        }
    });

    const ctxTrend = trendCanvas.getContext('2d');
    new Chart(ctxTrend, {
        type: 'line',
        data: {
            labels: data.innovationTrend.map(t => t._id),
            datasets: [{
                label: 'Innovation Score',
                data: data.innovationTrend.map(t => t.avgScore),
                borderColor: '#06b6d4',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(6, 182, 212, 0.1)'
            }]
        },
        options: { scales: { y: { ticks: { color: 'white' } }, x: { ticks: { color: 'white' } } } }
    });
}

// --- Utils ---
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Global Exports
window.fetchProjects = fetchProjects;
window.login = login;
window.signup = signup;
window.logout = logout;
window.showAuthModal = showAuthModal;
window.hideAuthModal = hideAuthModal;
window.loginWithGoogle = loginWithGoogle;
