import { requireAdmin } from '@/lib/auth/session';
import { DeleteTestRecord } from '@/components/admin/delete-test-record';
import { ActionForm } from '@/components/forms/action-form';
import { createCustomer } from '@/lib/actions/admin-catalog';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Pagination } from '@/components/admin/pagination';
import { PAGE_SIZE, pageNumber, literalSearch } from '@/lib/domain/pagination';
export default async function Customers({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; page?: string | string[] }>;
}) {
  const { db } = await requireAdmin();
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.trim().slice(0, 100) : '';
  const page = pageNumber(params.page);
  let query = db
    .from('customers')
    .select('id,name,phone,created_at', { count: 'exact' })
    .order('name')
    .order('id');
  if (q) query = query.ilike('name', `%${literalSearch(q)}%`);
  const { data, error, count } = await query.range(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE - 1,
  );
  if (error?.code === 'PGRST103' && page > 1) {
    redirect(`/admin/clientes?${new URLSearchParams({ q, page: '1' })}`);
  }
  if (error) throw error;
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  if (page > pages)
    redirect(
      `/admin/clientes?${new URLSearchParams({ q, page: String(pages) })}`,
    );
  return (
    <div className="stack">
      <h1>Clientes</h1>
      <form className="panel form-grid">
        <label className="field">
          Buscar cliente pelo nome
          <input
            name="q"
            type="search"
            defaultValue={q}
            maxLength={100}
            placeholder="Digite o nome do cliente"
          />
        </label>
        <div className="row-actions">
          <button className="button button-gold">Buscar</button>
          {q ? (
            <Link className="button button-outline" href="/admin/clientes">
              Limpar busca
            </Link>
          ) : null}
        </div>
      </form>
      <div className="panel">
        <h2>Novo cadastro manual</h2>
        <ActionForm action={createCustomer} className="form-grid">
          <label className="field">
            Nome
            <input name="name" required maxLength={100} />
          </label>
          <label className="field">
            Telefone
            <input name="phone" required inputMode="tel" />
          </label>
        </ActionForm>
      </div>
      <div className="panel table-wrap">
        <table>
          <caption className="muted">Clientes cadastrados</caption>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Telefone</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.phone || 'Não informado'}</td>
                <td>
                  <DeleteTestRecord kind="customer" id={c.id} label={c.name} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data?.length ? (
          <p className="empty-state">
            {q
              ? 'Nenhum cliente encontrado para esta busca.'
              : 'Nenhum cliente cadastrado.'}
          </p>
        ) : null}
      </div>
      <Pagination
        page={page}
        count={count ?? 0}
        pathname="/admin/clientes"
        query={q}
      />
    </div>
  );
}
