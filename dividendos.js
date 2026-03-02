// ═══════════════════════════════════════════════════════════════
// dividendos.js — Dividendos tab: calendar, history, projection
// ═══════════════════════════════════════════════════════════════

import { db } from './storage.js';
import { fmt, fmtP, fmtN, toast, openModal, closeModal, buildChart, CHART_DEFAULTS } from './utils.js';
import { DEFAULT_STOCKS, DEFAULT_FIIS } from './config.js';

let _calMonth = new Date().getMonth();
let _calYear  = new Date().getFullYear();

export async function renderDividendos() {
  const [divF, divH, stocks, fiis] = await Promise.all([
    db.get('divFut'), db.get('divHist'), db.get('stocks'), db.get('fiis'),
  ]);
  const DF = divF  || [];
  const DH = divH  || [];
  const ST = stocks || DEFAULT_STOCKS;
  const FI = fiis   || DEFAULT_FIIS;

  _renderStats(DH, ST, FI);
  _renderProjection(ST, FI);
  renderCalendar(DF);
  _renderHistTable(DH);
  _renderDivChart(DH);
}

function _renderStats(DH, ST, FI) {
  const total12   = DH.reduce((a, d) => a + d.qty * d.vc, 0);
  const totCost   = [...ST.map(s => s.qty * s.pm), ...FI.map(f => f.qty * f.pm)].reduce((a, x) => a + x, 0) || 1;
  const annualDiv = [...ST.map(s => s.qty * (s.diva || 0)), ...FI.map(f => f.qty * (f.dc || 0) * 12)].reduce((a, x) => a + x, 0);
  const yocCart   = (annualDiv / totCost) * 100;
  const proj12    = annualDiv / 12;

  _set('dv-12m', fmt(total12));
  _set('dv-dy',  fmtP(yocCart));
  _set('dv-men', fmt(proj12));

  const upcoming = (DB_divFut || []);
  // Will be populated after fetch in renderDividendos
}

function _renderProjection(ST, FI) {
  const proj = [
    ...ST.map(s => ({ tk: s.tk, tipo: 'Ação', val: s.qty * (s.diva || 0) })),
    ...FI.map(f => ({ tk: f.tk, tipo: 'FII',  val: f.qty * (f.dc  || 0) * 12 })),
  ].filter(x => x.val > 0).sort((a, b) => b.val - a.val);

  const total = proj.reduce((a, x) => a + x.val, 0);

  const el = document.getElementById('divProj');
  if (el) {
    el.innerHTML = proj.slice(0, 6).map(x => `
      <div class="proj-row">
        <div class="proj-left">
          <span class="mono fw6">${x.tk}</span>
          <span class="badge ${x.tipo === 'FII' ? 'bb' : 'bg'}">${x.tipo}</span>
        </div>
        <span class="mono up">${fmt(x.val)}/ano</span>
      </div>`).join('');
  }
  _set('divProjTotal', fmt(total));
  _set('dv-men', fmt(total / 12));
}

// ── Calendar ─────────────────────────────────────────────────
export function renderCalendar(events = []) {
  const monthLabel = new Date(_calYear, _calMonth, 1)
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  _set('calMonthLabel', monthLabel[0].toUpperCase() + monthLabel.slice(1));

  const grid = document.getElementById('calGrid');
  if (!grid) return;
  grid.innerHTML = '';

  ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].forEach(d => {
    const h = document.createElement('div');
    h.className   = 'cal-hdr';
    h.textContent = d;
    grid.appendChild(h);
  });

  const first     = new Date(_calYear, _calMonth, 1).getDay();
  const total     = new Date(_calYear, _calMonth + 1, 0).getDate();
  const prevTotal = new Date(_calYear, _calMonth, 0).getDate();
  const today     = new Date();
  const allDays   = [];

  for (let i = first - 1; i >= 0; i--)  allDays.push({ d: prevTotal - i, m: _calMonth - 1, other: true });
  for (let i = 1; i <= total; i++)       allDays.push({ d: i, m: _calMonth, other: false });
  while (allDays.length % 7 !== 0)       allDays.push({ d: allDays.length - total - first + 1, m: _calMonth + 1, other: true });

  allDays.forEach(({ d, m, other }) => {
    const cell    = document.createElement('div');
    cell.className = 'cal-day' + (other ? ' other-month' : '');
    const isToday = !other && d === today.getDate() && _calMonth === today.getMonth() && _calYear === today.getFullYear();
    if (isToday) cell.classList.add('today');
    cell.innerHTML = `<div class="cal-dn">${d}</div>`;

    const realM   = ((m % 12) + 12) % 12;
    const realY   = _calYear + (m < 0 ? -1 : m > 11 ? 1 : 0);
    const dateStr = `${realY}-${String(realM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    events.filter(e => e.pay === dateStr || e.ex === dateStr).forEach(e => {
      const ev      = document.createElement('div');
      ev.className  = 'cal-ev' + (e.tipo === 'FII' ? ' fii' : '');
      ev.textContent = (e.pay === dateStr ? '💰' : '📅') + e.tk;
      ev.title      = `${e.tk}: ${fmt(e.qty * e.vc)} (${e.pay === dateStr ? 'Pagamento' : 'Ex-div'})`;
      cell.appendChild(ev);
    });

    grid.appendChild(cell);
  });
}

function _renderHistTable(DH) {
  const tbody = document.getElementById('divHistBody');
  if (!tbody) return;

  if (!DH.length) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state">Nenhum dividendo lançado</div></td></tr>';
    return;
  }

  tbody.innerHTML = [...DH].sort((a, b) => new Date(b.dt) - new Date(a.dt)).map(d => {
    const bruto = d.qty * d.vc;
    const ir    = d.tipo === 'FII' ? 0 : bruto * 0.15;
    return `<tr>
      <td>${new Date(d.dt + 'T12:00').toLocaleDateString('pt-BR')}</td>
      <td><strong class="mono">${d.tk}</strong></td>
      <td><span class="badge ${d.tipo === 'FII' ? 'bb' : 'bg'}">${d.tipo}</span></td>
      <td class="tr">${fmtN(d.qty)}</td>
      <td class="tr">${fmt(d.vc, 3)}</td>
      <td class="tr">${fmt(bruto)}</td>
      <td class="tr ${ir > 0 ? 'down' : 'up'}">${ir > 0 ? '-' + fmt(ir) : 'Isento'}</td>
      <td class="tr up">${fmt(bruto - ir)}</td>
    </tr>`;
  }).join('');
}

function _renderDivChart(DH) {
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
    months.push({
      lbl: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    });
  }

  buildChart('divChart', {
    type: 'bar',
    data: {
      labels: months.map(m => m.lbl),
      datasets: [{
        label:           'Dividendos (R$)',
        data:            months.map(m => DH.filter(h => h.dt.startsWith(m.key)).reduce((a, h) => a + h.qty * h.vc, 0)),
        backgroundColor: 'rgba(63,185,80,.6)',
        borderColor:     '#3fb950',
        borderWidth:     1,
        borderRadius:    4,
      }],
    },
    options: {
      ...CHART_DEFAULTS,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ' ' + fmt(c.raw) } } },
      scales: {
        x: CHART_DEFAULTS.scales.x,
        y: { ...CHART_DEFAULTS.scales.y, ticks: { ...CHART_DEFAULTS.scales.y.ticks, callback: v => 'R$ ' + v } },
      },
    },
  });
}

// ── Forms ────────────────────────────────────────────────────
export function initDivForms() {
  document.getElementById('addDivFutBtn')?.addEventListener('click', () => {
    document.getElementById('dvf-ex').valueAsDate  = new Date();
    document.getElementById('dvf-pay').valueAsDate = new Date(Date.now() + 15 * 86400000);
    openModal('moDivF');
  });
  document.getElementById('addDivHistBtn')?.addEventListener('click', () => {
    document.getElementById('dvh-dt').valueAsDate = new Date();
    openModal('moDivH');
  });
  document.getElementById('saveDivFBtn')?.addEventListener('click',    saveDivFut);
  document.getElementById('saveDivHBtn')?.addEventListener('click',    saveDivHist);
  document.getElementById('calPrevBtn')?.addEventListener('click',     calPrev);
  document.getElementById('calNextBtn')?.addEventListener('click',     calNext);
}

async function calPrev() {
  _calMonth--;
  if (_calMonth < 0) { _calMonth = 11; _calYear--; }
  renderCalendar(await db.get('divFut') || []);
}

async function calNext() {
  _calMonth++;
  if (_calMonth > 11) { _calMonth = 0; _calYear++; }
  renderCalendar(await db.get('divFut') || []);
}

async function saveDivFut() {
  const tk = document.getElementById('dvf-tk').value.toUpperCase().trim();
  if (!tk) { toast('Informe o ticker.'); return; }
  const df = await db.get('divFut') || [];
  df.push({
    id:   Date.now(), tk,
    tipo: document.getElementById('dvf-tipo').value,
    ex:   document.getElementById('dvf-ex').value,
    pay:  document.getElementById('dvf-pay').value,
    vc:   +document.getElementById('dvf-vc').value  || 0,
    qty:  +document.getElementById('dvf-qty').value || 0,
  });
  await db.set('divFut', df);
  closeModal('moDivF');
  await renderDividendos();
  toast('💰 Dividendo registrado!');
}

async function saveDivHist() {
  const tk = document.getElementById('dvh-tk').value.toUpperCase().trim();
  if (!tk) { toast('Informe o ticker.'); return; }
  const dh = await db.get('divHist') || [];
  dh.push({
    id:   Date.now(), tk,
    tipo: document.getElementById('dvh-tipo').value,
    dt:   document.getElementById('dvh-dt').value,
    qty:  +document.getElementById('dvh-qty').value || 0,
    vc:   +document.getElementById('dvh-vc').value  || 0,
  });
  await db.set('divHist', dh);
  closeModal('moDivH');
  await renderDividendos();
  toast('📋 Dividendo lançado!');
}

let DB_divFut = [];

function _set(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}
