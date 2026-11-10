import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Crosshair, Flame, Play, SkipForward, Swords, Zap } from 'lucide-react';
import Button from '../components/Button';
import Modal from '../components/Modal';
import TimerRing from '../components/TimerRing';
import PlayerChip from '../components/PlayerChip';
import AnimatedNumber from '../components/AnimatedNumber';
import { useGame } from '../store';
import { useCountdown } from '../lib/useCountdown';
import { isCorrect, shuffledOptions } from '../lib/quiz';
import { buildPool, pickQuestion, QUICK_WINDOW, seededOrder } from '../lib/quickfire';
import { describeRules, scoreCorrect, scoreMiss } from '../lib/scoring';
import { sfx } from '../lib/sound';
import { burst } from '../lib/confetti';

const signed = (n) => (n > 0 ? `+${n}` : `${n}`);

export default function QuickFire() {
  const g = useGame();
  const over = !!g.quick && g.quick.turn >= g.players.length;
  useEffect(() => { if (!g.quick) g.go('home'); else if (over) g.go('final'); }, [g.quick, over]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!g.quick || over) return null;
  return <Turn key={g.quick.turn} g={g} />;
}

function Turn({ g }) {
  const { quick, players, options: opts } = g;
  const pl = players[quick.turn];
  const unit = g.unitOf(pl.id);
  const unitObj = g.units.find((u) => u.id === unit);
  const order = useMemo(() => seededOrder(buildPool(g.rounds, quick.roundIds), quick.seed), [g.rounds, quick.roundIds, quick.seed]);

  const [phase, setPhase] = useState('ready'); // ready | run
  const [idx, setIdx] = useState(quick.cursor);
  const [stats, setStats] = useState({ score: 0, correct: 0, wrong: 0, passed: 0, answered: 0, best: 0 });
  const [streak, setStreak] = useState(0);
  const [fb, setFb] = useState(null);            // feedback after an answer: {ok, picked, delta, parts}
  const [armed, setArmedState] = useState(false);
  const [removed, setRemoved] = useState([]);
  const [usedList, setUsedList] = useState([]);

  const statsRef = useRef(stats); const streakRef = useRef(0); const cursorRef = useRef(quick.cursor);
  const armedRef = useRef(false); const usedRef = useRef([]); const startedAt = useRef(0);
  const finished = useRef(false); const timer = useRef(null); const lock = useRef(false);
  const setArmed = (v) => { armedRef.current = v; setArmedState(v); };

  const clock = useCountdown(() => finish());
  const item = pickQuestion(order, idx);
  const q = item?.q;
  const options = useMemo(() => (q ? shuffledOptions(q) : []), [idx]); // eslint-disable-line react-hooks/exhaustive-deps

  function finish() {
    if (finished.current) return;
    finished.current = true; clearTimeout(timer.current); clock.stop();
    g.finishQuickTurn(pl.id, statsRef.current, cursorRef.current, usedRef.current);
  }
  useEffect(() => () => { clearTimeout(timer.current); g.setQuickLive(false); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function start() {
    sfx.open(); setPhase('run'); g.setQuickLive(true);
    clock.start(quick.duration * 1000); startedAt.current = performance.now();
  }
  useEffect(() => {
    if (phase !== 'run') return;
    if (g.leaveAsk) clock.pause(); else clock.resume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.leaveAsk, phase]);
  useEffect(() => { if (phase === 'run' && !g.leaveAsk && clock.seconds > 0 && clock.seconds <= 5) sfx.tick(); }, [clock.seconds]); // eslint-disable-line react-hooks/exhaustive-deps

  const has = (t) => !!opts[t] && !g.used[unit]?.[t] && !usedRef.current.some((x) => x.t === t);
  const spend = (t) => { usedRef.current = [...usedRef.current, { u: unit, t }]; setUsedList(usedRef.current); };
  const patch = (p) => { statsRef.current = { ...statsRef.current, ...p }; setStats(statsRef.current); };

  function next(delay) {
    cursorRef.current = idx + 1;
    timer.current = setTimeout(() => {
      if (finished.current) return;
      setIdx(idx + 1); setFb(null); setRemoved([]); setArmed(false); lock.current = false; startedAt.current = performance.now();
    }, delay);
  }

  function choose(o) {
    if (phase !== 'run' || fb || lock.current || g.leaveAsk || !q) return;
    lock.current = true;
    const s = statsRef.current;
    const doubled = armedRef.current;
    if (doubled) spend('double');
    if (isCorrect(q, o)) {
      const fraction = Math.max(0, 1 - (performance.now() - startedAt.current) / 1000 / QUICK_WINDOW);
      const sc = scoreCorrect({ base: q.points, streakBefore: streakRef.current, fraction, options: opts, doubled });
      streakRef.current += 1; setStreak(streakRef.current);
      patch({ score: s.score + sc.total, correct: s.correct + 1, answered: s.answered + 1, best: Math.max(s.best, streakRef.current) });
      setFb({ ok: true, picked: o, delta: sc.total, parts: sc }); sfx.correct(); if (streakRef.current % 5 === 0) burst();
      next(750);
    } else {
      const d = scoreMiss({ base: q.points, options: opts, doubled });
      streakRef.current = 0; setStreak(0);
      patch({ score: s.score + d, wrong: s.wrong + 1, answered: s.answered + 1 });
      setFb({ ok: false, picked: o, delta: d }); sfx.wrong();
      next(1400);
    }
  }

  function pass() {
    if (phase !== 'run' || fb || lock.current || g.leaveAsk) return;
    lock.current = true; sfx.click(); setArmed(false);
    patch({ passed: statsRef.current.passed + 1 });
    cursorRef.current = idx + 1;
    setIdx(idx + 1); setRemoved([]); startedAt.current = performance.now(); lock.current = false;
  }

  function power(t) {
    if (phase !== 'run' || fb || g.leaveAsk) return;
    sfx.click();
    if (t === 'double') { if (armedRef.current) setArmed(false); else if (has('double')) setArmed(true); return; }
    if (t === 'fifty') {
      const w = options.filter((o) => !isCorrect(q, o) && !removed.includes(o));
      if (!has('fifty') || w.length < 2) return;
      setRemoved([...w].sort(() => Math.random() - 0.5).slice(0, w.length - 1)); spend('fifty');
    }
  }

  const keys = useRef(null);
  keys.current = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || g.leaveAsk) return;
    const k = e.key.toLowerCase();
    if (phase === 'run') {
      const i = 'abcd'.indexOf(k) >= 0 ? 'abcd'.indexOf(k) : /^[1-4]$/.test(k) ? +k - 1 : -1;
      if (i >= 0 && options[i] && !removed.includes(options[i])) choose(options[i]);
      else if (k === 'p') pass();
    }
  };
  useEffect(() => { const h = (e) => keys.current(e); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, []);

  const rules = describeRules({ ...opts, skip: false }, g.hasTeams);
  const done = Object.keys(quick.results).length;

  if (phase === 'ready') {
    return (
      <div className="narrow qf">
        <motion.div className="qf__ready glass" initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 240, damping: 22 }}>
          {players.length > 1 && <p className="muted">Turn {quick.turn + 1} of {players.length}</p>}
          <PlayerChip player={pl} index={unitObj?.idx ?? quick.turn} />
          <h1 className="h1">{players.length > 1 ? `${pl.name}, you're up` : 'Ready?'}</h1>
          {g.hasTeams && <p className="muted">Playing for {unitObj?.name}</p>}
          <div className="qf__big"><b>{quick.duration}</b><span>seconds</span></div>
          <p className="muted">Answer as many as you can. Pass any question for free.</p>
          {rules.length > 0 && <ul className="parts" aria-label="Rules in play">{rules.map((r) => <li key={r}>{r}</li>)}</ul>}
          <Button size="lg" icon={<Play size={20} />} onClick={start} autoFocus>Start</Button>
        </motion.div>
        {players.length > 1 && (
          <ul className="qf__order">
            {players.map((p, i) => (
              <li key={p.id} className={i === quick.turn ? 'is-now' : ''}><span>{p.name}</span>
                <b>{quick.results[p.id] ? quick.results[p.id].score : i === quick.turn ? 'Next' : done > i ? '' : '·'}</b></li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (!q) return null;
  const power_ = [['fifty', Crosshair, '50/50'], ['double', Swords, 'Double or nothing']].filter(([t]) => opts[t]);
  return (
    <div className="narrow q qf">
      <div className="q__meta">
        <span className="tag">{item.topic}</span>
        <span className="tag tag--gold">{q.points} pts</span>
        {armed && <span className="tag tag--hot"><Swords size={14} /> Double or nothing</span>}
        {opts.streak.on && streak >= 1 && <span className="tag tag--hot"><Flame size={14} /> Streak {streak} · +{Math.min(opts.streak.cap, opts.streak.step * streak)}%</span>}
      </div>

      <div className="q__head">
        <div className="qf__score"><small>{pl.name}</small><b><AnimatedNumber value={stats.score} duration={0.4} /></b><span>{stats.correct} right{stats.wrong ? ` · ${stats.wrong} wrong` : ''}</span></div>
        <TimerRing seconds={clock.seconds} fraction={clock.duration ? clock.ms / clock.duration : 0} label="sec" urgent={clock.seconds <= 10} />
      </div>

      <div className="powerbar" role="group" aria-label="Quick-fire actions">
        {power_.map(([t, Icon, label]) => {
          const isArmed = t === 'double' && armed;
          const cannot = !!fb || (!has(t) && !isArmed) || (t === 'fifty' && options.filter((o) => !isCorrect(q, o) && !removed.includes(o)).length < 2);
          return <button key={t} type="button" className={`power ${isArmed ? 'is-armed' : ''}`} disabled={cannot} aria-pressed={t === 'double' ? isArmed : undefined} onClick={() => power(t)}>
            <Icon size={16} /> {label}{!has(t) && !isArmed && <small>used</small>}</button>;
        })}
        <button type="button" className="power power--pass" disabled={!!fb} onClick={pass}><SkipForward size={16} /> Pass</button>
      </div>

      <motion.div key={idx} className={`qcard glass ${armed ? 'qcard--armed' : ''}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <h2 className="qcard__text">{q.question}</h2>
        <div className="opts">
          {options.map((o, i) => {
            const right = !!fb && isCorrect(q, o);
            const wrong = !!fb && !fb.ok && o === fb.picked;
            const cross = !fb && removed.includes(o);
            return (
              <button key={o} className={`opt ${right ? 'is-right' : ''} ${wrong ? 'is-wrong' : ''} ${fb && !right && !wrong ? 'is-dim' : ''} ${cross ? 'is-struck' : ''}`}
                disabled={!!fb || cross} onClick={() => choose(o)}>
                <b>{right ? <Check size={16} strokeWidth={3} /> : 'ABCD'[i]}</b><span>{o}</span>
              </button>
            );
          })}
        </div>
        <p className={`qf__fb ${fb ? (fb.ok ? 'is-good' : 'is-bad') : ''}`} aria-live="polite">{fb ? (fb.ok ? `Correct ${signed(fb.delta)}` : `Not quite${fb.delta < 0 ? ` ${signed(fb.delta)}` : ''}`) : <Zap size={14} />}</p>
      </motion.div>

      <Modal open={g.leaveAsk} title="End your turn now?" onClose={g.cancelLeave}
        actions={<><Button variant="secondary" onClick={g.cancelLeave}>Keep playing</Button><Button variant="danger" onClick={finish}>End turn</Button></>}>
        Your score so far ({stats.score}) is kept. The clock is paused until you choose.
      </Modal>
    </div>
  );
}
