// ═══════════════════════════════════════════════════════════════
// auth.js — Authentication: login, register, user state
// ═══════════════════════════════════════════════════════════════

import { toast, openModal, closeModal } from './utils.js';
import { db } from './storage.js';

// ── Auth state indicator in topbar ───────────────────────────
export function initAuth(onLogin) {
  const btn = document.getElementById('authBtn');
  const lbl = document.getElementById('authLabel');

  // Listen for Firebase auth state changes
  document.addEventListener('authchange', ({ detail: { user } }) => {
    if (user) {
      lbl.textContent   = user.email.split('@')[0];
      btn.textContent   = '🚪 Sair';
      btn.dataset.state = 'out';
      updateAuthBadge(true);
      onLogin?.();
    } else {
      lbl.textContent   = 'Offline';
      btn.textContent   = '🔑 Entrar';
      btn.dataset.state = 'in';
      updateAuthBadge(false);
    }
  });

  btn.addEventListener('click', () => {
    if (btn.dataset.state === 'out') {
      if (confirm('Sair da conta? Seus dados ficam salvos no servidor.')) {
        window._fbAuth?.signOut();
        toast('👋 Sessão encerrada.');
      }
    } else {
      openModal('moAuth');
    }
  });

  // Login form
  document.getElementById('authSubmitBtn').addEventListener('click', () => handleAuthSubmit('login'));
  document.getElementById('authRegisterBtn').addEventListener('click', () => handleAuthSubmit('register'));
  document.getElementById('authToggleBtn').addEventListener('click', toggleAuthMode);
}

function updateAuthBadge(online) {
  const badge = document.getElementById('authBadge');
  if (!badge) return;
  badge.textContent = online ? '☁️ Nuvem' : '💾 Local';
  badge.title       = online ? 'Dados sincronizados com Firebase' : 'Dados salvos localmente (sem login)';
  badge.className   = 'score-b ' + (online ? 'cloud' : 'local');
}

let _authMode = 'login';
function toggleAuthMode() {
  _authMode = _authMode === 'login' ? 'register' : 'login';
  document.getElementById('authTitle').textContent   = _authMode === 'login' ? '🔑 Entrar' : '📝 Criar Conta';
  document.getElementById('authToggleBtn').textContent = _authMode === 'login' ? 'Não tenho conta — Criar' : 'Já tenho conta — Entrar';
  document.getElementById('authSubmitBtn').textContent  = _authMode === 'login' ? 'Entrar' : 'Criar Conta';
  document.getElementById('authRegisterBtn').style.display = 'none';
}

async function handleAuthSubmit(mode) {
  const email = document.getElementById('authEmail').value.trim();
  const pw    = document.getElementById('authPw').value;
  const err   = document.getElementById('authError');
  err.textContent = '';

  if (!email || !pw) { err.textContent = 'Preencha email e senha.'; return; }
  if (!window._fbAuth) { err.textContent = 'Firebase não configurado — veja js/config.js.'; return; }

  try {
    if (mode === 'login') {
      await window._fbAuth.signIn(email, pw);
    } else {
      await window._fbAuth.signUp(email, pw);
    }
    closeModal('moAuth');
    toast('✅ ' + (mode === 'login' ? 'Login realizado!' : 'Conta criada!'));
  } catch (e) {
    err.textContent = _authError(e.code);
  }
}

function _authError(code) {
  const map = {
    'auth/user-not-found':        'Email não encontrado.',
    'auth/wrong-password':        'Senha incorreta.',
    'auth/email-already-in-use':  'Email já cadastrado.',
    'auth/weak-password':         'Senha muito fraca (mín. 6 caracteres).',
    'auth/invalid-email':         'Email inválido.',
    'auth/too-many-requests':     'Muitas tentativas. Tente mais tarde.',
  };
  return map[code] || 'Erro: ' + code;
}
