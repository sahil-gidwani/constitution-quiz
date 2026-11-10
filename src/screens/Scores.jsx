import { motion } from 'framer-motion';
import { ArrowLeft, Flag } from 'lucide-react';
import Button from '../components/Button';
import Podium from '../components/Podium';
import Breakdown from '../components/Breakdown';
import { Avatar, PLAYER_COLORS } from '../components/PlayerChip';
import AnimatedNumber from '../components/AnimatedNumber';
import { useGame } from '../store';

export default function Scores() {
  const g = useGame();
  const max = Math.max(g.top, 1);
  return (
    <div className="narrow">
      <h1 className="h1">Scoreboard</h1>
      <p className="muted center">{g.leaders.length ? `${g.leaders.map((l) => l.name).join(' & ')} ${g.leaders.length > 1 ? 'are' : 'is'} in front with ${g.top} points.` : 'Nobody has scored yet. Pick a tile to get going.'}</p>
      {g.units.length > 1 && g.top > 0 && <Podium ranked={g.ranked} players={g.units} />}
      <ul className="bars">
        {g.ranked.map((p, i) => {
          const color = PLAYER_COLORS[p.idx % PLAYER_COLORS.length];
          return (
            <li key={p.id} className="glass">
              <span className="bars__rank">{i + 1}</span><Avatar name={p.name} color={color} size={34} /><span className="bars__name">{p.name}</span>
              <span className="bars__track"><motion.i style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${Math.max(3, (Math.max(0, p.score) / max) * 100)}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} /></span>
              <b><AnimatedNumber value={p.score} /></b>
            </li>
          );
        })}
      </ul>
      <Breakdown />
      <div className="actions">
        <Button variant="secondary" icon={<ArrowLeft size={18} />} onClick={() => g.back()}>{g.round ? 'Back to the board' : 'Back to rounds'}</Button>
        <Button icon={<Flag size={18} />} onClick={() => g.go('final')}>Finish game</Button>
      </div>
    </div>
  );
}
