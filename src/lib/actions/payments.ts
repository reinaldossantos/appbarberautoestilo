'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin, requireUser } from '@/lib/auth/session';
import type { ActionResult } from '@/lib/domain/validation';
import { pixPayload } from '@/lib/payments/pix';

const fail = (message: string): ActionResult => ({ ok: false, message });
export async function savePaymentSettings(
  form: FormData,
): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const p = z
    .object({
      key_type: z.enum(['phone', 'email', 'cpf', 'cnpj', 'random']),
      pix_key: z.string().trim().min(1).max(77),
      beneficiary: z.string().trim().min(1).max(100),
      city: z.string().trim().min(1).max(15),
    })
    .safeParse(Object.fromEntries(form));
  if (!p.success) return fail('Revise os dados do recebedor.');
  try {
    pixPayload({
      key: p.data.pix_key,
      beneficiary: p.data.beneficiary,
      city: p.data.city,
      amountCents: 1,
      reference: 'VALIDACAO',
    });
  } catch {
    return fail('Dados incompatíveis com o padrão Pix.');
  }
  const { error } = await db.rpc('save_payment_settings', {
    p_type: p.data.key_type,
    p_key: p.data.pix_key,
    p_beneficiary: p.data.beneficiary,
    p_city: p.data.city,
    p_verified: form.get('verified') === 'on',
  });
  if (error)
    return fail(
      'Não foi possível salvar. Confira o formato da chave e a instalação do módulo.',
    );
  revalidatePath('/admin/pagamentos');
  return {
    ok: true,
    message:
      'Configuração salva. Sem confirmação do teste real, o Pix permanece indisponível para clientes.',
  };
}
export async function reportPayment(form: FormData): Promise<ActionResult> {
  const { db } = await requireUser();
  const id = z.uuid().safeParse(form.get('appointment'));
  if (!id.success) return fail('Atendimento inválido.');
  const { error } = await db.rpc('report_payment', { p_appointment: id.data });
  if (error)
    return fail(
      'Não foi possível registrar. O pagamento deve estar disponível e a chave validada.',
    );
  revalidatePath(`/conta/pagamento/${id.data}`);
  return {
    ok: true,
    message:
      'Aviso registrado. Aguardando conferência bancária pelo administrador.',
  };
}
export async function preparePayment(form: FormData): Promise<ActionResult> {
  const { db } = await requireUser();
  const id = z.uuid().safeParse(form.get('appointment'));
  if (!id.success) return fail('Atendimento inválido.');
  const { error } = await db.rpc('ensure_payment', { p_appointment: id.data });
  if (error)
    return fail('Pagamento disponível no atendimento ou após a conclusão.');
  revalidatePath(`/conta/pagamento/${id.data}`);
  return {
    ok: true,
    message: 'Pagamento pendente registrado. Nenhum recebimento confirmado.',
  };
}
export async function confirmPayment(form: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  const values = Object.fromEntries(form);
  const p = z
    .object({
      appointment: z.uuid(),
      method: z.enum(['pix', 'cash', 'other']),
      amount: z.coerce.number().int().positive(),
      paid_at: z.iso.datetime({ offset: true }),
    })
    .safeParse({ ...values, paid_at: `${values.paid_at}:00-03:00` });
  if (!p.success || form.get('checked') !== 'on')
    return fail('Informe data, valor e confirme a conferência do recebimento.');
  const { error } = await db.rpc('confirm_payment', {
    p_appointment: p.data.appointment,
    p_method: p.data.method,
    p_amount: p.data.amount,
    p_paid_at: p.data.paid_at,
    p_checked: true,
  });
  if (error)
    return fail(
      'Confirmação recusada. Confira valor integral, data do recebimento e situação do atendimento.',
    );
  revalidatePath(`/conta/pagamento/${p.data.appointment}`);
  revalidatePath('/admin/pagamentos');
  return {
    ok: true,
    message: 'Recebimento confirmado manualmente e registrado no histórico.',
  };
}
