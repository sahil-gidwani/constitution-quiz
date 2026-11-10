import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Home, RotateCcw, Share2, Trophy } from 'lucide-react';
import Button from '../components/Button';
import Podium from '../components/Podium';
import Breakdown from '../components/Breakdown';
import ShareModal from '../components/ShareModal';
import AnimatedNumber from '../components/AnimatedNumber';
import { useGame } from '../store';
import { celebrate } from '../lib/confetti';
import { sfx } from '../lib/sound';
import { describeRules } from '../lib/scoring';

const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);

export default function Final() {
  const g = useGame();
  const single = g.mode === 'single';
  const [share, setShare] = useState(false);
  const right = sum(g.correct), wrong = sum(g.wrong), answered = right + wrong;
  const acc = answered ? Math.round((right / answered) * 100) : 0;
  const best = Math.max(0, ...Object.values(g.bestStreak));

  useEffect(() => {
    if (!g.hasGame) { g.go('home'); return undefined; }
    if (g.top <= 0) return undefined;
    sfx.win();
    return celebrate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const title = !g.hasGame ? '' : g.top === 0 ? 'Game over' : single ? `Well played, ${g.players[0].name}` : g.leaders.length > 1 ? "It's a tie" : `${g.leaders[0].name} wins`;
  const shareData = useMemo(() => !g.hasGame ? null : ({
    title: g.top === 0 ? 'Game over' : single ? `${g.players[0].name}: ${g.top} points` : g.leaders.length > 1 ? "It's a tie" : `${g.leaders[0].name} wins`,
    subtitle: `${single ? 'Solo' : `${g.players.length} players`} · ${g.format === 'quick' ? `Quick-fire ${g.quick?.duration}s` : 'Board game'}${g.hasTeams ? ` · ${g.units.length} teams` : ''}`,
    rows: g.ranked.map((u) => ({ name: u.name, score: u.score, idx: u.idx })),
    stats: [{ label: 'Correct', value: right }, { label: 'Answered', value: answered }, { label: 'Accuracy', value: `${acc}%` }, ...(g.options.streak.on || g.format === 'quick' ? [{ label: 'Best streak', value: best }] : [])],
    rules: describeRules(g.options, g.hasTeams),
    footer: window.location.host,
  }), [g.hasGame, g.ranked, g.options, g.hasTeams, right, answered, acc, best]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!g.hasGame) return null;

  return (
    <div className="narrow final">
      <motion.div className="final__crown" initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }}><Trophy size={34} /></motion.div>
      <motion.h1 className="h1 final__title" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>{title}</motion.h1>
      {single ? (
        <div className="solo glass">
          <div className="solo__score"><AnimatedNumber value={g.top} duration={1.4} /><small>points</small></div>
          <dl><div><dt>Correct</dt><dd>{right}</dd></div><div><dt>Answered</dt><dd>{answered}</dd></div><div><dt>Accuracy</dt><dd>{acc}%</dd></div>{(g.options.streak.on || g.format === 'quick') && <div><dt>Best streak</dt><dd>{best}</dd></div>}</dl>
        </div>
      ) : (
        <Podium ranked={g.ranked} players={g.units} />
      )}
      <Breakdown />
      <div className="actions">
        <Button size="lg" icon={<RotateCcw size={18} />} onClick={g.rematch}>Play again, same players</Button>
        <Button size="lg" variant="secondary" icon={<Share2 size={18} />} onClick={() => setShare(true)}>Share result</Button>
        <Button size="lg" variant="secondary" icon={<Home size={18} />} onClick={g.endGame}>New game</Button>
      </div>
      <ShareModal open={share} onClose={() => setShare(false)} data={shareData} />
    </div>
  );
}
