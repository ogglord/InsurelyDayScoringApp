import { getPublicLeaderboard } from '@/lib/data';
import { BoardView } from '@/app/board-view';

export const dynamic = 'force-dynamic';

export default function PublicBoard() {
  return (
    <>
      <h1>Standings</h1>
      {getPublicLeaderboard() ? (
        <BoardView masked linkTeams />
      ) : (
        <div className="empty">Public leaderboard is currently disabled</div>
      )}
    </>
  );
}
