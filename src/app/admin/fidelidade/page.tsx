import { relatedName } from '@/lib/utils';
import { requireAdmin } from '@/lib/auth/session';
import { ActionForm } from '@/components/forms/action-form';
import {
  saveRule,
  saveReward,
  grantPoints,
  redeemReward,
} from '@/lib/actions/admin-loyalty';
import { localDate } from '@/lib/utils';
export default async function LoyaltyAdmin() {
  const { db } = await requireAdmin();
  const [services, rules, rewards, customers, completed, transactions] =
    await Promise.all([
      db.from('services').select('id,name'),
      db.from('loyalty_rules').select('*,services(name)'),
      db.from('loyalty_rewards').select('*'),
      db.from('customers').select('id,name'),
      db
        .from('appointments')
        .select('id,starts_at,customers(name),services(name)')
        .eq('status', 'completed')
        .order('starts_at', { ascending: false })
        .limit(100),
      db
        .from('loyalty_transactions')
        .select('*,customers(name)')
        .order('created_at', { ascending: false })
        .limit(100),
    ]);
  if (
    [services, rules, rewards, customers, completed, transactions].some(
      (r) => r.error,
    )
  )
    throw new Error('Falha ao consultar fidelidade');
  return (
    <div className="stack">
      <h1>Fidelidade</h1>
      <p className="notice">
        Nenhuma regra é ativada automaticamente. Defina as condições comerciais
        e valide os atendimentos antes de conceder pontos. Validade de pontos e
        campanhas são evoluções pendentes.
      </p>
      <div className="panel">
        <h2>Regra por serviço</h2>
        <ActionForm action={saveRule} className="form-grid">
          <label className="field">
            Serviço
            <select name="service_id">
              {services.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Pontos por atendimento
            <input type="number" name="points" min="1" required />
          </label>
          <label className="checkbox-line">
            <input type="checkbox" name="active" />
            Regra ativa
          </label>
        </ActionForm>
        {rules.data?.map((r) => (
          <p key={r.id}>
            {r.services?.name} · {r.points} pontos ·{' '}
            {r.active ? 'Ativa' : 'Inativa'}
          </p>
        ))}
      </div>
      {[null, ...(rewards.data || [])].map((r) => (
        <details className="panel" key={r?.id || 'new'}>
          <summary>
            {r ? `Recompensa: ${r.name}` : 'Cadastrar recompensa'}
          </summary>
          <ActionForm action={saveReward} className="form-grid">
            <input type="hidden" name="id" value={r?.id || ''} />
            <label className="field">
              Nome
              <input name="name" required defaultValue={r?.name} />
            </label>
            <label className="field">
              Custo em pontos
              <input
                type="number"
                name="cost"
                min="1"
                required
                defaultValue={r?.cost}
              />
            </label>
            <label className="checkbox-line">
              <input type="checkbox" name="active" defaultChecked={r?.active} />
              Ativa
            </label>
          </ActionForm>
        </details>
      ))}
      <div className="panel">
        <h2>Validar pontuação</h2>
        <ActionForm action={grantPoints} submit="Conceder pontos">
          <label className="field">
            Atendimento concluído
            <select name="appointment" required>
              <option value="">Selecione</option>
              {completed.data?.map((a) => (
                <option key={a.id} value={a.id}>
                  {relatedName(a.customers)} · {relatedName(a.services)} ·{' '}
                  {localDate(a.starts_at)}
                </option>
              ))}
            </select>
          </label>
        </ActionForm>
      </div>
      <div className="panel">
        <h2>Registrar resgate</h2>
        <ActionForm
          action={redeemReward}
          className="form-grid"
          submit="Confirmar resgate"
        >
          <input type="hidden" name="operation" value={crypto.randomUUID()} />
          <label className="field">
            Cliente
            <select name="customer" required>
              {customers.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Recompensa
            <select name="reward" required>
              {rewards.data
                ?.filter((r) => r.active)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} · {r.cost} pontos
                  </option>
                ))}
            </select>
          </label>
        </ActionForm>
      </div>
      <div className="panel">
        <h2>Últimas 100 movimentações</h2>
        {transactions.data?.length ? (
          transactions.data.map((t) => (
            <p key={t.id}>
              {t.customers?.name} · {t.points} pontos ·{' '}
              {localDate(t.created_at)} · {t.reason}
            </p>
          ))
        ) : (
          <p className="muted">Nenhuma movimentação.</p>
        )}
      </div>
    </div>
  );
}
