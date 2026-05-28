# Fluxo Soberano e Estabilidade Operacional

Este documento define os caminhos oficiais, contratos e procedimentos para garantir a estabilidade do sistema FitJourney.

## 1. O "Caminho Soberano" (Official Paths)

Para evitar divergências e bugs de sincronização, as seguintes rotas e componentes são considerados oficiais. Qualquer componente fora desta lista é considerado legatário e deve ser evitado ou refatorado.

### Editor de Plano Alimentar
- **Componente Oficial**: `src/components/nutrition/MealPlanEditorV3.tsx`
- **Contrato de Dados**: `MealPlanV3` (Baseado na tabela `meal_plan_items` com `clinical_mass_g`)
- **Persistence**: Deve usar a RPC `publish_meal_plan_v3` para garantir atomicidade.

### Onboarding de Paciente
- **Componente Oficial**: `src/components/onboarding/OnboardingFlowV2.tsx`
- **Fluxo**: Convite -> Registro -> Anamnese -> Geração Automática.

### Comunicação (WhatsApp)
- **Engine Oficial**: `whatsapp-send` (Edge Function)
- **Logging**: Tabela `whatsapp_logs`.
- **Template**: Usar exclusivamente o bucket `shared-meal-plans` para PDFs gerados.

## 2. Contratos de Banco de Dados

### Tabelas Críticas
- `meal_plans`: `is_active` deve ser gerenciado via trigger ou RPC atômica.
- `meal_plan_items`: Uso obrigatório de `clinical_mass_g` em vez de `amount`.
- `profiles`: PII (Dados Pessoais) nunca devem ser expostos via RLS `public`.

### Enums Obrigatórios
- `plan_mode_type`: `['template', 'prescribed', 'draft']`
- `meal_type`: `['breakfast', 'lunch', 'dinner', 'snack']`

## 3. Prevenção de Regressão

### Check de Schema Automático
Todo deploy executa `npm run schema:validate`. Este script compara o `src/integrations/supabase/types.ts` com o estado real do banco. Se houver colunas faltantes ou tipos divergentes, o build falha.

### Smoke Tests (E2E)
O arquivo `src/tests/RealFlowE2E.test.ts` executa um ciclo completo de uso real:
1. Criação de paciente fake.
2. Geração de plano.
3. Publicação (RPC).
4. Verificação de integridade no banco.

## 4. Proibições (Freeze)
- **Proibido**: Inserções diretas em `meal_plan_items` via `supabase.from().insert()` no frontend. Use a RPC de publicação.
- **Proibido**: Alterar schema sem atualizar o snapshot local e passar no `schema:validate`.
- **Proibido**: Novas features de UI sem antes garantir que o fluxo de persistência subjacente está no Dashboard de Estabilidade.
