import InstitutionalLayout from "@v1/components/institutional/InstitutionalLayout";

export default function AccountDeletion() {
  return (
    <InstitutionalLayout
      title="Exclusão de Conta"
      description="Saiba como solicitar a exclusão da sua conta e dados pessoais no FitJourney."
      lastUpdated="22 de março de 2026"
    >
      <p>O FitJourney respeita o direito dos usuários de solicitar a exclusão de suas contas e dados pessoais, conforme previsto na Lei Geral de Proteção de Dados Pessoais (LGPD – Lei nº 13.709/2018).</p>

      <h2>1. Como solicitar a exclusão</h2>
      <p>Para solicitar a exclusão da sua conta e dos dados pessoais associados, envie um e-mail para:</p>
      <p><strong>Wylkem.nutri.ufpa@gmail.com</strong></p>
      <p>No e-mail, informe:</p>
      <ul>
        <li>Nome completo cadastrado na plataforma</li>
        <li>E-mail vinculado à conta</li>
        <li>Motivo da solicitação (opcional)</li>
      </ul>

      <h2>2. Prazo de atendimento</h2>
      <p>Após o recebimento da solicitação, o FitJourney se compromete a processar o pedido em até <strong>15 (quinze) dias úteis</strong>, confirmando a exclusão por e-mail.</p>

      <h2>3. Dados que serão excluídos</h2>
      <p>Ao solicitar a exclusão, os seguintes dados serão removidos permanentemente:</p>
      <ul>
        <li>Dados de cadastro (nome, e-mail, telefone, foto de perfil)</li>
        <li>Respostas de anamnese</li>
        <li>Registros de check-in e checklist</li>
        <li>Histórico de mensagens no chat</li>
        <li>Preferências e configurações da conta</li>
        <li>Dados de uso e sessão</li>
      </ul>

      <h2>4. Dados que poderão ser retidos</h2>
      <p>Conforme previsto na legislação aplicável, alguns dados poderão ser mantidos mesmo após a exclusão da conta, incluindo:</p>
      <ul>
        <li>Registros necessários para cumprimento de obrigações legais ou regulatórias</li>
        <li>Dados necessários para exercício regular de direitos em processos judiciais, administrativos ou arbitrais</li>
        <li>Dados anonimizados para fins estatísticos</li>
      </ul>

      <h2>5. Consequências da exclusão</h2>
      <p>Após a exclusão da conta:</p>
      <ul>
        <li>O acesso à plataforma será encerrado permanentemente</li>
        <li>Não será possível recuperar os dados excluídos</li>
        <li>Planos alimentares, receitas e registros vinculados à conta serão removidos</li>
        <li>Caso deseje utilizar o FitJourney novamente, será necessário criar uma nova conta</li>
      </ul>

      <h2>6. Exclusão pelo aplicativo</h2>
      <p>Futuramente, o FitJourney poderá disponibilizar a opção de exclusão diretamente pelo aplicativo, na seção de configurações da conta. Enquanto essa funcionalidade não estiver disponível, utilize o e-mail informado acima.</p>

      <h2>7. Contato</h2>
      <p>Em caso de dúvidas sobre o processo de exclusão ou sobre o tratamento de seus dados pessoais:</p>
      <ul>
        <li><strong>Dr. Wylkem Raiol</strong></li>
        <li><strong>E-mail:</strong> Wylkem.nutri.ufpa@gmail.com</li>
      </ul>
    </InstitutionalLayout>
  );
}
