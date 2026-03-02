// ═══════════════════════════════════════════════════════════════
// rendaFixa.js — Renda Fixa tab
// ═══════════════════════════════════════════════════════════════

import { db } from './storage.js';
import { fmt, fmtP, toast, openModal, closeModal, isIsento, irRate } from './utils.js';
import { DEFAULT_RF, DEFAULT_RATES } from './config.js';

export async function renderRendaFixa() {
  const [rf, rates] = await Promise.all([db.get('rf'), db.get('rates')]);
  const RF    = rf    || DEFAULT_RF;
  const ipca  = (rates || DEFAULT_RATES).ipca;
  const today = new Date();

  // Stats
  const totalSal = RF.reduce((a, x) => a + x.sal, 0);
  const avgRet   = RF.length > 0 ? RF.reduce((a, x) => a + x.taxa, 0) / RF.length : 0;
  const realRet  = avgRet - ipca;
  const v90      = RF.filter(x => { const d = (new Date(x.venc) - today) / 86400000; return d >= 0 && d <= 90; }).length;

  _set('rf-tot',  fmt(totalSal));
  _set('rf-ret',  fmtP(avgRet));
  const realEl = document.getElementById('rf-real');
  if (realEl) {
    realEl.textContent = (realRet >= 0 ? '+' : '') + fmtP(realRet);
    realEl.className   = 's-val ' + (realRet >= 0 ? 'up' : 'down');
  }
  _set('rf-v90', v90);

  _renderVencAlerts(RF, today);
  _renderTable(RF, today);
  _renderRefs(rates || DEFAULT_RATES);
}

function _renderVencAlerts(RF, today) {
  const box      = document.getElementById('vencAlerts');
  const badge    = document.getElementById('vencAlertBadge');
  const countEl  = document.getElementById('vencAlertCount');
  if (!box) return;

  const a30 = RF.filter(x => { const d = (new Date(x.venc) - today) / 86400000; return d >= 0 && d <= 30; });
  const a90 = RF.filter(x => { const d = (new Date(x.venc) - today) / 86400000; return d > 30 && d <= 90; });

  box.innerHTML =
    a30.map(x => `<div class="venc-alert">
      <span>🚨 <strong>${x.nm}</strong> vence em ${Math.ceil((new Date(x.venc) - today) / 86400000)} dias (${new Date(x.venc + 'T12:00').toLocaleDateString('pt-BR')})</span>
      <span class="mono fw6">${fmt(x.sal)}</span>
    </div>`).join('') +
    a90.map(x => `<div class="venc-warn">
      <span>⚠️ <strong>${x.nm}</strong> vence em ${Math.ceil((new Date(x.venc) - today) / 86400000)} dias</span>
      <span class="mono">${fmt(x.sal)}</span>
    </div>`).join('');

  if (badge)   badge.style.display   = a30.length ? 'block' : 'none';
  if (countEl) countEl.textContent    = a30.length;
}

function _renderTable(RF, today) {
  const tbody = document.getElementById('rfBody');
  if (!tbody) return;

  if (!RF.length) {
    tbody.innerHTML = '<tr><td colspan="11"><div class="empty-state">Nenhum ativo</div></td></tr>';
    return;
  }

  tbody.innerHTML = RF.map(r => {
    const lucro   = r.sal - r.inv;
    const lucroP  = r.inv > 0 ? ((lucro / r.inv) * 100).toFixed(1) : 0;
    const dias    = Math.ceil((new Date(r.venc) - today) / 86400000);
    const expCls  = dias < 30 ? 'br' : dias < 90 ? 'ba' : 'bg';
    const expLbl  = dias < 0 ? 'Vencido' : dias < 30 ? dias + 'd' : dias < 365 ? Math.round(dias / 30) + 'm' : (dias / 365).toFixed(1) + 'a';
    const irAliq  = isIsento(r.tipo) ? 0 : irRate(r.dt);
    const irLabel = isIsento(r.tipo) ? 'Isento IR' : (irAliq * 100).toFixed(1) + '%';
    const irCls   = isIsento(r.tipo) ? 'bg' : 'bx';
    const taxaDisp = r.idx === 'CDI' ? r.taxa + '% CDI' : r.idx === 'IPCA+' ? 'IPCA+' + r.taxa + '%' : r.taxa + '% a.a.';

    return `<tr>
      <td><strong>${r.nm}</strong></td>
      <td><span class="badge bb">${r.tipo}</span></td>
      <td><span class="mono dim">${r.idx}</span></td>
      <td class="tr up mono">${taxaDisp}</td>
      <td class="tr">${fmt(r.inv)}</td>
      <td class="tr">${fmt(r.sal)}</td>
      <td class="tr ${lucro >= 0 ? 'up' : 'down'}">${lucro >= 0 ? '+' : ''}${fmt(lucro)} (${lucroP >= 0 ? '+' : ''}${lucroP}%)</td>
      <td class="tr"><span class="badge ${irCls}">${irLabel}</span></td>
      <td class="tc"><span class="badge ${expCls}">${expLbl}</span></td>
      <td class="tc">${dias < 30 && dias >= 0 ? '<span class="badge br">⚠️ Vence logo</span>' : ''}</td>
      <td><button class="btn btn-sm btn-d del-rf" data-id="${r.id}">✕</button></td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('.del-rf').forEach(btn => {
    btn.addEventListener('click', () => deleteRf(+btn.dataset.id));
  });
}

function _renderRefs(rates) {
  const el = document.getElementById('rfRefPanel');
  if (!el) return;
  const lci  = (rates.cdi * 0.9).toFixed(2);
  const poup = (rates.cdi > 8.5 ? 6.17 : rates.cdi * 0.7).toFixed(2);

  el.innerHTML = [
    ['IPCA 12M',               fmtP(rates.ipca), 'var(--amber)'],
    ['CDI / Selic',            fmtP(rates.cdi),  'var(--green)'],
    ['IGP-M 12M',              fmtP(rates.igpm), 'var(--amber)'],
    ['CDB 100% CDI',           fmtP(rates.cdi) + ' a.a.', 'var(--green)'],
    ['LCI/LCA 90% CDI (isento IR)', '≈' + lci + '% a.a.', 'var(--blue)'],
    ['Poupança',               fmtP(+poup) + ' a.a.', 'var(--red)'],
  ].map(([lbl, val, col]) => `
    <div class="ref-row">
      <span class="ref-lbl">${lbl}</span>
      <span class="mono fw6" style="color:${col}">${val}</span>
    </div>`).join('');
}

async function deleteRf(id) {
  const rf = (await db.get('rf') || DEFAULT_RF).filter(r => r.id !== id);
  await db.set('rf', rf);
  await renderRendaFixa();
  toast('🗑️ Ativo removido.');
  document.dispatchEvent(new Event('portfoliochange'));
}

export function initRendaFixaForms() {
  document.getElementById('addRfBtn')?.addEventListener('click', () => {
    document.getElementById('rf-dt').valueAsDate   = new Date();
    document.getElementById('rf-venc').valueAsDate = new Date(Date.now() + 365 * 86400000);
    openModal('moRf');
  });
  document.getElementById('saveRfBtn')?.addEventListener('click', saveRf);
}

async function saveRf() {
  const nm = document.getElementById('rf-nm').value.trim();
  if (!nm) { toast('Informe o nome.'); return; }

  const rf = await db.get('rf') || DEFAULT_RF;
  rf.push({
    id:   Date.now(),
    nm,
    tipo: document.getElementById('rf-tipo').value,
    idx:  document.getElementById('rf-idx').value,
    taxa: +document.getElementById('rf-taxa').value || 0,
    inv:  +document.getElementById('rf-inv').value  || 0,
    sal:  +document.getElementById('rf-sal').value  || 0,
    dt:   document.getElementById('rf-dt').value,
    venc: document.getElementById('rf-venc').value,
  });

  await db.set('rf', rf);
  closeModal('moRf');
  await renderRendaFixa();
  toast('🏦 Ativo adicionado!');
  document.dispatchEvent(new Event('portfoliochange'));
}

function _set(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}
