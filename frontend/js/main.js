import './background.js';

const API_BASE = '/api';

let currentUser = null;
let authToken = localStorage.getItem('token') || null;
let isSemanticSearch = false;

function getAuthHeader() {
    return authToken ? { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

// --- Global Error Handling ---
window.onerror = function (msg, url, line, col, error) {
    console.error('GLOBAL ERROR:', msg, 'at', url, ':', line);
    alert('System Error: ' + msg + '\nPlease check console for details.');
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    fetchProjects();
    fetchAnalytics();
    setupStaticListeners();
    setupDashboardTabs();
    checkBackendHealth();
    initGoogleAuth();
});

async function checkBackendHealth() {
    try {
        const res = await fetch(`${API_BASE}/projects?limit=1`);
        if (res.ok) {
            console.log('✅ Backend connected');
        } else {
            throw new Error('Backend responded with ' + res.status);
        }
    } catch (err) {
        console.error('❌ Backend connection failed:', err);
        const warning = document.createElement('div');
        warning.style = "position: fixed; bottom: 20px; right: 20px; background: #ef4444; color: white; padding: 10px 20px; border-radius: 8px; z-index: 9999; box-shadow: 0 0 20px rgba(0,0,0,0.5);";
        warning.innerHTML = "<i class='fas fa-exclamation-triangle'></i> Backend Connection Issue. Please check the server.";
        document.body.appendChild(warning);
        setTimeout(() => warning.remove(), 10000);
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

    // Semantic Toggle
    const semanticToggle = document.getElementById('semantic-toggle');
    if (semanticToggle) {
        semanticToggle.addEventListener('change', (e) => {
            isSemanticSearch = e.target.checked;
            document.getElementById('search-mode-text').textContent = isSemanticSearch ? 'Semantic Search (AI)' : 'Keyword Search';
            handleSearchInput();
        });
    }

    // Project Upload
    const uploadBtn = document.getElementById('upload-submit');
    if (uploadBtn) uploadBtn.addEventListener('click', handleProjectUpload);

    // Chatbot
    const chatSend = document.getElementById('chat-send');
    const chatInput = document.getElementById('chat-input');
    if (chatSend && chatInput) {
        chatSend.onclick = handleChat;
        chatInput.onkeypress = (e) => { if (e.key === 'Enter') handleChat(); };
    }

    // Auth
    document.getElementById('to-forgot-password').addEventListener('click', (e) => {
        e.preventDefault();
        showAuthModal('forgot');
    });
    document.querySelectorAll('.back-to-login').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            showAuthModal('login');
        });
    });
    document.getElementById('forgot-submit').addEventListener('click', async () => {
        const email = document.getElementById('forgot-email').value;
        if (!email) return alert('Enter your email');

        try {
            console.log('Requesting reset for:', email);
            const res = await fetch(`${API_BASE}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (res.ok) {
                alert(`SUCCESS: Reset link sent to your email!\n\nPROTIP: For this prototype, your reset token is: ${data.token}`);
                showAuthModal('login');
            } else {
                alert('Account not found. Please check the email address.');
            }
        } catch (e) {
            console.error('Forgot password error:', e);
            alert('Forgot password failed. Ensure the server is running.');
        }
    });

    setupAuthListeners();
    setupNavTabListeners();
}

function setupNavTabListeners() {
    const navInsights = document.getElementById('nav-insights');
    const navAssistant = document.getElementById('nav-assistant');

    if (navInsights) {
        navInsights.onclick = (e) => {
            e.preventDefault();
            switchTab('analytics');
            document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth' });
        };
    }

    if (navAssistant) {
        navAssistant.onclick = (e) => {
            e.preventDefault();
            switchTab('chatbot');
            document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth' });
        };
    }
}

function switchTab(tabId) {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // Toggle buttons
    tabBtns.forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
    });

    // Toggle contents
    tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `${tabId}-tab`);
    });

    if (tabId === 'analytics') fetchAnalytics();
}

function setupDashboardTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');

            // Toggle buttons
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Toggle contents
            tabContents.forEach(content => {
                content.classList.toggle('active', content.id === `${tabId}-tab`);
            });

            // Re-render charts if specifically clicking analytics
            if (tabId === 'analytics') fetchAnalytics();
        });
    });
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
    ['login-form', 'signup-form', 'forgot-password-form', 'reset-password-form'].forEach(f => {
        document.getElementById(f)?.classList.add('hidden');
    });

    if (type === 'signup') document.getElementById('signup-form').classList.remove('hidden');
    else if (type === 'forgot') document.getElementById('forgot-password-form').classList.remove('hidden');
    else if (type === 'reset') document.getElementById('reset-password-form').classList.remove('hidden');
    else document.getElementById('login-form').classList.remove('hidden');
}

async function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!email || !password) return alert('Fill all fields');

    try {
        console.log('Logging in...', email);
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
            handleAuthSuccess(data);
            alert(`Welcome, ${currentUser.name}!`);
        } else {
            console.error('Login Error:', data.message);
            alert(data.message || 'Invalid Credentials');
        }
    } catch (err) {
        console.error('Login Fetch Failed:', err);
        alert('Login Failed: Check connection');
    }
}

function handleAuthSuccess(data) {
    currentUser = data.user;
    authToken = data.token;
    localStorage.setItem('user', JSON.stringify(currentUser));
    localStorage.setItem('token', authToken);
    updateAuthUI();
    hideAuthModal();
    fetchProjects();
}

async function handleGoogleAuth(response) {
    try {
        console.log('Google Auth Response received');
        const signupForm = document.getElementById('signup-form');
        const role = (signupForm && !signupForm.classList.contains('hidden'))
            ? document.getElementById('signup-role')?.value
            : document.getElementById('login-role-choice')?.value || 'student';
        const res = await fetch(`${API_BASE}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: response.credential, role })
        });
        const data = await res.json();
        if (res.ok) {
            handleAuthSuccess(data);
            alert(`Google Login Successful! Welcome, ${data.user.name}`);
        } else {
            alert('Google Auth Failed: ' + data.message);
        }
    } catch (err) {
        console.error('Google Auth Error:', err);
        alert('Google Login Failed');
    }
}

async function initGoogleAuth() {
    // Wait for the script to load if it hasn't already
    if (typeof google === 'undefined') {
        setTimeout(initGoogleAuth, 100);
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/auth/google/client-id`);
        const { clientId } = await res.json();

        if (!clientId || clientId.includes('your_google_client_id')) {
            console.warn('Google Client ID not configured');
            const googleBtns = ['google-login', 'google-signup'];
            googleBtns.forEach(id => {
                const btn = document.getElementById(id);
                if (btn) {
                    btn.onclick = () => alert('Google Sign-In is not configured yet. Please add your GOOGLE_CLIENT_ID to the .env file to enable this feature.');
                }
            });
            return;
        }

        google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleAuth
        });

        const googleBtns = ['google-login', 'google-signup'];
        googleBtns.forEach(id => {
            const parent = document.getElementById(id);
            if (parent) {
                google.accounts.id.renderButton(parent, {
                    theme: 'outline',
                    size: 'large',
                    width: parent.offsetWidth
                });
            }
        });
    } catch (e) {
        console.error('Failed to init Google Auth:', e);
    }
}

async function signup() {
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const role = document.getElementById('signup-role')?.value || 'student';

    if (!name || !email || !password) return alert('Fill all fields');

    try {
        console.log('Signing up...', email);
        const res = await fetch(`${API_BASE}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role })
        });
        const data = await res.json();
        if (res.ok) {
            handleAuthSuccess(data);
            alert(`Signup Successful! Welcome, ${data.user.name}`);
        } else {
            console.error('Signup Error:', data.message);
            alert(data.message || 'Signup Failed');
        }
    } catch (err) {
        console.error('Signup Fetch Failed:', err);
        alert('Signup Failed: Check connection');
    }
}

function logout() {
    localStorage.clear();
    location.reload();
}

function checkAuth() {
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (user && token) {
        currentUser = JSON.parse(user);
        authToken = token;
        updateAuthUI();
    }
}

function updateAuthUI() {
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const roleDisplay = document.getElementById('user-role-display');
    const studentSect = document.getElementById('student-actions');
    const teacherSect = document.getElementById('teacher-actions');
    const adminSect = document.getElementById('admin-actions');

    if (currentUser) {
        loginBtn?.classList.add('hidden');
        signupBtn?.classList.add('hidden');
        logoutBtn?.classList.remove('hidden');
        if (roleDisplay) {
            roleDisplay.textContent = `${currentUser.name} (${currentUser.role})`;
            roleDisplay.classList.remove('hidden');
        }

        // Dashboards
        studentSect?.classList.toggle('hidden', currentUser.role !== 'student');
        teacherSect?.classList.toggle('hidden', currentUser.role !== 'teacher' && currentUser.role !== 'admin');
        adminSect?.classList.toggle('hidden', currentUser.role !== 'admin');

        if (currentUser.role === 'teacher' || currentUser.role === 'admin') fetchPendingProjects();
        if (currentUser.role === 'admin') fetchUsersDashboard();
    } else {
        loginBtn?.classList.remove('hidden');
        signupBtn?.classList.remove('hidden');
        logoutBtn?.classList.add('hidden');
        roleDisplay?.classList.add('hidden');
        studentSect?.classList.add('hidden');
        teacherSect?.classList.add('hidden');
        adminSect?.classList.add('hidden');
    }
}

// --- Project Functions ---

async function fetchProjects() {
    const domain = document.getElementById('filter-domain').value;
    const year = document.getElementById('filter-year').value;
    const search = document.getElementById('repo-search').value;

    let url = `${API_BASE}/projects?domain=${domain}&year=${year}&search=${search}`;
    if (isSemanticSearch && search.length > 3) url = `${API_BASE}/projects/semantic-search?query=${search}`;

    try {
        const res = await fetch(url, { headers: getAuthHeader() });
        const projects = await res.json();
        renderProjects(projects);
    } catch (err) { console.error('Fetch Projects failed'); }
}

function renderProjects(projects) {
    const grid = document.getElementById('project-grid');
    grid.innerHTML = '';
    if (!Array.isArray(projects) || projects.length === 0) {
        grid.innerHTML = '<p class="text-center w-full">No projects found.</p>';
        return;
    }

    projects.forEach(p => {
        const card = document.createElement('div');
        card.className = 'project-card glass glass-hover';
        card.innerHTML = `
            <div class="project-header">
                <span class="badge">${p.domain}</span>
                <span class="score">Score: ${p.innovation_score || 0}</span>
            </div>
            <h3>${p.project_title}</h3>
            <p class="limitations">${p.problem_statement.substring(0, 100)}...</p>
            <div class="tech-stack">${(p.technologies_used || []).slice(0, 3).map(t => `<span>${t}</span>`).join('')}</div>
            <button class="btn btn-outline-sm" onclick="window.viewProjectAnalysis('${p.project_id || p._id}')">View Analysis</button>
        `;
        grid.appendChild(card);
    });
}

async function fetchPendingProjects() {
    try {
        const res = await fetch(`${API_BASE}/projects/pending`, { headers: getAuthHeader() });
        const data = await res.json();
        renderPending(data);
    } catch (e) { console.error('Failed to fetch pending projects', e); }
}

function renderPending(projects) {
    const list = document.getElementById('pending-projects-list');
    if (!list) return;
    list.innerHTML = '';
    if (projects.length === 0) {
        list.innerHTML = '<p class="text-center opacity-50 w-full">Great job! All projects have been reviewed.</p>';
        return;
    }

    projects.forEach(p => {
        const card = document.createElement('div');
        card.className = 'review-card glass';
        card.innerHTML = `
            <h3>${p.project_title}</h3>
            <p><strong>Owner:</strong> ${p.owner || 'Student'}</p>
            <p>${p.problem_statement.substring(0, 80)}...</p>
            <div class="badges">
                <span class="score">AI Score: ${p.innovation_score}</span>
            </div>
            <textarea placeholder="Feedback comment..." id="comment-${p._id}" class="review-comment"></textarea>
            <div class="review-actions">
                <button onclick="window.submitReview('${p._id}', 'approved')" class="btn btn-primary" style="padding: 5px 15px;">Approve</button>
                <button onclick="window.submitReview('${p._id}', 'rejected')" class="btn btn-outline" style="padding: 5px 15px; border-color: #ef4444; color: #ef4444;">Reject</button>
            </div>
        `;
        list.appendChild(card);
    });
}

window.submitReview = async (id, status) => {
    const comment = document.getElementById(`comment-${id}`).value;
    try {
        const res = await fetch(`${API_BASE}/projects/${id}/review`, {
            method: 'PATCH',
            headers: getAuthHeader(),
            body: JSON.stringify({ status, teacher_comment: comment })
        });
        if (res.ok) {
            alert(`Project ${status} successfully!`);
            fetchPendingProjects();
            fetchProjects();
        }
    } catch (e) { alert('Review failed'); }
}

async function fetchUsersDashboard() {
    try {
        const res = await fetch(`${API_BASE}/auth/users`, { headers: getAuthHeader() });
        const users = await res.json();
        renderUsers(users);
    } catch (e) {
        console.error('Failed to fetch users:', e);
    }
}

function renderUsers(users) {
    const body = document.getElementById('user-list-body');
    if (!body) return;
    body.innerHTML = '';
    users.forEach(u => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${u.name}</td>
            <td>${u.email}</td>
            <td><span class="badge" style="background: ${u.role === 'admin' ? '#ef4444' : u.role === 'teacher' ? '#3b82f6' : '#8b5cf6'}">${u.role}</span></td>
            <td><button class="btn-danger-sm">Revoke Access</button></td>
        `;
        body.appendChild(row);
    });
}

async function handleSearchInput() {
    const search = document.getElementById('repo-search').value.toLowerCase();
    const suggestions = document.getElementById('search-suggestions');

    if (search.length < 2) {
        suggestions.classList.add('hidden');
        fetchProjects();
        return;
    }

    try {
        let url = `${API_BASE}/projects?search=${search}`;
        if (isSemanticSearch && search.length > 3) url = `${API_BASE}/projects/semantic-search?query=${search}`;
        const res = await fetch(url, { headers: getAuthHeader() });
        const projects = await res.json();
        const filtered = projects.map(p => p.project_title).slice(0, 5);

        if (filtered.length > 0) {
            suggestions.innerHTML = filtered.map(f => `<div class="suggestion-item" onclick="document.getElementById('repo-search').value='${f}'; window.fetchProjects(); document.getElementById('search-suggestions').classList.add('hidden')">${f}</div>`).join('');
            suggestions.classList.remove('hidden');
        } else {
            suggestions.classList.add('hidden');
        }
    } catch (e) { console.error('Search suggestion fetch failed', e); }

    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(fetchProjects, 300);
}

async function handleProjectUpload() {
    const project_title = document.getElementById('upload-title').value;
    const problem_statement = document.getElementById('upload-problem').value;
    const domain = document.getElementById('upload-domain').value;
    const year = document.getElementById('upload-year').value;
    const algorithms_used = document.getElementById('upload-algo').value.split(',');
    const technologies_used = document.getElementById('upload-tech').value.split(',');

    if (!project_title || !problem_statement) return alert('Fill required fields');

    try {
        const res = await fetch(`${API_BASE}/projects/upload`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify({ project_title, problem_statement, domain, algorithms_used, technologies_used, year })
        });
        if (res.ok) {
            alert('Project uploaded! It is now in the review queue.');
            fetchProjects();
            fetchPendingProjects();
        } else {
            const data = await res.json();
            alert(data.message);
        }
    } catch (err) {
        console.error('Upload Error:', err);
        alert('Upload failed: ' + err.message);
    }
}

async function generateInnovation() {
    const input = document.getElementById('project-input').value;
    if (!input) return alert('Enter project details');

    document.getElementById('loader').classList.remove('hidden');
    document.getElementById('output-section').classList.add('hidden');

    try {
        const res = await fetch(`${API_BASE}/projects/generate-idea`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify({ input })
        });
        
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.message || 'Generation failed');

        document.getElementById('loader').classList.add('hidden');
        const output = document.getElementById('output-section');
        output.classList.remove('hidden');

        output.innerHTML = `
            <div class="innovation-result glass mt-40">
                <div class="result-header">
                    <h3 class="gradient-text">${data.title}</h3>
                    <div class="score-pill">${data.innovation_score}% Innovation</div>
                </div>
                
                <div class="result-item">
                    <h4><i class="fas fa-exclamation-triangle"></i> Defined Problem</h4>
                    <p>${data.problem}</p>
                </div>

                <div class="result-item">
                    <h4><i class="fas fa-lightbulb"></i> Innovative Solution</h4>
                    <p>${data.solution}</p>
                </div>

                <div class="analysis-grid glass-inner mb-20 style="margin-top: 15px;">
                    <div class="analysis-item">
                        <h4><i class="fas fa-microchip"></i> Suggested Algorithms</h4>
                        <ul>${(data.algorithms || []).map(a => `<li style="margin-left:20px;list-style-type:disc;">${a}</li>`).join('')}</ul>
                    </div>
                    <div class="analysis-item">
                        <h4><i class="fas fa-code"></i> Tech Stack</h4>
                        <div class="tech-stack" style="margin-top: 5px;">${(data.tech_stack || []).map(t => `<span>${t}</span>`).join('')}</div>
                    </div>
                    <div class="analysis-item full">
                        <h4><i class="fas fa-book-open"></i> Work Already Done (Repository Match)</h4>
                        <p>${data.work_already_done}</p>
                    </div>
                    <div class="analysis-item full">
                        <h4><i class="fas fa-bullseye"></i> Research Gap & Limitations</h4>
                        <p>${data.limitations}</p>
                    </div>
                </div>

                <div class="confidence-bar">
                    <span>AI Confidence</span>
                    <div class="bar-fill" style="width: ${data.innovation_score}%"></div>
                </div>
                <div style="margin-top: 20px;">
                    <button class="btn btn-primary" onclick="alert('Saving to your dashboard...')">Save Blueprint</button>
                    <button class="btn btn-outline" onclick="window.print()">Download Report</button>
                </div>
            </div>
        `;
        output.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
        console.error('Generation Error:', err);
        alert('Failed to generate idea. Please ensure you are logged in (Student/Teacher/Admin) and try again.');
        document.getElementById('loader').classList.add('hidden');
    }
}

async function fetchAnalytics() {
    try {
        const res = await fetch(`${API_BASE}/projects`, { headers: getAuthHeader() });
        const data = await res.json();
        document.getElementById('total-projects').textContent = data.length || 0;
        initCharts(data);
    } catch (e) {
        console.error('Analytics failed', e);
    }
}

function initCharts(projects) {
    const domainCtx = document.getElementById('domain-chart')?.getContext('2d');
    const algoCtx = document.getElementById('algo-chart')?.getContext('2d');
    const trendCtx = document.getElementById('trend-chart')?.getContext('2d');

    if (!domainCtx || projects.length === 0) return;

    // Domain Chart
    const domains = {};
    projects.forEach(p => domains[p.domain] = (domains[p.domain] || 0) + 1);
    new Chart(domainCtx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(domains),
            datasets: [{
                data: Object.values(domains),
                backgroundColor: ['#8b5cf6', '#3b82f6', '#06b6d4', '#f59e0b']
            }]
        },
        options: { plugins: { legend: { labels: { color: 'white' } } } }
    });

    // Algo Chart
    const algos = {};
    projects.forEach(p => p.algorithms_used?.forEach(a => algos[a] = (algos[a] || 0) + 1));
    const topAlgos = Object.entries(algos).sort((a, b) => b[1] - a[1]).slice(0, 5);
    new Chart(algoCtx, {
        type: 'bar',
        data: {
            labels: topAlgos.map(a => a[0]),
            datasets: [{
                label: 'Usage Count',
                data: topAlgos.map(a => a[1]),
                backgroundColor: '#3b82f6'
            }]
        },
        options: {
            scales: {
                y: { ticks: { color: 'white' } },
                x: { ticks: { color: 'white' } }
            },
            plugins: { legend: { display: false } }
        }
    });

    // Trend Chart (Mock year based trend)
    const years = {};
    projects.forEach(p => years[p.year] = (years[p.year] || 0) + 1);
    new Chart(trendCtx, {
        type: 'line',
        data: {
            labels: Object.keys(years).sort(),
            datasets: [{
                label: 'Projects per Year',
                data: Object.keys(years).sort().map(y => years[y]),
                borderColor: '#06b6d4',
                tension: 0.4
            }]
        },
        options: {
            scales: {
                y: { ticks: { color: 'white' } },
                x: { ticks: { color: 'white' } }
            }
        }
    });
}

async function viewProjectAnalysis(id) {
    console.log('🧐 Viewing Analysis for ID:', id);
    const modal = document.getElementById('result-modal');
    const body = document.getElementById('result-modal-body');
    if (!modal || !body) return console.error('Modal elements missing');

    try {
        const res = await fetch(`${API_BASE}/projects`, { headers: getAuthHeader() });
        const data = await res.json();
        console.log('📦 Projects Loaded:', data.length);

        const p = data.find(proj => {
            const pid = String(proj.project_id || proj._id);
            return pid === String(id);
        });

        if (p) {
            console.log('✅ Project Found:', p.project_title);
            body.innerHTML = `
                <h2 class="gradient-text mb-20">${p.project_title}</h2>
                <div class="analysis-grid glass-inner">
                    <div class="analysis-item">
                        <label>Innovation Score</label>
                        <div class="score-pill large">${p.innovation_score}%</div>
                    </div>
                    <div class="analysis-item">
                        <label>Target Domain</label>
                        <p>${p.domain}</p>
                    </div>
                    <div class="analysis-item full">
                        <label>Research Gap Analysis</label>
                        <p>${p.research_gap || 'Analyzing gaps in ' + p.domain + '...'}</p>
                    </div>
                    <div class="analysis-item full">
                        <label>AI Strategic Recommendations</label>
                        <p>${p.ai_suggestions?.suggested_features || 'Scale with cloud-native microservices and decentralized Edge AI nodes.'}</p>
                    </div>
                </div>
                <div class="mt-20">
                    <button class="btn btn-primary" onclick="window.print()">Download Analysis</button>
                    <button class="btn btn-outline" onclick="document.getElementById('result-modal').classList.add('hidden')">Close</button>
                </div>
            `;
            modal.classList.remove('hidden');
        }
    } catch (e) { console.error('Analysis load failed', e); }
}

async function handleChat() {
    const input = document.getElementById('chat-input');
    const container = document.getElementById('chat-messages');
    if (!input || !container) return;
    const text = input.value.trim();
    if (!text) return;

    // Add user message
    const userMsg = document.createElement('div');
    userMsg.className = 'message user';
    userMsg.textContent = text;
    container.appendChild(userMsg);
    input.value = '';
    container.scrollTop = container.scrollHeight;

    // Create typing indicator
    const typingMsg = document.createElement('div');
    typingMsg.className = 'typing-indicator';
    typingMsg.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    container.appendChild(typingMsg);
    container.scrollTop = container.scrollHeight;

    const webSearch = false; // Feature disabled by user request

    try {
        const res = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': authToken ? `Bearer ${authToken}` : ''
            },
            body: JSON.stringify({ message: text, webSearch })
        });
        
        typingMsg.remove();
        const botMsg = document.createElement('div');
        botMsg.className = 'message bot';
        
        if (res.ok) {
            const data = await res.json();
            const rawText = data.response || "";
            // Format: Bold **text**, newline to <br>, and auto-linking tech terms to Scholar
            let formatted = rawText
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>');
            
            // Auto-link 2.0: If it looks like a tech stack or domain, add a scholar helper link
            const domains = ['AI', 'ML', 'IoT', 'Blockchain', 'Cybersecurity', 'Cloud'];
            domains.forEach(d => {
                const regex = new RegExp(`\\b${d}\\b`, 'gi');
                formatted = formatted.replace(regex, `<span class="accent-link" onclick="window.open('https://scholar.google.com/scholar?q=${d}+innovation+2025', '_blank')">${d}</span>`);
            });

            botMsg.innerHTML = formatted;
        } else {
            const data = await res.json().catch(() => ({}));
            botMsg.innerHTML = data.fallback || data.details || data.error || "I'm currently recalibrating my AI sensors. Please check your API configuration.";
        }

        container.appendChild(botMsg);
        container.scrollTop = container.scrollHeight;
    } catch (e) {
        typingMsg.remove();
        const botMsg = document.createElement('div');
        botMsg.className = 'message bot';
        botMsg.textContent = "Offline: Unable to reach the NextGen AI server.";
        container.appendChild(botMsg);
        container.scrollTop = container.scrollHeight;
        console.error('Chat error:', e);
    }
}

// Attach functions to window for onclick handlers and global access
window.handleChat = handleChat;
window.signup = signup;
window.login = login;
window.logout = logout;
window.handleProjectUpload = handleProjectUpload;
window.generateInnovation = generateInnovation;
window.fetchProjects = fetchProjects;
window.fetchAnalytics = fetchAnalytics;
window.showAuthModal = showAuthModal;
window.hideAuthModal = hideAuthModal;
window.viewProjectAnalysis = viewProjectAnalysis;
