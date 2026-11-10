import { motion } from 'framer-motion';
import { useState } from 'react';
import { Play, BookOpen, RotateCcw, Timer, Users, Upload, Download, SlidersHorizontal, WifiOff, Share } from 'lucide-react';
import Button from '../components/Button';
import Seal from '../components/Seal';
import Teaser from '../components/Teaser';
import Modal from '../components/Modal';
import { useInstall } from '../lib/pwa';
import { useGame } from '../store';
import { BUNDLED_ROUNDS } from '../lib/quiz';

const stat = BUNDLED_ROUNDS.reduce((a, r) => ({ c: a.c + r.categories.length, q: a.q + r.categories.reduce((n, c) => n + c.questions.length, 0) }), { c: 0, q: 0 });
const rise = (d = 0) => ({ initial: { opacity: 0, y: 22 }, animate: { opacity: 1, y: 0 }, transition: { delay: d, duration: 0.6, ease: [0.22, 1, 0.36, 1] } });

export default function Home() {
  const g = useGame();
  const pwa = useInstall();
  const [iosOpen, setIosOpen] = useState(false);
  const played = g.format === 'quick' ? Object.keys(g.quick?.results || {}).length : Object.values(g.results).reduce((n, r) => n + Object.keys(r).length, 0);
  return (
    <div className="home">
      <section className="hero">
        <div className="hero__copy">
          <motion.p className="hero__kicker" {...rise(0.05)}><Seal size={46} spin /> The 1992 Constitution, played as a game show</motion.p>
          <motion.h1 className="hero__title" {...rise(0.12)}>
            <span>Constitution</span><span className="shine">Quiz Showdown</span>
          </motion.h1>
          <motion.p className="hero__lede" {...rise(0.22)}>
            {BUNDLED_ROUNDS.length} rounds on the Constitution, national symbols, chiefs, courts, leaders and more. Play solo against the clock, or buzz in against friends.
          </motion.p>
          {g.hasGame && (
            <motion.div className="resume glass" {...rise(0.3)}>
              <div><strong>Game in progress</strong><span>{g.players.map((p) => p.name).join(', ')} · {g.format === 'quick' ? `quick-fire, ${played} of ${g.players.length} turns done` : `${played} question${played === 1 ? '' : 's'} played`}</span></div>
              <div className="resume__actions">
                <Button icon={<Play size={18} />} onClick={() => g.go(g.resumeScreen)}>Resume</Button>
                <Button variant="ghost" size="sm" icon={<RotateCcw size={16} />} onClick={g.endGame}>Discard</Button>
              </div>
            </motion.div>
          )}
          <motion.div className="hero__cta" {...rise(0.34)}>
            <Button size="lg" icon={<Play size={20} />} variant={g.hasGame ? 'secondary' : 'primary'} onClick={() => g.go('setup')}>{g.hasGame ? 'Start a new game' : 'Start playing'}</Button>
            <Button size="lg" variant="ghost" icon={<BookOpen size={20} />} onClick={() => g.go('howto')}>How to play</Button>
            {pwa.canInstall && <Button size="lg" variant="ghost" icon={<Download size={20} />} onClick={pwa.install}>Install app</Button>}
            {pwa.iosHint && <Button size="lg" variant="ghost" icon={<Download size={20} />} onClick={() => setIosOpen(true)}>Add to Home Screen</Button>}
          </motion.div>
          {pwa.offlineReady && <motion.p className="offline-note" {...rise(0.4)}><WifiOff size={15} /> Saved on this device. You can play offline.</motion.p>}
          <motion.dl className="stats" {...rise(0.42)}>
            <div><dt>Rounds</dt><dd>{BUNDLED_ROUNDS.length}</dd></div>
            <div><dt>Topics</dt><dd>{stat.c}</dd></div>
            <div><dt>Questions</dt><dd>{stat.q}</dd></div>
          </motion.dl>
        </div>
        <motion.div className="hero__demo" initial={{ opacity: 0, rotate: 3, y: 30 }} animate={{ opacity: 1, rotate: -1.5, y: 0 }} transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
          <Teaser />
        </motion.div>
      </section>

      <motion.ul className="modes" {...rise(0.55)}>
        <li><Timer size={22} /><div><b>Solo</b><span>15 seconds a question. One wrong answer and it's gone.</span></div></li>
        <li><Users size={22} /><div><b>2 to 5 players</b><span>Buzz in first. Miss, and the others get a go.</span></div></li>
        <li><SlidersHorizontal size={22} /><div><b>Optional extras</b><span>Power-ups, streaks, teams and quick-fire. All off until you switch them on.</span></div></li>
        <li><Upload size={22} /><div><b>Your own rounds</b><span>Import a JSON file and play it on the same board.</span></div></li>
      </motion.ul>
      <Modal open={iosOpen} title="Add to Home Screen" onClose={() => setIosOpen(false)} actions={<Button onClick={() => setIosOpen(false)}>Got it</Button>}>
        <ol className="steps">
          <li>Tap the Share button <Share size={16} aria-hidden="true" /> in Safari's toolbar.</li>
          <li>Choose <b>Add to Home Screen</b>.</li>
          <li>Tap <b>Add</b>. The app then opens full screen and works offline.</li>
        </ol>
      </Modal>
    </div>
  );
}
