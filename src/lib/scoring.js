// Optional rules + scoring. Pure functions, no React. Every rule is OFF by default.
//
// Each answered tile stores an entry:
//   { status, playerId, points, n, events: [{pid, d, k}], used: [{u, t}] }
// `events` is the ledger: k = 'correct' (d > 0) or 'miss' (d <= 0, a wrong answer or a timeout
// while answering). Scores, streaks and used power-ups are all derived from it, so they cannot drift.

export const DEFAULT_OPTIONS = Object.freeze({
  fifty: false,                                  // 50/50 power-up
  skip: false,                                   // skip power-up
  double: false,                                 // double-or-nothing power-up
  streak: { on: false, step: 10, cap: 50 },      // +step% per correct answer in a row, up to +cap%
  penalty: { on: false, pct: 50 },               // a miss costs pct% of the tile
  speed: { on: false, max: 50 },                 // up to +max% for answering quickly
});

export const STREAK_STEPS = [5, 10, 20];
export const STREAK_CAPS = [25, 50, 100];
export const PENALTY_PCTS = [25, 50, 100];
export const SPEED_MAXES = [25, 50, 100];
export const POWER_UPS = ['fifty', 'skip', 'double'];

const pick = (v, allowed, fallback) => (allowed.includes(Number(v)) ? Number(v) : fallback);

/** Merge anything (old save, partial object, junk) into a complete, valid options object. */
export function cleanOptions(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  const d = DEFAULT_OPTIONS;
  return {
    fifty: o.fifty === true, skip: o.skip === true, double: o.double === true,
    streak: { on: o.streak?.on === true, step: pick(o.streak?.step, STREAK_STEPS, d.streak.step), cap: pick(o.streak?.cap, STREAK_CAPS, d.streak.cap) },
    penalty: { on: o.penalty?.on === true, pct: pick(o.penalty?.pct, PENALTY_PCTS, d.penalty.pct) },
    speed: { on: o.speed?.on === true, max: pick(o.speed?.max, SPEED_MAXES, d.speed.max) },
  };
}

export const rulesOnCount = (o) => POWER_UPS.filter((p) => o[p]).length + ['streak', 'penalty', 'speed'].filter((k) => o[k].on).length;
export const anyPowerUp = (o) => POWER_UPS.some((p) => o[p]);

/** Points for a correct answer. streakBefore = correct answers in a row by this unit before this one. */
export function scoreCorrect({ base, streakBefore = 0, fraction = 0, options, doubled = false }) {
  const streakPct = options.streak.on ? Math.min(options.streak.cap, options.streak.step * Math.max(0, streakBefore)) : 0;
  const f = Math.max(0, Math.min(1, fraction));
  const speedPct = options.speed.on ? Math.round(options.speed.max * f) : 0;
  const mult = doubled ? 2 : 1;
  const total = Math.round(base * (1 + (streakPct + speedPct) / 100) * mult);
  return { base, streakPct, speedPct, streakPts: Math.round((base * streakPct) / 100), speedPts: Math.round((base * speedPct) / 100), doubled, total };
}

/** Points change for a miss (zero or negative). Double-or-nothing always risks the full tile. */
export function scoreMiss({ base, options, doubled = false }) {
  if (doubled) return -base;
  if (options.penalty.on) return -Math.round((base * options.penalty.pct) / 100);
  return 0;
}

/* ---------------- teams ---------------- */
export const TEAM_NAMES = ['Team Gold', 'Team Green', 'Team Red'];
export const unitIdOf = (teams, pid) => (teams ? `t${teams.of?.[pid] ?? 0}` : pid);

/** Scoring units: teams when team mode is on, otherwise the players themselves. idx drives the colour. */
export function makeUnits(players, teams) {
  if (!teams) return players.map((p, i) => ({ id: p.id, name: p.name, idx: i, members: [p] }));
  return teams.names
    .map((name, i) => ({ id: `t${i}`, name, idx: i, members: players.filter((p) => (teams.of?.[p.id] ?? 0) === i) }))
    .filter((u) => u.members.length > 0);
}

/** Valid team setup? Needs >= 2 non-empty teams. */
export function validateTeams(players, teams) {
  if (!teams) return '';
  const used = new Set(players.map((p) => teams.of?.[p.id] ?? 0));
  if (used.size < 2) return 'Put players on at least two different teams.';
  const names = teams.names.filter((_, i) => used.has(i)).map((n) => n.trim().toLowerCase());
  if (names.some((n) => !n)) return 'Give every team a name.';
  if (new Set(names).size !== names.length) return 'Each team needs a different name.';
  return '';
}

/* ---------------- ledger -> totals ---------------- */
const legacyEvents = (e) => (e.status === 'correct' && e.playerId ? [{ pid: e.playerId, d: e.points || 0, k: 'correct' }] : []);

export function tally({ results = {}, players = [], teams = null }) {
  const list = [];
  let order = 0;
  Object.entries(results).forEach(([rid, qs]) => Object.values(qs).forEach((e) => list.push({ rid, e, order: order++ })));
  list.sort((a, b) => (a.e.n ?? a.order) - (b.e.n ?? b.order) || a.order - b.order);

  const units = makeUnits(players, teams);
  const pScores = Object.fromEntries(players.map((p) => [p.id, 0]));
  const uScores = Object.fromEntries(units.map((u) => [u.id, 0]));
  const correct = Object.fromEntries(players.map((p) => [p.id, 0]));
  const wrong = { ...correct };
  const byRound = {};
  const streak = Object.fromEntries(units.map((u) => [u.id, 0]));
  const best = { ...streak };
  const used = Object.fromEntries(units.map((u) => [u.id, {}]));

  list.forEach(({ rid, e }) => {
    byRound[rid] ||= Object.fromEntries(units.map((u) => [u.id, 0]));
    (e.events || legacyEvents(e)).forEach((ev) => {
      if (!(ev.pid in pScores)) return;
      const u = unitIdOf(teams, ev.pid);
      pScores[ev.pid] += ev.d; uScores[u] += ev.d; byRound[rid][u] += ev.d;
      if (ev.k === 'correct') { correct[ev.pid]++; streak[u]++; best[u] = Math.max(best[u], streak[u]); }
      else { wrong[ev.pid]++; streak[u] = 0; }
    });
    (e.used || []).forEach((x) => { if (used[x.u]) used[x.u][x.t] = true; });
  });
  return { units, pScores, uScores, byRound, correct, wrong, streak, bestStreak: best, used };
}

export function rankUnits(units, uScores) {
  return units.map((u) => ({ ...u, score: uScores[u.id] ?? 0 })).sort((a, b) => b.score - a.score);
}

/** Totals for a quick-fire game. quick.results[pid] = {score, correct, wrong, passed, answered, best}. */
export function tallyQuick({ quick, players = [], teams = null }) {
  const units = makeUnits(players, teams);
  const res = quick?.results || {};
  const pScores = {}, correct = {}, wrong = {};
  const uScores = Object.fromEntries(units.map((u) => [u.id, 0]));
  const bestStreak = Object.fromEntries(units.map((u) => [u.id, 0]));
  players.forEach((p) => {
    const r = res[p.id] || {};
    const u = unitIdOf(teams, p.id);
    pScores[p.id] = r.score || 0; correct[p.id] = r.correct || 0; wrong[p.id] = r.wrong || 0;
    uScores[u] += r.score || 0; bestStreak[u] = Math.max(bestStreak[u], r.best || 0);
  });
  const used = Object.fromEntries(units.map((u) => [u.id, { ...(quick?.used?.[u.id] || {}) }]));
  return { units, pScores, uScores, byRound: {}, correct, wrong, streak: Object.fromEntries(units.map((u) => [u.id, 0])), bestStreak, used };
}

/** Short human labels for the rules that are on, e.g. for the share image. */
export function describeRules(o, teamsOn = false) {
  const out = [];
  if (o.fifty) out.push('50/50');
  if (o.skip) out.push('Skip');
  if (o.double) out.push('Double or nothing');
  if (o.streak.on) out.push(`Streak +${o.streak.step}% (max +${o.streak.cap}%)`);
  if (o.penalty.on) out.push(`Negative marking ${o.penalty.pct}%`);
  if (o.speed.on) out.push(`Speed bonus up to +${o.speed.max}%`);
  if (teamsOn) out.push('Teams');
  return out;
}
