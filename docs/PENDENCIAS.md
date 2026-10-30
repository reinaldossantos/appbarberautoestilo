# Pendências e limites de entrega

- Supabase conectado ao projeto `dymlojijgvgvwcpxfqai`; cinco migrations iniciais reconciliadas com o histórico remoto. Contas de teste criadas e login/permissões verificados via API. Credenciais em `.local/remote-test-credentials.json`, ignorado pelo Git.
- Docker Desktop não foi encontrado; desenvolvimento conectado utiliza o projeto hospedado.
- Login por senha, saída, painel e isolamento administrativo validados no navegador com Supabase real. Falta validar a jornada completa de agendamento e concorrência com conexões PostgreSQL independentes. PGlite serializa consultas em uma instância.
- Fotografia real do Andrezinho incorporada à página inicial e à história. Definir expediente, durações pendentes e políticas comerciais.
- Configurar Google OAuth, SMTP, limitação de abuso/CAPTCHA no Supabase e verificar MFA real.
- Fidelidade: validade de pontos e campanhas ainda não implementadas; regras com validade são recusadas explicitamente. Concessão é manual após validação.
- Calendário administrativo usa lista filtrada por dia, sem grade visual mensal/semanal. Clientes têm busca e paginação; agenda e histórico de atendimentos também têm paginação, preservando filtros. Outras listagens administrativas limitadas ainda precisam de paginação para grande volume.
- Relatórios agregados agora filtram período, serviço e profissional; migration `202610270001_report_filters` aplicada no Supabase.
- Solicitações de privacidade e retenção exigem procedimento administrativo manual; revisar política antes de produção.
- Notificações automáticas aguardam provedor, credenciais, consentimento e avaliação de custos.
- Revisar segurança com Supabase hospedado, acessibilidade manual, desempenho e publicação antes de considerar pronto para produção.


