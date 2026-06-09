import type { Circuit, ScoreValue, ScoringType, Team, Tournament, TournamentConfig } from './types';

// --- raw metric per team for a tournament -------------------------------
// Returns { metric, display } or null if no usable score.
export interface Metric {
  metric: number; // normalized number used for ranking
  display: string; // human label shown in UI
}

function checkpointCorrect(answer: number[], correct: number[]): number {
  const set = new Set(correct);
  const seen = new Set<number>();
  let n = 0;
  for (const v of answer) {
    if (set.has(v) && !seen.has(v)) {
      n++;
      seen.add(v);
    }
  }
  return n;
}

export function teamMetric(
  type: ScoringType,
  config: TournamentConfig,
  value: ScoreValue | undefined,
  circuit?: Circuit | null,
): Metric | null {
  if (!value || Object.keys(value).length === 0) return null;

  switch (type) {
    case 'points': {
      const v = (value as { value: number }).value;
      if (v == null || Number.isNaN(v)) return null;
      return { metric: v, display: String(v) };
    }
    case 'time': {
      const s = (value as { seconds: number }).seconds;
      if (s == null || Number.isNaN(s)) return null;
      return { metric: s, display: fmtTime(s) };
    }
    case 'guesstimate': {
      const answers = (value as { answers?: number[] }).answers ?? [];
      const targets = (config as { targets?: number[] }).targets ?? [];
      const valid = answers.filter((a) => Number.isFinite(a));
      if (valid.length === 0) return null;
      // total distance across questions; lower is better
      const n = Math.min(answers.length, targets.length);
      let total = 0;
      for (let i = 0; i < n; i++) {
        if (!Number.isFinite(answers[i]) || !Number.isFinite(targets[i])) continue;
        total += Math.abs(answers[i] - targets[i]);
      }
      return { metric: total, display: `Δ ${round(total)}` };
    }
    case 'checkpoints': {
      const cv = value as { found?: number[] };
      const cfg = config as { circuitA?: number[]; circuitB?: number[] };
      const correct = circuit === 'B' ? cfg.circuitB ?? [] : cfg.circuitA ?? [];
      const n = checkpointCorrect(cv.found ?? [], correct);
      const ck = circuit ?? 'A';
      return { metric: n, display: `${n} ✓ · ${ck}` };
    }
    default:
      return null;
  }
}

// higher metric is better?
export function higherIsBetter(type: ScoringType): boolean {
  return type === 'points' || type === 'checkpoints';
}

// --- ranking + placement points -----------------------------------------
export interface RankedTeam {
  teamId: number;
  metric: number | null;
  display: string;
  rank: number | null; // 1-based; null if no score
  placement: number; // weighted placement points
}

// totalTeams: number of teams in the conference (placement base).
// 1st place = totalTeams points, last = 1. Ties share the average.
export function rankTournament(
  t: Tournament,
  scores: Map<number, ScoreValue>,
  teams: Team[],
  totalTeams: number,
): RankedTeam[] {
  const metrics = teams.map((team) => {
    const m = teamMetric(t.type, t.config, scores.get(team.id), team.circuit);
    return { teamId: team.id, m };
  });

  const scored = metrics.filter((x) => x.m !== null) as {
    teamId: number;
    m: Metric;
  }[];
  const unscored = metrics.filter((x) => x.m === null);

  const hib = higherIsBetter(t.type);
  scored.sort((a, b) => (hib ? b.m.metric - a.m.metric : a.m.metric - b.m.metric));

  const result: RankedTeam[] = [];
  let i = 0;
  while (i < scored.length) {
    // group ties (same metric)
    let j = i;
    while (j < scored.length && scored[j].m.metric === scored[i].m.metric) j++;
    const groupSize = j - i;
    // positions i..j-1 (0-based) -> placement points base
    let pts = 0;
    for (let k = i; k < j; k++) pts += totalTeams - k; // pos 0 -> totalTeams
    const avgPts = (pts / groupSize) * t.weight;
    const rank = i + 1;
    for (let k = i; k < j; k++) {
      result.push({
        teamId: scored[k].teamId,
        metric: scored[k].m.metric,
        display: scored[k].m.display,
        rank,
        placement: avgPts,
      });
    }
    i = j;
  }

  for (const u of unscored) {
    result.push({
      teamId: u.teamId,
      metric: null,
      display: '—',
      rank: null,
      placement: 0,
    });
  }

  return result;
}

// --- formatting -----------------------------------------------------------
export function fmtTime(seconds: number): string {
  if (seconds == null || Number.isNaN(seconds)) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const ss = Number.isInteger(s) ? String(s).padStart(2, '0') : s.toFixed(2).padStart(5, '0');
  return `${m}:${ss}`;
}

export function parseTime(input: string): number | null {
  const v = input.trim();
  if (!v) return null;
  if (v.includes(':')) {
    const [m, s] = v.split(':');
    const mn = Number(m);
    const sc = Number(s);
    if (Number.isNaN(mn) || Number.isNaN(sc)) return null;
    return mn * 60 + sc;
  }
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

export function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function parseSeq(input: string): number[] {
  return input
    .split(/[\s,]+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => !Number.isNaN(n));
}
