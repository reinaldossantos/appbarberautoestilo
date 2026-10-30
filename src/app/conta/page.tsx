import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import { requireUser } from '@/lib/auth/session';
import { AppointmentCard } from '@/components/account/appointment-card';
import type { Appointment } from '@/lib/domain/types';
import { AppointmentHistory } from '@/components/account/appointment-history';
export default async function Account() {
  const { db, user } = await requireUser();
  const { data: customer } = await db
    .from('customers')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle();
  if (!customer)
    return (
      <div className="panel empty-state">
        <h2>Vamos nos conhecer?</h2>
        <p>Complete seu nome e telefone para agendar.</p>
        <Link href="/conta/perfil" className="button button-gold">
          Completar cadastro
        </Link>
      </div>
    );
  const { data, error } = await db
    .from('appointments')
    .select('*,services(name),professionals(name)')
    .eq('customer_id', customer.id)
    .order('starts_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (
    <div className="stack">
      <div className="flex-between">
        <h2>Meus agendamentos</h2>
        <Link className="button button-gold" href="/agendar">
          Novo agendamento
        </Link>
      </div>
      <AppointmentHistory />
      {data?.length ? (
        data.map((a) => (
          <AppointmentCard key={a.id} appointment={a as Appointment} />
        ))
      ) : (
        <div className="panel empty-state">
          <CalendarDays size={40} />
          <h3>Seu próximo estilo espera por você.</h3>
          <p>Você ainda não tem agendamentos.</p>
        </div>
      )}
    </div>
  );
}
