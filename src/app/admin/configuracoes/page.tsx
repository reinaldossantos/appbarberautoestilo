import { requireAdmin } from '@/lib/auth/session';
import { ActionForm } from '@/components/forms/action-form';
import { ScheduleConflicts } from '@/components/admin/schedule-conflicts';
import {
  saveSettings,
  saveHours,
  removeHours,
  saveException,
  removeException,
  uploadPhoto,
} from '@/lib/actions/admin-settings';
const days = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
];
export default async function SettingsPage() {
  const { db } = await requireAdmin();
  const [settings, professionals, hours, exceptions] = await Promise.all([
    db.from('business_settings').select('*').single(),
    db.from('professionals').select('id,name'),
    db.from('business_hours').select('*,professionals(name)').order('weekday'),
    db.from('schedule_exceptions').select('*,professionals(name)').order('day'),
  ]);
  if (settings.error || professionals.error || hours.error || exceptions.error)
    throw new Error('Falha de leitura');
  const s = settings.data;
  const options = professionals.data?.map((p) => (
    <option key={p.id} value={p.id}>
      {p.name}
    </option>
  ));
  return (
    <div className="stack">
      <h1>Configurações</h1>
      <ScheduleConflicts />
      <p className="notice">
        A agenda depende de expediente, serviços com duração e políticas
        definidas. Alterar o expediente não cancela reservas existentes.
      </p>
      <div className="panel">
        <h2>Barbearia e políticas</h2>
        <ActionForm action={saveSettings} className="form-grid">
          <label className="field full">
            Endereço
            <input name="address" required defaultValue={s.address} />
          </label>
          <label className="field">
            WhatsApp (país + DDD + número)
            <input name="whatsapp" required defaultValue={s.whatsapp} />
          </label>
          <label className="field">
            Antecedência para reservar (minutos)
            <input
              type="number"
              min="0"
              max="43200"
              name="min_notice_minutes"
              defaultValue={s.min_notice_minutes ?? ''}
            />
          </label>
          <label className="field">
            Janela de agendamento (dias)
            <input
              type="number"
              min="1"
              max="365"
              name="max_booking_days"
              defaultValue={s.max_booking_days ?? ''}
            />
          </label>
          <label className="field">
            Antecedência para cancelar (minutos)
            <input
              type="number"
              min="0"
              max="43200"
              name="cancellation_notice_minutes"
              defaultValue={s.cancellation_notice_minutes ?? ''}
            />
          </label>
          <label className="field">
            Antecedência para reagendar (minutos)
            <input
              type="number"
              min="0"
              max="43200"
              required
              name="reschedule_notice_minutes"
              defaultValue={s.reschedule_notice_minutes}
            />
          </label>
          <label className="field">
            Intervalo entre atendimentos (minutos)
            <input
              type="number"
              min="0"
              max="240"
              required
              name="buffer_minutes"
              defaultValue={s.buffer_minutes}
            />
            <small>
              Use zero para desativar. Reservas existentes são preservadas e
              eventuais conflitos aparecem acima.
            </small>
          </label>
          <label className="field">
            Retenção desejada (dias)
            <input
              type="number"
              min="1"
              name="retention_days"
              defaultValue={s.retention_days ?? ''}
            />
            <small>
              Parâmetro para revisão manual; não executa exclusão automática.
            </small>
          </label>
          <label className="checkbox-line">
            <input
              type="checkbox"
              name="booking_enabled"
              defaultChecked={s.booking_enabled}
            />
            Liberar agenda online com as políticas acima
          </label>
          <label className="field full">
            História do Andrezinho
            <textarea name="story" rows={12} defaultValue={s.story} />
          </label>
        </ActionForm>
      </div>
      <div className="panel">
        <h2>Fotografia oficial</h2>
        <ActionForm action={uploadPhoto} submit="Enviar fotografia">
          <label className="field">
            Fotografia real do Andrezinho
            <input
              type="file"
              name="photo"
              accept="image/png,image/jpeg,image/webp"
              required
            />
            <small>
              Até 5 MB. Use uma fotografia aprovada para divulgação.
            </small>
          </label>
        </ActionForm>
      </div>
      <div className="panel stack">
        <h2>Expediente semanal</h2>
        <ActionForm
          action={saveHours}
          className="form-grid"
          submit="Adicionar intervalo"
        >
          <label className="field">
            Profissional<select name="professional_id">{options}</select>
          </label>
          <label className="field">
            Dia
            <select name="weekday">
              {days.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Abre às
            <input type="time" name="opens_at" required />
          </label>
          <label className="field">
            Fecha às
            <input type="time" name="closes_at" required />
          </label>
        </ActionForm>
        {hours.data?.map((h) => (
          <div key={h.id} className="flex-between">
            <span>
              {h.professionals?.name} · {days[h.weekday]} · {h.opens_at}–
              {h.closes_at}
            </span>
            <ActionForm action={removeHours} submit="Remover">
              <input type="hidden" name="id" value={h.id} />
            </ActionForm>
          </div>
        ))}
      </div>
      <div className="panel stack">
        <h2>Feriados e exceções</h2>
        <ActionForm
          action={saveException}
          className="form-grid"
          submit="Adicionar exceção"
        >
          <label className="field">
            Profissional<select name="professional_id">{options}</select>
          </label>
          <label className="field">
            Data
            <input type="date" name="day" required />
          </label>
          <label className="checkbox-line full">
            <input type="checkbox" name="closed" defaultChecked />
            Fechado neste dia (ignora os horários abaixo)
          </label>
          <label className="field">
            Abre às
            <input type="time" name="opens_at" />
          </label>
          <label className="field">
            Fecha às
            <input type="time" name="closes_at" />
          </label>
        </ActionForm>
        {exceptions.data?.map((e) => (
          <div className="flex-between" key={e.id}>
            <span>
              {e.professionals?.name} · {e.day} ·{' '}
              {e.closed ? 'Fechado' : `${e.opens_at}–${e.closes_at}`}
            </span>
            <ActionForm action={removeException} submit="Remover">
              <input type="hidden" name="id" value={e.id} />
            </ActionForm>
          </div>
        ))}
      </div>
    </div>
  );
}
