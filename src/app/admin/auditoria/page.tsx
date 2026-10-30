import { requireAdmin } from '@/lib/auth/session';
import { localDate } from '@/lib/utils';
export default async function Audit() {
  const { db } = await requireAdmin();
  const [audit, privacy] = await Promise.all([
    db
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200),
    db
      .from('privacy_requests')
      .select('*,profiles(display_name)')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);
  if (audit.error || privacy.error)
    throw new Error('Falha ao consultar auditoria');
  return (
    <div className="stack">
      <h1>Auditoria</h1>
      <div className="panel">
        <h2>Solicitações de privacidade</h2>
        {privacy.data?.length ? (
          privacy.data.map((r) => (
            <p key={r.id}>
              {r.profiles?.display_name} ·{' '}
              {r.kind === 'access' ? 'Acesso aos dados' : 'Exclusão'} ·{' '}
              {localDate(r.created_at)} · {r.status}
            </p>
          ))
        ) : (
          <p className="muted">Nenhuma solicitação.</p>
        )}
        <p className="muted">
          O atendimento das solicitações exige revisão administrativa conforme o
          guia de privacidade.
        </p>
      </div>
      <div className="panel table-wrap">
        <table>
          <caption>Últimas 200 alterações</caption>
          <thead>
            <tr>
              <th>Data</th>
              <th>Entidade</th>
              <th>Operação</th>
              <th>Responsável (ID)</th>
              <th>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {audit.data?.map((a) => (
              <tr key={a.id}>
                <td>{localDate(a.created_at)}</td>
                <td>{a.entity}</td>
                <td>{a.action}</td>
                <td>{a.actor_id || 'Sistema / configuração inicial'}</td>
                <td>
                  <details>
                    <summary>Antes e depois</summary>
                    <pre
                      style={{
                        whiteSpace: 'pre-wrap',
                        overflowWrap: 'anywhere',
                        maxWidth: 360,
                      }}
                    >
                      {JSON.stringify(
                        {
                          antes: a.old_data ?? null,
                          depois: a.new_data ?? null,
                        },
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
