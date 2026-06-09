import { getTeams } from '@/lib/data';
import { createTeam, updateTeam, deleteTeam } from '@/lib/actions';
import { SubmitButton } from '@/app/submit-button';

export const dynamic = 'force-dynamic';

export default function TeamsPage() {
  const teams = getTeams();

  return (
    <>
      <h1>Teams</h1>

      <div className="card">
        <form action={createTeam}>
          <label>Team name</label>
          <input name="name" placeholder="e.g. Red Foxes" required />
          <label>Members (one per line or comma-separated)</label>
          <textarea name="members" placeholder={'Alice\nBob\nCarol'} />
          <label>Orienteering circuit</label>
          <select name="circuit" defaultValue="">
            <option value="">— none —</option>
            <option value="A">Circuit A</option>
            <option value="B">Circuit B</option>
          </select>
          <SubmitButton>Add team</SubmitButton>
        </form>
      </div>

      <div className="lbl">{teams.length} teams</div>
      {teams.length === 0 && <div className="empty">No teams yet. Add one above.</div>}

      {teams.map((t) => (
        <div className="card" key={t.id}>
          <details>
            <summary
              className="between"
              style={{ cursor: 'pointer', listStyle: 'none' }}
            >
              <span style={{ fontWeight: 700 }}>{t.name}</span>
              <span>
                {t.circuit && (
                  <span className={`tag c${t.circuit.toLowerCase()}`}>{t.circuit}</span>
                )}{' '}
                <span className="tag">{t.members.length} ▾</span>
              </span>
            </summary>

            <div className="muted" style={{ margin: '9px 0' }}>
              {t.members.length ? t.members.join(', ') : 'No members listed'}
            </div>

            <form action={updateTeam}>
              <input type="hidden" name="id" value={t.id} />
              <label>Team name</label>
              <input name="name" defaultValue={t.name} required />
              <label>Members</label>
              <textarea name="members" defaultValue={t.members.join('\n')} />
              <label>Orienteering circuit</label>
              <select name="circuit" defaultValue={t.circuit ?? ''}>
                <option value="">— none —</option>
                <option value="A">Circuit A</option>
                <option value="B">Circuit B</option>
              </select>
              <button type="submit" className="small" style={{ width: '100%', marginTop: 12 }}>
                Save
              </button>
            </form>

            <form action={deleteTeam}>
              <input type="hidden" name="id" value={t.id} />
              <button type="submit" className="danger">
                Delete team
              </button>
            </form>
          </details>
        </div>
      ))}
    </>
  );
}
