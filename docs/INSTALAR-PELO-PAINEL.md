# Implantação pelo painel Supabase

Alternativa quando a CLI não tem acesso à conta. Não requer compartilhar senha ou token.

1. Entre no painel com `andrezindamidia@gmail.com` e abra **BarberAutoEstilo**, referência `dymlojijgvgvwcpxfqai`.
2. Abra **SQL Editor → New query**.
3. Copie o conteúdo completo de `supabase/install/initial-setup.sql` e execute **Run**.
4. Se ocorrer erro, envie somente a mensagem de erro. O arquivo usa uma transação única e interrompe a instalação caso encontre tabelas da aplicação já existentes.
5. Após sucesso, avise para verificarmos as tabelas, permissões e catálogo pela aplicação.

Este arquivo não cria contas, senhas, horários ou regras de fidelidade. A agenda começa desabilitada. Ele contém as migrations e o seed comercial, incluindo o armazenamento de imagens.

O SQL Editor não registra automaticamente essas migrations no histórico da CLI. Antes de usar `supabase db push` posteriormente, um operador deve conferir o esquema implantado e reconciliar as versões usando `supabase migration repair`; não executar novamente todas as migrations sobre tabelas existentes.

Alternativamente, conclua `npx supabase login` no terminal com a conta correta. A CLI já está instalada e `supabase init` não é necessário.
