// ═══════════════════════════════════════════════════════════════
// simuladores.js — Aportes, FIRE, Preço Teto, IR Regressivo
// ═══════════════════════════════════════════════════════════════

import { fmt, fmtP, fmtN, buildChart, CHART_DEFAULTS } from './utils.js';
import { db } from './storage.js';
import { DEFAULT_RATES } from './config.js';

export function initSimuladores() {
  document.getElementById('btnSimAportes')?.addEventListener('click',   calcAportes);
  document.getElementById('btnSimIR')?.addEventListener('click',        calcIR);
  document.getElementById('btnSimFIRE')?.addEventListener('click',      calcFIRE);
  document.getElementById('btnSimPrecoTeto')?.addEventListener('click', calcPrecoTeto);
  document.getElementById('btnSimPP')?.addEventListener('click',        calcPP);
}

// Pre-fill IPCA from saved rates
export async function prefillRates() {
  const r = await db.get('rates') || DEFAULT_RATES;
  const el1 = document.getElementById('sa-ipca');
  const el2 = document.getElementById('pp2');
  if (el1) el1.value = r.ipca;
  if (el2) el2.value = r.ipca;
}

// ── Simulador de Aportes ────────────────────────────────────
function calcAportes() {
  const aporte  = parseFloat(document.getElementById('sa-aporte').value)  || 0;
  const taxa    = parseFloat(document.getElementById('sa-taxa').value)    || 0;
  const anos    = parseInt(document.getElementById('sa-anos').value)      || 0;
  const inicial = parseFloat(document.getElementById('sa-inicial').value) || 0;
  const ipca    = parseFloat(document.getElementById('sa-ipca').value)    || 0;

  const mensal  = taxa / 100 / 12;
  const meses   = anos * 12;
  let saldo = inicial, totalAp = inicial;
  const labels = [], dataFut = [], dataReal = [], dataAp = [];

  for (let m = 1; m <= meses; m++) {
    saldo   = saldo * (1 + mensal) + aporte;
    totalAp += aporte;
    if (m % 12 === 0 || m === meses) {
      const yr = Math.ceil(m / 12);
      labels.push('Ano ' + yr);
      dataFut.push(Math.round(saldo));
      dataReal.push(Math.round(saldo / Math.pow(1 + ipca / 100, yr)));
      dataAp.push(Math.round(totalAp));
    }
  }

  const lucro = saldo - totalAp;
  const resEl = document.getElementById('sa-res');
  if (resEl) resEl.innerHTML = `
    <div class="sim-grid4">
      <div class="sim-card green"><div class="sim-lbl">Patrimônio futuro</div><div class="sim-val">${fmt(saldo)}</div></div>
      <div class="sim-card"><div class="sim-lbl">Total investido</div><div class="sim-val">${fmt(totalAp)}</div></div>
      <div class="sim-card blue"><div class="sim-lbl">Lucro dos juros</div><div class="sim-val">${fmt(lucro)}</div></div>
      <div class="sim-card amber"><div class="sim-lbl">Valor real (s/ inflação)</div><div class="sim-val">${fmt(saldo / Math.pow(1 + ipca / 100, anos))}</div></div>
    </div>`;

  document.getElementById('saCont').style.display = 'block';

  buildChart('saChart', {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Patrimônio Nominal',       data: dataFut,  borderColor: '#3fb950', backgroundColor: 'rgba(63,185,80,.08)', fill: true, tension: .3 },
        { label: 'Valor Real (s/ inflação)', data: dataReal, borderColor: '#d29922', backgroundColor: 'transparent', tension: .3, borderDash: [5, 3] },
        { label: 'Total Investido',          data: dataAp,   borderColor: '#8b949e', backgroundColor: 'transparent', tension: .3, borderDash: [3, 3] },
      ],
    },
    options: {
      ...CHART_DEFAULTS,
      plugins: { legend: { labels: { color: '#8b949e', boxWidth: 12 } }, tooltip: { callbacks: { label: c => ' ' + fmt(c.raw) } } },
      scales: {
        x: CHART_DEFAULTS.scales.x,
        y: { ...CHART_DEFAULTS.scales.y, ticks: { color: '#8b949e', callback: v => 'R$ ' + fmtN(v) } },
      },
    },
  });
}

// ── Simulador IR Regressivo ──────────────────────────────────
function calcIR() {
  const val   = parseFloat(document.getElementById('ir-val').value)  || 0;
  const taxa  = parseFloat(document.getElementById('ir-taxa').value) || 0;
  const tipo  = document.getElementById('ir-tipo').value;
  const isento = tipo.includes('isento');

  const rows = [
    { pz: 'Até 180 dias',    d: 180,  ir: isento ? 0 : 0.225 },
    { pz: '181–360 dias',    d: 360,  ir: isento ? 0 : 0.200 },
    { pz: '361–720 dias',    d: 720,  ir: isento ? 0 : 0.175 },
    { pz: 'Acima 720 dias',  d: 1440, ir: isento ? 0 : 0.150 },
  ];

  document.getElementById('ir-res').innerHTML = `
    <table>
      <thead><tr><th>Prazo</th><th class="tr">Bruto</th><th class="tr">IR</th><th class="tr">Líquido</th><th class="tr">Líq. % a.a.</th></tr></thead>
      <tbody>${rows.map(r => {
        const bruto   = val * Math.pow(1 + taxa / 100, r.d / 365) - val;
        const irVal   = isento ? 0 : bruto * r.ir;
        const liq     = bruto - irVal;
        const liqAnual = ((val + liq) / val) ** (365 / r.d) - 1;
        return `<tr>
          <td>${r.pz}</td>
          <td class="tr">${fmt(bruto)}</td>
          <td class="tr ${r.ir > 0 ? 'down' : 'up'}">${isento ? 'Isento' : fmt(irVal)}</td>
          <td class="tr up">${fmt(liq)}</td>
          <td class="tr up">${fmtP(liqAnual * 100)}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
}

// ── FIRE ─────────────────────────────────────────────────────
function calcFIRE() {
  const apos   = parseFloat(document.getElementById('fire-apos').value)   || 0;
  const taxa   = parseFloat(document.getElementById('fire-taxa').value)   || 4;
  const atual  = parseFloat(document.getElementById('fire-atual').value)  || 0;
  const aporte = parseFloat(document.getElementById('fire-aporte').value) || 0;
  const rent   = parseFloat(document.getElementById('fire-rent').value)   || 10;

  const fireNum = (apos * 12 * 100) / taxa;
  const mensal  = rent / 100 / 12;
  let meses = 0, saldo = atual;

  if (aporte > 0 && saldo < fireNum) {
    while (saldo < fireNum && meses < 1200) { saldo = saldo * (1 + mensal) + aporte; meses++; }
  }

  const anos = Math.ceil(meses / 12);
  const pct  = Math.min(100, (atual / fireNum) * 100);

  document.getElementById('fire-res').innerHTML = `
    <div class="fire-result">
      <div class="fire-row"><span>Número FIRE</span><strong class="green">${fmt(fireNum)}</strong></div>
      <div class="fire-row"><span>Patrimônio atual</span><span>${fmt(atual)}</span></div>
      <div class="fire-row"><span>Faltam</span><span class="am">${fmt(Math.max(0, fireNum - atual))}</span></div>
      <div class="pbar mt6"><div class="pfill" style="width:${pct}%"></div></div>
      <div class="right dim" style="font-size:.68rem;margin-top:2px">${pct.toFixed(1)}% da meta</div>
      ${meses > 0 ? `<div class="fire-row mt6"><span>Tempo estimado</span><strong class="blue">${anos} anos (${meses} meses)</strong></div>` : ''}
      <div class="info-${pct >= 100 ? 'green' : 'amber'} mt8" style="font-size:.74rem;">
        ${pct >= 100 ? '🎉 Você já atingiu o FIRE!' : `⏳ Com ${fmt(aporte)}/mês a ${taxa}% de retirada, aposentadoria estimada em ~${anos} anos.`}
      </div>
    </div>`;
}

// ── Preço Teto ───────────────────────────────────────────────
function calcPrecoTeto() {
  const divA = parseFloat(document.getElementById('pt-div').value) || 0;
  const dy1  = parseFloat(document.getElementById('pt-dy').value)  || 6;
  const dy2  = parseFloat(document.getElementById('pt-dy2').value) || 8;
  if (!divA) { document.getElementById('pt-res').textContent = 'Informe o dividendo anual.'; return; }

  const teto1 = divA / (dy1 / 100);
  const teto2 = divA / (dy2 / 100);

  document.getElementById('pt-res').innerHTML = `
    <div class="sim-grid2">
      <div class="sim-card green tc">
        <div class="sim-lbl">Preço Teto Mínimo (DY ${dy1}%)</div>
        <div class="sim-val lg">${fmt(teto1)}</div>
        <div class="dim" style="font-size:.7rem">Abaixo → compra interessante</div>
      </div>
      <div class="sim-card amber tc">
        <div class="sim-lbl">Preço Justo (DY ${dy2}%)</div>
        <div class="sim-val lg am">${fmt(teto2)}</div>
        <div class="dim" style="font-size:.7rem">Acima → preço esticado</div>
      </div>
    </div>
    <div class="dim mt8" style="font-size:.75rem">Fórmula: Preço Teto = Dividendo Anual ÷ DY Mínimo</div>`;
}

// ── Poder de Compra ──────────────────────────────────────────
function calcPP() {
  const v    = parseFloat(document.getElementById('pp1').value) || 0;
  const inf  = parseFloat(document.getElementById('pp2').value) || 0;
  const anos = parseInt(document.getElementById('pp3').value)   || 0;
  const rent = parseFloat(document.getElementById('pp4').value) || 0;

  const futuro     = v * Math.pow(1 + inf / 100, anos);
  const futuroCart = v * Math.pow(1 + rent / 100, anos);
  const real       = ((futuroCart / futuro) - 1) * 100;

  document.getElementById('ppRes').innerHTML = `
    <div class="fire-result">
      <div class="fire-row"><span>Hoje vale</span><strong class="green">${fmt(v)}</strong></div>
      <div class="fire-row"><span>Em ${anos}a os custos serão</span><strong class="down">${fmt(futuro)}</strong></div>
      <div class="fire-row"><span>Carteira valerá</span><strong class="blue">${fmt(futuroCart)}</strong></div>
      <div class="info-${real >= 0 ? 'green' : 'red'} mt8" style="font-size:.75rem;">
        ${real >= 0 ? '✅' : '❌'} Retorno real: <strong>${(real >= 0 ? '+' : '') + real.toFixed(1)}%</strong><br>
        ${real >= 0 ? 'Sua carteira preservou e aumentou o poder de compra.' : 'Sua carteira não acompanhou a inflação.'}
      </div>
    </div>`;
}
