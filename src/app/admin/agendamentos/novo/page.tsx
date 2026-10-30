import { requireAdmin } from '@/lib/auth/session';
import { getServices, getProfessionals, getSettings } from '@/lib/data/public';
import { BookingForm } from '@/components/booking/booking-form';
export default async function Manual({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string }>;
}) {
  const { db } = await requireAdmin();
  const { customer } = await searchParams;
  const [services, pros, settings, customers] = await Promise.all([
    getServices(),
    getProfessionals(),
    getSettings(),
    db.from('customers').select('id,name').order('name'),
  ]);
  if (customers.error) throw customers.error;
  const selected = customers.data.find((c) => c.id === customer);
  return (
    <div className="stack">
      <h1>Agendamento manual</h1>
      <form className="panel stack">
        <label className="field">
          Cliente
          <select name="customer" required defaultValue={customer}>
            <option value="">Selecione</option>
            {customers.data.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button className="button button-outline">Selecionar cliente</button>
      </form>
      {selected ? (
        <BookingForm
          key={selected.id}
          services={services}
          professionals={pros}
          enabled={settings?.booking_enabled ?? false}
          signedIn
          profileReady
          customerId={selected.id}
        />
      ) : (
        <p className="muted">
          Escolha um cliente cadastrado para consultar horários.
        </p>
      )}
    </div>
  );
}
