export type ScoringType = 'points' | 'time' | 'guesstimate' | 'checkpoints';

export const TYPE_LABELS: Record<ScoringType, string> = {
  points: 'Points (higher wins)',
  time: 'Time (lower wins)',
  guesstimate: 'Guesstimate (closest wins)',
  checkpoints: 'Orienteering (correct checkpoints)',
};

export type Circuit = 'A' | 'B';

export interface Team {
  id: number;
  name: string;
  members: string[];
  circuit: Circuit | null; // orienteering circuit assignment
  sort: number;
}

export interface Tournament {
  id: number;
  name: string;
  type: ScoringType;
  weight: number;
  config: TournamentConfig;
  sort: number;
}

export type TournamentConfig =
  | { targets?: number[] } // guesstimate (3 questions -> 3 correct answers)
  | { circuitA?: number[]; circuitB?: number[] } // checkpoints
  | Record<string, never>; // points / time

// Per-team raw score, stored as JSON in scores.value
export type ScoreValue =
  | { value: number } // points
  | { seconds: number } // time
  | { answers: number[] } // guesstimate (one answer per question)
  | { found: number[] } // checkpoints (scored vs the team's own circuit)
  | Record<string, never>;

export const GUESSTIMATE_QUESTIONS = 3;

export interface ScoreRow {
  id: number;
  tournament_id: number;
  team_id: number;
  value: ScoreValue;
  updated_at: string;
}
