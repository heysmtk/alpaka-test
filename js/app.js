// Obrazovky: Spustit testování, Historie, Kalkulačka. Body se počítají jen v scoring.js.
import {
  DISCIPLINES, MAX_POINTS, MAX_POINTS_PER_DISCIPLINE,
  pointsFor, totalPoints, rankFor, nextRank, nextPointAt, workingLoad, toSeconds, formatTime,
} from './scoring.js';
import { loadDraft, saveDraft, clearDraft } from './storage.js';

const view = document.getElementById('view');
const LAST = DISCIPLINES.length - 1;

// ---------- Pomocné funkce ----------

// Vytvoří element. Texty se vkládají jako textové uzly (nikdy innerHTML).
function el(tag, props = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) node.append(kid);
  return node;
}

// České skloňování: 1 bod, 2–4 body, 5 bodů
const plural = (n, one, few, many) => (n === 1 ? one : n >= 2 && n <= 4 ? few : many);
const bodu = (n) => `${n} ${plural(n, 'bod', 'body', 'bodů')}`;

function formatValue(d, v) {
  if (d.unit === 'time') return formatTime(v);
  if (d.unit === 'meters') return `${v} m`;
  return String(v);
}

// Text "další bod za …"
function nextPointText(d, value) {
  const next = nextPointAt(d.id, value);
  if (next === null) return 'plný počet bodů!';
  const what = d.unit === 'reps' ? `${next} opakování` : formatValue(d, next);
  return `další bod za ${what}`;
}

// Textové pole jen pro číslice. onChange dostane číslo (prázdné = 0).
function digitsInput({ value, maxLength, label, onChange, className = 'input', decimal = false }) {
  const input = el('input', {
    class: className,
    type: 'text',
    inputmode: decimal ? 'decimal' : 'numeric',
    autocomplete: 'off',
    'aria-label': label,
  });
  input.value = value;
  input.addEventListener('focus', () => input.select());
  input.addEventListener('input', () => {
    const allowed = decimal ? /[^\d.,]/g : /\D/g;
    input.value = input.value.replace(allowed, '').slice(0, maxLength);
    onChange(Number(input.value.replace(',', '.')) || 0);
  });
  return input;
}

function rankLine(rank) {
  return `${rank.emoji} ${rank.name}`;
}

function missingText(total) {
  const next = nextRank(total);
  return next
    ? `Chybí ${bodu(next.missing)} do hodnosti ${next.rank.name}`
    : 'Vyšší hodnost už neexistuje. Gratulace!';
}

// ---------- Spustit testování ----------

let draft = loadDraft();
// Po otevření stránky se rozdělaný test nabídne na startu; po přepnutí záložky se rovnou pokračuje.
let offerResume = true;

function renderTest() {
  if (draft && draft.step === 'result') return renderResult();
  if (draft && !offerResume) return renderExercise();
  return renderStart();
}

function renderStart() {
  const nickInput = el('input', { id: 'nick', class: 'input', type: 'text', inputmode: 'text', maxlength: 30, autocomplete: 'off' });
  const weightInput = el('input', { id: 'weight', class: 'input input-narrow', type: 'text', inputmode: 'decimal', maxlength: 6, autocomplete: 'off' });
  const error = el('div', { class: 'error', role: 'alert' });

  const start = () => {
    const name = nickInput.value.trim();
    const weight = Number(weightInput.value.replace(',', '.'));
    if (!name) { error.textContent = 'Zadej přezdívku.'; nickInput.focus(); return; }
    if (!Number.isFinite(weight) || weight < 30 || weight > 300) {
      error.textContent = 'Zadej tělesnou váhu v kg (30 až 300).';
      weightInput.focus();
      return;
    }
    draft = { nick: name, weight, step: 0, values: {}, started: Date.now() };
    saveDraft(draft);
    offerResume = false;
    renderTest();
  };

  const resume = draft && el('div', { class: 'card card-row' },
    el('span', {}, 'Rozdělaný test: ', el('b', {}, `${draft.nick}, cvik ${draft.step + 1}/${DISCIPLINES.length}`)),
    el('span', {},
      el('button', { type: 'button', class: 'btn-text', onclick: () => { offerResume = false; renderTest(); } }, 'Pokračovat'),
      ' · ',
      el('button', { type: 'button', class: 'btn-text', onclick: () => { draft = null; clearDraft(); renderTest(); } }, 'Zahodit'),
    ),
  );

  view.replaceChildren(el('div', { class: 'page start' },
    el('h1', {}, 'Na co máš?'),
    el('p', { class: 'muted' }, `${DISCIPLINES.length} disciplín, max. ${MAX_POINTS} bodů. Dohlížet musí druhá osoba.`),
    el('div', { class: 'field' }, el('label', { for: 'nick' }, 'Přezdívka'), nickInput),
    el('div', { class: 'field field-center' }, el('label', { for: 'weight' }, 'Tělesná váha v kg'), weightInput),
    error,
    el('button', { type: 'button', class: 'btn btn-primary btn-big', onclick: start }, 'Spustit testování'),
    resume,
  ));
}

function goStep(step) {
  draft.step = step;
  saveDraft(draft);
  renderTest();
  window.scrollTo(0, 0);
}

function skippedIndex() {
  return DISCIPLINES.findIndex((d) => draft.values[d.id] == null);
}

function renderExercise() {
  const i = draft.step;
  const d = DISCIPLINES[i];
  const current = () => draft.values[d.id] ?? 0;

  const live = el('div', { class: 'live' });
  const updateLive = () => {
    const v = current();
    live.replaceChildren(
      el('b', {}, bodu(pointsFor(d.id, v))),
      ` z ${MAX_POINTS_PER_DISCIPLINE} · ${nextPointText(d, v)}`,
    );
  };
  const setValue = (v) => {
    draft.values[d.id] = v;
    saveDraft(draft);
    updateLive();
  };

  // Vstup podle typu disciplíny
  let entry;
  if (d.unit === 'time') {
    const minutes = digitsInput({
      value: String(Math.floor(current() / 60)), maxLength: 2, label: 'Minuty', className: 'big-input',
      onChange: () => setValue(toSeconds(minutes.value, seconds.value)),
    });
    const seconds = digitsInput({
      value: String(current() % 60), maxLength: 2, label: 'Sekundy', className: 'big-input',
      onChange: () => setValue(toSeconds(minutes.value, seconds.value)),
    });
    entry = el('div', { class: 'time-pair' },
      el('label', { class: 'time-cell' }, minutes, 'minuty'),
      el('span', { class: 'colon', 'aria-hidden': 'true' }, ':'),
      el('label', { class: 'time-cell' }, seconds, 'sekundy'),
    );
  } else {
    const step = d.unit === 'meters' ? 50 : 1;
    const input = digitsInput({
      value: String(current()), maxLength: d.unit === 'meters' ? 5 : 4,
      label: d.unit === 'meters' ? 'Metry' : 'Počet opakování', className: 'big-input',
      onChange: setValue,
    });
    const change = (delta) => {
      const v = Math.max(0, (Number(input.value) || 0) + delta);
      input.value = String(v);
      setValue(v);
    };
    entry = el('div', { class: 'stepper' },
      el('button', { type: 'button', class: 'btn', 'aria-label': 'Ubrat', onclick: () => change(-step) }, '−'),
      input,
      el('button', { type: 'button', class: 'btn', 'aria-label': 'Přidat', onclick: () => change(step) }, '+'),
    );
  }

  const valueLabel = { reps: 'Počet opakování', time: 'Dosažený čas', meters: 'Uběhnuté metry' }[d.unit];
  const isLast = i === LAST;
  const next = () => {
    draft.values[d.id] = current();
    isLast ? finish() : goStep(i + 1);
  };
  const skip = () => {
    draft.values[d.id] = null;
    isLast ? finish() : goStep(i + 1);
  };

  const progress = el('div', { class: 'progress', role: 'img', 'aria-label': `Cvik ${i + 1} z ${DISCIPLINES.length}` },
    DISCIPLINES.map((x, n) => el('span', {
      class: n === i ? 'current' : typeof draft.values[x.id] === 'number' ? 'done' : '',
    })),
  );

  const overview = el('details', { class: 'overview' },
    el('summary', {}, 'Přehled cviků'),
    el('div', { class: 'overview-list' }, DISCIPLINES.map((x, n) => {
      const v = draft.values[x.id];
      const state = n === i ? 'teď'
        : typeof v === 'number' ? `${pointsFor(x.id, v)} b.`
        : v === null ? 'přeskočeno' : '–';
      return el('button', {
        type: 'button', class: `overview-item${n === i ? ' current' : ''}`, onclick: () => goStep(n),
      }, el('span', {}, `${n + 1}. ${x.short}`), el('span', { class: 'state' }, state));
    })),
  );
  if (window.matchMedia('(min-width: 900px)').matches) overview.open = true;

  const exercise = el('section', { class: 'exercise' },
    progress,
    el('div', { class: 'step-label' }, `Cvik ${i + 1} z ${DISCIPLINES.length}`),
    el('h1', {}, d.name),
    (d.id === 'bench' || d.id === 'squat') && el('div', { class: 'load' },
      'Nalož ', el('b', {}, `${workingLoad(draft.weight)} kg`), ` (80 % z ${draft.weight} kg)`),
    el('div', { class: 'value-label' }, valueLabel),
    entry,
    live,
    el('div', { class: 'nav-buttons' },
      el('button', { type: 'button', class: 'btn btn-primary', onclick: next }, isLast ? 'Dokončit' : 'Další cvik'),
      el('div', { class: 'row' },
        el('button', { type: 'button', class: 'btn', disabled: i === 0, onclick: () => goStep(i - 1) }, 'Zpět'),
        el('button', { type: 'button', class: 'btn', onclick: skip }, 'Přeskočit'),
      ),
    ),
  );

  updateLive();
  view.replaceChildren(el('div', { class: 'page test' }, exercise, overview));
}

function finish() {
  goStep('result');
}

function renderResult() {
  const results = Object.fromEntries(DISCIPLINES.map((d) => [d.id, draft.values[d.id] ?? 0]));
  const total = totalPoints(results);
  const skipped = skippedIndex();

  const rows = DISCIPLINES.map((d) => {
    const v = draft.values[d.id];
    return el('div', { class: 'row-line' },
      el('span', {}, d.short),
      el('span', {},
        v == null
          ? el('span', { class: 'val skipped' }, 'přeskočeno')
          : el('span', { class: 'val' }, formatValue(d, v)),
        el('b', {}, `${pointsFor(d.id, results[d.id])} b.`),
      ),
    );
  });

  view.replaceChildren(
    el('section', { class: 'hero' },
      el('div', {}, `${draft.nick}, tvoje hodnost je`),
      el('div', { class: 'rank' }, rankLine(rankFor(total))),
      el('div', { class: 'score' }, String(total), el('small', {}, ` / ${MAX_POINTS}`)),
      el('div', { class: 'missing' }, missingText(total)),
    ),
    el('div', { class: 'result-body' },
      el('div', { class: 'rows' }, rows),
      skipped >= 0 && el('div', { class: 'card' }, 'Některé cviky jsi přeskočil/a, počítají se jako 0 bodů.'),
      skipped >= 0
        ? el('button', { type: 'button', class: 'btn btn-primary', onclick: () => goStep(skipped) }, 'Vrátit se k přeskočeným')
        : el('button', { type: 'button', class: 'btn', onclick: () => goStep(0) }, 'Upravit výsledky'),
      el('button', {
        type: 'button', class: skipped >= 0 ? 'btn' : 'btn btn-primary',
        onclick: () => { draft = null; clearDraft(); offerResume = false; renderTest(); window.scrollTo(0, 0); },
      }, 'Nový test'),
    ),
  );
}

// ---------- Historie (placeholder do fáze 3) ----------

function renderHistory() {
  view.replaceChildren(el('div', { class: 'page start' },
    el('h1', {}, 'Historie testů'),
    el('p', { class: 'muted' }, 'Přijde v další fázi: uložené testy, mazání a export do CSV.'),
  ));
}

// ---------- Kalkulačka ----------

// Zůstává jen v paměti, dokud se stránka nenačte znovu. Nic se neukládá.
const calc = { weight: 0, values: {} };

function renderCalc() {
  const scoreEl = el('div', { class: 'score' });
  const rankEl = el('div', { class: 'rank' });
  const missingEl = el('div', { class: 'missing' });
  const loadEl = el('div', { class: 'note' });
  const badges = {};

  const update = () => {
    const total = totalPoints(calc.values);
    scoreEl.replaceChildren(String(total), el('small', {}, ` / ${MAX_POINTS}`));
    rankEl.textContent = rankLine(rankFor(total));
    missingEl.textContent = missingText(total);
    loadEl.textContent = calc.weight > 0
      ? `Bench a dřep: nalož ${workingLoad(calc.weight)} kg (80 % z ${calc.weight} kg)`
      : 'Zadej váhu a ukážu ti zátěž na bench a dřep.';
    for (const d of DISCIPLINES) badges[d.id].textContent = `${pointsFor(d.id, calc.values[d.id])} b.`;
  };

  const rows = DISCIPLINES.map((d) => {
    const v = calc.values[d.id] ?? 0;
    const initial = v ? String(v) : '';
    const minus = (onclick) => el('button', { type: 'button', class: 'btn btn-step', 'aria-label': `${d.short}: ubrat`, onclick }, '−');
    const plus = (onclick) => el('button', { type: 'button', class: 'btn btn-step', 'aria-label': `${d.short}: přidat`, onclick }, '+');
    let inputs;
    if (d.unit === 'time') {
      const sync = () => { calc.values[d.id] = toSeconds(minutes.value, seconds.value); update(); };
      const minutes = digitsInput({
        value: v ? String(Math.floor(v / 60)) : '', maxLength: 2, label: `${d.short} – minuty`, onChange: sync,
      });
      const seconds = digitsInput({
        value: v ? String(v % 60) : '', maxLength: 2, label: `${d.short} – sekundy`, onChange: sync,
      });
      // Tlačítka mění čas po 10 s (tak se mění body)
      const change = (delta) => {
        const total = Math.max(0, toSeconds(minutes.value, seconds.value) + delta);
        minutes.value = String(Math.floor(total / 60));
        seconds.value = String(total % 60);
        sync();
      };
      inputs = [
        minus(() => change(-10)), minutes, el('span', { class: 'unit' }, 'min'),
        seconds, el('span', { class: 'unit' }, 's'), plus(() => change(10)),
      ];
    } else {
      const field = digitsInput({
        value: initial, maxLength: d.unit === 'meters' ? 5 : 4, label: d.short,
        onChange: (n) => { calc.values[d.id] = n; update(); },
      });
      if (d.unit === 'reps') {
        const change = (delta) => {
          const n = Math.max(0, (Number(field.value) || 0) + delta);
          field.value = String(n);
          calc.values[d.id] = n;
          update();
        };
        inputs = [minus(() => change(-1)), field, el('span', { class: 'unit' }, 'opak.'), plus(() => change(1))];
      } else {
        inputs = [field, el('span', { class: 'unit' }, 'm')];
      }
    }
    badges[d.id] = el('span', { class: 'pts' });
    return el('div', { class: 'calc-row' },
      el('div', { class: 'head' }, el('span', {}, d.name), badges[d.id]),
      el('div', { class: 'inputs' }, inputs),
    );
  });

  const weight = digitsInput({
    value: calc.weight ? String(calc.weight) : '', maxLength: 6, label: 'Tělesná váha v kg', decimal: true,
    className: 'input input-narrow',
    onChange: (n) => { calc.weight = n; update(); },
  });

  view.replaceChildren(
    el('section', { class: 'calc-result' },
      scoreEl,
      el('div', {}, rankEl, missingEl),
    ),
    el('div', { class: 'page' },
      el('h2', {}, 'Kalkulačka'),
      el('div', { class: 'field field-center' }, el('label', {}, 'Tělesná váha v kg', weight), loadEl),
      el('div', { class: 'calc-grid' }, rows),
    ),
  );
  update();
}

// ---------- Záložky ----------

const routes = { spustit: renderTest, historie: renderHistory, kalkulacka: renderCalc };

function route() {
  const name = location.hash.replace('#/', '');
  const active = name in routes ? name : 'spustit';
  for (const tab of document.querySelectorAll('.tab')) {
    if (tab.dataset.route === active) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  }
  routes[active]();
}

window.addEventListener('hashchange', route);
route();
