# Plano de Consolidação Soberana V3

Este plano estabelece a base para a transição definitiva para o motor V3, priorizando a estabilidade clínica e a segurança operacional conforme as "Regras Absolutas".

## 1. Matriz de Segurança Operacional
Criação do arquivo `src/ENGINE_SECURITY_MATRIX.md` para mapear criticidade, riscos e dependências de todos os módulos do core clínico.

## 2. Implementação do Modo Degradado Explícito
Atualização das engines compartilhadas para eliminar fallbacks silenciosos.
- **clinical-engine.ts**: Adição de metadados de `provenance` e `degraded_mode` quando heurísticas substituem cálculos determinísticos.
- **weekly-composer**: Registro de logs de `provenance` na distribuição semanal.

## 3. Consolidação V3 - Fase 1 (App Bootstrap)
Refatoração do `src/App.tsx` para remover o toggle manual de versões.
- **Novo Fluxo**: Profissionais (Admin, Nutri, Personal) entram diretamente no `PrescriptionDashboard` (V2/V3).
- **Compatibilidade**: Adição de um "Compatibility Adapter" que permite redirecionar para rotas do V1 (AppRoutes) apenas quando necessário, sem o switcher flutuante.
- **Persistência**: Remoção do uso de `localStorage` para controle de versão, tornando o V3 a "verdade operacional" para profissionais.

## 4. Auditoria e Logs
Configuração de interceptores no `NutriCoreV3Adapter` para disparar alertas quando dados "contaminados" (V2 Legacy) forem consumidos.

---

## Detalhes Técnicos

### Modo Degradado (Exemplo de Implementação)
```typescript
if (fallbackUsed) {
  result.metadata.provenance = "heuristic_fallback";
  result.metadata.degraded = true;
  console.warn(`[CLINICAL_DEGRADED] ${context}`);
}
```

### Matriz de Segurança (Estrutura)
| Módulo | Criticidade | Risco | Status |
| :--- | :--- | :--- | :--- |
| clinical-engine | CRÍTICA | ALTO | Operacional V3 |
| WeeklyComposer | CRÍTICA | ALTO | Operacional V3 |
| ... | ... | ... | ... |
