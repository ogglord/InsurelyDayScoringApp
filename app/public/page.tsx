import Link from 'next/link';
import {
  getTeams,
  getTournaments,
  getScoredTournaments,
  getTournamentRanking,
  getRecentActivity,
  getPublicLeaderboard,
} from '@/lib/data';

export const dynamic = 'force-dynamic';

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function shortTime(iso: string): string {
  // stored as 'YYYY-MM-DD HH:MM:SS' (UTC) — show HH:MM
  const m = iso.match(/(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : iso;
}

export default function Board() {
  if (!getPublicLeaderboard()) {
    return (
      <>
        <h1>Standings</h1>
        <div className="empty">Public leaderboard is currently disabled</div>
      </>
    );
  }

  const teams = getTeams();
  // Tournaments that have started (have scores) are shown with real names.
  // The rest are masked as "undisclosed" — public sees how many remain, not what.
  const tournaments = getScoredTournaments();
  const undisclosed = getTournaments().length - tournaments.length;

  // per-tournament ranking -> per-team {scored, won, placement}
  const perTeam = new Map<
    number,
    { total: number; cells: Record<number, number>; pips: ('f' | 'fc' | '' | 'pm')[] }
  >();
  for (const t of teams) perTeam.set(t.id, { total: 0, cells: {}, pips: [] });

  for (const tn of tournaments) {
    const ranking = getTournamentRanking(tn, teams);
    const byTeam = new Map(ranking.map((r) => [r.teamId, r]));
    for (const t of teams) {
      const r = byTeam.get(t.id);
      const row = perTeam.get(t.id)!;
      row.cells[tn.id] = r?.placement ?? 0;
      row.total += r?.placement ?? 0;
      row.pips.push(r?.rank === 1 ? 'fc' : r?.rank != null ? 'f' : '');
    }
  }
  // masked pips for undisclosed tournaments (reveal count only)
  for (const t of teams) {
    const row = perTeam.get(t.id)!;
    for (let k = 0; k < undisclosed; k++) row.pips.push('pm');
  }

  const ranked = [...teams]
    .map((t) => ({ team: t, ...perTeam.get(t.id)! }))
    .sort((a, b) => b.total - a.total);

  const activity = getRecentActivity(6);

  if (teams.length === 0) {
    return (
      <>
        <h1>Standings</h1>
        <div className="empty">No teams yet.</div>
      </>
    );
  }

  const hasScores = ranked.some((r) => r.total > 0);
  const podium = hasScores && ranked.length >= 3 ? [ranked[1], ranked[0], ranked[2]] : null;
  const podiumClass = ['p2', 'p1', 'p3'];
  const podiumMedal = ['🥈', '🥇', '🥉'];
  const podiumPos = [2, 1, 3];

  return (
    <>
      <h1>Standings</h1>

      {podium && (
        <>
          <div className="lbl">Podium</div>
          <div className="podium">
            {podium.map((r, i) => (
              <Link className="pcol" key={r.team.id} href={`/public/team/${r.team.id}`}>
                <div className="pcap">{r.team.name}</div>
                <div className="pscore">{round(r.total)} pts</div>
                <div className={`pbar ${podiumClass[i]}`}>
                  <span className="medal">{podiumMedal[i]}</span>
                  <span className="pos">{podiumPos[i]}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="lbl">Overall</div>
      {ranked.map((r, i) => (
        <Link className="rowcard" key={r.team.id} href={`/public/team/${r.team.id}`}>
          <div className={`rk${r.total > 0 && i < 3 ? ` g${i + 1}` : ''}`}>{i + 1}</div>
          <div className="nm">
            <b>{r.team.name} ›</b>
            {tournaments.length > 0 && (
              <div className="pips">
                {r.pips.map((p, j) => (
                  <span key={j} className={`pip ${p}`} />
                ))}
              </div>
            )}
          </div>
          <div className="pts">
            <div className="n">{round(r.total)}</div>
            <div className="u">PTS</div>
          </div>
        </Link>
      ))}

      {tournaments.length + undisclosed > 0 && (
        <>
          <div className="lbl">Placement matrix</div>
          <div className="tblcard">
            <table className="matrix">
              <thead>
                <tr>
                  <th>Team</th>
                  {tournaments.map((t) => (
                    <th key={t.id}>{abbr(t.name)}</th>
                  ))}
                  {Array.from({ length: undisclosed }).map((_, i) => (
                    <th key={`u${i}`} title="Undisclosed tournament">
                      🔒
                    </th>
                  ))}
                  <th>Σ</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((r) => (
                  <tr key={r.team.id}>
                    <td>{r.team.name}</td>
                    {tournaments.map((t) => (
                      <td key={t.id}>{round(r.cells[t.id] ?? 0)}</td>
                    ))}
                    {Array.from({ length: undisclosed }).map((_, i) => (
                      <td key={`u${i}`} className="masked">
                        ·
                      </td>
                    ))}
                    <td className="tot">{round(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {undisclosed > 0 && (
            <div className="muted" style={{ margin: '6px 4px 0', fontSize: 12 }}>
              🔒 {undisclosed} undisclosed tournament{undisclosed > 1 ? 's' : ''} — revealed once played.
            </div>
          )}
        </>
      )}

      <div className="lbl">Activity</div>
      {activity.length === 0 ? (
        <div className="ticker">No scores entered yet.</div>
      ) : (
        activity.map((a, i) => (
          <div className="ticker" key={i}>
            <span className="t">{shortTime(a.when)}</span> <b>{a.tournament}</b> · {a.team} scored
          </div>
        ))
      )}
    </>
  );
}

function abbr(name: string): string {
  return name.length <= 6 ? name : name.slice(0, 5) + '…';
}
