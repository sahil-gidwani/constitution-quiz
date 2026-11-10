import { motion } from 'framer-motion';
import { Avatar, PLAYER_COLORS } from './PlayerChip';

const HEIGHT = { 1: 150, 2: 112, 3: 84 };
/** ranked: [{id,name,score}] sorted desc. Shows the top three; the rest are listed beneath. */
export default function Podium({ ranked, players }) {
  const top = ranked.slice(0, 3);
  const order = top.length === 1 ? [0] : top.length === 2 ? [1, 0] : [1, 0, 2];
  const place = (i) => { let p = i + 1; while (p > 1 && ranked[p - 2]?.score === ranked[i].score) p--; return p; };
  return (
    <div className="podium">
      <div className="podium__stage">
        {order.map((i) => {
          const p = top[i], pl = place(i);
          const color = PLAYER_COLORS[players.findIndex((x) => x.id === p.id) % PLAYER_COLORS.length];
          return (
            <motion.div key={p.id} className={`podium__col podium__col--${Math.min(pl, 3)}`}
              initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + (3 - pl) * 0.18, type: 'spring', stiffness: 180, damping: 18 }}>
              <Avatar name={p.name} color={color} size={pl === 1 ? 60 : 48} />
              <span className="podium__name">{p.name}</span>
              <span className="podium__score">{p.score.toLocaleString()} pts</span>
              <motion.div className="podium__block" style={{ '--c': color }} initial={{ height: 0 }} animate={{ height: HEIGHT[Math.min(pl, 3)] }}
                transition={{ delay: 0.15 + (3 - pl) * 0.18, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
                <span>{pl}</span>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
