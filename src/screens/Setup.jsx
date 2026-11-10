import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus, ArrowRight, User, Users, LayoutGrid, Zap, ChevronDown, SlidersHorizontal } from 'lucide-react';
import Button from '../components/Button';
import OptionsPanel from '../components/OptionsPanel';
import TeamsPanel from '../components/TeamsPanel';
import { Choice } from '../components/Switch';
import { Avatar, PLAYER_COLORS } from '../components/PlayerChip';
import { useGame } from '../store';
import { useToast } from '../components/Toast';
import { DEFAULT_OPTIONS, TEAM_NAMES, rulesOnCount, validateTeams } from '../lib/scoring';
import { QUICK_DURATIONS, buildPool } from '../lib/quickfire';

const MIN_POOL = 8;

export default function Setup() {
  const g = useGame();
  const toast = useToast();
  const editing = g.hasGame;
  const [mode, setMode] = useState(g.mode || 'single');
  const [format, setFormat] = useState(editing ? g.format : 'board');
  const [count, setCount] = useState(Math.max(2, g.mode === 'multi' ? g.players.length : 2));
  const [names, setNames] = useState(() => Array.from({ length: 5 }, (_, i) => g.players[i]?.name || ''));
  const [options, setOptions] = useState(editing ? g.options : DEFAULT_OPTIONS);
  const [teams, setTeams] = useState(() => ({
    on: !!g.teams, count: g.teams ? g.teams.names.length : 2,
    names: Array.from({ length: 3 }, (_, i) => g.teams?.names[i] || TEAM_NAMES[i]),
    assign: Array.from({ length: 5 }, (_, i) => (g.teams ? g.teams.of[g.players[i]?.id] ?? i % 2 : i % 2)),
  }));
  const [quick, setQuick] = useState(() => ({ duration: g.quick?.duration || 90, roundIds: g.quick?.roundIds?.length ? g.quick.roundIds : g.rounds.map((r) => r.id) }));
  const [openRules, setOpenRules] = useState(editing && rulesOnCount(g.options) > 0);
  const [error, setError] = useState('');

  const active = mode === 'single' ? names.slice(0, 1) : names.slice(0, count);
  const setName = (i, v) => setNames((n) => n.map((x, k) => (k === i ? v.slice(0, 20) : x)));
  const teamsAvailable = mode === 'multi' && count >= 3;
  const teamsOn = teams.on && teamsAvailable;
  const rulesOn = rulesOnCount(options) + (teamsOn ? 1 : 0);
  const pool = useMemo(() => buildPool(g.rounds, quick.roundIds).length, [g.rounds, quick.roundIds]);

  const submit = (e) => {
    e?.preventDefault();
    const clean = active.map((n) => n.trim());
    if (clean.some((n) => !n)) return setError(mode === 'single' ? 'Enter your name to continue.' : 'Give every player a name.');
    if (new Set(clean.map((n) => n.toLowerCase())).size !== clean.length) return setError('Each player needs a different name.');
    let teamCfg = null;
    if (teamsOn) {
      const tc = Math.min(teams.count, 3);
      const cfg = { names: teams.names.slice(0, tc), of: Object.fromEntries(clean.map((_, i) => [`p${i + 1}`, teams.assign[i]])) };
      const bad = validateTeams(clean.map((name, i) => ({ id: `p${i + 1}`, name })), cfg);
      if (bad) { setOpenRules(true); return setError(bad); }
      teamCfg = { names: cfg.names.map((n) => n.trim()), assign: clean.map((_, i) => teams.assign[i]) };
    }
    if (format === 'quick' && pool < MIN_POOL) return setError(`Pick rounds with at least ${MIN_POOL} multiple-choice questions between them.`);
    setError('');
    g.newGame({ mode, names: clean, format, options, teams: teamCfg, quick: format === 'quick' ? quick : null });
    toast(format === 'quick' ? 'Quick-fire ready' : mode === 'single' ? `Good luck, ${clean[0]}!` : `${clean.length} players ready`, 'success');
  };

  const seg = (items, value, set, thumb, label) => {
    const move = (e, i) => {
      const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!d) return;
      e.preventDefault();
      const group = e.currentTarget.parentElement;
      const next = items[(i + d + items.length) % items.length];
      set(next[0]); setError('');
      requestAnimationFrame(() => group.querySelector(`[data-seg="${next[0]}"]`)?.focus());
    };
    return (
      <div className="seg glass" role="radiogroup" aria-label={label}>
        <span className="seg__thumb" aria-hidden="true" style={{ transform: `translateX(${Math.max(0, items.findIndex(([id]) => id === value)) * 100}%)` }} />
        {items.map(([id, text, icon], i) => (
          <button key={id} type="button" role="radio" data-seg={id} aria-checked={value === id} tabIndex={value === id ? 0 : -1}
            className={value === id ? 'is-on' : ''} onClick={() => { set(id); setError(''); }} onKeyDown={(e) => move(e, i)}>
            <span>{icon}{text}</span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <form className="narrow setup" onSubmit={submit} noValidate>
      <h1 className="h1">Who's playing?</h1>
      {seg([['single', 'Solo', <User size={18} key="u" />], ['multi', 'Multiplayer', <Users size={18} key="m" />]], mode, setMode, 'seg-thumb', 'Game mode')}

      <div className="glass setup__card">
        {mode === 'multi' && (
          <div className="stepper">
            <span id="count-label">Players</span>
            <div role="group" aria-labelledby="count-label">
              <button type="button" className="icon-btn" aria-label="Fewer players" disabled={count <= 2} onClick={() => setCount((c) => c - 1)}><Minus size={18} /></button>
              <b aria-live="polite">{count}</b>
              <button type="button" className="icon-btn" aria-label="More players" disabled={count >= 5} onClick={() => setCount((c) => c + 1)}><Plus size={18} /></button>
            </div>
          </div>
        )}
        <div className="names">
          <AnimatePresence initial={false}>
            {active.map((n, i) => (
              <motion.label key={i} className="field" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}>
                <Avatar name={n || '?'} color={PLAYER_COLORS[i]} size={40} />
                <input value={n} onChange={(e) => setName(i, e.target.value)} placeholder={mode === 'single' ? 'Your name' : `Player ${i + 1}`}
                  aria-label={mode === 'single' ? 'Your name' : `Player ${i + 1} name`} autoComplete="off" autoFocus={i === 0} />
              </motion.label>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="setup__block">
        <h2 className="setup__h">Format</h2>
        {seg([['board', 'Board game', <LayoutGrid size={18} key="b" />], ['quick', 'Quick-fire', <Zap size={18} key="q" />]], format, setFormat, 'fmt-thumb', 'Game format')}
        <p className="muted setup__note">{format === 'board' ? 'Pick tiles from a board of topics, one question at a time.' : mode === 'single' ? 'A timed sprint of random questions from across the rounds. No board, just answer.' : 'Each player takes a timed sprint of random questions, one after another. Highest score wins.'}</p>
        {format === 'quick' && (
          <div className="glass setup__card">
            <Choice label={mode === 'single' ? 'Sprint length' : 'Time per player'} value={quick.duration} options={QUICK_DURATIONS.map((d) => ({ value: d, label: `${d}s` }))} onChange={(d) => setQuick((q) => ({ ...q, duration: d }))} />
            <div>
              <div className="pool__head"><span className="choice__label">Questions come from</span>
                <button type="button" className="linkbtn" onClick={() => setQuick((q) => ({ ...q, roundIds: q.roundIds.length === g.rounds.length ? [] : g.rounds.map((r) => r.id) }))}>
                  {quick.roundIds.length === g.rounds.length ? 'Clear all' : 'Select all'}</button></div>
              <div className="pool">
                {g.rounds.map((r) => {
                  const on = quick.roundIds.includes(r.id);
                  return <button key={r.id} type="button" aria-pressed={on} className={on ? 'is-on' : ''} onClick={() => setQuick((q) => ({ ...q, roundIds: on ? q.roundIds.filter((x) => x !== r.id) : [...q.roundIds, r.id] }))}>{r.title}</button>;
                })}
              </div>
              <p className="muted setup__note">{pool} question{pool === 1 ? '' : 's'} in the mix.</p>
            </div>
          </div>
        )}
      </div>

      <div className="setup__block">
        <button type="button" className="acc glass" aria-expanded={openRules} onClick={() => setOpenRules((o) => !o)}>
          <span className="acc__icon"><SlidersHorizontal size={20} /></span>
          <span className="acc__text"><b>Game rules</b><small>{rulesOn ? `${rulesOn} switched on` : 'All off. Optional extras: power-ups, streaks, teams and more.'}</small></span>
          <ChevronDown size={20} className="acc__chev" />
        </button>
        <AnimatePresence initial={false}>
          {openRules && (
            <motion.div className="glass setup__card" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
              <OptionsPanel options={options} onChange={setOptions} quick={format === 'quick'} />
              <h3 className="rules__h">Teams</h3>
              <TeamsPanel value={teams} onChange={setTeams} playerNames={active} available={teamsAvailable} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {error && <p className="error" role="alert">{error}</p>}
      <Button size="lg" block icon={<ArrowRight size={20} />} type="submit">{format === 'quick' ? 'Start quick-fire' : 'Choose a round'}</Button>
    </form>
  );
}
