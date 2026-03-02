// ═══════════════════════════════════════════════════════════════
// config.js — Firebase configuration + app constants
// ═══════════════════════════════════════════════════════════════
// 1. Go to https://console.firebase.google.com
// 2. Create a project → Add web app → Copy the config below
// 3. Enable Firestore Database (test mode to start)
// 4. Enable Authentication → Email/Password

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDwSFDfSpdYMZMH-Jy0FoJ_l0n6xYnu1XI",
  authDomain: "financas-smart.firebaseapp.com",
  projectId: "financas-smart",
  storageBucket: "financas-smart.firebasestorage.app",
  messagingSenderId: "46342923353",
  appId: "1:46342923353:web:5d1cbced9ac393c26d7d48"
};

// ── Default reference rates ──────────────────────────────────
export const DEFAULT_RATES = { ipca: 4.83, cdi: 10.50, igpm: 3.76 };

// ── Default categories ───────────────────────────────────────
export const DEFAULT_CATS = [
  { id: 1, n: 'Alimentação',   c: '#3fb950', a: 1200 },
  { id: 2, n: 'Saúde',         c: '#f85149', a: 300  },
  { id: 3, n: 'Vestuário',     c: '#bc8cff', a: 450  },
  { id: 4, n: 'Lazer',         c: '#d29922', a: 600  },
  { id: 5, n: 'Educação',      c: '#388bfd', a: 900  },
  { id: 6, n: 'Despesas Fixas',c: '#58a6ff', a: 1800 },
  { id: 7, n: 'Transporte',    c: '#39d353', a: 450  },
  { id: 8, n: 'Investimentos', c: '#7ee8a2', a: 900  },
  { id: 9, n: 'Outros',        c: '#8b949e', a: 300  },
];

export const DEFAULT_EMERGENCY  = { current: 12450, goal: 20000, monthly: 3100 };
export const DEFAULT_ALLOC      = { ac: 30, fi: 30, rf: 30, em: 10 };
export const DEFAULT_RENDA      = { sal: 8000, extra: 0 };
export const DEFAULT_FIRE       = { gasto: 5000, taxa: 4 };

export const DEFAULT_STOCKS = [
  { id:1, tk:'PETR4', set:'Petróleo',  qty:100, pm:32.50, px:35.80, pl:5.2, pvp:1.1, ev:3.4, dy:12.5, roe:28.3, mg:18.2, div:0.8, roic:22, diva:4.08 },
  { id:2, tk:'VALE3', set:'Mineração', qty:50,  pm:65.00, px:60.20, pl:4.8, pvp:1.9, ev:4.1, dy:9.8,  roe:24.1, mg:28.5, div:0.8, roic:19, diva:6.37 },
  { id:3, tk:'ITUB4', set:'Bancário',  qty:200, pm:27.00, px:31.50, pl:9.2, pvp:1.7, ev:0,   dy:5.4,  roe:19.8, mg:35.2, div:0,   roic:15, diva:1.46 },
];
export const DEFAULT_FIIS = [
  { id:1, tk:'MXRF11', seg:'Papel',     qty:300, pm:9.85,   px:9.60,   pvp:0.95, dy:12.8, dc:0.10 },
  { id:2, tk:'HGLG11', seg:'Logística', qty:50,  pm:155.00, px:162.00, pvp:0.97, dy:8.2,  dc:1.10 },
  { id:3, tk:'XPML11', seg:'Shoppings', qty:100, pm:105.00, px:112.00, pvp:0.98, dy:9.1,  dc:0.85 },
];
export const DEFAULT_RF = [
  { id:1, nm:'CDB Nubank',     tipo:'CDB',          idx:'CDI',   taxa:100, inv:10000, sal:11200, dt:'2024-06-01', venc:'2026-06-01' },
  { id:2, nm:'Tesouro IPCA+',  tipo:'Tesouro IPCA+',idx:'IPCA+', taxa:6.2, inv:15000, sal:16800, dt:'2023-08-15', venc:'2029-08-15' },
  { id:3, nm:'LCI Inter',      tipo:'LCI',          idx:'CDI',   taxa:90,  inv:8000,  sal:8650,  dt:'2024-03-01', venc:'2025-09-01' },
];
export const DEFAULT_BASKET = [
  { id:1, item:'Cesta Básica',   cat:'Alimentação', old:580,  current:635  },
  { id:2, item:'Plano de Saúde', cat:'Saúde',       old:1200, current:1320 },
  { id:3, item:'Gasolina (L)',   cat:'Transporte',  old:5.50, current:5.90 },
  { id:4, item:'Conta de Luz',   cat:'Habitação',   old:280,  current:310  },
];

// ── Allocation colors & labels ───────────────────────────────
export const ALLOC_COLORS = { ac:'#388bfd', fi:'#3fb950', rf:'#d29922', em:'#bc8cff' };
export const ALLOC_LABELS = { ac:'Ações', fi:'FIIs', rf:'Renda Fixa', em:'Reserva' };
