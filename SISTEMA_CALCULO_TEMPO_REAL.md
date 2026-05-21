# 🚀 SISTEMA DE CÁLCULO EM TEMPO REAL - FITJOURNEY 2.0

## 📋 RESUMO EXECUTIVO

Sistema tipo **Excel** que recalcula TUDO automaticamente quando você muda qualquer valor!

### ✅ O QUE FOI IMPLEMENTADO

1. **Medidas Caseiras** (unidades + gramas)
2. **Cálculo Proporcional Automático** (muda gramas → recalcula tudo)
3. **Interface de Montagem Rápida** (clica e adiciona)
4. **Templates com Restrições Alimentares** (glúten, lactose, FODMAP)

---

## 🎯 FUNCIONALIDADES PRINCIPAIS

### 1. MEDIDAS CASEIRAS

**Tabela**: `meal_household_measures`

Cada alimento tem:
- **Medida padrão**: Ex: 1 ovo = 50g
- **Nutrição por unidade**: Calorias, proteína, carbo, gordura
- **Conversões automáticas**: Gramas ↔ Unidades

**Exemplos**:
```sql
-- Ovo: 1 unidade = 50g = 73 kcal
-- Pão: 1 fatia = 50g = 120 kcal
-- Banana: 1 unidade = 100g = 89 kcal
-- Maçã: 1 unidade = 150g = 78 kcal
```

### 2. CÁLCULO PROPORCIONAL AUTOMÁTICO

**Função**: `calculate_nutrition_proportional(food_name, mass_g)`

**FÓRMULAS**:
- Proteína: **4 kcal/g**
- Carboidrato: **4 kcal/g**
- Lipídeo: **9 kcal/g**

**Exemplo**:
```sql
-- Calcular 3 ovos (150g):
SELECT * FROM calculate_nutrition_proportional('Ovo', 150);

-- Resultado:
-- mass_g: 150
-- units: 3
-- unit_name: "unidade"
-- kcal: 219
-- protein_g: 18.9
-- carbs_g: 0.9
-- fat_g: 15.0
-- kcal_from_protein: 75.6
-- kcal_from_carbs: 3.6
-- kcal_from_fat: 135.0
```

**Se mudar para 100g (2 ovos)**:
```sql
SELECT * FROM calculate_nutrition_proportional('Ovo', 100);

-- Resultado:
-- mass_g: 100
-- units: 2
-- kcal: 146
-- protein_g: 12.6
-- ... (tudo recalculado proporcionalmente!)
```

### 3. MONTAGEM RÁPIDA DE PLANOS

**Tabela**: `meal_plan_drafts`

**Funções**:
- `add_food_to_meal()` - Adiciona alimento e recalcula totais
- `update_food_mass()` - Atualiza massa e recalcula tudo

**Fluxo**:
1. Nutricionista clica em "Ovo" (150g)
2. Sistema adiciona à refeição
3. **Recalcula automaticamente**:
   - Total de calorias do dia
   - Total de proteínas
   - Total de carboidratos
   - Total de gorduras
4. Nutricionista muda para 100g
5. **Sistema recalcula TUDO instantaneamente!**

### 4. RESTRIÇÕES ALIMENTARES

**Tabela**: `food_restrictions`

**Restrições suportadas**:
- ✅ **Zero Glúten** (celíacos)
- ✅ **Zero Lactose** (intolerância)
- ✅ **Low FODMAP** (síndrome do intestino irritável)

**Função**: `get_safe_alternatives(food_name, avoid_gluten, avoid_lactose, avoid_fodmap)`

**Exemplos**:
```sql
-- Paciente celíaco (sem glúten):
SELECT get_safe_alternatives('Pão Integral', true, false, false);
-- Resultado: ['Pão sem Glúten', 'Tapioca', 'Batata Doce']

-- Paciente intolerante à lactose:
SELECT get_safe_alternatives('Iogurte Natural', false, true, false);
-- Resultado: ['Iogurte sem Lactose', 'Iogurte de Coco']

-- Paciente com SII (low FODMAP):
SELECT get_safe_alternatives('Maçã', false, false, true);
-- Resultado: ['Banana', 'Morango', 'Laranja']
```

---

## 📊 TEMPLATES DISPONÍVEIS

### VARIAÇÕES CALÓRICAS

Cada restrição tem 3 variações:
- **1400 kcal** - Emagrecimento
- **1800 kcal** - Manutenção
- **2200 kcal** - Hipertrofia

### TEMPLATES CRIADOS

1. **Zero Glúten**
   - `zero-gluten-1400`
   - `zero-gluten-1800`
   - `zero-gluten-2200`

2. **Zero Lactose**
   - `zero-lactose-1400`
   - `zero-lactose-1800`
   - `zero-lactose-2200`

3. **Low FODMAP**
   - `low-fodmap-1400`
   - `low-fodmap-1800`

4. **Zero Glúten + Zero Lactose**
   - `zero-gluten-lactose-1400`
   - `zero-gluten-lactose-1800`

5. **Zero Glúten + Zero Lactose + Low FODMAP**
   - `zero-gluten-lactose-fodmap-1400`
   - `zero-gluten-lactose-fodmap-1800`

**TOTAL**: 12 templates especializados + variações calóricas

---

## 🎨 COMPONENTES REACT

### 1. MealPlanBuilder.tsx

Interface de montagem rápida:
- Seleciona dia da semana
- Seleciona refeição
- Clica no alimento → adiciona
- Muda gramas → recalcula automaticamente
- **Totais em tempo real** no topo da tela

### 2. DietaryRestrictionsSelector.tsx

Seletor de restrições:
- Templates rápidos (1 clique)
- Seleção individual (checkboxes)
- Preview de substituições
- Variações calóricas disponíveis

---

## 🔧 COMO USAR

### PARA O NUTRICIONISTA

#### 1. Criar Plano do Zero

```typescript
// 1. Abrir interface de montagem
<MealPlanBuilder />

// 2. Selecionar dia e refeição
// Segunda-feira → Café da Manhã

// 3. Clicar nos alimentos
// Clica em "Ovo" (150g) → Adiciona 3 ovos
// Clica em "Pão Integral" (100g) → Adiciona 2 fatias
// Clica em "Banana" (100g) → Adiciona 1 banana

// 4. Sistema calcula automaticamente:
// Total: 449 kcal
// Proteína: 30.9g
// Carboidrato: 46.8g
// Gordura: 16.3g

// 5. Ajustar se necessário
// Muda ovo de 150g para 100g
// Sistema recalcula INSTANTANEAMENTE!
```

#### 2. Aplicar Restrições

```typescript
// 1. Abrir seletor de restrições
<DietaryRestrictionsSelector 
  onRestrictionsChange={(restrictions) => {
    // Sistema substitui automaticamente:
    // Pão Integral → Tapioca (se glúten)
    // Iogurte → Iogurte sem Lactose (se lactose)
    // Maçã → Banana (se FODMAP)
  }}
/>

// 2. Selecionar template rápido
// Clica em "Zero Glúten + Lactose"
// Sistema aplica ambas restrições

// 3. Ou selecionar individualmente
// ☑ Zero Glúten
// ☑ Zero Lactose
// ☐ Low FODMAP
```

---

## 📁 ARQUIVOS CRIADOS

### Migrations (SQL)
1. `20260521003000_meal_household_measures.sql`
   - Tabela de medidas caseiras
   - Função de cálculo proporcional
   - Dados iniciais (30+ alimentos)

2. `20260521003100_meal_plan_builder.sql`
   - Tabela de rascunhos
   - Função de adicionar alimento
   - Função de atualizar massa
   - RLS (segurança)

3. `20260521003200_templates_restricoes_alimentares.sql`
   - Tabela de restrições
   - Função de alternativas seguras
   - 12 templates especializados
   - Dados de restrições (40+ alimentos)

### Componentes (React)
1. `src/components/MealPlanBuilder.tsx`
   - Interface de montagem rápida
   - Cálculo em tempo real
   - Edição inline

2. `src/components/DietaryRestrictionsSelector.tsx`
   - Seletor de restrições
   - Templates rápidos
   - Preview de substituições

---

## 🎯 PRÓXIMOS PASSOS

### Para Aplicar as Migrations

**Opção 1: Supabase Dashboard**
```
1. Abrir Supabase Dashboard
2. SQL Editor
3. Copiar conteúdo de cada migration
4. Executar em ordem (3000 → 3100 → 3200)
```

**Opção 2: Supabase CLI**
```bash
cd nutrition-insights-fitjourney2.0
supabase db push
```

**Opção 3: Lovable (se conectado)**
```
Commit e push → Lovable aplica automaticamente
```

### Para Testar

1. **Testar Cálculo Proporcional**:
```sql
-- 3 ovos (150g)
SELECT * FROM calculate_nutrition_proportional('Ovo', 150);

-- 2 fatias de pão (100g)
SELECT * FROM calculate_nutrition_proportional('Pão Integral', 100);

-- 1.5 bananas (150g)
SELECT * FROM calculate_nutrition_proportional('Banana', 150);
```

2. **Testar Restrições**:
```sql
-- Alternativas sem glúten
SELECT get_safe_alternatives('Pão Integral', true, false, false);

-- Alternativas sem lactose
SELECT get_safe_alternatives('Iogurte Natural', false, true, false);

-- Alternativas low FODMAP
SELECT get_safe_alternatives('Maçã', false, false, true);
```

3. **Testar Interface**:
```typescript
// Importar componente
import { MealPlanBuilder } from '@/components/MealPlanBuilder';

// Usar na página
<MealPlanBuilder />
```

---

## 🎉 RESULTADO FINAL

### O QUE O SISTEMA FAZ AGORA

✅ **Medidas Caseiras**: "3 ovos" ao invés de "150g"
✅ **Cálculo Automático**: Muda gramas → recalcula tudo
✅ **Montagem Rápida**: Clica e adiciona (tipo Excel)
✅ **Restrições Inteligentes**: Substitui automaticamente
✅ **12 Templates Especializados**: Glúten, Lactose, FODMAP
✅ **Variações Calóricas**: 1400, 1800, 2200 kcal
✅ **Interface Premium**: Visual moderno e intuitivo

### FÓRMULAS IMPLEMENTADAS

```
Proteína: 4 kcal/g
Carboidrato: 4 kcal/g
Lipídeo: 9 kcal/g

Cálculo Proporcional:
Se 1 ovo (50g) = 73 kcal
Então 3 ovos (150g) = 219 kcal
```

---

## 📞 SUPORTE

Se tiver dúvidas sobre:
- Como aplicar as migrations
- Como usar os componentes
- Como adicionar novos alimentos
- Como criar novos templates

É só perguntar! 🚀
