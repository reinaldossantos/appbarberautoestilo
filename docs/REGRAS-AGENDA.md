# Regras aprovadas e implantação

Expediente: segunda a sexta, 08h–12h e 13h–19h; sábado, 08h–12h e 13h–18h; domingo fechado. Reserva com antecedência mínima de 60 minutos, até 30 dias à frente. Cancelamento e reagendamento com antecedência de 120 minutos, configuráveis separadamente.

Em Configurações, cadastre os períodos de trabalho separados pela pausa. Para remover o almoço, substitua manhã/tarde por um período contínuo. Exceções por data substituem o expediente semanal; um fechamento excepcional tem prioridade sobre períodos abertos na mesma data. Bloqueios permitem turnos, dias, semanas, férias e repetições semanais.

O intervalo entre atendimentos começa em zero e aceita até 240 minutos. Alterá-lo não move nem cancela reservas existentes: o painel sinaliza reservas incompatíveis com o intervalo ou expediente atual. Reagendamentos administrativos dispensam a antecedência do cliente, mas continuam respeitando expediente, conflitos e horários futuros.

As alterações novas registram antes/depois na auditoria. Os registros antigos não têm esses detalhes retroativos. Clientes veem as 20 alterações recentes em sua conta. O botão WhatsApp abre uma mensagem para o administrador conferir e enviar; não representa envio automático. A integração automática segue pendente.

A disponibilidade é recalculada no servidor a cada consulta e validada novamente na confirmação. Telas abertas atualizam a consulta a cada 15 segundos e ao recuperar foco/conexão; transmissão em tempo real entre dispositivos ainda não foi implementada.

## Estado em 30/10/2026

Build e 29 testes locais aprovados. A migration `202610290001_schedule_policies` ainda não foi aplicada ao projeto hospedado: a sessão CLI disponível lista apenas AgendaIRACAMBI e recebe 403 para a Auto-estilo.

A atualiza??o j? consta do hist?rico remoto da CLI. N?o executar novamente `update-schedule-policies.sql` nem `initial-setup.sql` neste projeto.

Pendentes: validação completa das reservas no ambiente hospedado, concorrência com conexões independentes e notificações automáticas. A publicação em HTTPS continua pendente.
