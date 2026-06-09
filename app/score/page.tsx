import Link from 'next/link';
import { getTeams, getTournaments, getTournamentRanking } from '@/lib/data';
import { TYPE_LABELS } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default function ScoreHub() {
  const tournaments = getTournaments();
  const teams = getTeams();
  const nameOf = new Map(teams.map((x) => [x.id, x.name]));

  return (
    <>
      <h1>Enter Score</h1>
      <p className="muted">Pick a tournament to enter or edit scores. Leader shown live.</p>

      {tournaments.length === 0 && (
        <div className="empty">
          No tournaments.{' '}
          <Link href="/tournaments" style={{ color: 'var(--accent)' }}>
            Create one ›
          </Link>
        </div>
      )}

      {tournaments.map((t) => {
        const ranking = getTournamentRanking(t, teams);
        const top = ranking.find((r) => r.rank === 1);
        return (
          <Link href={`/score/${t.id}`} key={t.id}>
            <div className="card between">
              <div>
                <div style={{ fontWeight: 600 }}>{t.name}</div>
                <div className="muted">{TYPE_LABELS[t.type]}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                {top ? (
                  <>
                    <div className="tag">🥇 {nameOf.get(top.teamId)}</div>
                    <div className="muted" style={{ marginTop: 4 }}>
                      {top.display}
                    </div>
                  </>
                ) : (
                  <div className="muted">no scores ›</div>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </>
  );
}
