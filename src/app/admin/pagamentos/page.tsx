import Link from 'next/link';
import { DeleteTestRecord } from '@/components/admin/delete-test-record';
import { requireAdmin } from '@/lib/auth/session';
import { ActionForm } from '@/components/forms/action-form';
import { savePaymentSettings } from '@/lib/actions/payments';
import { money, localDate } from '@/lib/utils';
export default async function Payments() {
  const { db } = await requireAdmin();
  const [config, payments] = await Promise.all([
    db.from('payment_settings').select('*').single(),
    db
      .from('payments')
      .select('*,customers(name)')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);
  if (config.error || payments.error)
    return (
      <p className="notice">
        Módulo de pagamentos aguardando instalação e validação antes da
        publicação.
      </p>
    );
  const s = config.data;
  return (
    <div className="stack">
      <h1>Configurações de Pagamento</h1>
      <p className="notice">
        Pix manual. Confirme chave e beneficiário com um teste bancário real
        antes de liberar. Alterar os dados exige nova validação.
      </p>
      <ActionForm action={savePaymentSettings}>
        <label className="field">
          Tipo de chave
          <select name="key_type" defaultValue={s.key_type}>
            <option value="phone">Telefone</option>
            <option value="email">E-mail</option>
            <option value="cpf">CPF</option>
            <option value="cnpj">CNPJ</option>
            <option value="random">Aleatória</option>
          </select>
        </label>
        <label className="field">
          Chave Pix
          <input
            name="pix_key"
            required
            defaultValue={s.pix_key}
            maxLength={77}
          />
        </label>
        <label className="field">
          Beneficiário informado pelo banco
          <input
            name="beneficiary"
            required
            defaultValue={s.beneficiary}
            maxLength={100}
          />
        </label>
        <label className="field">
          Cidade
          <input name="city" required defaultValue={s.city} maxLength={15} />
        </label>
        <label className="checkbox-line">
          <input name="verified" type="checkbox" />
          Conferi a chave, o beneficiário exibido pelo banco e o recebimento de
          um teste real com estes dados.
        </label>
      </ActionForm>
      <h2>Recebimentos recentes</h2>
      <p>
        Para registrar Pix, dinheiro ou outro meio, abra o pagamento na agenda.
        Últimos 100 registros:
      </p>
      {payments.data.map((p) => (
        <div className="panel" key={p.id}>
          <p>
            {p.customers?.name} · {money(p.amount_cents)} ·{' '}
            {p.status === 'confirmed'
              ? 'Confirmado'
              : p.status === 'awaiting_review'
                ? 'Aguardando conferência'
                : 'Pendente'}
          </p>
          <p>
            {localDate(p.created_at)} · {p.method}
          </p>
          <Link
            href={`/conta/pagamento/${p.appointment_id}`}
            className="text-link"
          >
            Conferir pagamento
          </Link>
          <DeleteTestRecord
            kind="payment"
            id={p.id}
            label={`${p.customers?.name} — ${money(p.amount_cents)}`}
          />
        </div>
      ))}
    </div>
  );
}
