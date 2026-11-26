// Bodovací logika: disciplíny, body, hodnosti. Jediné místo, kde se body počítají.

export const MAX_POINTS_PER_DISCIPLINE = 10;

// Body za opakování: floor(x / dělitel), max. 10
const byReps = (divisor) => (x) => Math.floor(x / divisor);

// Body za čas (plank, hyperextenze): pod 90 s = 0, jinak 1 + floor((s - 90) / 10)
const byTime = (s) => (s < 90 ? 0 : 1 + Math.floor((s - 90) / 10));

// Body za Cooperův běh: pod 2100 m = 0, jinak 1 + floor((m - 2100) / 100)
const byDistance = (m) => (m < 2100 ? 0 : 1 + Math.floor((m - 2100) / 100));

// short: krátký název do seznamů; unit: 'reps' (opakování), 'time' (sekundy), 'meters' (metry)
export const DISCIPLINES = [
  { id: 'pullups',  name: 'Shyby nadhmatem',     short: 'Shyby', unit: 'reps',   points: byReps(2) },
  { id: 'legraise', name: 'Vznosy',              short: 'Vznosy', unit: 'reps',   points: byReps(2) },
  { id: 'bench',    name: 'Bench press 80 %',    short: 'Bench press', unit: 'reps',   points: byReps(4) },
  { id: 'squat',    name: 'Dřep 80 %',           short: 'Dřep', unit: 'reps',   points: byReps(4) },
  { id: 'dips',     name: 'Kliky na bradlech',   short: 'Bradla', unit: 'reps',   points: byReps(3) },
  { id: 'plank',    name: 'Plank',               short: 'Plank', unit: 'time',   points: byTime },
  { id: 'hyper',    name: 'Hyperextenze',        short: 'Hyperextenze', unit: 'time',   points: byTime },
  { id: 'cooper',   name: 'Cooperův běh',        short: 'Cooperův běh', unit: 'meters', points: byDistance },
];

export const MAX_POINTS = DISCIPLINES.length * MAX_POINTS_PER_DISCIPLINE; // 80

// Od nejvyšší. Názvy jsou záměrné, neměnit.
export const RANKS = [
  { min: 70, name: 'Magoři a psychopati', emoji: '🔥' },
  { min: 55, name: 'Vrcholoví sportovci', emoji: '🏆' },
  { min: 45, name: 'Hobby sportovci',     emoji: '💪' },
  { min: 35, name: 'Sluníčkáři',          emoji: '☀️' },
  { min: 25, name: 'Zdechliny',           emoji: '💀' },
  { min: 10, name: 'Retardi',             emoji: '🤪' },
  { min: 0,  name: 'Alpaky',              emoji: '🦙' },
];

// Neplatná hodnota (prázdné, záporné, NaN) = 0; desetinná část se zahodí.
function clean(value) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function getDiscipline(id) {
  return DISCIPLINES.find((d) => d.id === id);
}

// Body za jednu disciplínu (0–10). Neznámé ID vyhodí chybu.
export function pointsFor(id, value) {
  const d = getDiscipline(id);
  if (!d) throw new Error(`Neznámá disciplína: ${id}`);
  return Math.min(MAX_POINTS_PER_DISCIPLINE, d.points(clean(value)));
}

// Od kolika opakování / sekund / metrů je další bod; null, když už je plný počet bodů.
export function nextPointAt(id, value) {
  const v = clean(value);
  const now = pointsFor(id, v);
  if (now >= MAX_POINTS_PER_DISCIPLINE) return null;
  for (let x = v + 1; x <= v + 5000; x++) {
    if (pointsFor(id, x) > now) return x;
  }
  return null;
}

// results: { pullups: 12, plank: 125, ... }; chybějící disciplína = 0 bodů.
export function pointsByDiscipline(results) {
  const out = {};
  for (const d of DISCIPLINES) out[d.id] = pointsFor(d.id, results?.[d.id]);
  return out;
}

export function totalPoints(results) {
  return Object.values(pointsByDiscipline(results)).reduce((a, b) => a + b, 0);
}

export function rankFor(total) {
  return RANKS.find((r) => total >= r.min) ?? RANKS[RANKS.length - 1];
}

// Další vyšší hodnost a kolik bodů chybí; u nejvyšší hodnosti null.
export function nextRank(total) {
  const higher = RANKS.filter((r) => r.min > total);
  if (higher.length === 0) return null;
  const next = higher[higher.length - 1]; // nejbližší vyšší
  return { rank: next, missing: next.min - total };
}

// Zátěž na bench a dřep = 80 % tělesné váhy, zaokrouhleno na 0,5 kg.
export function workingLoad(bodyWeightKg) {
  const w = Number(bodyWeightKg);
  if (!Number.isFinite(w) || w <= 0) return 0;
  return Math.round(w * 0.8 * 2) / 2;
}

// Minuty + sekundy → sekundy (pro pole zadávaná zvlášť).
export function toSeconds(minutes, seconds) {
  return clean(minutes) * 60 + clean(seconds);
}

// Sekundy → "m:ss"
export function formatTime(totalSeconds) {
  const s = clean(totalSeconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
