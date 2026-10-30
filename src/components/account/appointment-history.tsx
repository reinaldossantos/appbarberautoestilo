import { requireUser } from '@/lib/auth/session';
import { localDate } from '@/lib/utils';

const labels: Record<string, string> = { scheduled: 'Agendado', cancelled: 'Cancelado', completed: 'Concluído', no_show: 'Falta registrada' };
export async function AppointmentHistory() {
  const { db, user } = await requireUser();
  const { data, error } = await db.from('appointment_events')
    .select('id,created_at,old_start,new_start,old_status,new_status,appointments!inner(customers!inner(profile_id))')
    .eq('appointments.customers.profile_id', user.id)
    .order('created_at', { ascending: false }).limit(20);
  if (error) throw new Error('Não foi possível carregar o histórico.');
  if (!data?.length) return null;
  return <section className="panel stack" aria-label="Atualizações dos agendamentos">
    <h3>Atualizações dos seus agendamentos</h3>
    <p className="muted">As 20 alterações mais recentes. Consulte aqui confirmações, reagendamentos e cancelamentos.</p>
    {data.map((event) => <div key={event.id}>
      <strong>{event.old_start && event.old_start !== event.new_start ? 'Reagendado' : labels[event.new_status] || event.new_status}</strong>
      <p className="muted">Registrado em {localDate(event.created_at)}{event.new_start ? ` · Atendimento: ${localDate(event.new_start)}` : ''}</p>
    </div>)}
  </section>;
}
