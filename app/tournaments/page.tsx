import Link from 'next/link';
import { getTournaments, getPublicLeaderboard } from '@/lib/data';
import { createTournament, setPublicLeaderboard } from '@/lib/actions';
import { TYPE_LABELS } from '@/lib/types';
import { TournamentForm } from './tournament-form';
import { SubmitButton } from '@/app/submit-button';

export const dynamic = 'force-dynamic';

export default function TournamentsPage() {
  const tournaments = getTournaments();
  const publicOn = getPublicLeaderboard();

  return (
    <>
      <h1>Tournaments</h1>

      <div className="lbl">Public leaderboard</div>
      <div className="card between">
        <div>
          <div style={{ fontWeight: 600 }}>
            Public board is{' '}
            <span style={{ color: publicOn ? 'var(--good)' : 'var(--mut)' }}>
              {publicOn ? 'ON' : 'OFF'}
            </span>
          </div>
          <div className="muted">
            {publicOn
              ? 'Anyone with the public URL sees the live standings.'
              : 'Public sees “disabled” until you turn it on.'}
          </div>
          <Link href="/standings" className="link" style={{ fontSize: 13 }}>
            View standings (admin) ›
          </Link>
        </div>
        <form action={setPublicLeaderboard}>
          <input type="hidden" name="enabled" value={publicOn ? '0' : '1'} />
          <SubmitButton className={publicOn ? 'secondary small' : 'small'}>
            {publicOn ? 'Turn off' : 'Turn on'}
          </SubmitButton>
        </form>
      </div>

      <div className="lbl">New tournament</div>
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
            <Link href={`/score/${t.id}`} className="btn small" style={{ width: '100%' }}>
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
