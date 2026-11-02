# Exclusão administrativa de registros de teste

Disponível nas listas Clientes, Agenda de atendimentos e Pagamentos. Expanda “Excluir registro de teste”, revise o registro, informe o motivo, confirme que são dados de teste e digite EXCLUIR.

- Pagamento: remove o registro e seus eventos, inclusive quando confirmado. Não realiza estorno bancário. O atendimento permanece e pode receber um novo registro de pagamento.
- Agendamento: exige excluir o pagamento antes ou marcar a remoção dos vínculos. Remove notificações e eventos vinculados e libera a ocupação da agenda. Quando há pontos concedidos, a exclusão isolada é recusada para preservar a fidelidade; use a limpeza completa do cliente de teste.
- Cliente: sem a opção de vínculos, exige remover as dependências primeiro. Com a opção, remove atendimentos, pagamentos, pontos e resgates vinculados. Preserva perfil e conta de autenticação; o usuário poderá preencher novamente seu cadastro.

Não há exclusão automática de registros existentes na implantação. A classificação como teste é uma confirmação do administrador, não uma detecção automática. Não use esta operação como rotina financeira ou como atendimento a pedidos de eliminação de dados pessoais: os snapshots permanecem na auditoria.

A RPC `delete_test_record` valida administrador (inclusive MFA configurado), confirmação e motivo. Clientes não recebem permissão DELETE. A operação é atômica e serializa escritas nas tabelas envolvidas; pode aguardar transações concorrentes. Em falha, nenhuma exclusão parcial persiste. A auditoria preserva cada registro removido, responsável, data, motivo e identificador da operação principal.

Implantação: aplicar `202611020001_test_record_deletion.sql` via migrations antes de publicar a interface. Não executar novamente a instalação inicial. Validar com `npm test`, `npm run lint` e `npm run build`. Testes SQL cobrem autorização, confirmação, dependências, pagamento confirmado, liberação da ocupação, cascata e preservação de auditoria. Nenhum dado remoto real é excluído pelos testes locais.
