// ═══════════════════════════════════════════════════════════════
// b3.js — Carteira B3: Ações + FIIs
// ═══════════════════════════════════════════════════════════════

import { db } from './storage.js';
import { fmt, fmtP, fmtN, toast, openModal, closeModal, scoreStock, stStatus, fiiStatus, scoreColor } from './utils.js';
import { DEFAULT_STOCKS, DEFAULT_FIIS } from './config.js';

// ── Public: render the whole B3 tab ─────────────────────────
export async function renderB3() {
  const [stocks, fiis] = await Promise.all([
    db.get('stocks'),
    db.get('fiis'),
  ]);
  const ST = stocks || DEFAULT_STOCKS;
  const FI = fiis   || DEFAULT_FIIS;

  _renderStats(ST, FI);
  _renderStocksTable(ST);
  _renderFiisTable(FI);
}

// ── Stats row ────────────────────────────────────────────────
function _renderStats(ST, FI) {
  const stVal   = ST.reduce((a, s) => a + s.qty * s.px, 0);
  const fiVal   = FI.reduce((a, f) => a + f.qty * f.px, 0);
  const tot     = stVal + fiVal;
  const totCost = [...ST.map(s => s.qty * s.pm), ...FI.map(f => f.qty * f.pm)].reduce((a, x) => a + x, 0);
  const gain    = totCost > 0 ? ((tot - totCost) / totCost) * 100 : 0;

  const dyItems   = [...ST.map(s => ({ val: s.qty * s.pm, dy: s.dy || 0 })), ...FI.map(f => ({ val: f.qty * f.pm, dy: f.dy || 0 }))];
  const totCostB3 = dyItems.reduce((a, x) => a + x.val, 0) || 1;
  const yocAvg    = dyItems.reduce((a, x) => a + (x.val / totCostB3) * x.dy, 0);

  _set('b3-tot', fmt(tot));
  _set('b3-ac',  fmt(stVal));
  _set('b3-fi',  fmt(fiVal));
  _set('b3-dy',  fmtP(yocAvg));

  const resEl = document.getElementById('b3-res');
  if (resEl) {
    resEl.textContent = (gain >= 0 ? '+' : '') + fmtP(gain);
    resEl.className   = 's-chg ' + (gain >= 0 ? 'up' : 'down');
  }
}

// ── Stocks table ─────────────────────────────────────────────
function _renderStocksTable(ST) {
  const tbody = document.getElementById('stBody');
  if (!tbody) return;

  if (!ST.length) {
    tbody.innerHTML = '<tr><td colspan="16"><div class="empty-state">📊 Nenhuma ação cadastrada</div></td></tr>';
    return;
  }

  tbody.innerHTML = ST.map(s => {
    const g   = ((s.px - s.pm) / s.pm) * 100;
    const val = s.qty * s.px;
    const yoc = s.pm > 0 ? ((s.diva || 0) / s.pm) * 100 : 0;
    const sc  = scoreStock(s);
    const st  = stStatus(s);
    const DY_MIN = 6;
    const teto   = s.diva > 0 ? (s.diva / DY_MIN) * 100 : 0;
    const teto2  = s.diva > 0 ? (s.diva / (DY_MIN * 1.333)) * 100 : 0;
    const tetoColor = s.px <= teto2 ? 'var(--green)' : s.px <= teto ? 'var(--amber)' : 'var(--red)';

    return `<tr>
      <td><strong class="mono">${s.tk}</strong><br><span class="dim">${s.set || ''}</span></td>
      <td>${fmtN(s.qty)}</td>
      <td class="tr">${fmt(s.pm)}</td>
      <td class="tr">${fmt(s.px)}</td>
      <td class="tr">${fmt(val)}</td>
      <td class="tr ${g >= 0 ? 'up' : 'down'}">${g >= 0 ? '+' : ''}${fmtP(g)}</td>
      <td class="tr ${s.pl < 10 ? 'up' : s.pl < 20 ? 'am' : 'down'}">${(s.pl || 0).toFixed(1)}x</td>
      <td class="tr ${s.pvp < 1 ? 'up' : s.pvp < 1.5 ? 'am' : 'down'}">${(s.pvp || 0).toFixed(2)}</td>
      <td class="tr ${s.dy >= 6 ? 'up' : 'nu'}">${fmtP(s.dy || 0)}</td>
      <td class="tr up">${fmtP(yoc)}</td>
      <td class="tr ${s.roe >= 15 ? 'up' : s.roe >= 10 ? 'am' : 'down'}">${fmtP(s.roe || 0)}</td>
      <td class="tr ${(s.div || 0) < 2 ? 'up' : (s.div || 0) < 3 ? 'am' : 'down'}">${(s.div || 0).toFixed(1)}x</td>
      <td class="tr mono" style="color:${tetoColor};font-weight:600">${teto > 0 ? fmt(teto) : '—'}</td>
      <td class="tc">
        <div class="score-col">
          <span class="mono" style="font-size:.65rem;color:${scoreColor(sc)}">${sc}%</span>
          <div class="hbar"><div class="hfill" style="width:${sc}%;background:${scoreColor(sc)}"></div></div>
        </div>
      </td>
      <td class="tc"><span class="badge ${st.c}">${st.l}</span></td>
      <td><button class="btn btn-sm btn-d del-stock" data-id="${s.id}">✕</button></td>
    </tr>`;
  }).join('');

  // Attach delete listeners
  tbody.querySelectorAll('.del-stock').forEach(btn => {
    btn.addEventListener('click', () => deleteStock(+btn.dataset.id));
  });
}

// ── FIIs table ───────────────────────────────────────────────
function _renderFiisTable(FI) {
  const tbody = document.getElementById('fiiBody');
  if (!tbody) return;

  if (!FI.length) {
    tbody.innerHTML = '<tr><td colspan="14"><div class="empty-state">🏢 Nenhum FII cadastrado</div></td></tr>';
    return;
  }

  tbody.innerHTML = FI.map(f => {
    const g   = ((f.px - f.pm) / f.pm) * 100;
    const val = f.qty * f.px;
    const yoc = f.pm > 0 ? ((f.dc || 0) * 12 / f.pm) * 100 : 0;
    const st  = fiiStatus(f);
    const teto = f.dc > 0 ? (f.dc * 12 / 0.09) : 0;
    const tetoColor = f.px <= teto * 0.95 ? 'var(--green)' : f.px <= teto ? 'var(--amber)' : 'var(--red)';

    return `<tr>
      <td><strong class="mono">${f.tk}</strong></td>
      <td><span class="badge bx">${f.seg}</span></td>
      <td>${fmtN(f.qty)}</td>
      <td class="tr">${fmt(f.pm)}</td>
      <td class="tr">${fmt(f.px)}</td>
      <td class="tr">${fmt(val)}</td>
      <td class="tr ${g >= 0 ? 'up' : 'down'}">${g >= 0 ? '+' : ''}${fmtP(g)}</td>
      <td class="tr ${f.pvp < 1 ? 'up' : f.pvp < 1.1 ? 'am' : 'down'}">${(f.pvp || 0).toFixed(2)}</td>
      <td class="tr ${f.dy >= 8 ? 'up' : f.dy >= 6 ? 'am' : 'nu'}">${fmtP(f.dy || 0)}</td>
      <td class="tr up">${fmtP(yoc)}</td>
      <td class="tr up">${fmt(f.dc || 0, 3)}</td>
      <td class="tr mono" style="color:${tetoColor};font-weight:600">${teto > 0 ? fmt(teto) : '—'}</td>
      <td class="tc"><span class="badge ${st.c}">${st.l}</span></td>
      <td><button class="btn btn-sm btn-d del-fii" data-id="${f.id}">✕</button></td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('.del-fii').forEach(btn => {
    btn.addEventListener('click', () => deleteFii(+btn.dataset.id));
  });
}

// ── CRUD ─────────────────────────────────────────────────────
async function deleteStock(id) {
  const stocks = (await db.get('stocks') || DEFAULT_STOCKS).filter(s => s.id !== id);
  await db.set('stocks', stocks);
  await renderB3();
  toast('🗑️ Ação removida.');
  document.dispatchEvent(new Event('portfoliochange'));
}

async function deleteFii(id) {
  const fiis = (await db.get('fiis') || DEFAULT_FIIS).filter(f => f.id !== id);
  await db.set('fiis', fiis);
  await renderB3();
  toast('🗑️ FII removido.');
  document.dispatchEvent(new Event('portfoliochange'));
}

// ── Form: Add Stock ──────────────────────────────────────────
export function initB3Forms() {
  document.getElementById('addStBtn')?.addEventListener('click', () => openModal('moSt'));
  document.getElementById('addFiiBtn')?.addEventListener('click', () => openModal('moFii'));
  document.getElementById('saveStBtn')?.addEventListener('click', saveStock);
  document.getElementById('saveFiiBtn')?.addEventListener('click', saveFii);
}

async function saveStock() {
  const tk = document.getElementById('st-tk').value.toUpperCase().trim();
  if (!tk) { toast('Informe o ticker.'); return; }

  const stocks = await db.get('stocks') || DEFAULT_STOCKS;
  stocks.push({
    id:   Date.now(),
    tk,
    set:  document.getElementById('st-set').value,
    qty:  +document.getElementById('st-qty').value  || 0,
    pm:   +document.getElementById('st-pm').value   || 0,
    px:   +document.getElementById('st-px').value   || 0,
    pl:   +document.getElementById('st-pl').value   || 0,
    pvp:  +document.getElementById('st-pvp').value  || 0,
    ev:   +document.getElementById('st-ev').value   || 0,
    dy:   +document.getElementById('st-dy').value   || 0,
    roe:  +document.getElementById('st-roe').value  || 0,
    mg:   +document.getElementById('st-mg').value   || 0,
    div:  +document.getElementById('st-div').value  || 0,
    roic: +document.getElementById('st-roic').value || 0,
    diva: +document.getElementById('st-diva').value || 0,
  });

  await db.set('stocks', stocks);
  closeModal('moSt');
  await renderB3();
  toast('📈 Ação adicionada: ' + tk);
  document.dispatchEvent(new Event('portfoliochange'));
}

async function saveFii() {
  const tk = document.getElementById('fi-tk').value.toUpperCase().trim();
  if (!tk) { toast('Informe o ticker.'); return; }

  const fiis = await db.get('fiis') || DEFAULT_FIIS;
  fiis.push({
    id:  Date.now(),
    tk,
    seg: document.getElementById('fi-seg').value,
    qty: +document.getElementById('fi-qty').value  || 0,
    pm:  +document.getElementById('fi-pm').value   || 0,
    px:  +document.getElementById('fi-px').value   || 0,
    pvp: +document.getElementById('fi-pvp').value  || 0,
    dy:  +document.getElementById('fi-dy').value   || 0,
    dc:  +document.getElementById('fi-dc').value   || 0,
  });

  await db.set('fiis', fiis);
  closeModal('moFii');
  await renderB3();
  toast('🏢 FII adicionado: ' + tk);
  document.dispatchEvent(new Event('portfoliochange'));
}

// ── Helper ───────────────────────────────────────────────────
function _set(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}
