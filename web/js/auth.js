import { state, setAuth, clearAuth } from './state.js';
import { fetchAPI } from './api.js';
import QRCode from 'qrcode';

const $ = (id) => document.getElementById(id);

export function attachAuthListeners({ onLoginSuccess }) {
  const loginForm = $('loginForm');
  const registerForm = $('registerForm');
  const forgotPasswordForm = $('forgotPasswordForm');
  const totpRecoveryForm = $('totpRecoveryForm');
  const resetPasswordForm = $('resetPasswordForm');
  const totpVerifyForm = $('totpVerifyForm');
  const showLoginNavButton = $('showLoginNavButton');
  const showRegisterNavButton = $('showRegisterNavButton');
  const showForgotPassword = $('showForgotPassword');
  const backToLoginFromForgot = $('backToLoginFromForgot');
  const backToForgotFromTotp = $('backToForgotFromTotp');
  const backToLoginFromReset = $('backToLoginFromReset');
  const switchToRegister = $('switchToRegister');
  const switchToLogin = $('switchToLogin');
  const logoutButton = $('logoutButton');
  const startTotpSetupButton = $('startTotpSetupButton');

  if (loginForm) loginForm.addEventListener('submit', handleLogin(onLoginSuccess));
  if (registerForm) registerForm.addEventListener('submit', handleRegister);
  if (forgotPasswordForm) forgotPasswordForm.addEventListener('submit', handleForgotPassword);
  if (totpRecoveryForm) totpRecoveryForm.addEventListener('submit', handleTotpRecovery);
  if (resetPasswordForm) resetPasswordForm.addEventListener('submit', handleResetPassword);
  if (totpVerifyForm) totpVerifyForm.addEventListener('submit', handleTotpSetupVerification);
  if (showLoginNavButton) showLoginNavButton.addEventListener('click', () => showAuthForm('login'));
  if (showRegisterNavButton) showRegisterNavButton.addEventListener('click', () => showAuthForm('register'));
  if (showForgotPassword) showForgotPassword.addEventListener('click', (e) => { e.preventDefault(); showAuthForm('forgot'); });
  if (backToLoginFromForgot) backToLoginFromForgot.addEventListener('click', (e) => { e.preventDefault(); showAuthForm('login'); });
  if (backToForgotFromTotp) backToForgotFromTotp.addEventListener('click', (e) => { e.preventDefault(); showAuthForm('forgot'); });
  if (backToLoginFromReset) backToLoginFromReset.addEventListener('click', (e) => { e.preventDefault(); showAuthForm('login'); });
  if (switchToRegister) switchToRegister.addEventListener('click', (e) => { e.preventDefault(); showAuthForm('register'); });
  if (switchToLogin) switchToLogin.addEventListener('click', (e) => { e.preventDefault(); showAuthForm('login'); });
  if (logoutButton) logoutButton.addEventListener('click', handleLogout);
  if (startTotpSetupButton) startTotpSetupButton.addEventListener('click', startTotpSetup);
}

export function showAuthForm(which) {
  const authView = $('authView');
  const appView = $('appView');
  const authNav = $('authNav');
  const userNav = $('userNav');
  const authMessage = $('authMessage');
  const views = {
    login: $('loginView'),
    register: $('registerView'),
    forgot: $('forgotView'),
    totpRecovery: $('totpRecoveryView'),
    reset: $('resetView'),
  };

  if (!authView || !views.login || !views.register) {
    console.warn('[Auth] Missing auth containers. Check HTML IDs.');
    return;
  }

  authView.style.display = 'block';
  if (appView) appView.style.display = 'none';
  Object.entries(views).forEach(([key, el]) => {
    if (el) el.style.display = key === which ? 'block' : 'none';
  });
  if (authNav) authNav.style.display = 'block';
  if (userNav) userNav.style.display = 'none';
  clearMessage(authMessage);
}

export function showAppView() {
  const authView = $('authView');
  const appView = $('appView');
  const authNav = $('authNav');
  const userNav = $('userNav');
  const topicsSection = $('topicManagementSection');
  const flashcardSection = $('flashcardSection');
  const welcomeMessage = $('welcomeMessage');

  if (authView) authView.style.display = 'none';
  if (appView) appView.style.display = 'block';
  if (authNav) authNav.style.display = 'none';
  if (userNav) userNav.style.display = 'flex';
  if (topicsSection) topicsSection.style.display = 'none';
  if (flashcardSection) flashcardSection.style.display = 'none';
  if (welcomeMessage && state.user) {
    welcomeMessage.textContent = `Welcome, ${state.user.name || state.user.email || 'student'}`;
  }
  renderTotpStatus();
}

function handleRegister(e) {
  e.preventDefault();
  const authMessage = $('authMessage');
  const form = e.currentTarget;
  const name = form.registerName.value.trim();
  const email = form.registerEmail.value.trim();
  const password = form.registerPassword.value.trim();

  if (!name || !email || !password) {
    setMessage(authMessage, 'All fields are required.', 'error');
    return;
  }

  (async () => {
    try {
      await fetchAPI('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      form.reset();
      showAuthForm('login');
      setMessage(authMessage, 'Registration successful. Login and enable TOTP in Account Security.', 'success');
    } catch (err) {
      console.error('Register failed:', err);
      setMessage(authMessage, err.data?.detail || err.data?.message || 'Registration failed.', 'error');
    }
  })();
}

function handleLogin(onSuccess) {
  return (e) => {
    e.preventDefault();
    const authMessage = $('authMessage');
    const form = e.currentTarget;
    const usernameOrEmail = form.loginUsername.value.trim();
    const password = form.loginPassword.value.trim();

    if (!usernameOrEmail || !password) {
      setMessage(authMessage, 'Email and password are required.', 'error');
      return;
    }

    (async () => {
      try {
        const res = await fetchAPI('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: usernameOrEmail, password }),
        });

        const jwt = res?.access_token || null;
        const user = res?.student || null;
        const studentId = res?.student?.id ?? null;
        setAuth({ jwt, user, studentId });
        try { if (jwt) localStorage.setItem('jwtToken', jwt); } catch {}

        clearMessage(authMessage);
        form.reset();
        if (typeof onSuccess === 'function') onSuccess();
      } catch (err) {
        console.error('Login failed:', err);
        setMessage(authMessage, err.data?.detail || err.data?.message || 'Login failed.', 'error');
      }
    })();
  };
}

function handleLogout() {
  clearAuth();
  try { localStorage.removeItem('jwtToken'); } catch {}
  resetTotpSetupPanel();
  showAuthForm('login');
}

function handleForgotPassword(e) {
  e.preventDefault();
  const authMessage = $('authMessage');
  const form = e.currentTarget;
  const email = form.forgotEmail.value.trim();

  if (!email) {
    setMessage(authMessage, 'Email is required.', 'error');
    return;
  }

  (async () => {
    try {
      const res = await fetchAPI('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      if (!res?.totp_required || !res?.challenge_token) {
        setMessage(authMessage, 'TOTP recovery is not enabled for this account.', 'error');
        return;
      }

      $('recoveryEmail').value = email;
      $('recoveryChallengeToken').value = res.challenge_token;
      $('recoveryCode').value = '';
      showAuthForm('totpRecovery');
      setMessage(authMessage, 'Enter the code from Google Authenticator.', 'success');
    } catch (err) {
      console.error('Forgot password failed:', err);
      setMessage(authMessage, err.data?.detail || err.data?.message || 'Failed to start password recovery.', 'error');
    }
  })();
}

function handleTotpRecovery(e) {
  e.preventDefault();
  const authMessage = $('authMessage');
  const form = e.currentTarget;
  const email = form.recoveryEmail.value.trim();
  const challengeToken = form.recoveryChallengeToken.value.trim();
  const code = form.recoveryCode.value.trim();

  if (!email || !challengeToken || !code) {
    setMessage(authMessage, 'Email, challenge, and TOTP code are required.', 'error');
    return;
  }

  (async () => {
    try {
      const res = await fetchAPI('/auth/forgot-password/verify-totp', {
        method: 'POST',
        body: JSON.stringify({
          email,
          challenge_token: challengeToken,
          code,
        }),
      });
      $('resetToken').value = res.reset_token || '';
      $('resetPassword').value = '';
      showAuthForm('reset');
      setMessage(authMessage, 'TOTP verified. Enter your new password.', 'success');
    } catch (err) {
      console.error('TOTP recovery failed:', err);
      setMessage(authMessage, err.data?.detail || err.data?.message || 'Failed to verify TOTP code.', 'error');
    }
  })();
}

function handleResetPassword(e) {
  e.preventDefault();
  const authMessage = $('authMessage');
  const form = e.currentTarget;
  const token = form.resetToken.value.trim();
  const newPassword = form.resetPassword.value.trim();

  if (!token || !newPassword) {
    setMessage(authMessage, 'New password is required.', 'error');
    return;
  }

  (async () => {
    try {
      await fetchAPI('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, new_password: newPassword }),
      });
      form.reset();
      $('recoveryChallengeToken').value = '';
      showAuthForm('login');
      setMessage(authMessage, 'Password updated. Login with your new password.', 'success');
    } catch (err) {
      console.error('Reset password failed:', err);
      setMessage(authMessage, err.data?.detail || err.data?.message || 'Failed to reset password.', 'error');
    }
  })();
}

function startTotpSetup() {
  const totpMessage = $('totpMessage');
  if (!state.jwt) {
    setMessage(totpMessage, 'Login again before enabling TOTP.', 'error');
    return;
  }

  (async () => {
    try {
      const res = await fetchAPI('/auth/totp/setup', {
        method: 'POST',
        headers: authHeaders(),
      });
      $('totpSecretDisplay').value = res.secret || '';
      $('totpOtpAuthUrl').textContent = res.otpauth_url || '';
      await renderTotpQrCode(res.otpauth_url || '');
      $('totpVerifyCode').value = '';
      $('totpSetupPanel').style.display = 'block';
      setMessage(totpMessage, 'Add this setup key in Google Authenticator, then enter the generated code.', 'success');
    } catch (err) {
      console.error('TOTP setup failed:', err);
      setMessage(totpMessage, err.data?.detail || err.data?.message || 'Failed to start TOTP setup.', 'error');
    }
  })();
}

function handleTotpSetupVerification(e) {
  e.preventDefault();
  const totpMessage = $('totpMessage');
  const form = e.currentTarget;
  const code = form.totpVerifyCode.value.trim();

  if (!code) {
    setMessage(totpMessage, 'Enter the 6-digit code from Google Authenticator.', 'error');
    return;
  }

  (async () => {
    try {
      await fetchAPI('/auth/totp/verify', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ code }),
      });
      setAuth({
        user: {
          ...(state.user || {}),
          totpEnabled: true,
        },
      });
      resetTotpSetupPanel();
      renderTotpStatus();
      setMessage(totpMessage, 'TOTP is enabled. You can now recover your password with Google Authenticator.', 'success');
    } catch (err) {
      console.error('TOTP verification failed:', err);
      setMessage(totpMessage, err.data?.detail || err.data?.message || 'Failed to verify TOTP setup.', 'error');
    }
  })();
}

function renderTotpStatus() {
  const totpStatusText = $('totpStatusText');
  const startTotpSetupButton = $('startTotpSetupButton');
  const totpSetupPanel = $('totpSetupPanel');

  if (totpStatusText) {
    totpStatusText.textContent = state.user?.totpEnabled
      ? 'TOTP is enabled for password recovery.'
      : 'TOTP is not enabled yet. Enable it after registration so you can recover a forgotten password.';
  }

  if (startTotpSetupButton) {
    startTotpSetupButton.textContent = state.user?.totpEnabled ? 'Reconfigure TOTP' : 'Enable TOTP';
  }

  if (state.user?.totpEnabled && totpSetupPanel) {
    totpSetupPanel.style.display = 'none';
  }
}

function resetTotpSetupPanel() {
  const totpSetupPanel = $('totpSetupPanel');
  const totpQrCanvas = $('totpQrCanvas');
  const totpSecretDisplay = $('totpSecretDisplay');
  const totpOtpAuthUrl = $('totpOtpAuthUrl');
  const totpVerifyCode = $('totpVerifyCode');

  if (totpSetupPanel) totpSetupPanel.style.display = 'none';
  if (totpQrCanvas) {
    const ctx = totpQrCanvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, totpQrCanvas.width, totpQrCanvas.height);
  }
  if (totpSecretDisplay) totpSecretDisplay.value = '';
  if (totpOtpAuthUrl) totpOtpAuthUrl.textContent = '';
  if (totpVerifyCode) totpVerifyCode.value = '';
}

function authHeaders() {
  return state.jwt ? { Authorization: `Bearer ${state.jwt}` } : {};
}

function setMessage(el, text, tone) {
  if (!el) return;
  el.textContent = text || '';
  el.classList.remove('error-message', 'success-message');
  el.classList.add(tone === 'success' ? 'success-message' : 'error-message');
}

function clearMessage(el) {
  if (!el) return;
  el.textContent = '';
  el.classList.remove('success-message');
  el.classList.add('error-message');
}

async function renderTotpQrCode(otpauthUrl) {
  const canvas = $('totpQrCanvas');
  if (!canvas || !otpauthUrl) return;
  await QRCode.toCanvas(canvas, otpauthUrl, {
    width: 220,
    margin: 1,
    color: {
      dark: '#202124',
      light: '#ffffff',
    },
  });
}
