import { ChevronLeft, Volume2, VolumeX, Trophy } from 'lucide-react';
import Seal from './Seal';
import { motion } from 'framer-motion';
import { useGame } from '../store';
import { sfx } from '../lib/sound';
import AnimatedNumber from './AnimatedNumber';

const TITLES = { home: '', howto: 'How to play', setup: 'New game', rounds: 'Rounds', builder: 'Build a board', board: '', scores: 'Scoreboard', final: 'Final results', question: '', quick: 'Quick-fire' };

export default function Header() {
  const g = useGame();
  const { screen } = g;
  const inGame = g.hasGame && ['rounds', 'builder', 'board', 'question', 'scores', 'quick'].includes(screen);

  const back = () => { sfx.click(); g.back(); };
  const home = () => { sfx.click(); if (screen === 'question' || (screen === 'quick' && g.quickLive)) g.askLeave(); else g.go('home'); };
  const title = screen === 'board' ? g.round?.title : TITLES[screen];

  return (
    <header className="header">
      <div className="header__side">
        {screen !== 'home' && (
          <button className="icon-btn" onClick={back} aria-label="Go back"><ChevronLeft size={22} /></button>
        )}
      </div>
      <button className="brand" onClick={home}>
        <motion.span className="brand__mark" whileHover={{ rotate: 72 }} transition={{ type: 'spring', stiffness: 200 }}><Seal size={34} /></motion.span>
        <span className="brand__text">{title || 'Constitution Quiz'}</span><span className="sr-only"> (go to home screen)</span>
      </button>
      <div className="header__side header__side--right">
        {inGame && (
          <>
            {screen !== 'scores' && screen !== 'question' && screen !== 'quick' && screen !== 'builder' && g.format === 'board' && (
              <button className="icon-btn icon-btn--label" onClick={() => { sfx.click(); g.go('scores'); }} aria-label="Open scoreboard">
                <Trophy size={18} /> <span className="hide-sm">Scores</span>
              </button>
            )}
            <span className="score-pill" title="Top score"><i /> <AnimatedNumber value={g.top} /> <small>pts</small></span>
          </>
        )}
        <button className="icon-btn" onClick={() => g.toggleMute()} aria-label={g.muted ? 'Unmute sound' : 'Mute sound'} aria-pressed={g.muted}>
          {g.muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </div>
    </header>
  );
}
