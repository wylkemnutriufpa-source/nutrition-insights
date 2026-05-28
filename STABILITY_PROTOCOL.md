# Protocolo de Estabilização Operacional

## Fase: Congelamento de Arquitetura
**Objetivo:** Alcançar 0 bugs críticos em operação real por 7 dias consecutivos.

### 1. Regras de Intervenção
- **Bugs Reproduzíveis:** Nenhuma mudança é feita sem um passo-a-passo de reprodução.
- **Atomicidade:** Um bug por vez. Um fluxo por vez.
- **Minimalismo:** A alteração deve ser a menor possível para resolver a causa raiz.
- **Fronteira Estrita:** Proibido alterar código fora da vizinhança imediata do bug.
- **Sem Oportunismo:** Proibido "aproveitar" para refatorar ou melhorar código adjacente.
- **Determinismo:** Sem "auto-cura" ou fallbacks que mascarem a origem do erro.

### 2. Checklist Pré-Mudança (Mandatório)
Antes de qualquer `git commit` ou `deploy`, deve-se responder:
1. **Causa Raiz Exata:** Onde o estado inválido nasce (não onde ele explode)?
2. **Arquivo/Linha:** Localização precisa da falha.
3. **Impacto:** Quais outros fluxos dependem deste código?
4. **Risco de Regressão:** Baixo, Médio ou Alto? Por quê?
5. **Contratos:** Quais colunas do banco ou RPCs são tocados?

### 3. Checklist Operacional Diário (Fluxo Humano)
Validar manualmente todos os dias:
- [ ] Cadastro funcionando
- [ ] Onboarding funcionando
- [ ] Vínculo correto (Paciente <-> Nutricionista)
- [ ] Geração de plano (Edge Function)
- [ ] Publicação (RPC V3)
- [ ] WhatsApp (Envio e Log)
- [ ] PDF (Geração e Visualização)
- [ ] Substituições (Fluxo V3)
- [ ] App Paciente (Visualização do plano ativo)

### 4. Build Guard
O build do sistema falhará automaticamente se:
- O esquema do banco divergir do contrato esperado (`npm run schema:validate`).
- RPCs críticas estiverem ausentes.
- Testes E2E de "Caminho Soberano" falharem.

---
**Data de Início:** 28 de Maio de 2026
**Estado:** ATIVO
