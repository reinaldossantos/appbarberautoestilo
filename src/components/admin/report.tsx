import { getReport } from '@/lib/data/reports';
import { money } from '@/lib/utils';
export async function Report({
  from,
  to,
  service,
  professional,
}: {
  from?: string;
  to?: string;
  service?: string;
  professional?: string;
}) {
  const {
    start,
    end,
    data: d,
    services,
    professionals,
    selectedService,
    selectedProfessional,
    periodInvalid,
  } = await getReport(from, to, service, professional);
  return (
    <div className="stack">
      <form className="panel form-grid">
        <label className="field">
          De
          <input type="date" name="from" defaultValue={start} />
        </label>
        <label className="field">
          Até
          <input type="date" name="to" defaultValue={end} />
        </label>
        <label className="field">
          Serviço
          <select name="service" defaultValue={selectedService}>
            <option value="">Todos os serviços</option>
            {services?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Profissional
          <select name="professional" defaultValue={selectedProfessional}>
            <option value="">Todos os profissionais</option>
            {professionals?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <button className="button button-outline">Atualizar relatório</button>
      </form>
      {periodInvalid ? (
        <p className="notice error" role="alert">
          Escolha um período em ordem cronológica de até 366 dias.
        </p>
      ) : (
        <>
          <div className="stats-grid">
            {[
              ['Agendados', d.scheduled],
              ['Concluídos', d.completed],
              ['Cancelamentos', d.cancelled],
              ['Faltas', d.no_show],
              ['Valor dos serviços concluídos', money(d.value_cents)],
              ['Bloqueios no período', d.blocks],
            ].map(([label, value]) => (
              <div className="stat" key={label}>
                <small>{label}</small>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <p className="muted">
            Os valores representam serviços concluídos, não recebimentos
            financeiros.
          </p>
          <p className="muted">
            Bloqueios consideram o período e o profissional; não pertencem a um
            serviço específico.
          </p>
          <div className="form-grid">
            <div className="panel">
              <h2>Serviços mais procurados</h2>
              {d.popular.length ? (
                d.popular.map((s) => (
                  <p key={s.name}>
                    {s.name} · {s.total}
                  </p>
                ))
              ) : (
                <p className="muted">Sem dados neste período.</p>
              )}
            </div>
            <div className="panel">
              <h2>Clientes recorrentes</h2>
              {d.recurring.length ? (
                d.recurring.map((c) => (
                  <p key={c.name}>
                    {c.name} · {c.total} atendimentos
                  </p>
                ))
              ) : (
                <p className="muted">Sem recorrências neste período.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
