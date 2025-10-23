// /js/auth.js
import { state, setAuth, clearAuth } from './state.js';
import { fetchAPI } from './api.js';

const $ = (id) => document.getElementById(id);

export function attachAuthListeners({ onLoginSuccess }) {
  const loginForm = $('loginForm');
  const registerForm = $('registerForm');
  const showLoginNavButton = $('showLoginNavButton');
  const showRegisterNavButton = $('showRegisterNavButton');
  const switchToRegister = $('switchToRegister');
  const switchToLogin = $('switchToLogin');
  const logoutButton = $('logoutButton');

  if (loginForm) loginForm.addEventListener('submit', handleLogin(onLoginSuccess));
  if (registerForm) registerForm.addEventListener('submit', handleRegister);
  if (showLoginNavButton) showLoginNavButton.addEventListener('click', () => showAuthForm('login'));
  if (showRegisterNavButton) showRegisterNavButton.addEventListener('click', () => showAuthForm('register'));
  if (switchToRegister) switchToRegister.addEventListener('click', (e) => { e.preventDefault(); showAuthForm('register'); });
  if (switchToLogin) switchToLogin.addEventListener('click', (e) => { e.preventDefault(); showAuthForm('login'); });
  if (logoutButton) logoutButton.addEventListener('click', handleLogout);
}

export function showAuthForm(which) {
  const authView = $('authView');
  const appView = $('appView');
  const loginView = $('loginView');
  const registerView = $('registerView');
  const authNav = $('authNav');
  const userNav = $('userNav');
  const authMessage = $('authMessage');

  if (!authView || !loginView || !registerView) {
    console.warn('[Auth] Missing auth containers. Check HTML IDs.');
    return;
  }

  authView.style.display = 'block';
  if (appView) appView.style.display = 'none';
  loginView.style.display = which === 'login' ? 'block' : 'none';
  registerView.style.display = which === 'register' ? 'block' : 'none';
  if (authNav) authNav.style.display = 'block';
  if (userNav) userNav.style.display = 'none';
  if (authMessage) authMessage.textContent = '';
}

export function showAppView() {
  const authView = $('authView');
  const appView = $('appView');
  const authNav = $('authNav');
  const userNav = $('userNav');
  const topicsSection = $('topicManagementSection');
  const flashcardSection = $('flashcardSection');

  if (authView) authView.style.display = 'none';
  if (appView) appView.style.display = 'block';
  if (authNav) authNav.style.display = 'none';
  if (userNav) userNav.style.display = 'flex';
  if (topicsSection) topicsSection.style.display = 'none';
  if (flashcardSection) flashcardSection.style.display = 'none';
}

function handleRegister(e) {
  e.preventDefault();
  const authMessage = $('authMessage');
  const form = e.currentTarget;
  const name = form.registerName.value.trim();
  const email = form.registerEmail.value.trim();
  const password = form.registerPassword.value.trim();

  if (!name || !email || !password) {
    if (authMessage) authMessage.textContent = 'All fields are required.';
    return;
  }

  (async () => {
    try {
      let res;
      try {
        res = await fetchAPI('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });
      } catch {
        try {
          res = await fetchAPI('/auth/register', { method: 'POST', body: JSON.stringify({ username: name, email, password }) });
        } catch {
          res = await fetchAPI('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) });
        }
      }
      if (authMessage) {
        authMessage.classList.remove('error-message');
        authMessage.classList.add('success-message');
        authMessage.textContent = 'Registration successful! Please login.';
      }
      showAuthForm('login');
      form.reset();
    } catch (err) {
      console.error('Register failed:', err);
      if (authMessage) {
        authMessage.classList.remove('success-message');
        authMessage.classList.add('error-message');
        authMessage.textContent = err.data?.message || 'Registration failed.';
      }
    }
  })();
}

function handleLogin(onSuccess) {
  return (e) => {
    e.preventDefault();
    const authMessage = $('authMessage');
    const welcomeMessage = $('welcomeMessage');
    const form = e.currentTarget;
    const usernameOrEmail = form.loginUsername.value.trim();
    const password = form.loginPassword.value.trim();

    if (!usernameOrEmail || !password) {
      if (authMessage) authMessage.textContent = 'Username/Email and password are required.';
      return;
    }

    (async () => {
      try {
        let res;
        try {
          res = await fetchAPI('/auth/login', { method: 'POST', body: JSON.stringify({ email: usernameOrEmail, password }) });
        } catch {
          const fd = new URLSearchParams(); fd.set('username', usernameOrEmail); fd.set('password', password);
          try { res = await fetchAPI('/auth/token', { method: 'POST', body: fd }); }
          catch { res = await fetchAPI('/login', { method: 'POST', body: JSON.stringify({ email: usernameOrEmail, password }) }); }
        }

        const jwt = res?.access_token || res?.token || res?.jwt || null;
        const user = res?.user || res?.student || null;
        const studentId = res?.student_id ?? res?.student?.id ?? res?.user?.id ?? null;
        setAuth({ jwt, user, studentId });

        try { if (jwt) localStorage.setItem('jwtToken', jwt); } catch {}
        if (welcomeMessage && (user?.name || user?.email)) {
          welcomeMessage.textContent = `Welcome, ${user.name || user.email}`;
        }
        if (!state.studentId) {
          if (authMessage) authMessage.textContent = 'Logged in, but no student id found.';
          return;
        }
        if (authMessage) authMessage.textContent = '';

        if (typeof onSuccess === 'function') onSuccess();
      } catch (err) {
        console.error('Login failed:', err);
        if (authMessage) {
          authMessage.classList.remove('success-message');
          authMessage.classList.add('error-message');
          authMessage.textContent = err.data?.message || 'Login failed.';
        }
      }
    })();
  };
}

function handleLogout() {
  (async () => {
    try { await fetchAPI('/auth/logout', { method: 'POST' }); } catch {}
    clearAuth();
    try { localStorage.removeItem('jwtToken'); } catch {}
    showAuthForm('login');
  })();
}
