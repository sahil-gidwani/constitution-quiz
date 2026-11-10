import { Crown, Flame } from 'lucide-react';
import AnimatedNumber from './AnimatedNumber';

export const PLAYER_COLORS = ['#f5c542', '#34d399', '#fb7185', '#60a5fa', '#c084fc'];
// players may be players or scoring units (units carry their own colour index in `idx`).
export const colorFor = (players, id) => {
  const i = players.findIndex((p) => p.id === id);
  return PLAYER_COLORS[(players[i]?.idx ?? Math.max(0, i)) % PLAYER_COLORS.length];
};

export function Avatar({ name, color, size = 36 }) {
  return <span className="avatar" style={{ '--c': color, width: size, height: size, fontSize: size * 0.42 }}>{(name || '?').trim().charAt(0).toUpperCase()}</span>;
}

export default function PlayerChip({ player, index, score, leader, active, out, compact, streak }) {
  const color = PLAYER_COLORS[index % PLAYER_COLORS.length];
  return (
    <div className={`chip ${active ? 'chip--active' : ''} ${out ? 'chip--out' : ''} ${compact ? 'chip--compact' : ''}`} style={{ '--c': color }}>
      <Avatar name={player.name} color={color} size={compact ? 30 : 36} />
      <span className="chip__name">{player.name}{leader && <Crown size={13} aria-label="leading" />}</span>
      {streak >= 2 && <span className="chip__streak" title={`${streak} correct in a row`}><Flame size={12} />{streak}</span>}
      {score !== undefined && <span className="chip__score"><AnimatedNumber value={score} /></span>}
    </div>
  );
}
