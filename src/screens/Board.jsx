import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { ArrowRight, Flag, SlidersHorizontal, Trophy } from 'lucide-react';
import RulesModal from '../components/RulesModal';
import Button from '../components/Button';
import PlayerChip, { colorFor } from '../components/PlayerChip';
import PointTile from '../components/PointTile';
import { useGame } from '../store';
import { qKey } from '../lib/quiz';
import { burst } from '../lib/confetti';
import { sfx } from '../lib/sound';

export default function Board() {
  const g = useGame();
  const { round } = g;
  const pr = round ? g.progress(round) : null;
  const fired = useRef(false);
  const [rules, setRules] = useState(false);

  useEffect(() => { if (!round) g.go('rounds'); }, [round]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (pr?.complete && !fired.current) { fired.current = true; burst(); sfx.win(); }
  }, [pr?.complete]);
  if (!round) return null;

  const res = g.results[round.id] || {};
  const nextRound = g.rounds.find((r) => r.id !== round.id && !g.progress(r).complete);

  return (
    <div className="wide board">
      <div className="titlebar">
        <div>
          <h1 className="h1">{round.title}</h1>
          <p className="muted"><b>{pr.done}</b> of {pr.total} played</p>
        </div>
        <div className="players-row">
          {g.units.map((u) => <PlayerChip key={u.id} player={u} index={u.idx} score={g.scores[u.id]} compact leader={g.leaders.some((l) => l.id === u.id)} streak={g.options.streak.on ? g.streak[u.id] : 0} />)}
          <button className="icon-btn icon-btn--label rules-btn" onClick={() => setRules(true)} aria-label="Game rules"><SlidersHorizontal size={18} /> <span>Rules</span></button>
        </div>
      </div>
      <div className="kente" />

      <div className="grid" style={{ '--cols': round.categories.length }}>
        {round.categories.map((cat, ci) => (
          <section key={cat.id} className="col glass">
            <h2 className="col__head" title={cat.name}>{cat.short}</h2>
            <div className="col__tiles">
              {cat.questions.map((q, qi) => {
                const entry = res[qKey(ci, qi)];
                return (
                  <PointTile key={q.id} points={q.points} entry={entry} label={cat.short}
                    color={entry?.playerId ? colorFor(g.units, g.unitOf(entry.playerId)) : undefined}
                    delay={0.03 * ci + 0.05 * qi}
                    onClick={() => { sfx.open(); g.openQuestion(ci, qi); }} />
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {pr.complete && (
        <motion.div className="complete glass" initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 20 }}>
          <div><h2>Round complete</h2><p className="muted">{g.leaders.length ? `${g.leaders.map((l) => l.name).join(' & ')} ${g.leaders.length > 1 ? 'lead' : 'leads'} with ${g.top} points.` : 'Nobody has scored yet.'}</p></div>
          <div className="complete__actions">
            {nextRound && <Button icon={<ArrowRight size={18} />} onClick={() => g.pickRound(nextRound.id)}>Next: {nextRound.title}</Button>}
            <Button variant="secondary" icon={<Trophy size={18} />} onClick={() => g.go('scores')}>Scoreboard</Button>
            <Button variant="ghost" icon={<Flag size={18} />} onClick={() => g.go(nextRound ? 'rounds' : 'final')}>{nextRound ? 'All rounds' : 'Finish game'}</Button>
          </div>
        </motion.div>
      )}
      <RulesModal open={rules} onClose={() => setRules(false)} />
    </div>
  );
}
