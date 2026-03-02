// ═══════════════════════════════════════════════════════════════
// utils.js — Shared helpers: formatting, modals, toast, charts
// ═══════════════════════════════════════════════════════════════

// ── Number formatting ────────────────────────────────────────
export const fmt   = (v, d = 2) => 'R$ ' + (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
export const fmtP  = (v, d = 1) => (v || 0).toFixed(d) + '%';
export const fmtN  = (v, d = 0) => (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

// ── Toast notifications ──────────────────────────────────────
let _toastTimer;
export function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className   = 'toast show ' + type;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3400);
}

// ── Modal helpers ────────────────────────────────────────────
export function openModal(id)  { document.getElementById(id)?.classList.add('active'); }
export function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }

export function registerModalListeners() {
  document.querySelectorAll('[data-close]').forEach(btn => {
    // Remove old listener to avoid duplicates, then re-add
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', () => closeModal(newBtn.dataset.close));
  });
  document.querySelectorAll('.mo').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });
}

// ── Tab switching ────────────────────────────────────────────
export function initTabs(onSwitch) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === 'tab-' + tab));
      onSwitch?.(tab);
    });
  });
}

// ── Fundamentals scoring ─────────────────────────────────────
export function scoreStock(s) {
  let sc = 0;
  if (s.pl  > 0 && s.pl  < 10)  sc += 20; else if (s.pl  < 15) sc += 13; else if (s.pl  < 20) sc += 7;
  if (s.pvp > 0 && s.pvp < 1)   sc += 20; else if (s.pvp < 1.5) sc += 13; else if (s.pvp < 2.5) sc += 6;
  if (s.dy  >= 8)                sc += 20; else if (s.dy  >= 6)  sc += 14; else if (s.dy  >= 4) sc += 8; else sc += 3;
  if (s.roe >= 20)               sc += 20; else if (s.roe >= 15) sc += 14; else if (s.roe >= 10) sc += 6;
  if (s.div >= 0 && s.div < 1)  sc += 20; else if (s.div < 2)   sc += 14; else if (s.div < 3) sc += 6;
  return sc;
}

export function stStatus(s) {
  const g  = ((s.px - s.pm) / s.pm) * 100;
  const sc = scoreStock(s);
  if (sc >= 70 && g <= 5) return { l: '🟢 Subavaliado', c: 'bg' };
  if (sc >= 50)           return { l: '🟡 Justo',        c: 'ba' };
  if (g  > 30)            return { l: '🔴 Sobreavaliado', c: 'br' };
  return { l: '⚪ Neutro', c: 'bx' };
}

export function fiiStatus(f) {
  if (f.pvp < 0.95 && f.dy >= 9) return { l: '🟢 Atrativo', c: 'bg' };
  if (f.pvp < 1.05)               return { l: '🟡 Justo',    c: 'ba' };
  if (f.pvp >= 1.15)              return { l: '🔴 Caro',      c: 'br' };
  return { l: '⚪ Neutro', c: 'bx' };
}

export function scoreColor(sc) {
  return sc >= 70 ? 'var(--green)' : sc >= 45 ? 'var(--amber)' : 'var(--red)';
}

export function isIsento(tipo) {
  return ['LCI', 'LCA', 'CRI', 'CRA'].includes(tipo);
}

export function irRate(dtApl) {
  if (!dtApl) return 0.225;
  const d = Math.ceil((new Date() - new Date(dtApl)) / 86400000);
  if (d <= 180) return 0.225;
  if (d <= 360) return 0.200;
  if (d <= 720) return 0.175;
  return 0.150;
}

// ── Generic Chart.js wrapper ─────────────────────────────────
const _charts = {};

export function buildChart(canvasId, config) {
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return;
  _charts[canvasId]?.destroy();
  _charts[canvasId] = new Chart(ctx, config);
  return _charts[canvasId];
}

export const CHART_DEFAULTS = {
  scales: {
    x: { grid: { color: 'rgba(48,54,61,.4)' }, ticks: { color: '#8b949e' } },
    y: { grid: { color: 'rgba(48,54,61,.4)' }, ticks: { color: '#8b949e' } },
  },
  plugins: { legend: { display: false } },
  responsive: true,
  maintainAspectRatio: false,
};
