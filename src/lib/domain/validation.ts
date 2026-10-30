import { z } from 'zod';
export const bookingSchema = z.object({
  service: z.uuid(),
  professional: z.uuid(),
  start: z.iso.datetime({ offset: true }),
  customer: z.uuid().optional(),
});
export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome.').max(100),
  phone: z.string().regex(/^[0-9+ ()-]{8,20}$/, 'Informe um telefone válido.'),
  consent: z.literal(true, {
    error: 'É necessário aceitar o tratamento dos dados para agendar.',
  }),
});
export const emailSchema = z.object({
  email: z.email('Informe um e-mail válido.'),
});
export const serviceSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2).max(120),
  description: z.string().max(2000),
  price_cents: z.number().int().min(0).max(10000000).nullable(),
  duration_minutes: z.number().int().min(5).max(720).nullable(),
  status: z.enum(['active', 'coming_soon', 'hidden']),
  category: z.string().min(1).max(80),
  sort_order: z.number().int().min(0).max(1000),
  image_path: z.string().max(500).nullable(),
});
export type ActionResult = { ok: boolean; message: string; id?: string };
