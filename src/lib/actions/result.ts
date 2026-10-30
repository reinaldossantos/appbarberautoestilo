import type { ActionResult } from '@/lib/domain/validation';
const messages: Record<string, string> = {
  AUTH_REQUIRED: 'Entre na sua conta para continuar.',
  FORBIDDEN: 'Você não tem permissão para esta operação.',
  PROFILE_REQUIRED: 'Complete seu perfil antes de agendar.',
  SLOT_UNAVAILABLE: 'Esse horário não está mais disponível. Escolha outro.',
  BOOKING_LIMIT:
    'Você já possui cinco agendamentos futuros. Gerencie-os em Minha conta.',
  POLICY_LIMIT:
    'O prazo para alteração online foi encerrado ou ainda não foi definido. Fale com a barbearia.',
  INVALID_STATUS: 'Este agendamento não pode mais ser alterado.',
  BLOCK_CONFLICT:
    'O bloqueio conflita com reservas ou bloqueios existentes. Consulte a agenda e resolva os conflitos antes de tentar novamente.',
  INSUFFICIENT_POINTS: 'Saldo de pontos insuficiente.',
  LOYALTY_NOT_CONFIGURED: 'Não há regra de fidelidade ativa para este serviço.',
  APPOINTMENT_NOT_FINISHED:
    'Aguarde o término do atendimento para registrar a conclusão ou falta.',
  COMPLETION_REQUIRED: 'Conclua o atendimento antes de conceder pontos.',
  RATE_LIMIT: 'Muitas operações em pouco tempo. Aguarde um minuto.',
  EXPIRY_NOT_SUPPORTED: 'Regras com validade ainda não estão habilitadas.',
};
export function failure(
  error?: { message: string; code?: string } | null,
): ActionResult {
  const match = Object.keys(messages).find((k) => error?.message.includes(k));
  return {
    ok: false,
    message: match
      ? messages[match]
      : error?.code === '23P01'
        ? 'O período escolhido está ocupado. Atualize a agenda.'
        : 'Não foi possível salvar. Verifique os dados e tente novamente.',
  };
}
