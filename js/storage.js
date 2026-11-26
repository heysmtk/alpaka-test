// Lokální data v telefonu (localStorage). Když není dostupné, appka funguje dál, jen si nic nepamatuje.

const DRAFT_KEY = 'alpaka.draft.v1';

// Rozdělaný nebo právě dokončený test:
// { nick, weight, step: 0–7 | 'result', values: { <id disciplíny>: číslo | null (přeskočeno) } }
function isValidDraft(d) {
  return (
    d && typeof d === 'object' &&
    typeof d.nick === 'string' &&
    typeof d.weight === 'number' &&
    (d.step === 'result' || (Number.isInteger(d.step) && d.step >= 0 && d.step <= 7)) &&
    d.values && typeof d.values === 'object'
  );
}

export function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return isValidDraft(d) ? d : null;
  } catch {
    return null;
  }
}

export function saveDraft(draft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // nic, není co mazat
  }
}

// ---------- Historie testů ----------

const TESTS_KEY = 'alpaka.tests.v1';

// Záznam: { id, created_at (ISO), nick, values: { <id disciplíny>: číslo | null }, deleted_at? }
// Mazání je "měkké" (deleted_at), omylem smazaný test jde obnovit importem CSV.
function isValidTest(t) {
  return (
    t && typeof t === 'object' &&
    typeof t.id === 'string' && t.id !== '' &&
    typeof t.nick === 'string' &&
    typeof t.created_at === 'string' &&
    t.values && typeof t.values === 'object'
  );
}

export function newId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

// Všechny záznamy včetně smazaných.
export function loadTests() {
  let raw = null;
  try {
    raw = localStorage.getItem(TESTS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) throw new Error('není pole');
    return list.filter(isValidTest);
  } catch {
    // Poškozená data nepřepíšeme potichu, uložíme si je bokem.
    try { if (raw) localStorage.setItem(`${TESTS_KEY}.broken`, raw); } catch { /* nic */ }
    return [];
  }
}

export function saveTests(list) {
  try {
    localStorage.setItem(TESTS_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

// Přidá nový test, nebo přepíše výkony a datum existujícího (smazání zůstane zachované).
export function upsertTest(test) {
  const list = loadTests();
  const i = list.findIndex((t) => t.id === test.id);
  if (i >= 0) list[i] = { ...list[i], ...test };
  else list.push(test);
  return saveTests(list);
}

export function setDeleted(id, deleted) {
  const list = loadTests();
  const t = list.find((x) => x.id === id);
  if (!t) return false;
  if (deleted) t.deleted_at = new Date().toISOString();
  else delete t.deleted_at;
  return saveTests(list);
}

// Sloučí importované testy do existujících (čistá funkce, nic neukládá).
// Nové ID se přidá, smazaný test se stejným ID se obnoví, aktivní duplicit se přeskočí.
export function mergeTests(existing, incoming) {
  const tests = existing.map((t) => ({ ...t }));
  let added = 0, restored = 0, duplicates = 0;
  for (const inc of incoming) {
    const found = tests.find((t) => t.id === inc.id);
    if (!found) {
      tests.push({ ...inc });
      added++;
    } else if (found.deleted_at) {
      delete found.deleted_at;
      restored++;
    } else {
      duplicates++;
    }
  }
  return { tests, added, restored, duplicates };
}
