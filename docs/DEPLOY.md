# Publicação na Vercel

1. Finalize o Supabase na organização pertencente a `andrezindamidia@gmail.com`.
2. Coloque este projeto em repositório privado e importe-o na conta Vercel autorizada. Preset Next.js; build `npm run build`.
3. Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `NEXT_PUBLIC_SITE_URL` com valores reais. Não configurar service_role na aplicação.
4. Aplique migrations e seed no projeto correto, configure SMTP/Google e redirects.
5. Valide primeiro em ambiente de homologação: login OTP, Google, MFA, reservas concorrentes, reagendamento e isolamento entre dois clientes reais de teste.
6. Defina políticas comerciais e privacidade, confirme fotografia aprovada, configure backups/monitoramento e só então habilite agenda e domínio público.

Não houve publicação nem criação de projeto hospedado automaticamente. O PWA armazena somente arquivos estáticos e a página offline, nunca sessões ou reservas. Reservas exigem conexão.
