import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getTeams,
  getTournaments,
  getScoredTournaments,
  getTournamentRanking,
  getPublicLeaderboard,
} from '@/lib/data';

export const dynamic = 'force-dynamic';

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export default async function PublicTeam({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Public page — same gate as the board.
  if (!getPublicLeaderboard()) {
    return (
      <>
        <h1>Team</h1>
        <div className="empty">Public leaderboard is currently disabled</div>
      </>
    );
  }

  const { id } = await params;
  const teams = getTeams();
  const team = teams.find((t) => t.id === Number(id));
  if (!team) notFound();

  // Started tournaments show real names; the rest are masked as "undisclosed".
  const tournaments = getScoredTournaments();
  const undisclosed = getTournaments().length - tournaments.length;
  let total = 0;
  const results = tournaments.map((t) => {
    const r = getTournamentRanking(t, teams).find((x) => x.teamId === team.id);
    total += r?.placement ?? 0;
    return { name: t.name, rank: r?.rank ?? null, display: r?.display ?? '—', placement: r?.placement ?? 0 };
  });

  return (
    <>
      <Link href="/public" className="muted">
        ‹ Board
      </Link>
      <h1>{team.name}</h1>
      {team.circuit && (
        <span className={`tag c${team.circuit.toLowerCase()}`}>Circuit {team.circuit}</span>
      )}

      <div className="lbl">Members</div>
      {team.members.length === 0 ? (
        <div className="empty">No members listed.</div>
      ) : (
        <div className="card">
          {team.members.map((m, i) => (
            <div
              key={i}
              style={{
                padding: '10px 2px',
                borderBottom: i < team.members.length - 1 ? '1px solid var(--line)' : 'none',
                fontWeight: 600,
              }}
            >
              {m}
            </div>
          ))}
        </div>
      )}

      {results.length + undisclosed > 0 && (
        <>
          <div className="lbl">Results</div>
          {results.map((r) => (
            <div className="rowcard" key={r.name}>
              <div className="nm">
                <b>{r.name}</b>
                <div className="muted" style={{ marginTop: 4 }}>
                  {r.rank ? `#${r.rank} · ${r.display}` : 'no score yet'}
                </div>
              </div>
              <div className="pts">
                <div className="n">{round(r.placement)}</div>
                <div className="u">PTS</div>
              </div>
            </div>
          ))}
          {Array.from({ length: undisclosed }).map((_, i) => (
            <div className="rowcard masked-row" key={`u${i}`}>
              <div className="nm">
                <b>🔒 Undisclosed tournament</b>
                <div className="muted" style={{ marginTop: 4 }}>Not yet played</div>
              </div>
            </div>
          ))}
          <div className="rowcard" style={{ borderColor: 'var(--gold)' }}>
            <div className="nm">
              <b>Total</b>
            </div>
            <div className="pts">
              <div className="n" style={{ color: 'var(--gold)' }}>{round(total)}</div>
              <div className="u">PTS</div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
