'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from './db';
import { GUESSTIMATE_QUESTIONS, type ScoreValue, type ScoringType } from './types';
import { parseSeq, parseTime } from './scoring';

// Checkpoint numbers: integers 0–99, at most 6.
function parseCheckpoints(input: string): number[] {
  return parseSeq(input)
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 99)
    .slice(0, 6);
}

// Read N indexed numeric fields (prefix1..prefixN) into a sparse-safe array.
// Empty fields become NaN so question slots line up with targets by index.
function readNumberedNumbers(formData: FormData, prefix: string, n: number): number[] {
  const out: number[] = [];
  for (let i = 1; i <= n; i++) {
    const v = String(formData.get(`${prefix}${i}`) ?? '').trim();
    out.push(v === '' ? NaN : Number(v));
  }
  return out;
}

function bump() {
  revalidatePath('/', 'layout');
}

// --- teams ----------------------------------------------------------------
export async function createTeam(formData: FormData) {
  const name = String(formData.get('name') || '').trim();
  if (!name) return;
  const members = parseMembers(String(formData.get('members') || ''));
  const circuit = readCircuit(formData);
  db()
    .prepare('INSERT INTO teams (name, members, circuit) VALUES (?, ?, ?)')
    .run(name, JSON.stringify(members), circuit);
  bump();
}

export async function updateTeam(formData: FormData) {
  const id = Number(formData.get('id'));
  const name = String(formData.get('name') || '').trim();
  if (!id || !name) return;
  const members = parseMembers(String(formData.get('members') || ''));
  const circuit = readCircuit(formData);
  db()
    .prepare('UPDATE teams SET name = ?, members = ?, circuit = ? WHERE id = ?')
    .run(name, JSON.stringify(members), circuit, id);
  bump();
}

function readCircuit(formData: FormData): 'A' | 'B' | null {
  const c = String(formData.get('circuit') || '');
  return c === 'A' || c === 'B' ? c : null;
}

export async function deleteTeam(formData: FormData) {
  const id = Number(formData.get('id'));
  if (id) db().prepare('DELETE FROM teams WHERE id = ?').run(id);
  bump();
}

function parseMembers(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// --- tournaments ----------------------------------------------------------
export async function createTournament(formData: FormData) {
  const { name, type, weight, config } = readTournamentForm(formData);
  if (!name) return;
  db()
    .prepare('INSERT INTO tournaments (name, type, weight, config) VALUES (?, ?, ?, ?)')
    .run(name, type, weight, JSON.stringify(config));
  bump();
}

export async function updateTournament(formData: FormData) {
  const id = Number(formData.get('id'));
  if (!id) return;
  const { name, type, weight, config } = readTournamentForm(formData);
  if (!name) return;
  db()
    .prepare('UPDATE tournaments SET name = ?, type = ?, weight = ?, config = ? WHERE id = ?')
    .run(name, type, weight, JSON.stringify(config), id);
  bump();
  redirect(`/tournaments/${id}`);
}

export async function deleteTournament(formData: FormData) {
  const id = Number(formData.get('id'));
  if (id) db().prepare('DELETE FROM tournaments WHERE id = ?').run(id);
  bump();
  redirect('/tournaments');
}

function readTournamentForm(formData: FormData) {
  const name = String(formData.get('name') || '').trim();
  const type = String(formData.get('type') || 'points') as ScoringType;
  const weight = Number(formData.get('weight')) || 1.0;
  let config: Record<string, unknown> = {};
  if (type === 'guesstimate') {
    config = { targets: readNumberedNumbers(formData, 'target', GUESSTIMATE_QUESTIONS) };
  } else if (type === 'checkpoints') {
    config = {
      circuitA: parseCheckpoints(String(formData.get('circuitA') || '')),
      circuitB: parseCheckpoints(String(formData.get('circuitB') || '')),
    };
  }
  return { name, type, weight, config };
}

// --- scores ---------------------------------------------------------------
export async function saveScore(formData: FormData) {
  const tournamentId = Number(formData.get('tournament_id'));
  const teamId = Number(formData.get('team_id'));
  const type = String(formData.get('type')) as ScoringType;
  if (!tournamentId || !teamId) return;

  const raw = String(formData.get('raw') ?? '').trim();

  let value: ScoreValue | null = null;
  let clear = false;

  switch (type) {
    case 'points': {
      if (raw === '') clear = true;
      else value = { value: Number(raw) };
      break;
    }
    case 'time': {
      const s = parseTime(raw);
      if (s === null) clear = true;
      else value = { seconds: s };
      break;
    }
    case 'guesstimate': {
      const answers = readNumberedNumbers(formData, 'answer', GUESSTIMATE_QUESTIONS);
      if (answers.every((a) => Number.isNaN(a))) clear = true;
      else value = { answers };
      break;
    }
    case 'checkpoints': {
      if (raw === '') clear = true;
      else value = { found: parseCheckpoints(raw) };
      break;
    }
  }

  if (clear) {
    db()
      .prepare('DELETE FROM scores WHERE tournament_id = ? AND team_id = ?')
      .run(tournamentId, teamId);
  } else if (value) {
    db()
      .prepare(
        `INSERT INTO scores (tournament_id, team_id, value, updated_at)
         VALUES (?, ?, ?, datetime('now'))
         ON CONFLICT(tournament_id, team_id)
         DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      )
      .run(tournamentId, teamId, JSON.stringify(value));
  }
  bump();
}
