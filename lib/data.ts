import { db } from './db';
import type { Circuit, ScoreValue, ScoringType, Team, Tournament } from './types';
import { rankTournament, type RankedTeam } from './scoring';

export function getTeams(): Team[] {
  const rows = db()
    .prepare('SELECT * FROM teams ORDER BY sort, id')
    .all() as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r.id as number,
    name: r.name as string,
    members: JSON.parse((r.members as string) || '[]'),
    circuit: (r.circuit as Circuit | null) ?? null,
    sort: r.sort as number,
  }));
}

export function getTournaments(): Tournament[] {
  const rows = db()
    .prepare('SELECT * FROM tournaments ORDER BY sort, id')
    .all() as Record<string, unknown>[];
  return rows.map(rowToTournament);
}

export function getTournament(id: number): Tournament | null {
  const r = db()
    .prepare('SELECT * FROM tournaments WHERE id = ?')
    .get(id) as Record<string, unknown> | undefined;
  return r ? rowToTournament(r) : null;
}

function rowToTournament(r: Record<string, unknown>): Tournament {
  return {
    id: r.id as number,
    name: r.name as string,
    type: r.type as ScoringType,
    weight: r.weight as number,
    config: JSON.parse((r.config as string) || '{}'),
    sort: r.sort as number,
  };
}

// Map<teamId, ScoreValue> for a tournament
export function getScores(tournamentId: number): Map<number, ScoreValue> {
  const rows = db()
    .prepare('SELECT team_id, value FROM scores WHERE tournament_id = ?')
    .all(tournamentId) as { team_id: number; value: string }[];
  const m = new Map<number, ScoreValue>();
  for (const r of rows) m.set(r.team_id, JSON.parse(r.value || '{}'));
  return m;
}

export function getTournamentRanking(t: Tournament, teams: Team[]): RankedTeam[] {
  const scores = getScores(t.id);
  return rankTournament(t, scores, teams, teams.length);
}

export interface Activity {
  team: string;
  tournament: string;
  when: string;
}

export function getRecentActivity(limit = 8): Activity[] {
  const rows = db()
    .prepare(
      `SELECT s.updated_at AS when_, t.name AS team, tn.name AS tournament
       FROM scores s
       JOIN teams t ON t.id = s.team_id
       JOIN tournaments tn ON tn.id = s.tournament_id
       ORDER BY s.updated_at DESC, s.id DESC
       LIMIT ?`,
    )
    .all(limit) as { when_: string; team: string; tournament: string }[];
  return rows.map((r) => ({ team: r.team, tournament: r.tournament, when: r.when_ }));
}

export interface OverallRow {
  team: Team;
  total: number;
  perTournament: Record<number, number>;
}

export function getOverallStandings(): {
  rows: OverallRow[];
  tournaments: Tournament[];
} {
  const teams = getTeams();
  const tournaments = getTournaments();
  const acc = new Map<number, OverallRow>();
  for (const team of teams) acc.set(team.id, { team, total: 0, perTournament: {} });

  for (const t of tournaments) {
    const ranking = getTournamentRanking(t, teams);
    for (const r of ranking) {
      const row = acc.get(r.teamId);
      if (!row) continue;
      row.perTournament[t.id] = r.placement;
      row.total += r.placement;
    }
  }

  const rows = [...acc.values()].sort((a, b) => b.total - a.total);
  return { rows, tournaments };
}
