import Link from 'next/link';
import { getPublicLeaderboard } from '@/lib/data';
import { BoardView } from '@/app/board-view';

export const dynamic = 'force-dynamic';

// Admin-only standings — protected by Cloudflare Access (deny-by-default).
// Always visible regardless of the public toggle, and shows ALL tournaments
// (no "undisclosed" masking) since admins see everything anyway.
export default function AdminStandings() {
  const publicOn = getPublicLeaderboard();
  return (
    <>
      <div className="between">
        <Link href="/tournaments" className="muted">
          ‹ Tourneys
        </Link>
        <span className="tag">admin view</span>
      </div>
      <h1>Standings</h1>
      <div className="muted" style={{ marginBottom: 8 }}>
        Always visible to admins. Public board is{' '}
        <span style={{ color: publicOn ? 'var(--good)' : 'var(--mut)' }}>
          {publicOn ? 'ON' : 'OFF'}
        </span>
        .
      </div>
      <BoardView masked={false} linkTeams={false} />
    </>
  );
}
