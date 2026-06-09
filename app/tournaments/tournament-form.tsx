'use client';

import { useState } from 'react';
import { TYPE_LABELS, GUESSTIMATE_QUESTIONS, type ScoringType } from '@/lib/types';

export interface TournamentDefaults {
  id?: number;
  name?: string;
  type?: ScoringType;
  weight?: number;
  targets?: number[];
  circuitA?: number[];
  circuitB?: number[];
}

export function TournamentForm({
  action,
  initial,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  initial?: TournamentDefaults;
  submitLabel: string;
}) {
  const [type, setType] = useState<ScoringType>(initial?.type ?? 'points');

  const num = (v: number | undefined) => (v == null || Number.isNaN(v) ? '' : v);

  return (
    <form action={action}>
      {initial?.id != null && <input type="hidden" name="id" value={initial.id} />}

      <label>Name</label>
      <input name="name" defaultValue={initial?.name ?? ''} placeholder="e.g. Music Quiz" required />

      <label>Scoring type</label>
      <select name="type" value={type} onChange={(e) => setType(e.target.value as ScoringType)}>
        <option value="points">{TYPE_LABELS.points}</option>
        <option value="time">{TYPE_LABELS.time}</option>
        <option value="guesstimate">{TYPE_LABELS.guesstimate}</option>
        <option value="checkpoints">{TYPE_LABELS.checkpoints}</option>
      </select>

      <label>Weight (overall multiplier, default 1.0)</label>
      <input name="weight" type="number" step="0.1" defaultValue={initial?.weight ?? 1} />

      {type === 'guesstimate' && (
        <>
          <label>Correct answers — {GUESSTIMATE_QUESTIONS} questions</label>
          {Array.from({ length: GUESSTIMATE_QUESTIONS }, (_, i) => (
            <input
              key={i}
              name={`target${i + 1}`}
              type="number"
              step="any"
              inputMode="decimal"
              placeholder={`Q${i + 1} answer`}
              defaultValue={num(initial?.targets?.[i])}
              style={{ marginBottom: 8 }}
            />
          ))}
        </>
      )}

      {type === 'checkpoints' && (
        <>
          <label>Circuit A checkpoints (6 numbers, 0–99)</label>
          <input
            name="circuitA"
            inputMode="numeric"
            placeholder="e.g. 14 3 78 9 41 60"
            defaultValue={(initial?.circuitA ?? []).join(' ')}
          />
          <label>Circuit B checkpoints (6 numbers, 0–99)</label>
          <input
            name="circuitB"
            inputMode="numeric"
            placeholder="e.g. 22 5 88 6 17 90"
            defaultValue={(initial?.circuitB ?? []).join(' ')}
          />
        </>
      )}

      {(type === 'points' || type === 'time') && (
        <p className="muted" style={{ marginTop: 12 }}>
          {type === 'points'
            ? 'Teams scored on points entered — higher wins.'
            : 'Teams scored on time entered (m:ss or seconds) — lower wins.'}{' '}
          No extra setup needed.
        </p>
      )}

      <button type="submit">{submitLabel}</button>
    </form>
  );
}
