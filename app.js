// ═══════════════════════════════════════════════════════════════
// app.js — Main orchestrator: init, tabs, rates, reset, data I/O
// ═══════════════════════════════════════════════════════════════

import { initStorage, db, seedIfEmpty } from './storage.js';
import { toast, openModal, closeModal, registerModalListeners, initTabs } from './utils.js';
import { initAuth } from './auth.js';
import { renderB3, initB3Forms } from './b3.js';
import { renderRendaFixa, initRendaFixaForms } from './rendaFixa.js';
import { renderDividendos, initDivForms } from './dividendos.js';
import { renderInflacao, initInflacaoForms } from './inflacao.js';
import { renderVisao, initVisaoForms } from './visao.js';
import { renderOrcamento, initOrcamentoForms } from './orcamento.js';
import { initSimuladores, prefillRates } from './simuladores.js';
import {
  DEFAULT_RATES, DEFAULT_CATS, DEFAULT_EMERGENCY, DEFAULT_ALLOC,
  DEFAULT_RENDA, DEFAULT_FIRE, DEFAULT_STOCKS, DEFAULT_FIIS,
  DEFAULT_RF, DEFAULT_BASKET,
} from './config.js';

// ── Bootstrap ────────────────────────────────────────────────
async function init() {
  await initStorage();

  // Seed defaults on first run
  await seedDefaults();

  // Auth (login/logout badge in topbar)
  initAuth(async () => {
    await seedDefaults();  // re-seed after login in case cloud is empty
    await renderAll();
  });

  // UI
  registerModalListeners();
  initTabs(onTabSwitch);
  initRatesBar();
  initResetModal();
  initImportExport();

  // Module forms (all addEventListener — no inline onclick)
  initVisaoForms();
  initB3Forms();
  initRendaFixaForms();
  initDivForms();
  initInflacaoForms();
  initOrcamentoForms();
  initSimuladores();

  // Date stamp
  const dateEl = document.getElementById('topDate');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('pt-BR');

  // Listen for cross-module portfolio changes → refresh overview
  document.addEventListener('portfoliochange', renderVisao);

  await renderAll();
}

async function renderAll() {
  await Promise.all([
    renderVisao(),
    renderB3(),
    renderRendaFixa(),
    renderDividendos(),
    renderInflacao(),
    renderOrcamento(),
    prefillRates(),
  ]);
}

function onTabSwitch(tab) {
  // Lazy re-render on tab focus to catch any stale data
  const renderMap = {
    visao:     renderVisao,
    b3:        renderB3,
    fixa:      renderRendaFixa,
    divs:      renderDividendos,
    inflacao:  renderInflacao,
    sims:      prefillRates,
    orcamento: renderOrcamento,
  };
  renderMap[tab]?.();
}

async function seedDefaults() {
  const seeds = [
    ['rates',      DEFAULT_RATES],
    ['cats',       DEFAULT_CATS],
    ['emergency',  DEFAULT_EMERGENCY],
    ['alloc',      DEFAULT_ALLOC],
    ['renda',      DEFAULT_RENDA],
    ['fire',       DEFAULT_FIRE],
    ['stocks',     DEFAULT_STOCKS],
    ['fiis',       DEFAULT_FIIS],
    ['rf',         DEFAULT_RF],
    ['basket',     DEFAULT_BASKET],
    ['budgets',    [{ id:1, item:'Viagem', amount:6000, saved:2500, deadline:'2025-12-31', priority:'Alta' }]],
    ['patrimHist', []],
    ['divFut',     []],
    ['divHist',    []],
    ['income',     []],
    ['catLimits',  {}],
  ];
  await Promise.all(seeds.map(([k, v]) => seedIfEmpty(k, v)));
}

// ── Rates bar ────────────────────────────────────────────────
function initRatesBar() {
  document.getElementById('saveRatesBtn')?.addEventListener('click', saveRates);
  loadRatesBar();
}

async function loadRatesBar() {
  const r = await db.get('rates') || DEFAULT_RATES;
  document.getElementById('rate-ipca').value  = r.ipca;
  document.getElementById('rate-cdi').value   = r.cdi;
  document.getElementById('rate-igpm').value  = r.igpm;
}

async function saveRates() {
  const r = {
    ipca:  parseFloat(document.getElementById('rate-ipca').value)  || DEFAULT_RATES.ipca,
    cdi:   parseFloat(document.getElementById('rate-cdi').value)   || DEFAULT_RATES.cdi,
    igpm:  parseFloat(document.getElementById('rate-igpm').value)  || DEFAULT_RATES.igpm,
  };
  await db.set('rates', r);

  // Sync simulator fields
  const el1 = document.getElementById('sa-ipca');
  const el2 = document.getElementById('pp2');
  if (el1) el1.value = r.ipca;
  if (el2) el2.value = r.ipca;

  const st = document.getElementById('ratesStatus');
  if (st) {
    st.textContent = '✓ Salvo às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    st.style.color = 'var(--green)';
    setTimeout(() => { st.textContent = ''; }, 3000);
  }

  await Promise.all([renderRendaFixa(), renderInflacao(), renderVisao()]);
  toast('📡 Taxas atualizadas!');
}

// ── Reset modal ──────────────────────────────────────────────
function initResetModal() {
  document.getElementById('openResetBtn')?.addEventListener('click', () => openModal('moReset'));

  document.getElementById('selectAllReset')?.addEventListener('click',   () => toggleAll(true));
  document.getElementById('deselectAllReset')?.addEventListener('click', () => toggleAll(false));
  document.getElementById('confirmResetBtn')?.addEventListener('click',  confirmReset);
}

function toggleAll(val) {
  document.querySelectorAll('#moReset input[type=checkbox]').forEach(cb => { cb.checked = val; });
}

async function confirmReset() {
  const map = {
    'rz-stocks':    ['stocks'],
    'rz-fiis':      ['fiis'],
    'rz-rf':        ['rf'],
    'rz-divhist':   ['divHist'],
    'rz-divfut':    ['divFut'],
    'rz-cats':      ['cats', 'expenses'],
    'rz-basket':    ['basket'],
    'rz-budgets':   ['budgets'],
    'rz-emergency': ['emergency'],
    'rz-hist':      ['patrimHist'],
    'rz-income':    ['income', 'renda', 'catLimits'],
  };

  const checked = Object.entries(map).filter(([id]) => document.getElementById(id)?.checked);
  if (!checked.length) { toast('Nenhum item selecionado.'); return; }
  if (!confirm(`Zerar ${checked.length} categoria(s)? Esta ação não pode ser desfeita.`)) return;

  await Promise.all(checked.flatMap(([, keys]) => keys.map(k => db.del(k))));
  closeModal('moReset');
  toggleAll(false);
  await seedDefaults();
  await renderAll();
  toast('🗑️ Dados zerados com sucesso.');
}

// ── Import / Export ──────────────────────────────────────────
const ALL_KEYS = [
  'stocks','fiis','rf','basket','budgets','emergency','cats',
  'divHist','divFut','rates','patrimHist','renda','catLimits','income','alloc','fire',
];

const SCHEMA = {
  stocks:    [{ id:'auto', tk:'PETR4', set:'Petróleo', qty:100, pm:32.50, px:35.80, pl:5.2, pvp:1.1, ev:3.4, dy:12.5, roe:28.3, mg:18.2, div:0.8, roic:22, diva:4.08 }],
  fiis:      [{ id:'auto', tk:'MXRF11', seg:'Papel|Tijolo|Logística|Shoppings|Lajes Corp.|Residencial|FOFs|Híbrido', qty:300, pm:9.85, px:9.60, pvp:0.95, dy:12.8, dc:0.10 }],
  rf:        [{ id:'auto', nm:'CDB Nubank', tipo:'CDB|LCI|LCA|Tesouro Selic|Tesouro IPCA+|Tesouro Prefixado|Debenture|CRI|CRA', idx:'CDI|IPCA+|Prefixado|Selic', taxa:100, inv:10000, sal:11200, dt:'2024-06-01', venc:'2026-06-01' }],
  basket:    [{ id:'auto', item:'Cesta Básica', cat:'Alimentação|Saúde|Transporte|Habitação|Educação|Lazer|Vestuário|Outros', old:580, current:635 }],
  budgets:   [{ id:'auto', item:'Viagem', amount:6000, saved:2500, deadline:'2025-12-31', priority:'Alta|Média|Baixa' }],
  emergency: { current:12000, goal:18000, monthly:3000 },
  rates:     { ipca:4.83, cdi:10.50, igpm:3.76 },
  cats:      [{ id:'auto', n:'Alimentação', c:'#3fb950', a:1200 }],
  divHist:   [{ id:'auto', tk:'MXRF11', tipo:'FII|Ação|JCP', dt:'2025-01-15', qty:300, vc:0.10 }],
  divFut:    [{ id:'auto', tk:'MXRF11', tipo:'FII|Ação|BDR', ex:'2025-01-10', pay:'2025-01-15', vc:0.10, qty:300 }],
};

function initImportExport() {
  document.getElementById('openImportBtn')?.addEventListener('click', () => {
    document.getElementById('schemaRef').textContent = JSON.stringify(SCHEMA, null, 2);
    openModal('moImport');
  });
  document.getElementById('exportJsonBtn')?.addEventListener('click', exportJSON);
  document.getElementById('copyJsonBtn')?.addEventListener('click',   copyJSON);
  document.getElementById('importJsonBtn')?.addEventListener('click', importJSON);
  document.getElementById('templateBtn')?.addEventListener('click',   () => {
    document.getElementById('importJSON').value = JSON.stringify(SCHEMA, null, 2);
  });
}

async function getAllData() {
  const result = {};
  await Promise.all(ALL_KEYS.map(async k => {
    const v = await db.get(k);
    if (v != null) result[k] = v;
  }));
  return result;
}

async function exportJSON() {
  const data = await getAllData();
  const json = JSON.stringify(data, null, 2);
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  a.download = 'financasmart-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  toast('📤 JSON exportado!');
}

async function copyJSON() {
  const data = await getAllData();
  try {
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    toast('📋 Copiado!');
  } catch {
    document.getElementById('importJSON').value = JSON.stringify(data, null, 2);
    toast('Conteúdo copiado no campo abaixo.');
  }
}

async function importJSON() {
  const raw = document.getElementById('importJSON').value.trim();
  const st  = document.getElementById('importStatus');
  if (!raw) { toast('Cole o JSON antes de importar.'); return; }

  let data;
  try { data = JSON.parse(raw); }
  catch (e) {
    if (st) { st.textContent = '❌ JSON inválido: ' + e.message; st.style.color = 'var(--red)'; }
    return;
  }

  let count = 0;
  await Promise.all(ALL_KEYS.map(async key => {
    if (data[key] !== undefined) {
      const val = Array.isArray(data[key])
        ? data[key].map((item, i) => ({ id: item.id || Date.now() + i, ...item }))
        : data[key];
      await db.set(key, val);
      count++;
    }
  }));

  if (st) {
    st.textContent = `✅ ${count} categoria(s) importada(s)!`;
    st.style.color = 'var(--green)';
    setTimeout(() => { st.textContent = ''; }, 4000);
  }

  await renderAll();
  await loadRatesBar();
  toast(`📥 Importação concluída! ${count} categorias.`);
}

// ── Start ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
