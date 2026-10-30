# Pagamentos manuais — módulo aguardando validação e publicação

Configuração inicial explicitamente fornecida pelo proprietário: telefone `+553298553119`, beneficiário André da Silva Nascimento Filho, cidade Muriaé. A chave não foi inferida do WhatsApp. A migration inicia `verified_at` e `verified_by` vazios. Sem confirmação administrativa, os clientes não recebem os dados Pix nem QR Code.

## Fluxo

O cliente confirma reservas sem pagar. No início do atendimento ou depois da conclusão, pode abrir Pagamento e preparar um registro pendente. O servidor obtém cliente e preço da reserva. Depois de usar o QR ou Copia e Cola, “Já paguei” muda somente para aguardando conferência. Repetir o aviso não confirma nem duplica o registro.

Somente o administrador, com sessão autorizada e MFA quando habilitado, pode confirmar recebimento integral por Pix, dinheiro ou outro meio, informando data e marcando a conferência. Não são aceitos valores divergentes do total da reserva, datas futuras ou anteriores ao início do atendimento. Pagamentos parciais, estornos e múltiplos meios na mesma reserva ficam fora desta versão. Confirmações são idempotentes e imutáveis pelas operações disponíveis.

O painel Configurações de Pagamento permite editar tipo, chave, beneficiário e cidade. Cada salvamento sem nova declaração de teste revoga a validação. Os eventos e auditoria registram responsáveis e datas. Não são coletados dados da conta bancária, cartão ou comprovantes. Histórico de configuração conserva a chave para auditoria, acessível apenas ao administrador.

## Implementação

- `pix-utils` gera BR Code; `qrcode` gera imagem local, sem enviar a chave a serviços externos. Versões resolvidas no package-lock.
- `PaymentCodeProvider` separa geração do código de futuras integrações. Não existe integração bancária, webhook ou confirmação automática.
- Testes independentes verificam TLV, moeda, valor em centavos, chave, CRC16 e leitura do QR com `jsqr`.
- O nome no BR Code é convertido para ASCII e limitado a 25 caracteres conforme formato. O nome completo é exibido separadamente após validação; o nome retornado pelo aplicativo bancário deve ser conferido.
- RLS permite leitura somente ao titular da reserva ou administrador. Escritas diretas são revogadas; RPCs autorizam e bloqueiam a reserva para serialização. Nada altera regras de agenda, fidelidade ou preço de serviços.
- Um QR estático pode ser pago mais de uma vez no banco. O sistema não impede transferências externas repetidas nem comprova recebimentos; a conciliação é manual.

## Validação obrigatória antes da publicação

1. Gerar `node scripts/prepare-pix-validation.mjs` (Node com suporte nativo a TypeScript). Abrir `.local/pix-validacao.html` localmente.
2. No banco, ler o QR ou colar o código de R$ 0,01. Conferir chave e beneficiário antes de autorizar. Em caso de nome divergente ou rejeição da chave, interromper e corrigir os dados.
3. O proprietário deve conferir o crédito na conta recebedora e confirmar o resultado. Não enviar senhas, tokens ou dados bancários adicionais.
4. Somente após a validação solicitada pelo usuário, aplicar `202610300001_manual_payments.sql`, publicar o código e marcar a confirmação no painel com os dados testados. Não executar instalação inicial no banco existente.

Nenhuma transferência real foi feita pelos testes automatizados. A migration e o código deste módulo não devem ser enviados à produção antes dessa validação; o repositório está conectado ao deploy automático.

Referências: [Manual de Padrões para Iniciação do Pix, BCB](https://bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf), [pix-utils](https://github.com/thalesog/pix-utils), [node-qrcode](https://github.com/soldair/node-qrcode).
