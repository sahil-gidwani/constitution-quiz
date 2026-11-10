import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Crosshair, Flame, Send, SkipForward, Swords, Zap } from 'lucide-react';
import Button from '../components/Button';
import Modal from '../components/Modal';
import TimerRing from '../components/TimerRing';
import PlayerChip, { colorFor } from '../components/PlayerChip';
import { useGame } from '../store';
import { useToast } from '../components/Toast';
import { useCountdown } from '../lib/useCountdown';
import { MULTI_MAIN_SECONDS, MULTI_PLAYER_SECONDS, SINGLE_SECONDS, isCorrect, isFillIn, mediaFor, qKey, shuffledOptions } from '../lib/quiz';
import { anyPowerUp, scoreCorrect, scoreMiss } from '../lib/scoring';
import { burst } from '../lib/confetti';
import { sfx } from '../lib/sound';

/** Outer shell: finds the question. The body is keyed by question id so each question starts from clean state. */
export default function Question() {
  const g = useGame();
  const cat = g.round?.categories[g.activeQ?.c];
  const q = cat?.questions[g.activeQ?.q];
  useEffect(() => { if (!q) g.go('board'); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!q) return null;
  return <Body key={q.id} g={g} cat={cat} q={q} ci={g.activeQ.c} qi={g.activeQ.q} />;
}

const signed = (n) => (n > 0 ? `+${n}` : `${n}`);

function Body({ g, cat, q, ci, qi }) {
  const toast = useToast();
  const { players, round, options: opts } = g;
  const single = g.mode === 'single';
  const fill = isFillIn(q);
  const key = qKey(ci, qi);
  const media = mediaFor(q.image);
  const unitOf = g.unitOf;

  const [options] = useState(() => (fill ? [] : shuffledOptions(q)));
  const [phase, setPhaseState] = useState(single ? 'answer' : 'buzz'); // buzz | answer | revealed
  const [activeId, setActiveState] = useState(single ? players[0].id : null);
  const [attempted, setAttempted] = useState([]);
  const [struck, setStruck] = useState([]);
  const [removed, setRemoved] = useState([]);   // options taken away by 50/50
  const [armed, setArmedState] = useState(false); // double-or-nothing armed
  const [usedNow, setUsedNow] = useState([]);   // power-ups spent on this question: [{u, t}]
  const [picked, setPicked] = useState(null);
  const [outcome, setOutcome] = useState(null); // {status, playerId, parts, misses}
  const [typed, setTyped] = useState('');

  // Refs mirror state so handlers fired in the same tick (double tap, timer + click) always see the latest values.
  const phaseRef = useRef(phase);
  const activeRef = useRef(activeId);
  const armedRef = useRef(false);
  const usedRef = useRef([]);
  const eventsRef = useRef([]);          // ledger entries for this question
  const missedUnits = useRef(new Set()); // units that already missed here (their streak is broken)
  const setPhase = (p) => { phaseRef.current = p; setPhaseState(p); };
  const setActive = (id) => { activeRef.current = id; setActiveState(id); };
  const setArmed = (v) => { armedRef.current = v; setArmedState(v); };
  const spend = (u, t) => { usedRef.current = [...usedRef.current, { u, t }]; setUsedNow(usedRef.current); };

  const main = useCountdown(() => onMainExpire());
  const player = useCountdown(() => onPlayerExpire());

  useEffect(() => {
    if (single) player.start(SINGLE_SECONDS * 1000); else main.start(MULTI_MAIN_SECONDS * 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nameOf = (id) => players.find((p) => p.id === id)?.name ?? '';
  const unitName = (u) => g.units.find((x) => x.id === u)?.name ?? '';
  const hasPower = (u, t) => !!opts[t] && !g.used[u]?.[t] && !usedRef.current.some((x) => x.u === u && x.t === t);

  function reveal(status, pid, parts = null, sound = true) {
    if (phaseRef.current === 'revealed') return;
    setPhase('revealed');
    main.stop(); player.stop();
    const events = eventsRef.current;
    const win = events.find((e) => e.k === 'correct');
    setOutcome({ status, playerId: pid, parts, misses: events.filter((e) => e.k === 'miss' && e.d < 0) });
    g.resolve(round.id, key, { status, playerId: pid || null, points: win ? win.d : 0, events, used: usedRef.current });
    if (status === 'correct') { sfx.correct(); burst(); } else if (sound) sfx.timeout();
  }

  /** The acting player missed (wrong answer, or ran out of time while answering). */
  function recordMiss(pid) {
    const u = unitOf(pid);
    const doubled = armedRef.current;
    const d = scoreMiss({ base: q.points, options: opts, doubled });
    eventsRef.current = [...eventsRef.current, { pid, d, k: 'miss' }];
    missedUnits.current.add(u);
    if (doubled) { spend(u, 'double'); setArmed(false); }
    return d;
  }

  function nextAfterMiss(pid) {
    const next = [...attempted, pid];
    setAttempted(next);
    player.stop();
    setTyped(''); setArmed(false);
    if (next.length >= players.length) { reveal('missed', null, null, false); return; }
    setPhase('buzz'); setActive(null);
    main.resume();
  }

  function onMainExpire() { if (phaseRef.current === 'buzz') reveal('missed', null); }
  function onPlayerExpire() {
    if (phaseRef.current !== 'answer') return;
    const pid = activeRef.current;
    const d = recordMiss(pid);
    if (single) { reveal('missed', null); return; }
    sfx.timeout(); toast(`${nameOf(pid)} ran out of time${d < 0 ? ` (${signed(d)})` : ''}`, 'error');
    nextAfterMiss(pid);
  }

  function buzz(pid) {
    if (phaseRef.current !== 'buzz' || attempted.includes(pid) || g.leaveAsk) return;
    main.pause(); setActive(pid); setPhase('answer'); player.start(MULTI_PLAYER_SECONDS * 1000); sfx.buzz();
  }

  function answer(value) {
    if (phaseRef.current !== 'answer' || g.leaveAsk) return;
    const pid = activeRef.current;
    const u = unitOf(pid);
    if (isCorrect(q, value)) {
      const doubled = armedRef.current;
      const streakBefore = missedUnits.current.has(u) ? 0 : g.streak[u] || 0;
      const sc = scoreCorrect({ base: q.points, streakBefore, fraction: player.duration ? player.ms / player.duration : 0, options: opts, doubled });
      eventsRef.current = [...eventsRef.current, { pid, d: sc.total, k: 'correct' }];
      if (doubled) spend(u, 'double');
      setPicked(value); reveal('correct', pid, sc); return;
    }
    sfx.wrong(); setPicked(value); setStruck((s) => [...s, value]);
    const d = recordMiss(pid);
    if (single) { reveal('missed', null, null, false); return; }
    toast(`${nameOf(pid)} missed${d < 0 ? ` (${signed(d)})` : ''}`, 'error');
    nextAfterMiss(pid);
  }

  /* ----- power-ups (all opt-in; the buttons only exist when the host switched them on) ----- */
  const wrongLeft = () => options.filter((o) => !isCorrect(q, o) && !struck.includes(o) && !removed.includes(o));
  function usePower(t) {
    if (phaseRef.current !== 'answer' || g.leaveAsk) return;
    const pid = activeRef.current, u = unitOf(pid);
    if (!hasPower(u, t) && !(t === 'double' && armedRef.current)) return;
    sfx.click();
    if (t === 'double') { setArmed(!armedRef.current); return; }
    if (t === 'fifty') {
      const w = wrongLeft();
      if (fill || w.length < 2) return;
      const drop = [...w].sort(() => Math.random() - 0.5).slice(0, w.length - 1);
      setRemoved((r) => [...r, ...drop]); spend(u, 'fifty'); return;
    }
    if (t === 'skip') {
      spend(u, 'skip'); setArmed(false);
      if (single) { reveal('skipped', null); return; }
      toast(`${nameOf(pid)} passed`, 'info');
      nextAfterMiss(pid);
    }
  }

  // Pause the clocks while the "leave?" dialog is open; resume afterwards.
  useEffect(() => {
    if (phase === 'revealed') return;
    if (g.leaveAsk) { main.pause(); player.pause(); }
    else if (phase === 'answer') player.resume(); else main.resume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.leaveAsk]);
  useEffect(() => { if (g.leaveAsk && phase === 'revealed') g.closeQuestion(); }, [g.leaveAsk, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = phase === 'answer' ? player : main;
  useEffect(() => {
    if (phase !== 'revealed' && !g.leaveAsk && shown.seconds > 0 && shown.seconds <= 5) sfx.tick();
  }, [shown.seconds, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const crossed = (o) => struck.includes(o) || removed.includes(o);
  const keys = useRef(null);
  keys.current = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || g.leaveAsk) return;
    const typing = e.target instanceof HTMLElement && e.target.matches('input, textarea');
    if (phase === 'revealed') {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); g.closeQuestion(); }
      return;
    }
    if (typing) return;
    const k = e.key.toLowerCase();
    if (phase === 'buzz' && /^[1-5]$/.test(k) && players[+k - 1]) buzz(players[+k - 1].id);
    else if (phase === 'answer' && !fill) {
      const idx = 'abcd'.indexOf(k) >= 0 ? 'abcd'.indexOf(k) : /^[1-4]$/.test(k) ? +k - 1 : -1;
      if (idx >= 0 && options[idx] && !crossed(options[idx])) answer(options[idx]);
    }
  };
  useEffect(() => {
    const h = (e) => keys.current(e);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const forfeit = () => { g.resolve(round.id, key, { status: 'skipped', playerId: null, points: 0, events: eventsRef.current, used: usedRef.current }); g.closeQuestion(); };

  const revealed = phase === 'revealed';
  const winner = outcome?.status === 'correct' ? outcome.playerId : null;
  const won = outcome?.parts?.total ?? q.points;
  const status = revealed
    ? outcome.status === 'skipped' ? 'Skipped. The answer is shown below.'
      : winner ? (single ? `Correct. ${signed(won)} points` : `${nameOf(winner)} got it. ${signed(won)} points`)
      : (single ? (picked ? 'Not quite. The answer is shown below.' : "Time's up. The answer is shown below.") : 'Nobody scored this one.')
    : phase === 'answer' ? (single ? 'Your answer' : `${nameOf(activeId)}, you're up`)
      : 'Buzzers open. Who knows it?';
  const ringLabel = single ? 'sec' : phase === 'answer' ? 'to answer' : 'to buzz';
  const urgent = shown.seconds <= (phase === 'answer' && !single ? 4 : 5);

  // power-up tray: shows for whoever is answering
  const actor = single ? players[0].id : activeId;
  const actorUnit = actor ? unitOf(actor) : null;
  const power = [
    ['fifty', Crosshair, '50/50', 'Remove two wrong answers'],
    ['skip', SkipForward, single ? 'Skip' : 'Pass', single ? 'Skip this question, no penalty' : 'Pass it on, no penalty'],
    ['double', Swords, 'Double or nothing', `Correct pays double. Wrong loses ${q.points}`],
  ].filter(([t]) => opts[t]);
  const streakNow = actorUnit && opts.streak.on && !missedUnits.current.has(actorUnit) ? g.streak[actorUnit] || 0 : 0;

  return (
    <div className="narrow q">
      <div className="q__meta">
        <span className="tag">{cat.short}</span>
        <span className="tag tag--gold">{q.points} pts</span>
        {armed && !revealed && <span className="tag tag--hot"><Swords size={14} /> Double or nothing</span>}
        {opts.streak.on && actorUnit && !revealed && streakNow >= 1 && <span className="tag tag--hot"><Flame size={14} /> Streak {streakNow} · +{Math.min(opts.streak.cap, opts.streak.step * streakNow)}%</span>}
      </div>

      <div className="q__head">
        <p className={`q__status ${winner ? 'is-good' : revealed ? 'is-bad' : ''}`} aria-live="polite">{status}</p>
        {!revealed && <TimerRing seconds={shown.seconds} fraction={shown.duration ? shown.ms / shown.duration : 0} label={ringLabel} urgent={urgent} />}
      </div>

      {g.hasTeams && (
        <div className="teamstrip" aria-label="Team scores">
          {g.units.map((u) => <PlayerChip key={u.id} player={u} index={u.idx} score={g.scores[u.id]} compact active={actorUnit === u.id && !revealed} />)}
        </div>
      )}

      {!single && (
        <div className="buzzers" role="group" aria-label="Buzzers">
          {players.map((p, i) => {
            const out = attempted.includes(p.id), on = activeId === p.id && !revealed;
            const unit = g.units.find((u) => u.id === unitOf(p.id));
            return (
              <motion.button key={p.id} className={`buzzer ${on ? 'is-on' : ''} ${out ? 'is-out' : ''}`} disabled={phase !== 'buzz' || out}
                whileTap={{ scale: 0.92 }} animate={on ? { scale: 1.06 } : { scale: 1 }} onClick={() => buzz(p.id)} aria-label={`${p.name} buzz in`}>
                <PlayerChip player={p} index={unit?.idx ?? i} score={g.hasTeams ? undefined : g.pScores[p.id]} active={on} out={out} compact />
                {phase === 'buzz' && !out && <span className="buzzer__hint"><Zap size={12} /> {i + 1}</span>}
              </motion.button>
            );
          })}
        </div>
      )}

      {power.length > 0 && !revealed && (
        <div className="powerbar" role="group" aria-label={actorUnit ? `Power-ups for ${unitName(actorUnit)}` : 'Power-ups'}>
          <span className="powerbar__who">{actorUnit ? (g.hasTeams || !single ? unitName(actorUnit) : 'Power-ups') : 'Power-ups'}</span>
          {power.map(([t, Icon, label, tip]) => {
            const have = actorUnit ? hasPower(actorUnit, t) : false;
            const isArmed = t === 'double' && armed;
            const cannot = phase !== 'answer' || (!have && !isArmed) || (t === 'fifty' && (fill || wrongLeft().length < 2));
            const spent = actorUnit && !have && !isArmed;
            return (
              <button key={t} type="button" className={`power ${isArmed ? 'is-armed' : ''}`} disabled={cannot} aria-pressed={t === 'double' ? isArmed : undefined}
                title={phase !== 'answer' ? 'Buzz in first' : spent ? 'Already used' : tip} onClick={() => usePower(t)}>
                <Icon size={16} /> {label}{spent && <small>used</small>}
              </button>
            );
          })}
        </div>
      )}

      <motion.div className={`qcard glass ${armed && !revealed ? 'qcard--armed' : ''}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
        {media && <div className="qcard__media">{media.kind === 'video' ? <video src={media.src} controls autoPlay playsInline /> : <img src={media.src} alt="" />}</div>}
        <h2 className="qcard__text">{q.question}</h2>

        {fill ? (
          revealed ? (
            <div className="answer-reveal"><small>Answer</small><b>{q.answer}</b></div>
          ) : (
            <form className="fillbox" onSubmit={(e) => { e.preventDefault(); if (typed.trim()) answer(typed); }}>
              <input value={typed} onChange={(e) => setTyped(e.target.value)} disabled={phase !== 'answer'} autoFocus={single}
                placeholder={phase === 'answer' ? 'Type your answer' : 'Buzz in to answer'} aria-label="Your answer" autoComplete="off" />
              <Button type="submit" icon={<Send size={18} />} disabled={phase !== 'answer' || !typed.trim()} silent>Submit</Button>
            </form>
          )
        ) : (
          <div className="opts">
            {options.map((o, i) => {
              const right = revealed && isCorrect(q, o);
              const wrong = o === picked && !right && (revealed || struck.includes(o));
              const dim = revealed && !right && !wrong;
              const cross = !revealed && crossed(o);
              return (
                <motion.button key={o} className={`opt ${right ? 'is-right' : ''} ${wrong ? 'is-wrong' : ''} ${dim ? 'is-dim' : ''} ${cross ? 'is-struck' : ''}`}
                  initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.07 }}
                  whileHover={phase === 'answer' && !cross ? { x: 4 } : undefined} whileTap={phase === 'answer' && !cross ? { scale: 0.98 } : undefined}
                  disabled={phase !== 'answer' || cross} onClick={() => answer(o)}>
                  <b>{right ? <Check size={16} strokeWidth={3} /> : 'ABCD'[i]}</b><span>{o}</span>
                </motion.button>
              );
            })}
          </div>
        )}
      </motion.div>

      {revealed && (
        <motion.div className="q__foot" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          {winner && !single && <span className="winner-badge" style={{ '--c': colorFor(g.units, unitOf(winner)) }}>{nameOf(winner)} {signed(won)}</span>}
          {outcome?.parts && (outcome.parts.streakPts > 0 || outcome.parts.speedPts > 0 || outcome.parts.doubled) && (
            <ul className="parts" aria-label="How the points add up">
              <li>{outcome.parts.base} tile</li>
              {outcome.parts.streakPts > 0 && <li className="parts--streak">+{outcome.parts.streakPts} streak</li>}
              {outcome.parts.speedPts > 0 && <li className="parts--speed">+{outcome.parts.speedPts} speed</li>}
              {outcome.parts.doubled && <li className="parts--double">×2 double</li>}
            </ul>
          )}
          {outcome?.misses?.length > 0 && (
            <ul className="parts" aria-label="Points lost">
              {outcome.misses.map((m, i) => <li key={i} className="parts--loss">{nameOf(m.pid)} {signed(m.d)}</li>)}
            </ul>
          )}
          <Button size="lg" icon={<ArrowRight size={20} />} onClick={() => g.closeQuestion()} autoFocus>Back to the board</Button>
          <small className="hint">or press Space</small>
        </motion.div>
      )}

      <Modal open={g.leaveAsk && !revealed} title="Leave this question?" onClose={g.cancelLeave}
        actions={<><Button variant="secondary" onClick={g.cancelLeave}>Keep playing</Button><Button variant="danger" onClick={forfeit}>Leave and forfeit</Button></>}>
        The tile will be marked as skipped and nobody scores. The clock is paused until you choose.
      </Modal>
    </div>
  );
}
