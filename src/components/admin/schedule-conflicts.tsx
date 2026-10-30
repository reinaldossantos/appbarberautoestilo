import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/session';
import { localDate } from '@/lib/utils';

type Conflict = {
  appointment_id: string;
  starts_at: string;
  customer_name: string;
  professional_name: string;
  reason: string;
};
export async function ScheduleConflicts() {
  const { db } = await requireAdmin();
  const { data, error } = await db.rpc('schedule_conflicts');
  if (error?.code === 'PGRST202')
    return (
      <p className="notice">
        A atualização das regras de agenda ainda precisa ser instalada no banco.
        A verificação de conflitos estará disponível após essa etapa.
      </p>
    );
  if (error) throw new Error('Não foi possível conferir conflitos da agenda.');
  if (!data?.length)
    return (
      <p className="notice">
        Nenhum conflito entre reservas futuras e o expediente ou intervalo
        configurado.
      </p>
    );
  return (
    <section className="panel stack" aria-label="Conflitos da agenda">
      <h2>Reservas que precisam de atenção</h2>
      <p>
        As reservas foram preservadas. Combine qualquer alteração com o cliente.
      </p>
      {(data as Conflict[]).map((c) => (
        <div key={c.appointment_id} className="notice">
          <p>
            {localDate(c.starts_at)} · {c.customer_name} · {c.professional_name}
          </p>
          <p>{c.reason}</p>
          <Link
            className="text-link"
            href={`/conta/reagendar/${c.appointment_id}`}
          >
            Revisar horário
          </Link>
        </div>
      ))}
    </section>
  );
}
