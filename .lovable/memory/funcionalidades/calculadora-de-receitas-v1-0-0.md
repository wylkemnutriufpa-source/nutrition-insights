---
name: Calculadora de Receitas Dinâmica
description: Patient recipe builder with real-time macro gauges, food DB autocomplete, clinical meal slot matching, and nutritionist curation queue
type: feature
---
## Calculadora de Receitas v1.0.0

### Arquitetura
- **RecipeBuilder** (`/recipe-builder`): Tela interativa para pacientes montarem receitas
- **IngredientSearch**: Autocomplete com `ifj_food_database` (debounce 250ms)
- **MacroGauge**: SVG ring gauges atualizados em tempo real
- **MealSlotMatcher**: Match clínico paramétrico (escala linear por calorias)
- **recipeCalculator.ts**: Engine de cálculo com suporte a unidades caseiras

### Tabelas
- `user_recipes`: RLS por `user_id`, nutricionistas vinculados podem ler/aprovar
- `recipe_curation_queue`: Fila de curadoria com status pending/approved/rejected

### Fluxo
1. Paciente busca ingredientes → autocomplete do banco IFJ
2. Macros calculados em tempo real (por porção)
3. Suporte a unidades: g, colher de sopa, xícara, unidade, fatia, copo
4. Match Clínico: compara receita vs refeição do plano ativo (margem 5%)
5. Ao salvar: auto-submete para fila de curadoria do nutricionista vinculado
6. Upload de foto via storage `meal-images`

### Rotas
- `/recipe-builder` — ProtectedRoute (pacientes e nutricionistas)
- Botão "Criar Receita" na view de paciente em `/recipes`
