import { describe, it, expect } from 'vitest';
import { initialServices, canBook } from '../../src/lib/domain/catalog';
import { profileSchema, bookingSchema } from '../../src/lib/domain/validation';
import { localDate, money } from '../../src/lib/utils';
describe('Catálogo e entradas', () => {
  it('mantém os preços fornecidos em centavos', () =>
    expect(initialServices.slice(0, 7).map((s) => s.price_cents)).toEqual([
      3000, 4500, 7500, 8500, 1500, 4000, 1500,
    ]));
  it('não agenda serviços sem duração', () =>
    expect(
      initialServices
        .filter((s) => !s.duration_minutes)
        .every((s) => !canBook(s)),
    ).toBe(true));
  it('não agenda serviços em breve nem ocultos', () => {
    expect(canBook({ ...initialServices[0], status: 'coming_soon' })).toBe(
      false,
    );
    expect(canBook({ ...initialServices[0], status: 'hidden' })).toBe(false);
  });
  it('exige identidade e consentimento', () =>
    expect(
      profileSchema.safeParse({ name: 'A', phone: '1', consent: false })
        .success,
    ).toBe(false));
  it('recusa data sem fuso e IDs arbitrários', () =>
    expect(
      bookingSchema.safeParse({
        service: '1',
        professional: '2',
        start: '2026-10-25T10:00',
      }).success,
    ).toBe(false));
  it('apresenta o fuso de São Paulo independente do host', () =>
    expect(localDate('2026-10-25T02:00:00Z')).toContain('24/10/2026'));
  it('formata centavos sem alterar o valor', () =>
    expect(money(3000)).toContain('30,00'));
});
