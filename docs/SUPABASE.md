# Supabase: desenvolvimento e conta definitiva

## Ambiente local

1. Instale e inicie Docker Desktop com containers Linux.
2. Execute `npm run db:start`. A CLI está instalada como dependência de desenvolvimento.
3. Execute `npm run db:reset` somente no banco local descartável: aplica migrations e seed, apagando dados locais anteriores.
4. Copie `.env.example` para `.env.local` e preencha com os valores exibidos por `npx supabase status`: URL API, chave anon/publishable e service_role. A service_role é usada somente pelo script local, nunca pelo navegador.
5. Execute `npm run test:users` e consulte `.local/test-credentials.json`.
6. Execute `npm run dev`. Na tela de login escolha **Acesso com senha / conta de teste**.

Studio local: http://localhost:54323. Caixa de e-mails local: http://localhost:54324. OTP de e-mail não exige envio para uma caixa real no ambiente local.

## Projeto definitivo

1. Entre em https://supabase.com/dashboard com a conta **andrezindamidia@gmail.com**. Confirme que a organização é dessa conta.
2. Crie o projeto Auto-estilo Barbershop. Escolha região apropriada, plano e senha do banco; guarde a senha em gerenciador seguro. Nenhuma senha deve ser enviada pelo chat ou versionada.
3. Com autorização dessa conta, faça `npx supabase login`, `npx supabase link --project-ref REFERENCIA_REAL` e `npx supabase db push`.
4. Execute `supabase/seed.sql` no SQL Editor para cadastrar apenas os dados comerciais aprovados. Não execute testes sintéticos no projeto de produção.
5. Configure `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` do projeto. A aplicação normal não precisa da service_role.
6. Configure Auth Site URL e URLs de redirecionamento `/auth/callback` para o domínio real. Configure SMTP e limites de abuso antes de liberar acesso público. No template de e-mail Magic Link, use `{{ .Token }}` para o código de seis dígitos.

## Administrador inicial

Faça login com o e-mail real autorizado. Um operador com acesso ao SQL Editor identifica o UUID em Authentication → Users e executa, com esse UUID verificado:

```sql
update public.profiles set role = 'admin' where id = 'UUID_REAL_VERIFICADO';
```

Nunca atribuir o papel a partir de metadados enviados pelo cliente ou domínio de e-mail. Ative TOTP em Minha conta → Segurança. Após a inscrição, o servidor e `is_admin()` exigem AAL2.

## Google

Crie um cliente OAuth Web na conta Google autorizada. Cadastre como redirect URI a URL de callback exibida pelo Supabase (`https://REFERENCIA.supabase.co/auth/v1/callback`). Configure Client ID e Client Secret apenas no provedor Google do Supabase. Habilite o provedor e cadastre as URLs do aplicativo em Auth URL Configuration. Não colocar Client Secret em variáveis NEXT_PUBLIC.

## Integridade

`schedule_occupancy` concentra intervalos de reservas e bloqueios em uma exclusão GiST. RPCs serializam alterações por profissional e fazem reservas/reagendamentos em transação. RLS isola clientes e impede escrita direta em reservas, pontos e papéis. O banco registra eventos e auditoria. Pontos exigem atendimento concluído e têm unicidade por atendimento.
