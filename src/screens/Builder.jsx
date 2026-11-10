import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Dices, Hammer, Search, X } from 'lucide-react';
import Button from '../components/Button';
import RoundIcon from '../components/Icon';
import { useGame } from '../store';
import { useToast } from '../components/Toast';
import { MAX_BOARD_CATEGORIES, buildBoard, randomPicks } from '../lib/boards';
import { sfx } from '../lib/sound';

const same = (a, b) => a.roundId === b.roundId && a.catId === b.catId;

/** Pick categories from any rounds and play them together as one board. */
export default function Builder() {
  const g = useGame();
  const toast = useToast();
  const [picks, setPicks] = useState([]);
  const [title, setTitle] = useState('');
  const [find, setFind] = useState('');
  const [error, setError] = useState('');

  const f = find.trim().toLowerCase();
  const groups = useMemo(() => g.rounds.map((r) => ({ r, cats: r.categories.filter((c) => !f || c.name.toLowerCase().includes(f) || (c.short || '').toLowerCase().includes(f)) })).filter((x) => x.cats.length), [g.rounds, f]);
  const full = picks.length >= MAX_BOARD_CATEGORIES;
  const find_ = (p) => g.rounds.find((r) => r.id === p.roundId)?.categories.find((c) => c.id === p.catId);
  const questions = picks.reduce((n, p) => n + (find_(p)?.questions.length || 0), 0);

  const toggle = (roundId, catId) => {
    const p = { roundId, catId }; sfx.click(); setError('');
    setPicks((cur) => (cur.some((x) => same(x, p)) ? cur.filter((x) => !same(x, p)) : cur.length >= MAX_BOARD_CATEGORIES ? cur : [...cur, p]));
  };
  const build = () => {
    try {
      const board = buildBoard(g.rounds, picks, title);
      g.addCustom([board]); g.pickRound(board.id);
      toast(`Board ready: ${board.title}`, 'success');
    } catch (e) { setError(e.message); }
  };

  return (
    <div className="wide builder">
      <div className="titlebar">
        <div><h1 className="h1">Build your own board</h1><p className="muted">Pick up to {MAX_BOARD_CATEGORIES} topics from any round. They become the columns of one board.</p></div>
      </div>

      <div className="builder__bar glass">
        <div className="builder__count"><b>{picks.length}</b><span>of {MAX_BOARD_CATEGORIES} topics{picks.length ? ` · ${questions} questions` : ''}</span></div>
        <ol className="builder__picked" aria-label="Chosen topics">
          {picks.length === 0 && <li className="muted">Nothing chosen yet.</li>}
          {picks.map((p) => (
            <li key={`${p.roundId}${p.catId}`}><span>{find_(p)?.short}</span>
              <button type="button" aria-label={`Remove ${find_(p)?.short}`} onClick={() => toggle(p.roundId, p.catId)}><X size={14} /></button></li>
          ))}
        </ol>
        <div className="builder__actions">
          <label className="field field--sm"><input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 40))} placeholder="Name your board (optional)" aria-label="Board name" autoComplete="off" /></label>
          <Button variant="secondary" size="sm" icon={<Dices size={16} />} onClick={() => { sfx.click(); setPicks(randomPicks(g.rounds, 5)); setError(''); }}>Pick 5 at random</Button>
          <Button variant="ghost" size="sm" disabled={!picks.length} onClick={() => setPicks([])}>Clear</Button>
          <Button icon={<Hammer size={18} />} disabled={!picks.length} onClick={build}>Build and play</Button>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
      </div>

      <label className="field builder__find"><Search size={18} /><input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Search topics" aria-label="Search topics" autoComplete="off" /></label>

      <div className="builder__groups">
        {groups.map(({ r, cats }, gi) => (
          <motion.section key={r.id} className="bgroup glass" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(gi, 6) * 0.04 }}>
            <h2><span className="bgroup__icon"><RoundIcon name={r.icon} size={18} /></span>{r.title}</h2>
            <div className="bgroup__chips">
              {cats.map((c) => {
                const on = picks.some((x) => same(x, { roundId: r.id, catId: c.id }));
                return (
                  <button key={c.id} type="button" className={`topic ${on ? 'is-on' : ''}`} aria-pressed={on} disabled={!on && full} onClick={() => toggle(r.id, c.id)}>
                    {on && <Check size={14} strokeWidth={3} />}{c.short || c.name}
                  </button>
                );
              })}
            </div>
          </motion.section>
        ))}
        {groups.length === 0 && <p className="muted center">No topics match "{find}".</p>}
      </div>
    </div>
  );
}
