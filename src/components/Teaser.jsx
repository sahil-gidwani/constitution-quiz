import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BUNDLED_ROUNDS } from '../lib/quiz';

/** Live demo for the home hero: cycles real questions from the bundled rounds and resolves them. */
export default function Teaser() {
  const picks = useMemo(() => {
    const all = [];
    BUNDLED_ROUNDS.forEach((r) => r.categories.forEach((c) => c.questions.forEach((q) => {
      if (q.question.length > 24 && q.question.length < 90 && q.options.every((o) => o.length < 34 && !/^(both\s+)?[a-e]\s*(,|and)\s*[a-e]|above|true$/i.test(o)) && !q.image) all.push({ cat: c.short, q });
    })));
    const out = []; for (let i = 3; i < all.length && out.length < 8; i += Math.floor(all.length / 8)) out.push(all[i]);
    return out;
  }, []);
  const [i, setI] = useState(0);
  const [reveal, setReveal] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setReveal(true), 2800);
    const t2 = setTimeout(() => { setReveal(false); setI((n) => (n + 1) % picks.length); }, 6200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [i, picks.length]);
  const { cat, q } = picks[i];
  return (
    <div className="teaser glass" aria-hidden="true">
      <div className="teaser__top"><span className="tag">{cat}</span><span className="tag tag--gold">{q.points} pts</span></div>
      <AnimatePresence mode="wait">
        <motion.div key={i} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.35 }}>
          <p className="teaser__q">{q.question}</p>
          <div className="teaser__opts">
            {q.options.map((o, k) => (
              <motion.div key={o} className={`teaser__opt ${reveal ? (o === q.answer ? 'is-right' : 'is-dim') : ''}`}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + k * 0.08 }}>
                <b>{'ABCD'[k]}</b>{o}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="teaser__bar"><motion.i key={i} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 6.2, ease: 'linear' }} /></div>
    </div>
  );
}
