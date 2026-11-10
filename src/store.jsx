import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import { BUNDLED_ROUNDS } from './lib/quiz';
import { load, save, clear } from './lib/storage';
import { setMuted } from './lib/sound';
import { DEFAULT_OPTIONS, cleanOptions, makeUnits, rankUnits, tally, tallyQuick, unitIdOf } from './lib/scoring';
import { QUICK_DURATIONS } from './lib/quickfire';

const KEY = 'constitution-quiz:v1';

/**
 * One source of truth. Scores are never stored: they are derived from the ledger
 * (`results` for board games, `quick.results` for quick-fire), so they cannot drift.
 *
 *  results[roundId][`${catIdx}:${qIdx}`] = { status, playerId, points, n, events, used }
 *
 * Optional rules (`options`) and teams are chosen by the players and are all OFF until switched on.
 */
const blank = {
  screen: 'home', format: 'board', mode: null, players: [], teams: null, options: DEFAULT_OPTIONS,
  quick: null, roundId: null, results: {}, seq: 0, custom: [], muted: false,
  activeQ: null, leaveAsk: false, quickLive: false,
};

const validTeams = (t, players) => {
  if (!t || !Array.isArray(t.names) || t.names.length < 2 || typeof t.of !== 'object' || !t.of) return null;
  return players.every((p) => Number.isInteger(t.of[p.id]) && t.of[p.id] >= 0 && t.of[p.id] < t.names.length) ? { names: t.names.map(String), of: t.of } : null;
};

function init() {
  const s = load(KEY, {});
  const players = Array.isArray(s.players) ? s.players : [];
  const results = s.results && typeof s.results === 'object' ? s.results : {};
  const format = s.format === 'quick' ? 'quick' : 'board';
  const st = {
    ...blank,
    format, players, results,
    mode: s.mode === 'single' || s.mode === 'multi' ? s.mode : null,
    teams: validTeams(s.teams, players),
    options: cleanOptions(s.options),
    quick: format === 'quick' && s.quick && typeof s.quick === 'object' ? s.quick : null,
    custom: Array.isArray(s.custom) ? s.custom : [],
    muted: !!s.muted,
    roundId: s.roundId || null,
    screen: s.screen || 'home',
    seq: Math.max(Number(s.seq) || 0, ...Object.values(results).flatMap((r) => Object.values(r).map((e) => e.n || 0))),
  };
  const hasGame = players.length > 0 && st.mode;
  const roundOk = [...BUNDLED_ROUNDS, ...st.custom].some((r) => r.id === st.roundId);
  if (!hasGame) return { ...st, screen: 'home', roundId: null, results: {}, teams: null, quick: null, options: DEFAULT_OPTIONS };
  if (format === 'quick') { if (!st.quick) return { ...st, screen: 'home' }; st.screen = st.screen === 'final' ? 'final' : 'quick'; }
  else if (['board', 'question'].includes(st.screen)) st.screen = roundOk ? 'board' : 'rounds'; // an unfinished question restarts from the board
  else if (['setup', 'builder', 'quick'].includes(st.screen)) st.screen = st.screen === 'setup' ? 'home' : 'rounds';
  return st;
}

const PARENT = { howto: 'home', setup: 'home', rounds: 'home', builder: 'rounds', board: 'rounds', scores: 'board', final: 'home', quick: 'home' };
const newSeed = () => Math.floor(Math.random() * 2 ** 31);

function reducer(s, a) {
  switch (a.type) {
    case 'GO': return { ...s, screen: a.screen, leaveAsk: false, quickLive: false, activeQ: a.screen === 'question' ? s.activeQ : null };
    case 'BACK': {
      if (s.screen === 'question' || (s.screen === 'quick' && s.quickLive)) return { ...s, leaveAsk: true };
      if (s.screen === 'scores') return { ...s, screen: s.roundId ? 'board' : 'rounds' };
      return { ...s, screen: PARENT[s.screen] || s.screen };
    }
    case 'NEW_GAME': {
      const players = a.names.map((name, i) => ({ id: `p${i + 1}`, name }));
      const teams = a.mode === 'multi' && a.teams ? { names: a.teams.names, of: Object.fromEntries(players.map((p, i) => [p.id, a.teams.assign[i] ?? 0])) } : null;
      const quick = a.format === 'quick' ? { duration: QUICK_DURATIONS.includes(a.quick?.duration) ? a.quick.duration : 90, roundIds: a.quick?.roundIds || [], seed: newSeed(), turn: 0, cursor: 0, results: {}, used: {} } : null;
      return { ...s, format: a.format === 'quick' ? 'quick' : 'board', mode: a.mode, players, teams, options: cleanOptions(a.options), quick,
        results: {}, seq: 0, roundId: null, activeQ: null, leaveAsk: false, quickLive: false, screen: quick ? 'quick' : 'rounds' };
    }
    case 'SET_OPTIONS': return { ...s, options: cleanOptions(a.options) };
    case 'PICK_ROUND': return { ...s, roundId: a.id, screen: 'board', activeQ: null };
    case 'OPEN_Q': return { ...s, activeQ: { c: a.c, q: a.q }, screen: 'question', leaveAsk: false };
    case 'RESOLVE': {
      const round = s.results[a.roundId] || {};
      if (round[a.key]) return s; // never double-score
      const n = s.seq + 1;
      return { ...s, seq: n, results: { ...s.results, [a.roundId]: { ...round, [a.key]: { ...a.entry, n } } } };
    }
    case 'CLOSE_Q': return { ...s, activeQ: null, leaveAsk: false, screen: 'board' };
    case 'ASK_LEAVE': return { ...s, leaveAsk: true };
    case 'CANCEL_LEAVE': return { ...s, leaveAsk: false };
    case 'QUICK_LIVE': return s.quickLive === a.live ? s : { ...s, quickLive: a.live };
    case 'QUICK_TURN_DONE': {
      if (!s.quick || s.quick.results[a.pid]) return s; // a turn is only ever recorded once
      const used = { ...s.quick.used };
      (a.used || []).forEach((x) => { used[x.u] = { ...(used[x.u] || {}), [x.t]: true }; });
      const turn = s.quick.turn + 1;
      const quick = { ...s.quick, turn, cursor: a.cursor, used, results: { ...s.quick.results, [a.pid]: a.stats } };
      return { ...s, quick, leaveAsk: false, quickLive: false, screen: turn >= s.players.length ? 'final' : 'quick' };
    }
    case 'REMATCH': {
      const quick = s.quick ? { ...s.quick, seed: newSeed(), turn: 0, cursor: 0, results: {}, used: {} } : null;
      return { ...s, results: {}, seq: 0, quick, roundId: null, activeQ: null, leaveAsk: false, quickLive: false, screen: quick ? 'quick' : 'rounds' };
    }
    case 'END_GAME': return { ...blank, custom: s.custom, muted: s.muted };
    case 'ADD_CUSTOM': return { ...s, custom: [...s.custom, ...a.rounds] };
    case 'REMOVE_CUSTOM': {
      const { [a.id]: _gone, ...rest } = s.results;
      return { ...s, custom: s.custom.filter((r) => r.id !== a.id), results: rest, roundId: s.roundId === a.id ? null : s.roundId };
    }
    case 'TOGGLE_MUTE': return { ...s, muted: !s.muted };
    default: return s;
  }
}

const Ctx = createContext(null);

export function GameProvider({ children }) {
  const [s, dispatch] = useReducer(reducer, undefined, init);

  useEffect(() => { setMuted(s.muted); }, [s.muted]);
  useEffect(() => {
    save(KEY, { format: s.format, mode: s.mode, players: s.players, teams: s.teams, options: s.options, quick: s.quick, roundId: s.roundId, results: s.results, seq: s.seq, custom: s.custom, muted: s.muted, screen: s.screen });
  }, [s.format, s.mode, s.players, s.teams, s.options, s.quick, s.roundId, s.results, s.seq, s.custom, s.muted, s.screen]);

  // Browser/phone back button follows the app's own screen stack instead of leaving the site.
  useEffect(() => {
    if (window.history.state?.screen !== s.screen) window.history.pushState({ screen: s.screen }, '');
  }, [s.screen]);
  useEffect(() => {
    const onPop = () => dispatch({ type: 'BACK' });
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const rounds = useMemo(() => [...BUNDLED_ROUNDS, ...s.custom], [s.custom]);
  const round = useMemo(() => rounds.find((r) => r.id === s.roundId) || null, [rounds, s.roundId]);

  const derived = useMemo(() => {
    const t = s.format === 'quick' ? tallyQuick({ quick: s.quick, players: s.players, teams: s.teams }) : tally({ results: s.results, players: s.players, teams: s.teams });
    const ranked = rankUnits(t.units, t.uScores);
    const top = ranked[0]?.score ?? 0;
    const leaders = ranked.filter((u) => u.score === top && top > 0);
    return { ...t, scores: t.uScores, ranked, top, leaders, hasTeams: !!s.teams };
  }, [s.format, s.quick, s.results, s.players, s.teams]);

  const progress = useCallback((r) => {
    let total = 0; r.categories.forEach((c) => { total += c.questions.length; });
    const done = Object.keys(s.results[r.id] || {}).length;
    return { done, total, complete: total > 0 && done >= total, started: done > 0 };
  }, [s.results]);

  const value = useMemo(() => ({
    ...s, ...derived, rounds, round, progress,
    hasGame: s.players.length > 0 && !!s.mode,
    resumeScreen: s.format === 'quick' ? 'quick' : s.roundId ? 'board' : 'rounds',
    unitOf: (pid) => unitIdOf(s.teams, pid),
    go: (screen) => dispatch({ type: 'GO', screen }),
    back: () => dispatch({ type: 'BACK' }),
    newGame: (cfg) => dispatch({ type: 'NEW_GAME', ...cfg }),
    setOptions: (options) => dispatch({ type: 'SET_OPTIONS', options }),
    pickRound: (id) => dispatch({ type: 'PICK_ROUND', id }),
    openQuestion: (c, q) => dispatch({ type: 'OPEN_Q', c, q }),
    resolve: (roundId, key, entry) => dispatch({ type: 'RESOLVE', roundId, key, entry }),
    closeQuestion: () => dispatch({ type: 'CLOSE_Q' }),
    askLeave: () => dispatch({ type: 'ASK_LEAVE' }),
    cancelLeave: () => dispatch({ type: 'CANCEL_LEAVE' }),
    setQuickLive: (live) => dispatch({ type: 'QUICK_LIVE', live }),
    finishQuickTurn: (pid, stats, cursor, used) => dispatch({ type: 'QUICK_TURN_DONE', pid, stats, cursor, used }),
    rematch: () => dispatch({ type: 'REMATCH' }),
    endGame: () => { dispatch({ type: 'END_GAME' }); },
    addCustom: (r) => dispatch({ type: 'ADD_CUSTOM', rounds: r }),
    removeCustom: (id) => dispatch({ type: 'REMOVE_CUSTOM', id }),
    toggleMute: () => dispatch({ type: 'TOGGLE_MUTE' }),
    wipeSaved: () => clear(KEY),
  }), [s, derived, rounds, round, progress]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGame() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useGame must be used inside <GameProvider>');
  return v;
}
