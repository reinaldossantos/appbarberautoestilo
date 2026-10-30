import { PageHeading } from '@/components/ui/page-heading';
import Link from 'next/link';
export const metadata = { title: 'Privacidade' };
export default function Privacy() {
  return (
    <div className="container page-content">
      <div className="prose">
        <PageHeading
          eyebrow="Transparência e cuidado"
          title="Sua privacidade importa."
        />
        <p>
          A Auto-estilo Barbershop utiliza os dados informados para identificar
          sua conta, organizar agendamentos, manter o histórico de atendimentos
          e operar benefícios de fidelidade quando configurados.
        </p>
        <h2>Quais dados são utilizados</h2>
        <p>
          Nome, e-mail de autenticação, telefone informado, serviços agendados,
          datas, status de atendimento e movimentações de fidelidade. Não usamos
          somente o telefone para validar identidade.
        </p>
        <h2>Acesso e fornecedores</h2>
        <p>
          Você acessa seus próprios registros. A equipe administrativa
          autorizada acessa os dados necessários para prestar o atendimento. A
          infraestrutura utiliza Supabase para autenticação, banco e imagens; a
          hospedagem deve ser informada na versão publicada. Ao escolher Google,
          WhatsApp ou Maps, aplicam-se também as políticas desses serviços.
        </p>
        <h2>Comunicações</h2>
        <p>
          Links de WhatsApp abrem uma conversa a seu pedido. Mensagens
          automáticas não estão habilitadas. O interesse em serviços futuros é
          registrado somente com sua confirmação.
        </p>
        <h2>Seus direitos</h2>
        <p>
          Você pode corrigir seu cadastro e solicitar acesso ou exclusão dos
          dados em{' '}
          <Link className="text-gold" href="/conta/perfil">
            Meu perfil
          </Link>
          , ou entrar em contato pela{' '}
          <Link className="text-gold" href="/contato">
            página de contato
          </Link>
          . A exclusão pode exigir a preservação de registros necessários ao
          cumprimento de obrigações aplicáveis.
        </p>
        <h2>Armazenamento e segurança</h2>
        <p>
          Utilizamos sessões de autenticação e controles de acesso. O aplicativo
          não guarda dados de conta ou reservas no cache offline. O prazo de
          retenção e o procedimento de atendimento às solicitações precisam ser
          definidos pela barbearia antes da operação pública.
        </p>
        <p className="notice">
          Versão de implantação: este texto e os procedimentos de privacidade
          devem ser revisados pelo responsável antes da publicação comercial.
        </p>
      </div>
    </div>
  );
}
