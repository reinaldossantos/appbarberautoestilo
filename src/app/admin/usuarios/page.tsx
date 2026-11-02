import { requireAdmin } from '@/lib/auth/session';
import { ActionForm } from '@/components/forms/action-form';
import { saveUserAccess, removePendingAccess } from '@/lib/actions/users';

function AccessFields({
  email = '',
  name = '',
  role = 'customer',
}: {
  email?: string;
  name?: string;
  role?: string;
}) {
  return (
    <>
      <label className="field">
        Nome
        <input
          name="name"
          defaultValue={name}
          required
          minLength={2}
          maxLength={100}
        />
      </label>
      <label className="field">
        E-mail de acesso
        <input
          type="email"
          name="email"
          defaultValue={email}
          readOnly={!!email}
          required
          maxLength={254}
        />
      </label>
      <label className="field">
        Nível de acesso
        <select name="role" defaultValue={role}>
          <option value="customer">Cliente — somente seus dados</option>
          <option value="admin">Administrador — gestão completa</option>
        </select>
      </label>
    </>
  );
}

export default async function Users() {
  const { db } = await requireAdmin();
  const { data, error } = await db
    .from('user_access')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw new Error('Não foi possível consultar os acessos.');
  return (
    <div className="stack">
      <h1>Usuários e acessos</h1>
      <p>
        Cadastre o e-mail e compartilhe o endereço de login. A pessoa ativa a
        conta ao entrar com Google ou confirmar o código recebido nesse e-mail.
        Contas existentes e senhas são preservadas.
      </p>
      <p className="notice">
        Administrador tem acesso completo, inclusive pagamentos, exclusões e
        gestão de usuários. Conceda esse nível apenas a pessoas autorizadas.
      </p>
      <section className="panel stack">
        <h2>Criar acesso</h2>
        <ActionForm action={saveUserAccess} submit="Salvar acesso">
          <AccessFields />
        </ActionForm>
      </section>
      <p>
        Link para compartilhar:{' '}
        <a className="text-link" href="/login">
          https://appbarberautoestilo.vercel.app/login
        </a>
        . Após entrar, administradores podem acessar{' '}
        <a className="text-link" href="/admin">
          o painel de gestão
        </a>
        .
      </p>
      <h2>Acessos cadastrados</h2>
      <p className="muted">
        Últimos 200 acessos gerenciados. Para alterar uma conta que não aparece,
        informe seu e-mail em Criar acesso.
      </p>
      {data.map((u) => (
        <details className="panel" key={u.id}>
          <summary>
            {u.display_name} · {u.email} ·{' '}
            {u.role === 'admin' ? 'Administrador' : 'Cliente'} ·{' '}
            {u.claimed_at ? 'Ativo' : 'Aguardando primeiro acesso'}
          </summary>
          <ActionForm action={saveUserAccess} submit="Atualizar acesso">
            <AccessFields email={u.email} name={u.display_name} role={u.role} />
          </ActionForm>
          {!u.claimed_at && (
            <ActionForm
              action={removePendingAccess}
              submit="Remover autorização pendente"
            >
              <input type="hidden" name="id" value={u.id} />
            </ActionForm>
          )}
        </details>
      ))}
    </div>
  );
}
