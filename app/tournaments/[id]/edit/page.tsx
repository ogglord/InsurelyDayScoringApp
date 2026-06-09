import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTournament } from '@/lib/data';
import { updateTournament, deleteTournament } from '@/lib/actions';
import { TournamentForm } from '../../tournament-form';

export const dynamic = 'force-dynamic';

export default async function EditTournament({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = getTournament(Number(id));
  if (!t) notFound();

  return (
    <>
      <Link href={`/tournaments/${t.id}`} className="muted">
        ‹ Back to {t.name}
      </Link>
      <h1>Settings</h1>

      <div className="card">
        <TournamentForm
          action={updateTournament}
          submitLabel="Save settings"
          initial={{
            id: t.id,
            name: t.name,
            type: t.type,
            weight: t.weight,
            targets: (t.config as { targets?: number[] }).targets,
            circuitA: (t.config as { circuitA?: number[] }).circuitA,
            circuitB: (t.config as { circuitB?: number[] }).circuitB,
          }}
        />
      </div>

      <div className="lbl">Danger zone</div>
      <div className="card">
        <form action={deleteTournament}>
          <input type="hidden" name="id" value={t.id} />
          <button type="submit" className="danger">
            Delete tournament
          </button>
        </form>
      </div>
    </>
  );
}
