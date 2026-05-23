# NOS — Nutrition Operating System

## Arquitetura Final do FitJourney 2.0

---

## 1. Visão Geral

O NOS é a camada de **autoria clínica** do FitJourney 2.0. Ele transforma o sistema de um "gerador de planos" em um **sistema operacional clínico completo**.

```
┌─────────────────────────────────────────────────────────────┐
│                    NUTRITION OPERATING SYSTEM               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CAMADA 1: FOOD DATABASE SOBERANO                          │
│  ├─ nos_foods (TACO + USDA + custom + brand + supplement) │
│  ├─ Identidade canônica (deduplicação por hash)           │
│  └─ RLS isolado por tenant                                │
│                                                             │
│  CAMADA 2: FOOD CALC ENGINE (TypeScript puro)             │
│  ├─ calcMacros(food, qty_g) → macros                      │
│  ├─ calcRecipePerPortion(ingredients, yield, portion)     │
│  ├─ calcMealTotals(items) → totais da refeição           │
│  └─ ZERO Supabase, ZERO side effects                      │
│                                                             │
│  CAMADA 3: EDITOR V3 (Autoria)                            │
│  ├─ NOSFoodSearch (busca soberana)                        │
│  ├─ RecipeBuilder (criar receitas)                        │
│  ├─ ComboBuilder (criar marmitas/combos)                  │
│  └─ Macros calculados em tempo real                       │
│                                                             │
│  CAMADA 4: SOVEREIGN COMPILER                             │
│  ├─ buildSovereignSnapshot()                              │
│  ├─ Congela todos os valores calculados                   │
│  └─ Ponto de fechamento (publicação)                      │
│                                                             │
│  CAMADA 5: SOVEREIGN SNAPSHOT V3                          │
│  ├─ JSONB no banco (imutável após publish)                │
│  ├─ Contém macros congelados                              │
│  └─ Versionado (revision_number, version_history)         │
│                                                             │
│  CAMADA 6: PATIENT APP PASSIVO                            │
│  ├─ extractMealsFromSnapshot() — ÚNICA fonte de dados     │
│  ├─ ZERO cálculo                                          │
│  ├─ ZERO inferência                                       │
│  └─ ZERO acesso a nos_foods, calcEngine, etc             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Tabelas do NOS

### `nos_foods` — Fonte unificada de alimentos

```sql
id              uuid PRIMARY KEY
tenant_id       uuid (NULL = global)
nutritionist_id uuid (NULL = global)
source          text CHECK (source IN ('TACO','USDA','IBGE','custom','brand','supplement'))
source_priority int (1=TACO, 2=USDA, 3=IBGE, 4=custom, 5=brand, 6=supplement)
name            text NOT NULL
name_normalized text (lowercase sem acentos)
kcal_100g       numeric (base de cálculo)
protein_100g    numeric
carbs_100g      numeric
fat_100g        numeric
fiber_100g      numeric
sodium_100g     numeric
portion_g       numeric (porção de referência)
portion_label   text (ex: "1 fatia (30g)")
canonical_hash  text (deduplicação)
canonical_food_id uuid (aponta para canônico se duplicata)
is_canonical    boolean (true = é o canônico)
image_url       text
verified        boolean (auditado manualmente)
is_active       boolean
created_at      timestamptz
updated_at      timestamptz
```

**Índices críticos:**
- `nos_foods_source_priority_idx` — busca por prioridade
- `nos_foods_name_search_idx` — full-text search português
- `nos_foods_canonical_hash_idx` — deduplicação
- `nos_foods_tenant_idx` — isolamento de tenant

**RLS:**
- Global (tenant_id NULL) visível para todos
- Custom/brand visível apenas para o tenant dono

---

### `nos_recipes` — Receitas versionadas

```sql
id                  uuid PRIMARY KEY
nutritionist_id     uuid NOT NULL
tenant_id           uuid
name                text NOT NULL
version             int (1, 2, 3, ...)
previous_version_id uuid (cadeia de versões)
yield_g             numeric (rendimento total)
portion_g           numeric (porção padrão)
ingredients         jsonb (snapshot congelado)
kcal_portion        numeric (pré-calculado, congelado)
protein_portion     numeric
carbs_portion       numeric
fat_portion         numeric
instructions        text
prep_time_min       int
cook_time_min       int
is_public           boolean (compartilhar com workspace)
is_active           boolean
created_at          timestamptz
```

**Invariante:** Receita é imutável após salvar. Para editar → cria nova versão.

---

### `nos_meal_combos` — Marmitas, refeições prontas, combos

```sql
id              uuid PRIMARY KEY
nutritionist_id uuid NOT NULL
tenant_id       uuid
name            text NOT NULL
combo_type      text CHECK (combo_type IN ('meal','marmita','snack','combo','supplement_stack'))
meal_slot       text (breakfast, lunch, dinner, snack, pre_workout, post_workout)
items           jsonb (snapshot congelado)
kcal_total      numeric (pré-calculado, congelado)
protein_total   numeric
carbs_total     numeric
fat_total       numeric
use_count       int (quantas vezes foi usado)
is_active       boolean
created_at      timestamptz
updated_at      timestamptz
```

**Índices críticos:**
- `nos_meal_combos_nutritionist_usage_idx` — listagem com ordenação por uso
- `nos_meal_combos_type_idx` — filtro por tipo
- `nos_meal_combos_slot_idx` — filtro por slot de refeição

---

### `nos_nutritionist_library` — Biblioteca pessoal

```sql
id              uuid PRIMARY KEY
nutritionist_id uuid NOT NULL
item_type       text CHECK (item_type IN ('food','recipe','combo','supplement'))
item_id         uuid NOT NULL
item_snapshot   jsonb (snapshot completo no momento de adicionar)
nickname        text (apelido customizado)
pinned          boolean (favorito)
use_count       int
last_used_at    timestamptz
created_at      timestamptz
```

**Invariante:** `item_snapshot` é congelado no momento de adicionar. Sem joins necessários.

---

## 3. Engine de Cálculo (TypeScript Puro)

**Arquivo:** `src/features/nos/engine/calcEngine.ts`

**Funções:**

```typescript
// Calcula macros para uma gramagem específica
calcMacros(food: NOSFoodBase, qty_g: number): NOSMacros

// Calcula macros totais de uma receita
calcRecipeTotals(ingredients: NOSIngredient[]): NOSMacros

// Calcula macros por porção de uma receita
calcRecipePerPortion(ingredients, yield_g, portion_g): NOSMacros

// Calcula totais de uma refeição
calcMealTotals(items: NOSMealItem[]): NOSMacros

// Calcula totais do dia
calcDayTotals(meals: { items: NOSMealItem[] }[]): NOSMacros

// Calcula gramagem para atingir alvo de macro
calcQtyForMacroTarget(food, targetValue, macro): number

// Calcula densidade energética
calcEnergyDensity(food): number

// Escala substituição por equivalência calórica
calcEquivalentSubstitution(primaryKcal, substituteFood): number
```

**Invariantes:**
- ✅ Funções puras (sem side effects)
- ✅ Sem imports de Supabase, hooks, componentes
- ✅ Base SEMPRE por 100g (factor = qty_g / 100)
- ✅ Arredondamento consistente (2 casas decimais)
- ✅ NUNCA importado no Patient App

---

## 4. Componentes do Editor V3

### NOSFoodSearch

**Arquivo:** `src/features/nos/components/NOSFoodSearch.tsx`

**Funcionalidade:**
- Busca em `nos_foods` via RPC `nos_search_foods`
- 3 abas: Base NOS | Minha Biblioteca | Visual Library (fallback)
- Prioridade: TACO → USDA → custom → brand → supplement
- Favoritos pinados no topo
- Macros calculados em tempo real via `calcEngine`

**Props:**
```typescript
interface NOSFoodSearchProps {
  onSelect: (food: Food) => void;
  mealSlot?: string;
}
```

### RecipeBuilder

**Arquivo:** `src/features/nos/components/RecipeBuilder.tsx`

**Funcionalidade:**
- Criar receitas com ingredientes
- Macros calculados em tempo real
- Salva em `nos_recipes` com snapshot congelado
- Versionamento automático

**Hook:** `useRecipeBuilder()`

### ComboBuilder

**Arquivo:** `src/features/nos/components/ComboBuilder.tsx`

**Funcionalidade:**
- Criar marmitas, refeições prontas, combos
- 2 abas: Novo Combo | Minha Biblioteca
- Macros calculados em tempo real
- Salva em `nos_meal_combos` com snapshot congelado
- Botão "Adicionar ao Plano" injeta todos os itens na refeição

**Hook:** `useComboBuilder()` + `useMyLibrary()`

---

## 5. Boundaries Arquiteturais

### ✅ PERMITIDO no Editor V3

```typescript
import { calcEngine } from '@/features/nos/engine/calcEngine';
import { useNOSFoodSearch } from '@/features/nos/hooks/useNOSFoodSearch';
import { NOSFoodSearch } from '@/features/nos/components/NOSFoodSearch';
import { RecipeBuilder } from '@/features/nos/components/RecipeBuilder';
import { ComboBuilder } from '@/features/nos/components/ComboBuilder';
```

### ❌ PROIBIDO no Patient App

```typescript
// NUNCA fazer isso:
import { calcEngine } from '@/features/nos/engine/calcEngine';
import { useNOSFoodSearch } from '@/features/nos/hooks/useNOSFoodSearch';
import { nos_foods } from '@/features/nos/...';

// SEMPRE fazer isso:
import { extractMealsFromSnapshot } from '@/lib/sovereign/extractMealsFromSnapshot';
```

---

## 6. Fluxo de Publicação

```
1. Nutricionista cria plano no Editor V3
   ↓
2. Adiciona alimentos via NOSFoodSearch
   ↓
3. Cria receitas via RecipeBuilder
   ↓
4. Cria combos via ComboBuilder
   ↓
5. Macros calculadas em tempo real via calcEngine
   ↓
6. Clica "Publicar Plano"
   ↓
7. buildSovereignSnapshot() congela TODOS os valores
   ↓
8. Snapshot gravado em meal_plans.snapshot (JSONB)
   ↓
9. Plano publicado (imutável)
   ↓
10. Paciente acessa Patient App
    ↓
11. extractMealsFromSnapshot() lê snapshot congelado
    ↓
12. Paciente vê macros EXATAMENTE como nutricionista criou
    ↓
13. Paciente faz substituição (se permitido)
    ↓
14. Substituição é VALIDADA contra snapshot
    ↓
15. Macros recalculados APENAS para a substituição
    ↓
16. Histórico de substituições gravado (auditoria)
```

---

## 7. Invariantes do Sistema

### Invariante 1: Snapshot é Imutável

```
Após publicação:
- Nenhum recálculo de macros
- Nenhuma busca em nos_foods
- Nenhuma inferência
- Nenhum runtime clínico

Snapshot = Registro histórico, não referência dinâmica
```

### Invariante 2: Engine é Puro

```
calcEngine NUNCA:
- Acessa banco de dados
- Faz side effects
- Importa hooks ou componentes
- Usa estado global

calcEngine SEMPRE:
- Recebe dados como parâmetros
- Retorna valores calculados
- Pode ser testado isoladamente
```

### Invariante 3: Patient App é Passivo

```
Patient App NUNCA:
- Acessa nos_foods
- Chama calcEngine
- Faz cálculos nutricionais
- Recalcula macros

Patient App SEMPRE:
- Lê snapshot congelado
- Exibe dados como-estão
- Valida substituições contra snapshot
- Registra auditoria
```

### Invariante 4: Separação de Camadas

```
Editor V3 ↔ NOS (autoria)
   ↓
Sovereign Compiler (congelamento)
   ↓
Snapshot V3 (imutável)
   ↓
Patient App (leitura)

Nenhuma camada pode pular a anterior.
```

---

## 8. Estratégia de Performance

### Índices Críticos

```sql
-- nos_foods
CREATE INDEX nos_foods_source_priority_idx 
  ON nos_foods (source_priority, is_active, is_canonical)
  WHERE is_active = true AND is_canonical = true;

-- nos_recipes
CREATE INDEX nos_recipes_nutritionist_active_idx 
  ON nos_recipes (nutritionist_id, is_active, created_at DESC)
  WHERE is_active = true;

-- nos_meal_combos
CREATE INDEX nos_meal_combos_nutritionist_usage_idx 
  ON nos_meal_combos (nutritionist_id, is_active, use_count DESC)
  WHERE is_active = true;

-- nos_nutritionist_library
CREATE INDEX nos_library_priority_idx 
  ON nos_nutritionist_library (nutritionist_id, pinned DESC, use_count DESC);
```

### Caching Strategy

```typescript
// Biblioteca pessoal (cache local)
const [library, setLibrary] = useState<NOSLibraryItem[]>([]);

// Busca com debounce
const debouncedSearch = useMemo(
  () => debounce((query: string) => {
    searchNOSFoods(query).then(setResults);
  }, 300),
  []
);

// Favoritos pinados (sempre no topo)
const pinnedItems = library.filter(item => item.pinned);
const recentItems = library.sort((a, b) => 
  (b.last_used_at?.getTime() || 0) - (a.last_used_at?.getTime() || 0)
);
```

---

## 9. Plano de Migração

### Sprint J (Atual)

- [x] Deprecar `FOOD_DATABASE.ts`
- [x] Criar migration de índices de performance
- [x] Criar lint rules para boundaries
- [x] Documentar arquitetura final

### Sprint K (Próximo)

- [ ] Implementar `nos_foods` com TACO + USDA
- [ ] Implementar `calcEngine` (TypeScript puro)
- [ ] Implementar `NOSFoodSearch` component
- [ ] Testes forenses do engine

### Sprint L

- [ ] Implementar `RecipeBuilder`
- [ ] Implementar `nos_recipes` table
- [ ] Versionamento de receitas
- [ ] Testes de receitas

### Sprint M

- [ ] Implementar `ComboBuilder`
- [ ] Implementar `nos_meal_combos` table
- [ ] Biblioteca pessoal (`nos_nutritionist_library`)
- [ ] Testes de combos

### Sprint N

- [ ] `buildSovereignSnapshot()` compiler
- [ ] Integração com publicação de planos
- [ ] Testes de snapshot imutável
- [ ] Auditoria de substituições

---

## 10. Riscos e Mitigações

### Risco 1: Contaminação do Patient App

**Risco:** Patient App importa `calcEngine` ou `nos_foods`

**Mitigação:**
- ESLint rule `no-restricted-imports`
- Code review obrigatório
- Testes de isolamento

### Risco 2: Snapshot Mutável

**Risco:** Snapshot é modificado após publicação

**Mitigação:**
- Snapshot é JSONB imutável
- Trigger de auditoria em qualquer UPDATE
- Versionamento com `revision_number`

### Risco 3: Duplicação de Alimentos

**Risco:** TACO + USDA + custom com mesmo nome

**Mitigação:**
- `canonical_hash` para deduplicação
- `source_priority` para hierarquia
- Validação manual de canônicos

### Risco 4: Performance de Busca

**Risco:** Busca em `nos_foods` fica lenta com 100k+ alimentos

**Mitigação:**
- Full-text search com índice
- Paginação (limit 50)
- Cache local de favoritos
- Debounce de 300ms

---

## 11. Veredito Final

### ✅ Sistema Blindado

- Engine puro (sem side effects)
- Snapshot imutável (após publicação)
- Separação de camadas (Editor V3 ↔ Patient App)
- RLS isolado por tenant
- Índices de performance
- Steering file para Lovable
- Lint rules para boundaries

### ✅ Pronto para Sprint K

- Arquitetura documentada
- Tabelas definidas
- Índices planejados
- Boundaries claros
- Riscos mapeados
- Plano de migração

### 🎯 Próximos Passos

1. **Sprint K**: Implementar `nos_foods` + `calcEngine`
2. **Sprint L**: Implementar `RecipeBuilder`
3. **Sprint M**: Implementar `ComboBuilder`
4. **Sprint N**: Integrar com publicação
5. **Sprint O**: Testes forenses completos

---

## Conclusão

O NOS é um **sistema operacional clínico completo** que transforma o FitJourney 2.0 de um "gerador de planos" em uma **plataforma de autoria nutricional profissional**.

A arquitetura garante:
- **Integridade clínica** (snapshots imutáveis)
- **Performance** (índices otimizados)
- **Segurança** (RLS + boundaries)
- **Auditoria** (versionamento + histórico)
- **Escalabilidade** (separação de camadas)

Estamos prontos para o próximo sprint.
