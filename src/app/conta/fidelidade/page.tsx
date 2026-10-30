import { requireUser } from '@/lib/auth/session';
import { localDate } from '@/lib/utils';
export default async function Loyalty() {
  const { db, user } = await requireUser();
  const { data: c } = await db
    .from('customers')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle();
  const { data: transactions, error } = c
    ? await db
        .from('loyalty_transactions')
        .select('*')
        .eq('customer_id', c.id)
        .order('created_at', { ascending: false })
    : { data: [], error: null };
  if (error) throw error;
  const { data: rewards } = await db
    .from('loyalty_rewards')
    .select('*')
    .eq('active', true);
  return (
    <div className="stack">
      <div className="panel">
        <span className="eyebrow">Cuidado que aproxima</span>
        <h2 style={{ marginTop: 20 }}>Minha fidelidade</h2>
        <p className="service-price">
          {transactions?.reduce((n, t) => n + t.points, 0) || 0} pontos
        </p>
        <p className="muted">
          Pontos são registrados somente após atendimentos concluídos, conforme
          regras habilitadas pela barbearia.
        </p>
      </div>
      <div className="panel">
        <h3>Recompensas</h3>
        {rewards?.length ? (
          rewards.map((r) => (
            <p key={r.id}>
              {r.name} · {r.cost} pontos. Solicite seu resgate à barbearia.
            </p>
          ))
        ) : (
          <p className="muted">
            O programa está em preparação. Nenhuma recompensa foi configurada
            ainda.
          </p>
        )}
      </div>
      <div className="panel">
        <h3>Movimentações</h3>
        {transactions?.length ? (
          transactions.map((t) => (
            <p key={t.id}>
              {localDate(t.created_at)} · {t.points > 0 ? '+' : ''}
              {t.points} · {t.reason}
            </p>
          ))
        ) : (
          <p className="muted">Nenhuma movimentação por enquanto.</p>
        )}
      </div>
    </div>
  );
}
