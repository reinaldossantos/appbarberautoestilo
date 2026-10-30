# Ativar login Google

1. Entre em https://console.cloud.google.com/ com a conta proprietária e crie ou selecione um projeto para Auto-estilo.
2. Abra Google Auth Platform. Configure Branding (nome do aplicativo, e-mail de suporte e contato). Em Audience, escolha External. Durante testes, adicione os e-mails que utilizarão o login como usuários de teste.
3. Em Clients, crie um cliente OAuth do tipo Web application. Origem JavaScript autorizada: `https://appbarberautoestilo.vercel.app`.
4. URI de redirecionamento autorizado no Google: `https://dymlojijgvgvwcpxfqai.supabase.co/auth/v1/callback`. Este é o callback do Supabase, não a rota do aplicativo.
5. Copie Client ID e Client Secret diretamente para Authentication → Sign In / Providers → Google no projeto Supabase `dymlojijgvgvwcpxfqai`, habilite o provedor e salve. Não coloque o segredo no frontend, GitHub ou chat.
6. Em Authentication → URL Configuration, defina Site URL como `https://appbarberautoestilo.vercel.app` e inclua `https://appbarberautoestilo.vercel.app/auth/callback` em Redirect URLs. Preserve URLs locais necessárias.
7. Recarregue `/login`. O botão Google será liberado quando o Supabase informar que o provedor está ativo. Teste primeiro com usuário autorizado na tela de consentimento.
8. Para acesso público, ajuste Audience para produção e conclua eventuais exigências da tela de consentimento do Google. Não solicite escopos além dos necessários ao login.

A mensagem “Unsupported provider: provider is not enabled” significa que o Google está desabilitado no Supabase. O aplicativo consulta a disponibilidade antes de oferecer o botão e novamente antes do redirecionamento. Falhas de consulta mantêm e-mail/senha disponíveis.

Referência oficial: https://supabase.com/docs/guides/auth/social-sign-in/auth-google
