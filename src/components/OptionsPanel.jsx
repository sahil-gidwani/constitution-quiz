import { Crosshair, Flame, MinusCircle, SkipForward, Swords, Timer } from 'lucide-react';
import { Choice, Switch } from './Switch';
import { PENALTY_PCTS, SPEED_MAXES, STREAK_CAPS, STREAK_STEPS } from '../lib/scoring';

const pct = (n) => ({ value: n, label: `${n}%` });
const plus = (n) => ({ value: n, label: `+${n}%` });

function Rule({ icon: Icon, title, desc, on, onToggle, disabled, children }) {
  return (
    <li className={`rule ${on ? 'is-on' : ''}`}>
      <div className="rule__row">
        <span className="rule__icon"><Icon size={20} /></span>
        <div className="rule__text"><b>{title}</b><p>{desc}</p></div>
        <Switch checked={on} onChange={onToggle} label={title} disabled={disabled} />
      </div>
      {on && children && <div className="rule__sub">{children}</div>}
    </li>
  );
}

/**
 * Every rule here is opt-in: nothing is on until the host switches it on.
 * quick = the game is quick-fire (skip is replaced by a free pass there).
 */
export default function OptionsPanel({ options: o, onChange, quick }) {
  const set = (patch) => onChange({ ...o, ...patch });
  const sub = (key, patch) => set({ [key]: { ...o[key], ...patch } });
  return (
    <div className="rules">
      <h3 className="rules__h">Power-ups <small>one of each per {'player or team'}, per game</small></h3>
      <ul className="rules__list">
        <Rule icon={Crosshair} title="50/50" desc="Removes two wrong answers on a multiple-choice question." on={o.fifty} onToggle={(v) => set({ fifty: v })} />
        <Rule icon={SkipForward} title="Skip" on={o.skip} onToggle={(v) => set({ skip: v })} disabled={quick}
          desc={quick ? 'Not used in quick-fire: you can pass any question for free.' : 'Skip a question with no penalty and no broken streak. In multiplayer it passes the question on.'} />
        <Rule icon={Swords} title="Double or nothing" desc="Bet on your answer. Correct pays double. Wrong loses the whole tile." on={o.double} onToggle={(v) => set({ double: v })} />
      </ul>
      <h3 className="rules__h">Scoring</h3>
      <ul className="rules__list">
        <Rule icon={Flame} title="Streak bonus" desc="Each correct answer in a row adds a bonus to the next one." on={o.streak.on} onToggle={(v) => sub('streak', { on: v })}>
          <Choice label="Bonus per answer" value={o.streak.step} options={STREAK_STEPS.map(pct)} onChange={(v) => sub('streak', { step: v })} />
          <Choice label="Largest bonus" value={o.streak.cap} options={STREAK_CAPS.map(plus)} onChange={(v) => sub('streak', { cap: v })} />
        </Rule>
        <Rule icon={MinusCircle} title="Negative marking" desc="A wrong answer, or running out of time while answering, costs points." on={o.penalty.on} onToggle={(v) => sub('penalty', { on: v })}>
          <Choice label="A miss costs" value={o.penalty.pct} options={PENALTY_PCTS.map((n) => ({ value: n, label: `${n}% of the tile` }))} onChange={(v) => sub('penalty', { pct: v })} />
        </Rule>
        <Rule icon={Timer} title="Speed bonus" desc="The faster a correct answer, the more it earns." on={o.speed.on} onToggle={(v) => sub('speed', { on: v })}>
          <Choice label="Fastest answer earns" value={o.speed.max} options={SPEED_MAXES.map(plus)} onChange={(v) => sub('speed', { max: v })} />
        </Rule>
      </ul>
    </div>
  );
}
