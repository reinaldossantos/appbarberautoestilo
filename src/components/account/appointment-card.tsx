'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { localDate, money } from '@/lib/utils';
import type { Appointment } from '@/lib/domain/types';
import { changeAppointment } from '@/lib/actions/appointments';
import { Button } from '@/components/ui/button';
const labels = {
  scheduled: 'Agendado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  no_show: 'Não compareceu',
};
export function AppointmentCard({
  appointment: a,
  admin = false,
  customerPhone,
}: {
  appointment: Appointment;
  admin?: boolean;
  customerPhone?: string | null;
}) {
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function change(action: 'cancelled' | 'completed' | 'no_show') {
    setBusy(true);
    try {
      const r = await changeAppointment({ id: a.id, action });
      setMessage(r.message);
      if (r.ok) {
        setConfirm(false);
        router.refresh();
      }
    } catch {
      setMessage('Não foi possível atualizar. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="panel stack">
      <div className="flex-between">
        <h3 style={{ margin: 0 }}>{a.services?.name || 'Atendimento'}</h3>
        <span className="badge">{labels[a.status]}</span>
      </div>
      <p className="muted" style={{ margin: 0 }}>
        {localDate(a.starts_at)} · {a.professionals?.name || 'Profissional'} ·{' '}
        {money(a.price_cents)}
      </p>
      {admin && customerPhone ? <a className="text-link" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${customerPhone.replace(/\D/g, '').replace(/^(\d{10,11})$/, '55$1')}?text=${encodeURIComponent(`Olá! Atualização do seu atendimento na Auto-estilo: ${a.services?.name || 'Atendimento'}, ${localDate(a.starts_at)}. Situação: ${labels[a.status]}.`)}`}>Comunicar situação ao cliente pelo WhatsApp</a> : null}
      {a.status === 'scheduled' ? (
        <div className="row-actions">
          <Link
            className="button button-outline button-sm"
            href={`/conta/reagendar/${a.id}`}
          >
            Reagendar
          </Link>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => setConfirm(!confirm)}
          >
            Cancelar
          </Button>
          {admin ? (
            <>
              <Button
                size="sm"
                disabled={busy}
                onClick={() => change('completed')}
              >
                Concluir
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => change('no_show')}
              >
                Registrar falta
              </Button>
            </>
          ) : null}
        </div>
      ) : null}
      {confirm ? (
        <div className="notice">
          <p>Deseja cancelar este atendimento? O horário será liberado.</p>
          <Button
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={() => change('cancelled')}
          >
            Confirmar cancelamento
          </Button>
        </div>
      ) : null}
      {message ? (
        <p role="status" className="notice">
          {message}
          {!admin ? (
            <>
              {' '}
              <Link href="/contato" className="text-link">
                Falar com a barbearia pelo WhatsApp
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
    </article>
  );
}
