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
