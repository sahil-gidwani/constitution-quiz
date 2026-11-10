import { useGame } from '../store';
import { Avatar, PLAYER_COLORS } from './PlayerChip';

const color = (u) => PLAYER_COLORS[u.idx % PLAYER_COLORS.length];

/** Who scored what inside each team, shown only in team mode. */
function TeamDetail({ g }) {
  if (!g.hasTeams) return null;
  return (
    <div className="teamdetail glass">
      <h3>Who scored what</h3>
      {g.units.map((u) => (
        <div key={u.id} className="teamdetail__team" style={{ '--c': color(u) }}>
          <b>{u.name}</b>
          <ul>{u.members.map((m) => <li key={m.id}><span>{m.name}</span><em>{g.pScores[m.id] ?? 0}</em></li>)}</ul>
        </div>
      ))}
    </div>
  );
}

/** Quick-fire: one row per player with their sprint stats. */
function QuickTable({ g }) {
  const r = g.quick?.results || {};
  return (
    <>
      <div className="table-wrap glass">
        <table className="breakdown">
          <thead><tr><th scope="col">Player</th><th scope="col">Score</th><th scope="col">Right</th><th scope="col">Wrong</th><th scope="col">Passed</th><th scope="col">Best streak</th></tr></thead>
          <tbody>
            {g.players.map((p, i) => {
              const x = r[p.id] || {};
              return (
                <tr key={p.id}>
                  <th scope="row"><Avatar name={p.name} color={PLAYER_COLORS[i]} size={24} /> {p.name}{g.hasTeams && <small>{g.units.find((u) => u.id === g.unitOf(p.id))?.name}</small>}</th>
                  <td className="is-best">{x.score ?? 0}</td><td>{x.correct ?? 0}</td><td>{x.wrong ?? 0}</td><td>{x.passed ?? 0}</td><td>{x.best ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <TeamDetail g={g} />
    </>
  );
}

/** Points per round per player or team, plus totals. */
export default function Breakdown() {
  const g = useGame();
  if (g.format === 'quick') return <QuickTable g={g} />;
  const played = g.rounds.filter((r) => Object.keys(g.results[r.id] || {}).length);
  if (!played.length) return <p className="muted center">No questions played yet.</p>;
  return (
    <>
      <div className="table-wrap glass">
        <table className="breakdown">
          <thead>
            <tr><th scope="col">Round</th>{g.units.map((u) => <th key={u.id} scope="col"><Avatar name={u.name} color={color(u)} size={24} /> <span>{u.name}</span></th>)}</tr>
          </thead>
          <tbody>
            {played.map((r) => {
              const best = Math.max(...g.units.map((u) => g.byRound[r.id]?.[u.id] || 0));
              return (
                <tr key={r.id}>
                  <th scope="row">{r.title}<small>{g.progress(r).done}/{g.progress(r).total} played</small></th>
                  {g.units.map((u) => { const v = g.byRound[r.id]?.[u.id] || 0; return <td key={u.id} className={v === best && v > 0 ? 'is-best' : ''}>{v}</td>; })}
                </tr>
              );
            })}
          </tbody>
          <tfoot><tr><th scope="row">Total</th>{g.units.map((u) => <td key={u.id}>{g.scores[u.id]}</td>)}</tr></tfoot>
        </table>
      </div>
      <TeamDetail g={g} />
    </>
  );
}
