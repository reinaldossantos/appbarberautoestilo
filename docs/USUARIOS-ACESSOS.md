# Usuários e acessos

Em Administração → Usuários e acessos, informe nome, e-mail exato e nível. Para uma conta existente com e-mail confirmado, a alteração é imediata. Para um novo usuário, cria-se uma autorização pendente; a conta Supabase Auth é criada no primeiro login, não pelo formulário administrativo.

Compartilhe manualmente `https://appbarberautoestilo.vercel.app/login`. A pessoa entra com Google usando o mesmo e-mail ou confirma o código recebido por e-mail (dependente da configuração de entrega do Supabase). Não há envio automático de convite nem senha provisória. Depois da ativação, administradores encontram Administração em Minha conta.

- Administrador: acesso integral à gestão, pagamentos, exclusões, auditoria e gestão de acessos.
- Cliente: somente dados próprios, agendamentos e pagamentos permitidos pelas regras existentes.

O formulário também atualiza acessos existentes por e-mail. Para retirar privilégios administrativos de outra pessoa, selecione Cliente. Isso não bloqueia o login como cliente. Não há níveis intermediários ou suspensão completa nesta versão. Autorizações ainda pendentes podem ser removidas. A lista mostra os 200 acessos gerenciados mais recentes; outros usuários podem ser gerenciados informando o e-mail no formulário.

A migration inventaria as contas atuais sem mudar seus papéis, senhas, IDs ou dados. Os usuários admin e customer existentes são preservados. Não é possível retirar o próprio papel administrativo nem o último administrador. As RPCs e RLS verificam administração e MFA conforme a regra existente. E-mails não confirmados não recebem o papel reservado. A atribuição pendente só é consumida uma vez; editar metadados do próprio usuário não concede privilégios. Mudanças ficam na auditoria.

Aplicar `202611020002_user_access.sql` antes de publicar. Testes locais validam acesso indevido, RLS, confirmação do e-mail, promoção, rebaixamento sem reativação, proteção do próprio administrador e preservação de cliente. Não altere `auth.users` diretamente para criar contas; a autenticação continua sob responsabilidade do Supabase Auth.
