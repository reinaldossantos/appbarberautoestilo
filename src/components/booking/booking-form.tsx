'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarDays, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ServiceVisual } from '@/components/services/service-visual';
import { canBook } from '@/lib/domain/catalog';
import { money, localDate } from '@/lib/utils';
import type { Professional, Service } from '@/lib/domain/types';
import { bookAppointment, changeAppointment } from '@/lib/actions/appointments';
export function BookingForm({
  services,
  professionals,
  initialService,
  enabled,
  signedIn,
  profileReady,
  reschedule,
  customerId,
}: {
  services: Service[];
  professionals: Professional[];
  initialService?: string;
  enabled: boolean;
  signedIn: boolean;
  profileReady: boolean;
  reschedule?: { id: string; professional: string };
  customerId?: string;
}) {
  const [service, setService] = useState(initialService || '');
  const [professional, setProfessional] = useState(
    reschedule?.professional || professionals[0]?.id || '',
  );
  const [day, setDay] = useState('');
  const [slot, setSlot] = useState('');
  const [slots, setSlots] = useState<{ starts_at: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const router = useRouter();
  const selected = services.find((s) => s.id === service);
  useEffect(() => {
    if (!enabled || !day || !service || !professional) return;
    const refresh = () => {
      if (!document.hidden) setRefreshKey((value) => value + 1);
    };
    const interval = window.setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
    };
  }, [enabled, day, service, professional]);
  useEffect(() => {
    if (!service || !professional || !day || !enabled) return;
    const controller = new AbortController();
    fetch(
      `/api/availability?${new URLSearchParams({ service, professional, day, ...(reschedule ? { exclude: reschedule.id } : {}) })}`,
      { signal: controller.signal, cache: 'no-store' },
    )
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => {
        setSlots(d.slots);
        setSlot((current) =>
          d.slots.some(
            (item: { starts_at: string }) => item.starts_at === current,
          )
            ? current
            : '',
        );
        setLoading(false);
      })
      .catch((e) => {
        if (e.name !== 'AbortError') {
          setMessage(
            'Não foi possível consultar os horários. Tente outra data ou recarregue.',
          );
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [service, professional, day, enabled, reschedule, refreshKey]);
  function reset() {
    setSlot('');
    setSlots([]);
    setMessage('');
    setLoading(true);
  }
  async function confirm() {
    if (!navigator.onLine) {
      setMessage('Reconecte-se para confirmar o horário.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const result = reschedule
        ? await changeAppointment({
            id: reschedule.id,
            action: 'reschedule',
            start: slot,
          })
        : await bookAppointment({
            service,
            professional,
            start: slot,
            ...(customerId ? { customer: customerId } : {}),
          });
      if (result.ok) {
        router.push(
          reschedule ? '/conta' : `/agendar/confirmacao/${result.id}`,
        );
        router.refresh();
      } else {
        setMessage(result.message);
        setSlot('');
        setRefreshKey((value) => value + 1);
      }
    } catch {
      setMessage(
        'Não foi possível confirmar. Consulte seus agendamentos antes de tentar novamente.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="booking-grid">
      <div className="stack">
        {!enabled ? (
          <p className="notice">
            A agenda online ainda não foi liberada. Fale com a barbearia pelo
            WhatsApp para combinar seu atendimento.
          </p>
        ) : null}
        <div className="panel stack">
          <div className="step-title">
            <span>1</span>
            <h2>Seu cuidado</h2>
          </div>
          <label className="field">
            Serviço
            <select
              value={service}
              disabled={!!reschedule}
              onChange={(e) => {
                setService(e.target.value);
                reset();
              }}
            >
              <option value="">Selecione um serviço</option>
              {services.filter(canBook).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {money(s.price_cents!)} · {s.duration_minutes} min
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Profissional
            <select
              value={professional}
              disabled={!!reschedule}
              onChange={(e) => {
                setProfessional(e.target.value);
                reset();
              }}
            >
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <div
            className="service-choices"
            role="group"
            aria-label="Escolha visual do serviço"
          >
            {services.filter(canBook).map((item) => (
              <button
                type="button"
                key={item.id}
                className="service-choice"
                aria-pressed={service === item.id}
                disabled={!!reschedule}
                onClick={() => {
                  setService(item.id);
                  reset();
                }}
              >
                <ServiceVisual name={item.name} />
                <strong>{item.name}</strong>
                <small>
                  {money(item.price_cents!)} · {item.duration_minutes} min
                </small>
              </button>
            ))}
          </div>
          <p className="service-imagery-note">
            Imagens ilustrativas dos serviços.
          </p>
        </div>
        <div className="panel stack">
          <div className="step-title">
            <span>2</span>
            <h2>Seu momento</h2>
          </div>
          <label className="field">
            Data do atendimento
            <input
              type="date"
              value={day}
              disabled={!enabled || !service}
              onChange={(e) => {
                setDay(e.target.value);
                reset();
              }}
            />
            <small>Horários de Brasília · America/Sao_Paulo</small>
          </label>
          {day && enabled ? (
            loading ? (
              <p role="status">Consultando disponibilidade…</p>
            ) : slots.length ? (
              <div className="slots" aria-label="Horários disponíveis">
                {slots.map((s) => (
                  <button
                    type="button"
                    className="slot"
                    key={s.starts_at}
                    aria-pressed={slot === s.starts_at}
                    onClick={() => setSlot(s.starts_at)}
                  >
                    {new Intl.DateTimeFormat('pt-BR', {
                      timeZone: 'America/Sao_Paulo',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(s.starts_at))}
                  </button>
                ))}
              </div>
            ) : (
              <p className="muted">
                Nenhum horário disponível nesta data. Escolha outro dia.
              </p>
            )
          ) : (
            <p className="muted">
              Escolha um serviço e uma data para consultar a agenda.
            </p>
          )}
        </div>
      </div>
      <aside className="panel stack">
        <div className="step-title">
          <span>3</span>
          <h2>{reschedule ? 'Revisar alteração' : 'Confirmar seu horário'}</h2>
        </div>
        <CalendarDays className="text-gold" />
        <h3>{selected?.name || 'Seu próximo estilo'}</h3>
        <div className="muted">
          {professionals.find((p) => p.id === professional)?.name}
          <br />
          {slot ? localDate(slot) : 'Data e horário a escolher'}
        </div>
        {selected?.price_cents != null ? (
          <div className="flex-between">
            <span>Valor do serviço</span>
            <strong className="text-gold">{money(selected.price_cents)}</strong>
          </div>
        ) : null}
        <p className="muted" style={{ fontSize: 12 }}>
          A reserva só é confirmada após a validação da disponibilidade. Nenhum
          pagamento é cobrado aqui.
        </p>
        {message ? (
          <p className="notice error" role="alert">
            {message}
          </p>
        ) : null}
        {!signedIn ? (
          <>
            <p className="muted">Identifique-se para confirmar.</p>
            <Button asChild>
              <Link href="/login">Entrar na minha conta</Link>
            </Button>
          </>
        ) : !profileReady ? (
          <Button asChild>
            <Link href="/conta/perfil">Completar meu cadastro</Link>
          </Button>
        ) : (
          <Button onClick={confirm} disabled={!slot || !enabled || busy}>
            <Check size={17} />
            {busy
              ? 'Confirmando…'
              : reschedule
                ? 'Confirmar reagendamento'
                : 'Confirmar agendamento'}
          </Button>
        )}
      </aside>
    </div>
  );
}
