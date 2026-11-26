// Export a import historie do CSV: středník, UTF-8 s BOM, ID testu proti duplicitám.
import { DISCIPLINES, totalPoints, rankFor } from './scoring.js';

const BOM = '\uFEFF';
const SEP = ';';
const MAX_ROWS = 5000;
const MAX_NICK = 30;

// Čas se v CSV ukládá v sekundách, běh v metrech (Excel by "2:20" přepsal na čas dne).
const headerFor = (d) => (d.unit === 'time' ? `${d.short} (s)` : d.unit === 'meters' ? `${d.short} (m)` : d.short);
export const HEADER = ['ID testu', 'Datum', 'Přezdívka', ...DISCIPLINES.map(headerFor), 'Body', 'Hodnost'];
const FIRST_RESULT_COL = 3;

// Buňka začínající = + - @ (nebo tabulátorem / CR) by se v Excelu mohla vyhodnotit jako vzorec.
// Takové texty dostanou na začátek apostrof; import ho zase odebere.
const DANGEROUS = /^'?[=+\-@\t\r]/;

function escapeCell(value) {
  let s = value == null ? '' : String(value);
  if (DANGEROUS.test(s)) s = `'${s}`;
  if (/[;"\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

function unescapeText(s) {
  return s.startsWith("'") && DANGEROUS.test(s.slice(1)) ? s.slice(1) : s;
}

// Smazané testy se neexportují.
export function testsToCsv(tests) {
  const lines = [HEADER.map(escapeCell).join(SEP)];
  for (const t of tests) {
    if (t.deleted_at) continue;
    const total = totalPoints(t.values);
    lines.push([
      t.id, t.created_at, t.nick,
      ...DISCIPLINES.map((d) => t.values[d.id]),
      total, rankFor(total).name,
    ].map(escapeCell).join(SEP));
  }
  return BOM + lines.join('\r\n') + '\r\n';
}

// Rozdělí text na řádky a buňky (uvozovky, zdvojené uvozovky, nové řádky v buňce).
export function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  const src = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === SEP) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      rows.push(row); row = [];
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ''));
}

function parseResult(d, raw) {
  const s = raw.trim();
  if (s === '') return { value: null };
  if (/^\d{1,5}$/.test(s)) return { value: Number(s) };
  const m = d.unit === 'time' && s.match(/^(\d{1,3}):([0-5]?\d)$/);
  if (m) return { value: Number(m[1]) * 60 + Number(m[2]) };
  return { error: `${d.short}: "${s.slice(0, 12)}" není číslo` };
}

// Vrátí { tests, errors }. Řádky s chybou se přeskočí, ostatní se naimportují.
// Body a hodnost z CSV se ignorují, spočítají se znovu.
export function parseTestsCsv(text) {
  const rows = parseCsv(text);
  if (rows.length === 0) return { tests: [], errors: ['Soubor je prázdný.'] };
  if (unescapeText(rows[0][0].trim()) !== HEADER[0] || rows[0].length < FIRST_RESULT_COL + DISCIPLINES.length) {
    return { tests: [], errors: ['Tohle není export z Alpaka Test (chybí hlavička).'] };
  }
  if (rows.length - 1 > MAX_ROWS) return { tests: [], errors: [`Moc řádků (max. ${MAX_ROWS}).`] };

  const tests = [], errors = [], seen = new Set();
  rows.slice(1).forEach((cells, n) => {
    const line = n + 2;
    const fail = (msg) => errors.push(`Řádek ${line}: ${msg}`);
    if (cells.length < FIRST_RESULT_COL + DISCIPLINES.length) return fail('chybí sloupce');

    const id = unescapeText(cells[0].trim());
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return fail('neplatné ID testu');
    if (seen.has(id)) return fail('ID testu je v souboru dvakrát');
    const date = new Date(unescapeText(cells[1].trim()));
    if (Number.isNaN(date.getTime())) return fail('neplatné datum');
    const nick = unescapeText(cells[2]).replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, MAX_NICK);
    if (!nick) return fail('chybí přezdívka');

    const values = {};
    for (const [k, d] of DISCIPLINES.entries()) {
      const r = parseResult(d, cells[FIRST_RESULT_COL + k]);
      if (r.error) return fail(r.error);
      values[d.id] = r.value;
    }
    seen.add(id);
    tests.push({ id, created_at: date.toISOString(), nick, values });
  });
  return { tests, errors };
}
