# Validação executada

Em 25/10/2026:

- TypeScript strict: aprovado.
- ESLint: aprovado sem avisos após ajustes.
- Vitest: 23 testes aprovados, incluindo execução das migrations de domínio no PostgreSQL embarcado PGlite.
- Build Next.js 16.4.3: aprovado.

Em 26/10/2026, após melhorias de navegação:

- Build de produção, TypeScript e ESLint aprovados.
- Playwright: 8 testes aprovados em desktop e celular usando servidor de produção.
- Busca sem acentos, filtros do catálogo, navegação inferior e indicação da rota ativa verificados.
- Rotas administrativas e conta redirecionam visitantes sem sessão para login.
- Axe não apontou violações nas regras WCAG 2 A/AA, 2.1 AA e 2.2 AA verificadas nas seis páginas públicas; não houve overflow horizontal. Isso não substitui auditoria manual completa de acessibilidade.
- Capturas de tela em `test-results/home-desktop.png` e `test-results/home-mobile.png`.

Os testes de integração validam reservas, conflitos, bloqueios, reagendamento atômico, cancelamento, RLS, permissões administrativas, fidelidade e feriados. A tentativa concorrente em PGlite usa uma única instância que serializa comandos; resta validar múltiplas conexões no Supabase/PostgreSQL completo.

Atualização em 29/10/2026:

- Agenda e histórico administrativos paginados em grupos de 20, com filtros preservados e retorno à primeira página para índices fora do resultado. TypeScript, ESLint e build aprovados. Dois testes conectados aprovados em 24,5 s, incluindo retorno da página inexistente da agenda com preservação da data, login/permissões, relatórios e PWA. Navegação entre páginas com grande volume real ainda não foi exercitada no projeto hospedado.

- Layout inspirado nas referências enviadas: fotografia original do Andrezinho, atalhos na página inicial e cartões compactos no celular. Build aprovado; 8 testes públicos de desktop/celular aprovados em 33,9 s, incluindo Axe e ausência de overflow nas seis páginas verificadas. Captura móvel revisada visualmente.

- Supabase hospedado conectado, migrations aplicadas e contas reais de teste criadas.
- Login por senha, saída e isolamento administrativo verificados no navegador conectado.
- Playwright conectado: 2 testes aprovados (21,6 s), cobrindo também busca/paginação de clientes, filtros de serviço/profissional nos relatórios, rejeição de período invertido e PWA em viewport de celular.
- Vitest: 26 testes aprovados, incluindo paginação e filtros de relatórios.
- Build, TypeScript e ESLint aprovados após as alterações de PWA.
- Teste de PWA aprovado: manifesto, registro do service worker, fallback sem internet, cache restrito aos quatro arquivos públicos e fluxo de instalação com evento simulado.
- A instalação nativa e o comportamento em aparelhos Android/iOS físicos ainda precisam de validação em HTTPS. O evento simulado não comprova a instalação nativa.

Docker não está disponível. Envio de OTP/Google, MFA, upload e jornada completa de agendamento continuam pendentes de validação específica no ambiente conectado.
