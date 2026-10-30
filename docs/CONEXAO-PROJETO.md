# Conexão do projeto informado

- Referência: `dymlojijgvgvwcpxfqai`
- URL: `https://dymlojijgvgvwcpxfqai.supabase.co`
- Conta proprietária solicitada: `andrezindamidia@gmail.com` (a titularidade não foi verificada pela CLI).
- URL e chave pública configuradas em `.env.local`, ignorado pelo Git.

A verificação conectada retornou Auth disponível, e-mail habilitado, Google desabilitado e os dez serviços comerciais cadastrados. A agenda permanece desabilitada até a definição do expediente e das políticas comerciais.

A autenticação da CLI foi concluída e o projeto está vinculado. As cinco migrations iniciais foram reconciliadas no histórico remoto e a migration `202610270001_report_filters` foi aplicada.

## Operação

Não é necessário executar `supabase init` novamente. Não compartilhe token, senha do banco ou senha do e-mail no chat.

Para alterações futuras, revisar migrations incrementais antes de aplicá-las. O seed contém somente os serviços e dados comerciais aprovados. Não utilizar `db reset` nem repetir `initial-setup.sql` no banco remoto já instalado.

Execute `npm run db:check` para verificar Auth, catálogo e configuração. A chave pública conecta o aplicativo, mas não concede permissão para criar tabelas ou promover administradores. A string PostgreSQL fornecida contém `[YOUR-PASSWORD]` e não deve ser usada literalmente.

As contas reais de teste de administrador e cliente foram criadas e verificadas. Credenciais em `.local/remote-test-credentials.json`, ignorado pelo Git. O script `test:users` continua restrito ao ambiente local e não cria contas no projeto remoto.
