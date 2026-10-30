import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { requireUser } from '@/lib/auth/session';
import { localDate } from '@/lib/utils';
import { getSettings } from '@/lib/data/public';
export default async function Confirmation({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { db } = await requireUser();
  const { data } = await db
    .from('appointments')
    .select('starts_at,status,services(name)')
    .eq('id', id)
    .maybeSingle();
  if (!data) notFound();
  const settings = await getSettings();
  const text = `Olá! Meu agendamento na Auto-estilo está marcado para ${localDate(data.starts_at)}.`;
  return (
    <div className="container section narrow">
      <div className="panel empty-state">
        <CheckCircle2 size={48} />
        <h1 style={{ fontSize: 32 }}>Horário reservado!</h1>
        <p>{localDate(data.starts_at)}</p>
        <p>Você pode acompanhar e gerenciar seu atendimento na sua conta.</p>
        <div className="stack">
          <Link className="button button-gold" href="/conta">
            Ver meus agendamentos
          </Link>
          <a
            className="button button-outline"
            href={`https://wa.me/${settings?.whatsapp || '553298553119'}?text=${encodeURIComponent(text)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Compartilhar pelo WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
