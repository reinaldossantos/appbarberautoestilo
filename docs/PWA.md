# Uso no celular

A aplicação continua sendo web, responsiva e opcionalmente instalável. A publicação em loja não faz parte desta etapa.

- Acesse `/instalar` ou o link **Instalar no celular** no rodapé.
- Em navegadores compatíveis, o botão aparece quando o navegador disponibiliza a instalação.
- No Android, o menu pode oferecer **Instalar aplicativo** ou **Adicionar à tela inicial**.
- No iPhone, use Safari → Compartilhar → Adicionar à Tela de Início.
- O aplicativo instalado usa a mesma conta e o mesmo banco do site.
- Agendamentos e dados pessoais dependem de internet. Nenhuma reserva é confirmada offline.

O service worker guarda somente a página offline, o logotipo e os ícones. Não guarda respostas autenticadas. Seu arquivo é servido sem cache HTTP para permitir atualização. Em desenvolvimento (`npm run dev`) o registro do service worker não é habilitado; valide com `npm run build` e `npm run start`.

Para instalar pelo celular fora da máquina de desenvolvimento, será necessário publicar o projeto em HTTPS. `localhost` no celular aponta para o próprio aparelho. A instalação real em Android e iPhone deve ser validada após a publicação; o teste automatizado da oferta de instalação simula o evento do navegador.
