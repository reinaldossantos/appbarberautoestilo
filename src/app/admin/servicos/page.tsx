import { requireAdmin } from '@/lib/auth/session';
import { ServiceEditor } from '@/components/admin/service-editor';
export default async function ServicesAdmin() {
  const { db } = await requireAdmin();
  const { data, error } = await db
    .from('services')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return (
    <div className="stack">
      <h1>Serviços</h1>
      <details className="panel">
        <summary>Cadastrar novo serviço</summary>
        <ServiceEditor />
      </details>
      {data?.map((s) => (
        <details className="panel" key={s.id}>
          <summary>
            {s.name} ·{' '}
            {s.status === 'active'
              ? 'Ativo'
              : s.status === 'hidden'
                ? 'Oculto'
                : 'Em breve'}
          </summary>
          <div style={{ marginTop: 24 }}>
            <ServiceEditor service={s} />
          </div>
        </details>
      ))}
    </div>
  );
}
