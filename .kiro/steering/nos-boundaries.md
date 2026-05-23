# NOS BOUNDARIES — Regras Invioláveis do Nutrition Operating System

## O QUE É O NOS

O NOS (Nutrition Operating System) é a camada de autoria do FitJourney 2.0.
Ele contém o banco de alimentos, o engine de cálculo e as ferramentas do nutricionista.

## SEPARAÇÃO ABSOLUTA DE CAMADAS

```
nos_foods (banco)     → SOMENTE o Editor V3 lê
calcEngine.ts         → SOMENTE o Editor V3 importa
nos_recipes           → SOMENTE o Editor V3 lê/escreve
nos_meal_combos       → SOMENTE o Editor V3 lê/escreve

SOVEREIGN SNAPSHOT    → ponto de FECHAMENTO (compilação)

Patient App           → lê SOMENTE o snapshot já compilado
extractMealsFromSnapshot → ÚNICA fonte de dados para o Patient App
```

## PROIBIÇÕES ABSOLUTAS

**NUNCA fazer nos arquivos do Patient App:**
- Importar `calcEngine.ts` ou qualquer arquivo de `src/features/nos/`
- Fazer query para `nos_foods`, `nos_recipes`, `nos_meal_combos`
- Recalcular macros a partir de gramagem
- Buscar imagens dinamicamente (usar o que está no snapshot)
- Normalizar, inferir ou enriquecer dados do snapshot

**NUNCA fazer após publicação do plano:**
- Recalcular macros do snapshot
- Buscar TACO/USDA para "corrigir" valores
- Alterar `quantity_display` baseado em novo cálculo
- Modificar `substitutions` do snapshot

## ARQUIVOS DO PATIENT APP — PROIBIDOS DE IMPORTAR NOS

```
src/pages/PatientMealPlan.tsx          ← NUNCA importar calcEngine
src/components/patient/*.tsx           ← NUNCA importar nos/
src/lib/sovereign/extractMealsFromSnapshot.ts ← NUNCA importar nos/
```

## ARQUIVOS DO EDITOR — ONDE O NOS É PERMITIDO

```
src/features/editor-v3/              ← PODE usar calcEngine, nos_foods
src/features/nos/                    ← É O NOS
src/features/editor-v3/services/planPersistenceService.ts ← compila o snapshot
```

## REGRA DO SNAPSHOT

O snapshot nasce no `buildSovereignSnapshot()` e nunca mais é recalculado.
Após `publishPlan()`, o plano é um **registro histórico imutável**.

Se o nutricionista edita uma receita usada em plano publicado:
→ O plano publicado NÃO muda
→ A receita cria uma nova versão (`version + 1`)
→ `previous_version_id` mantém a cadeia de versões

## PRIORIDADE DE FONTES

```
source_priority: TACO(1) > USDA(2) > IBGE(3) > custom(4) > brand(5) > supplement(6)
```

Nunca misturar macros de fontes diferentes para o mesmo alimento sem `canonical_food_id`.

## DEDUPLICAÇÃO

Alimentos com mesmo `canonical_hash` (nome normalizado + macros arredondados)
são candidatos ao mesmo canônico. O campo `canonical_food_id` aponta para o
registro TACO quando existe equivalente.

O campo `is_canonical = false` indica que é uma duplicata mapeada.
Exibir apenas `is_canonical = true` nas buscas.

## O QUE O LOVABLE NUNCA DEVE FAZER

1. Recriar `FOOD_DATABASE.ts` com lógica de cálculo
2. Adicionar imports de `calcEngine` no Patient App
3. Criar "helpers" que calculam macros no runtime do paciente
4. Adicionar fallbacks que buscam `nos_foods` durante renderização
5. Criar "bridges" entre o snapshot e o banco de alimentos após publicação
