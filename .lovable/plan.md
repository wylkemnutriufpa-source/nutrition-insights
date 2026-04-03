
## Plano de Estabilização — 5 Pontos

### 1. 🔴 Job de Auditoria Automática de Planos Ativos
- Edge function `audit-active-plans` com cron job diário
- Varre todos os planos ativos e detecta: macros fora de tolerância, planos sem itens, drafts órfãos, planos ativos sem vínculo
- Persiste resultados em tabela `plan_audit_results`
- Visível no painel de diagnósticos

### 2. 🔴 Teste E2E Playwright do Fluxo Completo
- Teste que cobre: login → navegar ao paciente → gerar plano → validar → publicar → verificar visão do paciente
- Garante que o plano entregue é idêntico ao publicado

### 3. 🟡 Fechar Gap Geração↔Validação
- Revisar `reconcileDailyMacros` para garantir que planos já nasçam 100% em conformidade
- Adicionar testes unitários que comprovem tolerância inter-diária de 3% para proteínas

### 4. 🟡 Governança por engine_version
- Criar lógica que sinaliza planos gerados com engine < versão atual
- Adicionar badge visual no perfil do paciente para planos desatualizados
- Permitir re-geração automática sugerida

### 5. 🟢 Feedback Loop do Paciente
- Tabela `patient_meal_feedback` para o paciente reportar problemas em refeições específicas
- UI simples no dashboard do paciente (botão 👍/👎 + comentário opcional por refeição)
- Visível para o nutricionista no perfil do paciente

---

**Ordem de execução:** 1 → 2 → 3 → 4 → 5, cada um validado antes de prosseguir.
