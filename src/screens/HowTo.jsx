import { motion } from 'framer-motion';
import { ArrowRight, FileDown } from 'lucide-react';
import Button from '../components/Button';
import { useGame } from '../store';
import { GUIDE_URL } from '../lib/guide';
import { MULTI_MAIN_SECONDS, MULTI_PLAYER_SECONDS, SINGLE_SECONDS } from '../lib/quiz';

const STEPS = [
  ['Pick a mode', 'Play solo, or add 2 to 5 players on one device.'],
  ['Choose a round', 'Each round is a board of topics. Every topic has up to five questions worth 10 to 50 points.'],
  ['Pick a tile', 'Higher points mean harder questions. A tile can only be played once.'],
  ['Answer against the clock', `Solo: ${SINGLE_SECONDS} seconds, one try. Multiplayer: ${MULTI_MAIN_SECONDS} seconds to buzz in, then ${MULTI_PLAYER_SECONDS} seconds to answer. A wrong answer or a timeout knocks you out of that question.`],
  ['Finish the board', 'When every tile is played the round ends. Start another round, or finish for the final podium.'],
];

export default function HowTo() {
  const g = useGame();
  return (
    <div className="narrow">
      <h1 className="h1">How to play</h1>
      <ol className="steps">
        {STEPS.map(([t, b], i) => (
          <motion.li key={t} className="glass" initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 * i }}>
            <span className="steps__n">{i + 1}</span><div><h3>{t}</h3><p>{b}</p></div>
          </motion.li>
        ))}
      </ol>
      <div className="guide-card glass">
        <span className="guide-card__icon"><FileDown size={26} aria-hidden="true" /></span>
        <span className="guide-card__text"><b>The user guide</b><small>A friendly, illustrated PDF with screenshots. Read it here or keep a copy.</small></span>
        <span className="guide-card__btns">
          <a className="guide-card__btn guide-card__btn--main" href={GUIDE_URL} target="_blank" rel="noopener">View</a>
          <a className="guide-card__btn" href={GUIDE_URL} download>Download</a>
        </span>
      </div>
      <div className="tips glass">
        <h3>Keyboard shortcuts</h3>
        <p><kbd>1</kbd>–<kbd>5</kbd> buzz in as player 1 to 5. <kbd>A</kbd>–<kbd>D</kbd> pick an answer. <kbd>Space</kbd> or <kbd>Enter</kbd> continues.</p>
      </div>
      <div className="actions"><Button size="lg" icon={<ArrowRight size={20} />} onClick={() => g.go('setup')}>Set up a game</Button></div>
    </div>
  );
}
