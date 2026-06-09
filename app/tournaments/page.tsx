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
        <div className="card" key={t.id}>
          <div className="between">
            <div style={{ fontWeight: 600 }}>{t.name}</div>
            <span className="tag">×{t.weight}</span>
          </div>
          <div className="muted" style={{ marginTop: 2 }}>{TYPE_LABELS[t.type]}</div>
          <div className="row" style={{ marginTop: 12 }}>
            <Link href={`/tournaments/${t.id}`} className="btn small" style={{ width: '100%' }}>
              ✎ Enter scores
            </Link>
            <Link href={`/tournaments/${t.id}/edit`} className="btn secondary small" style={{ width: '100%' }}>
              ⚙ Edit
            </Link>
          </div>
        </div>
      ))}
    </>
  );
}
