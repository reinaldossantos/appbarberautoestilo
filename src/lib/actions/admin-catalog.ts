'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/session';
import { serviceSchema, type ActionResult } from '@/lib/domain/validation';
import { failure } from './result';
export async function saveService(form: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const entries = Object.fromEntries(form);
  const p = serviceSchema.safeParse({
    ...entries,
    id: entries.id || undefined,
    price_cents:
      entries.price_cents === '' ? null : Number(entries.price_cents),
    duration_minutes:
      entries.duration_minutes === '' ? null : Number(entries.duration_minutes),
    sort_order: Number(entries.sort_order),
    image_path: entries.image_path || null,
  });
  if (!p.success)
    return {
      ok: false,
      message: 'Revise nome, preço em centavos e duração (5 a 720 minutos).',
    };
  const { id, ...values } = p.data;
  const { error } = id
    ? await db.from('services').update(values).eq('id', id)
    : await db.from('services').insert(values);
  if (error) return failure(error);
  revalidatePath('/servicos');
  revalidatePath('/admin/servicos');
  return { ok: true, message: 'Serviço salvo.' };
}
export async function saveProfessional(form: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const p = z
    .object({
      id: z.uuid().optional(),
      name: z.string().trim().min(2).max(100),
      active: z.boolean(),
      services: z.array(z.uuid()),
    })
    .safeParse({
      id: form.get('id') || undefined,
      name: form.get('name'),
      active: form.get('active') === 'on',
      services: form.getAll('services'),
    });
  if (!p.success) return failure();
  const { error } = await db.rpc('save_professional', {
    p_id: p.data.id || null,
    p_name: p.data.name,
    p_active: p.data.active,
    p_services: p.data.services,
  });
  if (error) return failure(error);
  revalidatePath('/admin/profissionais');
  return { ok: true, message: 'Profissional e serviços atualizados.' };
}
export async function createCustomer(form: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const p = z
    .object({
      name: z.string().trim().min(2).max(100),
      phone: z.string().regex(/^[0-9+ ()-]{8,20}$/),
    })
    .safeParse(Object.fromEntries(form));
  if (!p.success)
    return { ok: false, message: 'Informe nome e telefone válidos.' };
  const { error } = await db.rpc('admin_create_customer', {
    p_name: p.data.name,
    p_phone: p.data.phone,
  });
  if (error) return failure(error);
  revalidatePath('/admin/clientes');
  return {
    ok: true,
    message:
      'Cliente cadastrado. O cadastro não concede acesso a uma conta autenticada.',
  };
}
