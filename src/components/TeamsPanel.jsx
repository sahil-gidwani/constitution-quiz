import { Choice, Switch } from './Switch';
import { Avatar, PLAYER_COLORS } from './PlayerChip';
import { Users } from 'lucide-react';

/** Team setup. Controlled by Setup: { on, count, names, assign } */
export default function TeamsPanel({ value, onChange, playerNames, available }) {
  const { on, count, names, assign } = value;
  const set = (patch) => onChange({ ...value, ...patch });
  const maxTeams = Math.min(3, playerNames.length);
  return (
    <section className="teams">
      <div className="rule__row">
        <span className="rule__icon"><Users size={20} /></span>
        <div className="rule__text"><b>Team mode</b><p>{available ? 'Group players into teams. Team scores add up, and each team shares its streak and power-ups.' : 'Needs 3 to 5 players in multiplayer.'}</p></div>
        <Switch checked={on && available} onChange={(v) => set({ on: v })} label="Team mode" disabled={!available} />
      </div>
      {on && available && (
        <div className="rule__sub">
          {maxTeams > 2 && <Choice label="Teams" value={Math.min(count, maxTeams)} options={Array.from({ length: maxTeams - 1 }, (_, i) => ({ value: i + 2, label: String(i + 2) }))}
            onChange={(v) => set({ count: v, assign: assign.map((a) => (a >= v ? v - 1 : a)) })} />}
          <div className="teamnames">
            {Array.from({ length: Math.min(count, maxTeams) }, (_, i) => (
              <label key={i} className="field field--sm" style={{ '--c': PLAYER_COLORS[i] }}>
                <Avatar name={names[i] || '?'} color={PLAYER_COLORS[i]} size={30} />
                <input value={names[i]} onChange={(e) => set({ names: names.map((n, k) => (k === i ? e.target.value.slice(0, 18) : n)) })} aria-label={`Team ${i + 1} name`} autoComplete="off" />
              </label>
            ))}
          </div>
          <ul className="assign">
            {playerNames.map((n, pi) => (
              <li key={pi}>
                <span className="assign__who">{n.trim() || `Player ${pi + 1}`}</span>
                <div className="assign__teams" role="radiogroup" aria-label={`Team for ${n.trim() || `player ${pi + 1}`}`}>
                  {Array.from({ length: Math.min(count, maxTeams) }, (_, ti) => (
                    <button key={ti} type="button" role="radio" aria-checked={assign[pi] === ti} style={{ '--c': PLAYER_COLORS[ti] }}
                      className={assign[pi] === ti ? 'is-on' : ''} onClick={() => set({ assign: assign.map((a, k) => (k === pi ? ti : a)) })}>
                      {names[ti] || `Team ${ti + 1}`}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
