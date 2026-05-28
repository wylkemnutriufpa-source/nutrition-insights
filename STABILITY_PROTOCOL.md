# Protocolo de Estabilização Operacional & Disciplina de Produção

## Fase: Congelamento de Arquitetura & Governança de Produção
**Objetivo:** Alcançar 0 regressões críticas em operação real por 7 dias consecutivos através de disciplina operacional rigorosa.

### 1. Regras de Ouro (Governança)
- **Postura Conservadora:** Nenhuma alteração sobe sem justificativa operacional clara.
- **Bug Real vs. Melhoria:** Proibido disfarçar impulsos arquiteturais ou refatores como "correções".
- **Só corrigir bugs reproduzíveis:** Sem "acho que resolve". Precisa de prova de falha e prova de cura.
- **Atomicidade:** Um bug por vez. Um fluxo por vez. Sem "aproveitar a viagem".
- **Sem Auto-Cura:** Se existir estado inválido, devemos descobrir ONDE ele nasce. Proibido usar fallbacks silenciosos ou sincronizações invisíveis para mascarar erros de origem.

### 2. Disciplina de Produção (Território Protegido)
1. **Ambiente Isolado:** Nenhuma mudança entra direto em produção. Tudo passa por ambiente de validação + Smoke Test + Checklist Clínico.
2. **Rastro de Mudança:** Toda correção deve documentar: arquivo alterado, motivo, risco, plano de rollback, fluxo afetado e resultado esperado.
3. **Documentação de Incidente:** Toda regressão vira um incidente documentado com causa raiz, origem, como escapou e como evitar repetição.
4. **Proibido "Melhoria Silenciosa":** Se o objetivo é corrigir, apenas corrija. Não reorganize, limpe ou modernize o código durante uma correção.
5. **Fluxos Críticos:** Onboarding, Publicação, Vínculo, WhatsApp, PDF, Geração e Persistência são tratados como mudanças de alto risco.

### 3. Checklist Pré-Mudança (Mandatório)
Antes de qualquer alteração, o agente/desenvolvedor deve responder:
1. **Qual bug real resolve?** (Descrever falha operacional)
2. **Qual fluxo clínico toca?** (Ex: Geração de plano, WhatsApp, PDF)
3. **Qual contrato altera?** (Banco, RPC, Interface de Serviço)
4. **Qual risco de regressão cria?** (Baixo/Médio/Alto e porquê)
5. **Qual teste protege?** (Como garantimos que não volta a quebrar?)
6. **Como o rollback funciona?** (Plano de emergência caso quebre em produção)

### 4. Ritual Operacional Diário
1. **Usar o Sistema:** Fluxo humano real (Cadastro -> Plano -> WhatsApp).
2. **Registrar Falha:** Qualquer desvio do comportamento esperado.
3. **Identificar Causa Raiz:** Onde o erro nasce (não apenas onde ele se manifesta).
4. **Corrigir Pequeno:** Intervenção cirúrgica e isolada.
5. **Validar em Produção:** Teste real no ambiente de uso.
6. **Congelar Novamente:** Voltar ao estado de observação.

### 5. Métricas de Confiança Operacional
- **Stability Streak:** Dias sem regressão crítica (Meta: 7 dias).
- **Publish Success Rate:** % de planos gerados e publicados sem erro.
- **Onboarding Completion Rate:** % de usuários que concluem o fluxo inicial.
- **Rollback Rate:** Quantidade de reverts necessários pós-deploy.
- **Orphan Prevention:** Ausência de dados desconectados (Ex: plano sem paciente).

---
**Data de Atualização:** 28 de Maio de 2026
**Estado:** DISCIPLINA DE PRODUÇÃO ATIVA
**Responsável:** Lovable Agent & Nutricionista Operacional