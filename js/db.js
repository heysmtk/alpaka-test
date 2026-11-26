// Supabase: přihlášení týmovým heslem a synchronizace historie.
// Hotový test se vždy uloží nejdřív lokálně (storage.js); sem se odesílá až potom.
// Kdykoli něco selže (server neběží, nejsi přihlášený, není internet), test zůstane
// v telefonu s příznakem "čeká na odeslání" a odešle se při další synchronizaci.
import { SUPABASE_URL, SUPABASE_KEY, TEAM_EMAIL, SUPABASE_JS_URL } from './config.js';
import { DISCIPLINES } from './scoring.js';
import { loadTests, saveTests, markSynced, mergeFromServer, needsSync, snapshot } from './storage.js';

const MAX_VALUE = 99999;
const PAGE = 1000;

export const state = {
  ready: false,         // proběhla úvodní kontrola přihlášení
  loggedIn: false,
  offlineUnlock: false, // přihlášení z minula, ale server teď nejde ověřit (offline)
  unavailable: false,   // knihovna supabase-js se nenačetla
  syncing: false,
  lastSync: null,       // Date posledního úspěšného odeslání
  error: null,          // text poslední chyby synchronizace
};

const listeners = new Set();
export const onChange = (fn) => listeners.add(fn);
const emit = () => listeners.forEach((fn) => fn());

// ---------- Převod mezi lokálním záznamem a řádkem v databázi (čisté funkce) ----------

export function testToRow(t) {
  return { id: t.id, created_at: t.created_at, nick: t.nick, results: t.values, deleted_at: t.deleted_at ?? null };
}

// Data ze serveru bereme jako nedůvěryhodná: neplatné hodnoty se zahodí.
export function sanitizeValues(raw) {
  const out = {};
  for (const d of DISCIPLINES) {
    const v = raw?.[d.id];
    out[d.id] = Number.isInteger(v) && v >= 0 && v <= MAX_VALUE ? v : null;
  }
  return out;
}

export function rowToTest(row) {
  if (!row || typeof row.id !== 'string' || typeof row.nick !== 'string') return null;
  const created = new Date(row.created_at);
  if (Number.isNaN(created.getTime())) return null;
  const test = {
    id: row.id,
    created_at: created.toISOString(),
    nick: row.nick.slice(0, 30),
    values: sanitizeValues(row.results),
  };
  if (row.deleted_at) {
    const deleted = new Date(row.deleted_at);
    if (!Number.isNaN(deleted.getTime())) test.deleted_at = deleted.toISOString();
  }
  return test;
}

// ---------- Klient ----------

let client = null;

// supabase-js se načítá až při potřebě, aby appka fungovala i když CDN není dostupné.
async function getClient() {
  if (client) return client;
  try {
    const { createClient } = await import(SUPABASE_JS_URL);
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
    state.unavailable = false;
    client.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && state.loggedIn) {
        state.loggedIn = false;
        emit();
      }
    });
    return client;
  } catch {
    state.unavailable = true;
    return null;
  }
}

const authKeys = () => {
  try {
    return Object.keys(localStorage).filter((k) => /^sb-.*-auth-token$/.test(k));
  } catch {
    return [];
  }
};

function describeError(error) {
  const msg = String(error?.message ?? error ?? '');
  if (/failed to fetch|networkerror|load failed|fetch/i.test(msg) || error?.name === 'AuthRetryableFetchError') {
    return 'Server není dostupný.';
  }
  if (error?.status === 401 || error?.status === 403 || error?.code === '42501') {
    return 'Přihlášení neplatí, odemkni historii znovu.';
  }
  return msg || 'Neznámá chyba.';
}

// ---------- Přihlášení ----------

// Zkontroluje uložené přihlášení. Zavolá se při startu a když se telefon vrátí online.
export async function initDb() {
  const c = await getClient();
  state.offlineUnlock = false;
  if (c) {
    const { data, error } = await c.auth.getSession();
    if (data?.session) {
      state.loggedIn = true;
    } else if (authKeys().length > 0 && (error || !navigator.onLine)) {
      // Přihlášení z minula existuje, jen ho teď nejde ověřit. Historii z telefonu ukážeme.
      state.loggedIn = true;
      state.offlineUnlock = true;
    } else {
      state.loggedIn = false;
    }
  } else if (authKeys().length > 0) {
    state.loggedIn = true;
    state.offlineUnlock = true;
  }
  state.ready = true;
  emit();
  if (state.loggedIn && !state.offlineUnlock) syncNow();
}

// Vrací { ok: true } nebo { ok: false, error: 'wrong' | 'network' | 'limit' | 'unavailable' }.
export async function login(password) {
  const c = await getClient();
  if (!c) return { ok: false, error: 'unavailable' };
  try {
    const { error } = await c.auth.signInWithPassword({ email: TEAM_EMAIL, password });
    if (error) {
      if (error.name === 'AuthRetryableFetchError' || error.status === 0 || error.status >= 500) {
        return { ok: false, error: 'network' };
      }
      return { ok: false, error: error.status === 429 ? 'limit' : 'wrong' };
    }
  } catch {
    return { ok: false, error: 'network' };
  }
  state.loggedIn = true;
  state.offlineUnlock = false;
  emit();
  syncNow();
  return { ok: true };
}

export async function logout() {
  try {
    if (client) await client.auth.signOut({ scope: 'local' });
  } catch {
    // nic, přihlášení smažeme i ručně
  }
  for (const k of authKeys()) {
    try { localStorage.removeItem(k); } catch { /* nic */ }
  }
  state.loggedIn = false;
  state.offlineUnlock = false;
  state.lastSync = null;
  state.error = null;
  emit();
}

// ---------- Synchronizace ----------

let running = null;

// Odešle čekající testy a stáhne ty ze serveru. Souběžná volání sdílí jeden běh.
export function syncNow() {
  if (!running) running = doSync().finally(() => { running = null; });
  return running;
}

async function doSync() {
  if (!state.loggedIn || state.offlineUnlock) return { ok: false, skipped: true };
  const c = await getClient();
  if (!c) return { ok: false, skipped: true };

  state.syncing = true;
  state.error = null;
  emit();
  try {
    // 1) odeslat, co čeká
    const pending = loadTests().filter(needsSync);
    const sent = new Map(pending.map((t) => [t.id, snapshot(t)]));
    for (let i = 0; i < pending.length; i += 200) {
      const rows = pending.slice(i, i + 200).map(testToRow);
      const { error } = await c.from('tests').upsert(rows, { onConflict: 'id' });
      if (error) throw error;
    }
    markSynced(sent);

    // 2) stáhnout ze serveru (včetně smazaných, aby se smazání přeneslo na další telefon)
    const server = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await c.from('tests')
        .select('id,created_at,nick,results,deleted_at')
        .order('created_at').order('id')
        .range(from, from + PAGE - 1);
      if (error) throw error;
      server.push(...data);
      if (data.length < PAGE) break;
    }
    const merged = mergeFromServer(loadTests(), server.map(rowToTest).filter(Boolean));
    saveTests(merged.tests);

    state.lastSync = new Date();
    return { ok: true, pushed: pending.length, added: merged.added, updated: merged.updated };
  } catch (error) {
    state.error = describeError(error);
    return { ok: false, error: state.error };
  } finally {
    state.syncing = false;
    emit();
  }
}

// Odešle brzy po změně (několik změn za sebou se spojí do jedné synchronizace).
let timer = null;
export function queueSync() {
  clearTimeout(timer);
  timer = setTimeout(() => { if (state.loggedIn) syncNow(); }, 500);
}

globalThis.addEventListener?.('online', () => initDb());
