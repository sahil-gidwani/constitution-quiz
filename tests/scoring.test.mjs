import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const esbuild = process.env.ESBUILD || join(root, 'node_modules/.bin/esbuild');
const dir = mkdtempSync(join(tmpdir(), 'rules-'));
const load = async (name) => {
  const out = join(dir, `${name}.mjs`);
  execFileSync(esbuild, [join(root, `src/lib/${name}.js`), '--bundle', '--format=esm', '--platform=node', `--outfile=${out}`, '--log-level=error']);
  return import(pathToFileURL(out).href);
};
const S = await load('scoring');
const Qf = await load('quickfire');
const B = await load('boards');

const on = (patch = {}) => S.cleanOptions({ ...patch });

test('everything is off by default', () => {
  const o = S.cleanOptions(undefined);
  assert.deepEqual(o, S.DEFAULT_OPTIONS);
  assert.equal(S.rulesOnCount(o), 0);
  assert.equal(S.anyPowerUp(o), false);
  // junk input can never switch a rule on
  assert.equal(S.rulesOnCount(S.cleanOptions({ streak: 'yes', penalty: 1, fifty: 'true', speed: { on: 'true' } })), 0);
});
test('with no rules on, a correct answer is exactly the tile value and a miss costs nothing', () => {
  const o = S.cleanOptions({});
  assert.equal(S.scoreCorrect({ base: 30, streakBefore: 9, fraction: 1, options: o }).total, 30);
  assert.equal(S.scoreMiss({ base: 30, options: o }), 0);
});
test('options values are clamped to the allowed choices', () => {
  const o = S.cleanOptions({ streak: { on: true, step: 77, cap: 1 }, penalty: { on: true, pct: 3 }, speed: { on: true, max: 9999 } });
  assert.deepEqual([o.streak.step, o.streak.cap, o.penalty.pct, o.speed.max], [10, 50, 50, 50]);
});
test('streak bonus: first answer none, then +step per answer in a row, capped', () => {
  const o = on({ streak: { on: true, step: 10, cap: 25 } });
  const t = (s) => S.scoreCorrect({ base: 100, streakBefore: s, options: o }).total;
  assert.deepEqual([0, 1, 2, 3, 4, 8].map(t), [100, 110, 120, 125, 125, 125]);
});
test('speed bonus scales with time left and rounds sensibly', () => {
  const o = on({ speed: { on: true, max: 50 } });
  const t = (f) => S.scoreCorrect({ base: 20, fraction: f, options: o }).total;
  assert.deepEqual([t(0), t(0.5), t(1), t(7)], [20, 25, 30, 30]);
});
test('streak, speed and double combine: base x (1 + streak + speed) x 2', () => {
  const o = on({ streak: { on: true, step: 10, cap: 50 }, speed: { on: true, max: 50 } });
  const r = S.scoreCorrect({ base: 40, streakBefore: 2, fraction: 1, options: o, doubled: true });
  assert.equal(r.total, Math.round(40 * (1 + (20 + 50) / 100) * 2)); // 136
  assert.deepEqual([r.streakPct, r.speedPct, r.doubled], [20, 50, true]);
});
test('negative marking costs a share of the tile; double-or-nothing risks the whole tile', () => {
  assert.equal(S.scoreMiss({ base: 30, options: on({ penalty: { on: true, pct: 50 } }) }), -15);
  assert.equal(S.scoreMiss({ base: 30, options: on({ penalty: { on: true, pct: 25 } }) }), -8); // 7.5 rounds up
  assert.equal(S.scoreMiss({ base: 30, options: on(), doubled: true }), -30);
  assert.equal(S.scoreMiss({ base: 30, options: on({ penalty: { on: true, pct: 25 } }), doubled: true }), -30);
});

const players = [{ id: 'p1', name: 'Ama' }, { id: 'p2', name: 'Kojo' }, { id: 'p3', name: 'Efua' }, { id: 'p4', name: 'Yaw' }];
const ev = (pid, d, k) => ({ pid, d, k });
test('tally: scores, streaks, misses and used power-ups come from the ledger in order', () => {
  const results = { r1: {
    a: { status: 'correct', playerId: 'p1', points: 10, n: 1, events: [ev('p1', 10, 'correct')] },
    b: { status: 'correct', playerId: 'p1', points: 22, n: 2, events: [ev('p2', -5, 'miss'), ev('p1', 22, 'correct')], used: [{ u: 'p1', t: 'fifty' }] },
    c: { status: 'missed', playerId: null, points: 0, n: 3, events: [ev('p1', 0, 'miss')] },
    d: { status: 'correct', playerId: 'p1', points: 10, n: 4, events: [ev('p1', 10, 'correct')] },
  } };
  const t = S.tally({ results, players: players.slice(0, 2) });
  assert.deepEqual([t.pScores.p1, t.pScores.p2], [42, -5]);
  assert.equal(t.streak.p1, 1); // reset by the miss on c, then one more correct
  assert.equal(t.bestStreak.p1, 2);
  assert.deepEqual([t.correct.p1, t.wrong.p1, t.wrong.p2], [3, 1, 1]);
  assert.deepEqual(t.used.p1, { fifty: true });
  assert.equal(t.byRound.r1.p1, 42);
});
test('tally: old saves without events still score the winner', () => {
  const t = S.tally({ results: { r1: { a: { status: 'correct', playerId: 'p2', points: 30 }, b: { status: 'skipped', playerId: null, points: 0 } } }, players: players.slice(0, 2) });
  assert.deepEqual([t.pScores.p1, t.pScores.p2], [0, 30]);
});
test('teams: scores roll up per team, streaks and power-ups belong to the team', () => {
  const teams = { names: ['Gold', 'Green', 'Red'], of: { p1: 0, p2: 1, p3: 0, p4: 1 } };
  const results = { r1: {
    a: { status: 'correct', playerId: 'p1', points: 10, n: 1, events: [ev('p1', 10, 'correct')] },
    b: { status: 'correct', playerId: 'p3', points: 20, n: 2, events: [ev('p3', 20, 'correct')], used: [{ u: 't0', t: 'skip' }] },
    c: { status: 'missed', playerId: null, points: 0, n: 3, events: [ev('p2', -4, 'miss')] },
  } };
  const t = S.tally({ results, players, teams });
  assert.deepEqual(t.units.map((u) => u.id), ['t0', 't1']); // empty third team is dropped
  assert.deepEqual([t.uScores.t0, t.uScores.t1], [30, -4]);
  assert.equal(t.streak.t0, 2); // p1 and p3 both feed the team streak
  assert.deepEqual(t.used.t0, { skip: true });
  assert.deepEqual([t.pScores.p1, t.pScores.p3], [10, 20]); // individual contributions kept
});
test('validateTeams needs two real, distinctly named teams', () => {
  assert.match(S.validateTeams(players, { names: ['A', 'B'], of: { p1: 0, p2: 0, p3: 0, p4: 0 } }), /two different teams/);
  assert.match(S.validateTeams(players, { names: ['A', 'a'], of: { p1: 0, p2: 1, p3: 0, p4: 1 } }), /different name/);
  assert.equal(S.validateTeams(players, { names: ['A', 'B'], of: { p1: 0, p2: 1, p3: 0, p4: 1 } }), '');
  assert.equal(S.validateTeams(players, null), '');
});

const rounds = [
  { id: 'r1', title: 'One', categories: [
    { id: 'r1-1', name: 'Alpha topic', short: 'Alpha', questions: [{ id: 'r1-1-1', points: 10, type: 'multiple-choice', question: 'Q1', options: ['a', 'b'], answer: 'a' }, { id: 'r1-1-2', points: 20, type: 'fill-in', question: 'Q2', options: [], answer: 'x' }] },
    { id: 'r1-2', name: 'Beta', questions: [{ id: 'r1-2-1', points: 10, type: 'multiple-choice', question: 'Q3', options: ['c', 'd'], answer: 'c' }] } ] },
  { id: 'r2', title: 'Two', categories: [{ id: 'r2-1', name: 'Gamma', short: 'Gamma', questions: [{ id: 'r2-1-1', points: 10, type: 'multiple-choice', question: 'Q4', options: ['e', 'f'], answer: 'e' }] }] },
];
test('quick-fire pool: only multiple-choice questions of the chosen rounds', () => {
  assert.equal(Qf.buildPool(rounds, ['r1', 'r2']).length, 3);
  assert.equal(Qf.buildPool(rounds, ['r2']).length, 1);
  assert.equal(Qf.buildPool(rounds, []).length, 0);
});
test('quick-fire order is deterministic per seed and complete', () => {
  const pool = Array.from({ length: 50 }, (_, i) => i);
  assert.deepEqual(Qf.seededOrder(pool, 7), Qf.seededOrder(pool, 7));
  assert.notDeepEqual(Qf.seededOrder(pool, 7), Qf.seededOrder(pool, 8));
  assert.deepEqual([...Qf.seededOrder(pool, 7)].sort((a, b) => a - b), pool);
  assert.equal(Qf.pickQuestion([1, 2, 3], 4), 2); // wraps
  assert.equal(Qf.pickQuestion([], 0), null);
});
test('board builder: copies picked categories from any rounds, with fresh unique ids', () => {
  const b = B.buildBoard(rounds, [{ roundId: 'r2', catId: 'r2-1' }, { roundId: 'r1', catId: 'r1-1' }], '  Mix  ');
  assert.equal(b.title, 'Mix');
  assert.deepEqual(b.categories.map((c) => c.short), ['Gamma', 'Alpha']);
  assert.ok(b.built && b.custom);
  const ids = b.categories.flatMap((c) => c.questions.map((q) => q.id));
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((id) => id.startsWith(b.id)));
  b.categories[1].questions[0].options.push('zzz'); // a copy, not a reference
  assert.equal(rounds[0].categories[0].questions[0].options.length, 2);
});
test('board builder rejects empty, oversized and unknown picks', () => {
  assert.throws(() => B.buildBoard(rounds, []), /at least one/);
  assert.throws(() => B.buildBoard(rounds, Array(9).fill({ roundId: 'r1', catId: 'r1-1' })), /at most 8/);
  assert.throws(() => B.buildBoard(rounds, [{ roundId: 'r1', catId: 'nope' }]), /no longer exists/);
  assert.equal(B.randomPicks(rounds, 5).length, 3);
  assert.equal(B.randomPicks(rounds, 2).length, 2);
});
test('quick-fire tally sums per player and per team, keeps best streak and used power-ups', () => {
  const quick = { results: { p1: { score: 50, correct: 6, wrong: 1, best: 4 }, p2: { score: 20, correct: 3, wrong: 2, best: 2 }, p3: { score: 10, correct: 1, wrong: 0, best: 1 } }, used: { t0: { fifty: true } } };
  const teams = { names: ['Gold', 'Green'], of: { p1: 0, p2: 1, p3: 0, p4: 1 } };
  const t = S.tallyQuick({ quick, players, teams });
  assert.deepEqual([t.uScores.t0, t.uScores.t1], [60, 20]);
  assert.deepEqual([t.bestStreak.t0, t.bestStreak.t1], [4, 2]);
  assert.deepEqual(t.used.t0, { fifty: true });
  assert.equal(S.tallyQuick({ quick: null, players }).pScores.p1, 0);
});
test('describeRules lists only what is on', () => {
  assert.deepEqual(S.describeRules(S.cleanOptions({})), []);
  assert.deepEqual(S.describeRules(S.cleanOptions({ fifty: true, penalty: { on: true, pct: 25 } }), true), ['50/50', 'Negative marking 25%', 'Teams']);
});
