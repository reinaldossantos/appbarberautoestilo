import { notFound } from 'next/navigation';
import { z } from 'zod';
import { requireUser, requireAdmin } from '@/lib/auth/session';
import { staticPixProvider } from '@/lib/payments/pix';
import { PixCode } from '@/components/payments/pix-code';
import { ActionForm } from '@/components/forms/action-form';
import {
  reportPayment,
  confirmPayment,
  preparePayment,
} from '@/lib/actions/payments';
import { money, localDate } from '@/lib/utils';
export default async function PaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { db, profile } = await requireUser();
  const admin = profile?.role === 'admin';
  if (admin) await requireAdmin();
  const { data: a } = await db
    .from('appointments')
    .select('*,services(name),professionals(name)')
    .eq('id', id)
    .maybeSingle();
  if (!a) notFound();
  const [payment, config] = await Promise.all([
    db.from('payments').select('*').eq('appointment_id', id).maybeSingle(),
    db.from('payment_settings').select('*').maybeSingle(),
  ]);
  if (payment.error || config.error)
    return (
      <p className="notice">
        Pagamentos ainda não disponíveis. Sua reserva não depende de pagamento
        antecipado.
      </p>
    );
  const p = payment.data,
    s = config.data;
  const due =
    ['scheduled', 'completed'].includes(a.status) &&
    new Date(a.starts_at) <= new Date() &&
    a.price_cents > 0;
  const code =
    due && p && p.status !== 'confirmed' && s?.verified_at
      ? await staticPixProvider.generate({
          key: s.pix_key,
          beneficiary: s.beneficiary,
          city: s.city,
          amountCents: p.amount_cents,
          reference: id.replaceAll('-', '').slice(0, 25),
        })
      : null;
  return (
    <div className="stack">
      <h2>Pagamento do atendimento</h2>
      <div className="panel">
        <h3>{a.services?.name}</h3>
        <p>
          {a.professionals?.name} · {localDate(a.starts_at)}
        </p>
        <strong>Total: {money(a.price_cents)}</strong>
        <p>
          Status:{' '}
          {p?.status === 'confirmed'
            ? 'Confirmado'
            : p?.status === 'awaiting_review'
              ? 'Aguardando conferência'
              : 'Pendente'}
        </p>
      </div>
      <p>
        O pagamento pode ser feito no atendimento ou após a conclusão. Sua
        reserva não exige pagamento antecipado.
      </p>
      {p?.status === 'confirmed' ? (
        <p className="notice">
          Recebimento em {localDate(p.paid_at)} · {p.method}. Conferido em{' '}
          {localDate(p.confirmed_at)} pelo administrador.
        </p>
      ) : !due ? (
        <p className="notice">
          Pagamento disponível no momento do atendimento. Cancelamentos e faltas
          não geram cobrança neste módulo.
        </p>
      ) : (
        <>
          {!p ? (
            <ActionForm action={preparePayment} submit="Preparar pagamento">
              <input type="hidden" name="appointment" value={id} />
              <p>
                Registre o pagamento pendente para consultar as opções
                disponíveis.
              </p>
            </ActionForm>
          ) : null}
          {code ? (
            <>
              <p>
                Beneficiário validado pelo administrador:{' '}
                <strong>{s.beneficiary}</strong>. Confira o nome no aplicativo
                bancário antes de pagar.
              </p>
              <PixCode {...code} />
              <ActionForm action={reportPayment} submit="Já paguei">
                <input type="hidden" name="appointment" value={id} />
                <p>
                  Este aviso apenas solicita conferência. Não confirma o
                  recebimento.
                </p>
              </ActionForm>
            </>
          ) : (
            <p className="notice">
              {s?.verified_at ? 'Prepare o pagamento acima para exibir o QR Code.' : 'Pix aguardando validação dos dados bancários pela administração. Combine o pagamento no atendimento.'}
            </p>
          )}
          {admin ? (
            <div className="panel">
              <h3>Conferência manual</h3>
              <ActionForm
                action={confirmPayment}
                submit="Confirmar recebimento"
              >
                <input type="hidden" name="appointment" value={id} />
                <input type="hidden" name="amount" value={a.price_cents} />
                <label className="field">
                  Meio
                  <select name="method">
                    <option value="pix">Pix</option>
                    <option value="cash">Dinheiro</option>
                    <option value="other">Outro meio</option>
                  </select>
                </label>
                <label className="field">
                  Data do recebimento (Bras?lia)
                  <input type="datetime-local" name="paid_at" required />
                </label>
                <label className="checkbox-line">
                  <input name="checked" type="checkbox" required />
                  Conferi o recebimento integral de {money(a.price_cents)} no
                  banco ou em mãos.
                </label>
              </ActionForm>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
