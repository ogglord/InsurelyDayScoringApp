import Link from 'next/link';
import { getTournaments } from '@/lib/data';
import { createTournament } from '@/lib/actions';
import { TYPE_LABELS } from '@/lib/types';
import { TournamentForm } from './tournament-form';

export const dynamic = 'force-dynamic';

export default function TournamentsPage() {
  const tournaments = getTournaments();

  return (
    <>
      <h1>Tournaments</h1>

      <div className="card">
        <TournamentForm action={createTournament} submitLabel="Create tournament" />
      </div>

      <h2>{tournaments.length} tournaments</h2>
      {tournaments.length === 0 && (
        <div className="empty">No tournaments yet. Create one above.</div>
      )}

      {tournaments.map((t) => (
        <Link href={`/tournaments/${t.id}`} key={t.id}>
          <div className="card between">
            <div>
              <div style={{ fontWeight: 600 }}>{t.name}</div>
              <div className="muted">{TYPE_LABELS[t.type]}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="tag">×{t.weight}</span>
              <div className="muted" style={{ marginTop: 4 }}>
                score ›
              </div>
            </div>
          </div>
        </Link>
      ))}
    </>
  );
}
