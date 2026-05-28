# Protocolo de Estabilização Operacional

## Fase: Congelamento de Arquitetura & Confiança Clínica
**Objetivo:** Alcançar 0 regressões críticas em operação real por 7 dias consecutivos.

### 1. Regras de Ouro (Governança)
- **Postura Conservadora:** Nenhuma alteração sobe sem justificativa operacional clara.
- **Bug Real vs. Melhoria:** Proibido disfarçar impulsos arquiteturais ou refatores como "correções".
- **Só corrigir bugs reproduzíveis:** Sem "acho que resolve". Precisa de prova de falha e prova de cura.
- **Atomicidade:** Um bug por vez. Um fluxo por vez. Sem "aproveitar a viagem".
- **Sem Auto-Cura:** Se existir estado inválido, devemos descobrir ONDE ele nasce. Proibido usar fallbacks silenciosos ou sincronizações invisíveis para mascarar erros de origem.

### 2. Checklist Pré-Mudança (Mandatório)
Antes de qualquer alteração, o agente/desenvolvedor deve responder:
1. **Qual bug real resolve?** (Descrever falha operacional)
2. **Qual fluxo clínico toca?** (Ex: Geração de plano, WhatsApp, PDF)
3. **Qual contrato altera?** (Banco, RPC, Interface de Serviço)
4. **Qual risco de regressão cria?** (Baixo/Médio/Alto e porquê)
5. **Qual teste protege?** (Como garantimos que não volta a quebrar?)
6. **Como o rollback funciona?** (Plano de emergência caso quebre em produção)

### 3. Ritual Operacional Diário
1. **Usar o Sistema:** Fluxo humano real (Cadastro -> Plano -> WhatsApp).
2. **Registrar Falha:** Qualquer desvio do comportamento esperado.
3. **Identificar Causa Raiz:** Onde o erro nasce (não onde ele nasce).
4. **Corrigir Pequeno:** Intervenção cirúrgica e isolada.
5. **Validar em Produção:** Teste real no ambiente de uso.
6. **Congelar Novamente:** Voltar ao estado de observação.

### 4. Checklist Operacional Diário (Métrica Real)
Validar manualmente todos os dias via Stability Dashboard:
- [ ] Cadastro funcionando
- [ ] Onboarding funcionando
- [ ] Vínculo correto (Paciente <-> Nutricionista)
- [ ] Geração de plano
- [ ] Publicação
- [ ] WhatsApp (Envio e Log)
- [ ] PDF
- [ ] Substituições
- [ ] App Paciente

### 5. Métrica de Sucesso
- **Estabilidade Determinística:** 7 dias sem regressão crítica = Estágio de Confiança Clínica atingido.

---
**Data de Atualização:** 28 de Maio de 2026
**Estado:** OPERAÇÃO CONSERVADORA ATIVA
**Responsável:** Lovable Agent & Nutricionista Operacional