import { useEffect, useRef } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { GameProvider, useGame } from './store';
import { ToastProvider } from './components/Toast';
import Background from './components/Background';
import Header from './components/Header';
import Home from './screens/Home';
import HowTo from './screens/HowTo';
import Setup from './screens/Setup';
import Rounds from './screens/Rounds';
import Board from './screens/Board';
import Question from './screens/Question';
import Scores from './screens/Scores';
import Builder from './screens/Builder';
import QuickFire from './screens/QuickFire';
import Final from './screens/Final';

const TITLES = { howto: 'How to play', setup: 'New game', rounds: 'Choose a round', builder: 'Build a board', scores: 'Scoreboard', final: 'Final results', quick: 'Quick-fire', question: 'Question' };
const SCREENS = { home: Home, howto: HowTo, setup: Setup, rounds: Rounds, builder: Builder, quick: QuickFire, board: Board, question: Question, scores: Scores, final: Final };

function Shell() {
  const { screen } = useGame();
  const Screen = SCREENS[screen] || Home;
  const { round } = useGame();
  const first = useRef(true);
  useEffect(() => {
    window.scrollTo({ top: 0 });
    const name = screen === 'board' ? round?.title : TITLES[screen];
    document.title = name ? `${name} · Constitution Quiz Showdown` : 'Constitution Quiz Showdown';
    // Move focus to the new screen so keyboard and screen-reader users start at the top of it.
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => {
      const m = document.getElementById('main');
      if (m && !m.contains(document.activeElement)) m.focus({ preventScroll: true }); // leave autofocused fields alone
    }, 320);
    return () => clearTimeout(t);
  }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <Background />
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>
      <Header />
      <AnimatePresence mode="wait" initial={false}>
        <motion.main key={screen} id="main" tabIndex={-1} className={`screen screen--${screen}`}
          initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
          <Screen />
        </motion.main>
      </AnimatePresence>
    </>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <GameProvider><ToastProvider><Shell /></ToastProvider></GameProvider>
    </MotionConfig>
  );
}
