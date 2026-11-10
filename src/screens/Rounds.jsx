import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Download, FileJson, Flag, LayoutGrid, Plus, SlidersHorizontal, Trash2, Upload } from 'lucide-react';
import RulesModal from '../components/RulesModal';
import Button from '../components/Button';
import RoundIcon from '../components/Icon';
import PlayerChip from '../components/PlayerChip';
import { useGame } from '../store';
import { useToast } from '../components/Toast';
import { normalizeImport, roundTotals, TEMPLATE } from '../lib/quiz';
import { sfx } from '../lib/sound';

function ImportPanel() {
  const g = useGame();
  const toast = useToast();
  const [over, setOver] = useState(false);
  const [error, setError] = useState('');
  const input = useRef(null);

  const read = (file) => {
    if (!file) return;
    setError('');
    const fr = new FileReader();
    fr.onerror = () => setError('That file could not be read. Try again.');
    fr.onload = () => {
      try {
        const rounds = normalizeImport(JSON.parse(String(fr.result)), file.name);
        g.addCustom(rounds);
        toast(`Added ${rounds.length} round${rounds.length > 1 ? 's' : ''} from ${file.name}`, 'success');
      } catch (e) {
        setError(e instanceof SyntaxError ? 'That file is not valid JSON.' : e.message);
      }
    };
    fr.readAsText(file);
  };
  const template = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(TEMPLATE, null, 2)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'round-template.json' });
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <section className="import glass" aria-labelledby="imp-h">
      <div className="import__head">
        <h2 id="imp-h">Bring your own round</h2>
        <Button variant="ghost" size="sm" icon={<Download size={16} />} onClick={template}>Template</Button>
      </div>
      <label className={`drop ${over ? 'is-over' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); read(e.dataTransfer.files[0]); }}>
        <Upload size={22} /><span>Drop a .json quiz here, or tap to choose</span>
        <input ref={input} type="file" accept=".json,application/json" onChange={(e) => { read(e.target.files[0]); e.target.value = ''; }} />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      {g.custom.length > 0 && (
        <ul className="customs">
          {g.custom.map((r) => (
            <li key={r.id}><FileJson size={16} /><span>{r.title}</span>
              <button className="icon-btn" aria-label={`Remove ${r.title}`} onClick={() => g.removeCustom(r.id)}><Trash2 size={16} /></button></li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Rounds() {
  const g = useGame();
  const [rules, setRules] = useState(false);
  const anyPlayed = Object.values(g.results).some((r) => Object.keys(r).length);
  const nextId = g.rounds.find((r) => !g.progress(r).complete)?.id;

  return (
    <div className="wide">
      <div className="titlebar">
        <div><h1 className="h1">Choose a round</h1><p className="muted">Play them in any order. Scores add up across rounds.</p></div>
        <div className="players-row">{g.units.map((u) => <PlayerChip key={u.id} player={u} index={u.idx} score={g.scores[u.id]} compact leader={g.leaders.some((l) => l.id === u.id)} streak={g.options.streak.on ? g.streak[u.id] : 0} />)}
          <button className="icon-btn icon-btn--label rules-btn" onClick={() => setRules(true)} aria-label="Game rules"><SlidersHorizontal size={18} /> <span>Rules</span></button></div>
      </div>

      <div className="rounds">
        <motion.button className="rcard rcard--build" initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -6 }} whileTap={{ scale: 0.98 }} onClick={() => { sfx.open(); g.go('builder'); }}>
          <span className="rcard__icon"><LayoutGrid size={26} /></span>
          <h3>Build your own board</h3>
          <p className="rcard__tag">Pick any topics from any rounds and play them as one board.</p>
          <span className="rcard__plus"><Plus size={18} /> New board</span>
        </motion.button>
        {g.rounds.map((r, i) => {
          const pr = g.progress(r), t = roundTotals(r);
          return (
            <motion.button key={r.id} className={`rcard glass ${pr.complete ? 'is-done' : ''} ${r.id === nextId && !pr.started ? 'is-next' : ''}`}
              initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -6 }} whileTap={{ scale: 0.98 }} onClick={() => { sfx.open(); g.pickRound(r.id); }}>
              <span className="rcard__kente" />
              <div className="rcard__top">
                <span className="rcard__icon"><RoundIcon name={r.icon} size={26} /></span>
                <span className="rcard__no">{r.built ? 'Your board' : r.custom ? 'Custom' : `Round ${i + 1}`}</span>
                {pr.complete && <span className="rcard__done"><Check size={14} /> Done</span>}
              </div>
              <h3>{r.title}</h3>
              <p className="rcard__tag">{r.tagline}</p>
              <ul className="rcard__cats">{r.categories.slice(0, 4).map((c) => <li key={c.id}>{c.short}</li>)}{r.categories.length > 4 && <li>+{r.categories.length - 4}</li>}</ul>
              <div className="rcard__foot">
                <span>{t.categories} topics · {t.points} pts</span>
                <span>{pr.started ? `${pr.done}/${pr.total} played` : r.id === nextId ? 'Up next' : 'Not started'}</span>
              </div>
              <div className="rcard__bar"><motion.i initial={{ width: 0 }} animate={{ width: `${(pr.done / pr.total) * 100}%` }} transition={{ duration: 0.8, delay: 0.2 }} /></div>
            </motion.button>
          );
        })}
      </div>

      <div className="rounds__foot">
        <ImportPanel />
        {anyPlayed && <Button size="lg" variant="secondary" icon={<Flag size={18} />} onClick={() => g.go('final')}>Finish game and see results</Button>}
      </div>
      <RulesModal open={rules} onClose={() => setRules(false)} />
    </div>
  );
}
