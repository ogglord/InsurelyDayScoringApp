import type { RankedTeam } from '@/lib/scoring';

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function Leaderboard({
  ranking,
  nameOf,
  showRankPoints,
}: {
  ranking: RankedTeam[];
  nameOf: Map<number, string>;
  showRankPoints?: boolean;
}) {
  return (
    <>
      {ranking.map((r) => (
        <div className="rowcard" key={r.teamId}>
          <div className={`rk${r.rank && r.rank <= 3 ? ` g${r.rank}` : ''}`}>
            {r.rank ?? '–'}
          </div>
          <div className="nm">
            <b>{nameOf.get(r.teamId) ?? `#${r.teamId}`}</b>
          </div>
          <div className="pts">
            <div className="n">{r.display}</div>
            {showRankPoints && r.rank != null && (
              <div className="sub">{round(r.placement)} pts</div>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
