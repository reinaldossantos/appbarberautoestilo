import { requireAdmin } from '@/lib/auth/session';
import { ActionForm } from '@/components/forms/action-form';
import { saveProfessional } from '@/lib/actions/admin-catalog';
export default async function Professionals() {
  const { db } = await requireAdmin();
  const [p, s, l] = await Promise.all([
    db.from('professionals').select('*').order('name'),
    db.from('services').select('id,name'),
    db.from('professional_services').select('*'),
  ]);
  if (p.error || s.error || l.error)
    throw new Error('Falha ao consultar profissionais');
  return (
    <div className="stack">
      <h1>Profissionais</h1>
      {[...(p.data || []), { id: '', name: '', active: true }].map((pro) => (
        <details key={pro.id} className="panel">
          <summary>{pro.name || 'Cadastrar profissional'}</summary>
          <ActionForm action={saveProfessional}>
            <input type="hidden" name="id" value={pro.id} />
            <label className="field">
              Nome
              <input name="name" defaultValue={pro.name} required />
            </label>
            <label className="checkbox-line">
              <input
                type="checkbox"
                name="active"
                defaultChecked={pro.active}
              />
              Ativo
            </label>
            <fieldset className="stack">
              <legend>Serviços oferecidos</legend>
              {s.data?.map((service) => (
                <label key={service.id} className="checkbox-line">
                  <input
                    type="checkbox"
                    name="services"
                    value={service.id}
                    defaultChecked={l.data?.some(
                      (link) =>
                        link.professional_id === pro.id &&
                        link.service_id === service.id,
                    )}
                  />
                  {service.name}
                </label>
              ))}
            </fieldset>
          </ActionForm>
        </details>
      ))}
    </div>
  );
}
