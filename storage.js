// ═══════════════════════════════════════════════════════════════
// storage.js — Data layer: Firebase Firestore + localStorage fallback
//
// Usage:
//   import { db } from './storage.js';
//   await db.get('stocks')
//   await db.set('stocks', [...])
//   await db.del('stocks')
//
// Firebase is used when the user is authenticated.
// Falls back to localStorage for offline/unauthenticated use.
// ═══════════════════════════════════════════════════════════════

import { FIREBASE_CONFIG } from './config.js';

// ── Firebase SDK (loaded from CDN in index.html) ─────────────
let _firestore = null;
let _auth      = null;
let _uid       = null;
let _useFirebase = false;

export async function initStorage() {
  if (FIREBASE_CONFIG.apiKey === 'YOUR_API_KEY') {
    console.info('[storage] Firebase not configured — using localStorage.');
    return;
  }
  try {
    const { initializeApp }     = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
    const { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs }
                                 = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const { getAuth, onAuthStateChanged, signInWithEmailAndPassword,
            createUserWithEmailAndPassword, signOut }
                                 = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');

    const app  = initializeApp(FIREBASE_CONFIG);
    _firestore = getFirestore(app);
    _auth      = getAuth(app);

    // Expose auth helpers globally so auth.js can call them
    window._fbAuth = {
      signIn:    (email, pw) => signInWithEmailAndPassword(_auth, email, pw),
      signUp:    (email, pw) => createUserWithEmailAndPassword(_auth, email, pw),
      signOut:   ()          => signOut(_auth),
    };
    window._fb = { doc, getDoc, setDoc, deleteDoc };

    await new Promise(resolve => {
      onAuthStateChanged(_auth, user => {
        _uid        = user?.uid || null;
        _useFirebase = !!user;
        window._currentUser = user;
        document.dispatchEvent(new CustomEvent('authchange', { detail: { user } }));
        resolve();
      });
    });

    console.info('[storage] Firebase ready. uid:', _uid);
  } catch (e) {
    console.warn('[storage] Firebase init failed — falling back to localStorage.', e);
  }
}

// ── Core API ─────────────────────────────────────────────────

export const db = {
  async get(key) {
    if (_useFirebase && _uid) {
      try {
        const snap = await window._fb.getDoc(
          window._fb.doc(_firestore, 'users', _uid, 'data', key)
        );
        return snap.exists() ? snap.data().value : null;
      } catch (e) {
        console.warn('[db.get] Firestore error, falling back:', e);
      }
    }
    // localStorage fallback
    try { return JSON.parse(localStorage.getItem('fp_' + key)); } catch { return null; }
  },

  async set(key, value) {
    if (_useFirebase && _uid) {
      try {
        await window._fb.setDoc(
          window._fb.doc(_firestore, 'users', _uid, 'data', key),
          { value, updatedAt: new Date().toISOString() }
        );
        return;
      } catch (e) {
        console.warn('[db.set] Firestore error, falling back:', e);
      }
    }
    try { localStorage.setItem('fp_' + key, JSON.stringify(value)); } catch {}
  },

  async del(key) {
    if (_useFirebase && _uid) {
      try {
        await window._fb.deleteDoc(
          window._fb.doc(_firestore, 'users', _uid, 'data', key)
        );
        return;
      } catch (e) {
        console.warn('[db.del] Firestore error, falling back:', e);
      }
    }
    try { localStorage.removeItem('fp_' + key); } catch {}
  },

  isFirebase() { return _useFirebase; },
  getUid()     { return _uid; },
};

// ── Seed defaults if key is missing ─────────────────────────
export async function seedIfEmpty(key, defaultValue) {
  const existing = await db.get(key);
  if (existing === null || existing === undefined) {
    await db.set(key, defaultValue);
  }
}
