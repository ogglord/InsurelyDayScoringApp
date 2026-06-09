import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTeams, getScores, getTournament, getTournamentRanking } from '@/lib/data';
import { saveScore } from '@/lib/actions';
import {
  TYPE_LABELS,
  GUESSTIMATE_QUESTIONS,
  type ScoreValue,
  type Team,
  type Tournament,
} from '@/lib/types';
import { fmtTime } from '@/lib/scoring';
import { Leaderboard } from '@/app/leaderboard';
import { SubmitButton } from '@/app/submit-button';

export const dynamic = 'force-dynamic';

export default async function TournamentDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = getTournament(Number(id));
  if (!t) notFound();

  const teams = getTeams();
  const scores = getScores(t.id);
  const ranking = getTournamentRanking(t, teams);
  const nameOf = new Map(teams.map((x) => [x.id, x.name]));

  return (
    <>
      <div className="between">
        <Link href="/tournaments" className="muted">
          ‹ Tournaments
        </Link>
        <Link href={`/tournaments/${t.id}/edit`} className="muted">
          ⚙ Settings
        </Link>
      </div>
      <h1>{t.name}</h1>
      <span className="tag">{TYPE_LABELS[t.type]}</span> <span className="tag">×{t.weight}</span>

      <h2>Live leaderboard</h2>
      {teams.length === 0 ? (
        <div className="empty">Add teams first.</div>
      ) : (
        <Leaderboard ranking={ranking} nameOf={nameOf} showRankPoints />
      )}

      <h2>Enter scores</h2>
      {teams.map((team) => (
        <div className="card" key={team.id}>
          <form action={saveScore} className="between">
            <input type="hidden" name="tournament_id" value={t.id} />
            <input type="hidden" name="team_id" value={team.id} />
            <input type="hidden" name="type" value={t.type} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                {team.name}
                {t.type === 'checkpoints' && (
                  <span className={`tag c${(team.circuit ?? 'A').toLowerCase()}`} style={{ marginLeft: 8 }}>
                    {team.circuit ?? 'A'}
                  </span>
                )}
              </div>
              <ScoreInputs t={t} team={team} value={scores.get(team.id)} />
            </div>
            <SubmitButton className="small" style={{ flex: 'none' }}>
              Save
            </SubmitButton>
          </form>
        </div>
      ))}

    </>
  );
}

function ScoreInputs({ t, team, value }: { t: Tournament; team: Team; value?: ScoreValue }) {
  switch (t.type) {
    case 'points':
      return (
        <input
          name="raw"
          type="number"
          step="any"
          inputMode="decimal"
          placeholder="points"
          defaultValue={(value as { value?: number })?.value ?? ''}
        />
      );
    case 'time': {
      const s = (value as { seconds?: number })?.seconds;
      return (
        <input
          name="raw"
          inputMode="decimal"
          placeholder="m:ss or seconds"
          defaultValue={s != null ? fmtTime(s) : ''}
        />
      );
    }
    case 'guesstimate': {
      const answers = (value as { answers?: number[] })?.answers ?? [];
      const targets = (t.config as { targets?: number[] }).targets ?? [];
      return (
        <div>
          {Array.from({ length: GUESSTIMATE_QUESTIONS }, (_, i) => (
            <input
              key={i}
              name={`answer${i + 1}`}
              type="number"
              step="any"
              inputMode="decimal"
              placeholder={
                Number.isFinite(targets[i]) ? `Q${i + 1} (answer ${targets[i]})` : `Q${i + 1} answer`
              }
              defaultValue={Number.isFinite(answers[i]) ? answers[i] : ''}
              style={{ marginBottom: i < GUESSTIMATE_QUESTIONS - 1 ? 6 : 0 }}
            />
          ))}
        </div>
      );
    }
    case 'checkpoints': {
      const cv = value as { found?: number[] } | undefined;
      const ck = team.circuit ?? 'A';
      const cfg = t.config as { circuitA?: number[]; circuitB?: number[] };
      const correct = ck === 'B' ? cfg.circuitB ?? [] : cfg.circuitA ?? [];
      return (
        <input
          name="raw"
          inputMode="numeric"
          placeholder={`checkpoints found (circuit ${ck}, of ${correct.length})`}
          defaultValue={(cv?.found ?? []).join(' ')}
        />
      );
    }
  }
}
