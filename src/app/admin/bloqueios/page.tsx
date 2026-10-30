import { relatedName } from '@/lib/utils';
import { requireAdmin } from '@/lib/auth/session';
import { ActionForm } from '@/components/forms/action-form';
import { saveBlock, removeBlock } from '@/lib/actions/admin-schedule';
import { localDate } from '@/lib/utils';
function localInput(date: string) {
  const d = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
  return d.replace(' ', 'T');
}
export default async function Blocks() {
  const { db } = await requireAdmin();
  const [blocks, pros, appointments] = await Promise.all([
    db
      .from('schedule_blocks')
      .select('*,professionals(name)')
      .order('starts_at'),
    db.from('professionals').select('id,name'),
    db
      .from('appointments')
      .select('id,starts_at,ends_at,professionals(name)')
      .eq('status', 'scheduled')
      .gte('ends_at', new Date().toISOString())
      .order('starts_at')
      .limit(100),
  ]);
  if (blocks.error || pros.error || appointments.error)
    throw new Error('Falha na agenda');
  return (
    <div className="stack">
      <h1>Bloqueios de agenda</h1>
      <p className="muted">
        Use início e fim para bloquear um horário, turno, dia inteiro, semana ou
        férias. Recorrências repetem semanalmente, até 52 vezes. Motivos são
        privados.
      </p>
      {[null, ...blocks.data].map((b) => (
        <details key={b?.id || 'new'} className="panel" open={!b}>
          <summary>
            {b
              ? `${b.professionals?.name} · ${localDate(b.starts_at)} a ${localDate(b.ends_at)}`
              : 'Criar bloqueio'}
          </summary>
          <div style={{ marginTop: 20 }}>
            <ActionForm action={saveBlock} className="form-grid">
              <input type="hidden" name="id" value={b?.id || ''} />
              <label className="field">
                Profissional
                <select name="professional" defaultValue={b?.professional_id}>
                  {pros.data.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Repetições semanais
                <input
                  name="repeat"
                  type="number"
                  min="1"
                  max={b ? 1 : 52}
                  defaultValue="1"
                />
              </label>
              <label className="field">
                Início (Brasília)
                <input
                  type="datetime-local"
                  name="start"
                  required
                  defaultValue={b ? localInput(b.starts_at) : ''}
                />
              </label>
              <label className="field">
                Fim (Brasília)
                <input
                  type="datetime-local"
                  name="end"
                  required
                  defaultValue={b ? localInput(b.ends_at) : ''}
                />
              </label>
              <label className="field full">
                Motivo privado
                <input
                  name="reason"
                  maxLength={500}
                  defaultValue={b?.reason || ''}
                />
              </label>
            </ActionForm>
            {b ? (
              <div style={{ marginTop: 18 }}>
                <ActionForm
                  action={removeBlock}
                  submit="Desbloquear este período"
                >
                  <input type="hidden" name="id" value={b.id} />
                </ActionForm>
              </div>
            ) : null}
          </div>
        </details>
      ))}
      <div className="panel">
        <h2>Reservas a preservar</h2>
        <p className="muted">
          Se houver conflito, o bloqueio será recusado. Reagende ou cancele
          explicitamente cada reserva na agenda e tente novamente.
        </p>
        {appointments.data.length ? (
          appointments.data.map((a) => (
            <p key={a.id}>
              {relatedName(a.professionals)} · {localDate(a.starts_at)} até{' '}
              {localDate(a.ends_at)}
            </p>
          ))
        ) : (
          <p className="muted">Nenhuma reserva futura.</p>
        )}
      </div>
    </div>
  );
}
