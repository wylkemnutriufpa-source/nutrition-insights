# 🖼️ CORREÇÃO: IMAGENS DOS TEMPLATES NO EDITOR V3

## 🎯 PROBLEMA IDENTIFICADO

Os 72+ templates apareceram no Editor V3, mas **SEM AS IMAGENS** das refeições.

## 🔍 CAUSA RAIZ

1. **Estrutura do Snapshot**: Os templates soberanos têm a estrutura:
   ```json
   [
     {
       "day": "Segunda-feira",
       "meals": [
         {
           "name": "Pão com Ovo",
           "image": "https://...pao-com-ovo.jpg",  ← IMAGEM DA REFEIÇÃO
           "foods": [                               ← ALIMENTOS (não "items")
             {"name": "Pão Integral", "qty": "2 fatias", "kcal": 240}
           ]
         }
       ]
     }
   ]
   ```

2. **Função `normalizeSnapshotToV3`**: Não estava:
   - ✗ Pegando a propriedade `image` da refeição
   - ✗ Convertendo `foods` para `items`
   - ✗ Processando a estrutura de array direto dos templates soberanos

3. **Componente `MealCard`**: Não estava renderizando a imagem da refeição

## ✅ CORREÇÕES IMPLEMENTADAS

### 1. **Atualização da função `normalizeSnapshotToV3`**

Arquivo: `src/features/editor-v3/utils/normalization.ts`

**O que foi feito:**
- ✅ Adicionada lógica para processar estrutura de array direto (formato dos templates soberanos)
- ✅ Adicionada conversão de `foods` para `items`
- ✅ Adicionada captura da propriedade `image` da refeição
- ✅ Mapeamento correto de `imageUrl` no objeto `Meal`

**Código adicionado:**
```typescript
// Estrutura 3: snapshot é um array direto (formato dos templates soberanos)
else if (Array.isArray(snapshot)) {
  snapshot.forEach((day: any, index: number) => {
    const daysOrder = [1, 2, 3, 4, 5, 6, 0];
    const dayIdx = daysOrder[index % 7];
    
    if (Array.isArray(day.meals)) {
      day.meals.forEach((m: any) => {
        rawMeals.push({
          ...m,
          day_of_week: dayIdx
        });
      });
    }
  });
}

// Converter foods (formato antigo) para items (formato novo)
let items = m.items || [];
if (!items.length && Array.isArray(m.foods)) {
  items = m.foods.map((food: any) => ({
    id: crypto.randomUUID(),
    instanceId: crypto.randomUUID(),
    name: food.name || "Item",
    kcal: Number(food.kcal || 0),
    protein: Number(food.protein || 0),
    carbs: Number(food.carbs || food.carbohydrates || 0),
    fat: Number(food.fat || food.fats || 0),
    quantity: parseFloat(food.qty || food.quantity || '100'),
    clinical_mass_g: parseFloat(food.qty || food.quantity || '100'),
    quantity_display: food.qty || food.quantity || '100g',
    imageUrl: food.imageUrl || food.image_url || food.image || null,
    substitution_group_id: crypto.randomUUID(),
    substitutions: []
  }));
}

// Capturar imagem da refeição
imageUrl: m.image || m.imageUrl || m.image_url || null, // 🖼️ IMAGEM DA REFEIÇÃO
```

### 2. **Atualização do componente `MealCard`**

Arquivo: `src/features/editor-v3/components/MealCard.tsx`

**O que foi feito:**
- ✅ Adicionada renderização da imagem da refeição
- ✅ Efeito hover com zoom suave
- ✅ Gradiente overlay para melhor legibilidade

**Código adicionado:**
```tsx
{/* Imagem da Refeição */}
{meal.imageUrl && (
  <div className="relative w-full h-48 overflow-hidden">
    <img 
      src={meal.imageUrl} 
      alt={meal.name}
      className="w-full h-full object-cover group-hover/meal:scale-105 transition-transform duration-500"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/80 to-transparent" />
  </div>
)}
```

## 🎉 RESULTADO ESPERADO

Após essas correções, os templates no Editor V3 devem mostrar:

1. ✅ **Imagem da refeição completa** (ex: pão-com-ovo.jpg, frango-grelhado.jpg)
2. ✅ **Lista de alimentos** com quantidades e calorias
3. ✅ **Totais de macros** (proteína, carboidrato, gordura)
4. ✅ **Efeito hover** com zoom suave na imagem

## 📝 COMO TESTAR

1. **Limpe o cache do navegador** (Ctrl+Shift+R)
2. **Abra o Editor V3** no FitJourney
3. **Clique em "Biblioteca"**
4. **Selecione um template** (ex: "Saúde Equilibrado 1800 kcal")
5. **Escolha o perfil calórico** (ex: 1800 kcal)
6. **Clique em "Plotar Template"**
7. **Verifique se as imagens aparecem** nos cards das refeições

## 🖼️ IMAGENS DISPONÍVEIS

Os templates usam imagens reais do Supabase Storage:

- `pao-com-ovo.jpg` - Pão com Ovo
- `frango-grelhado.jpg` - Frango Grelhado
- `tapioca-com-queijo.jpg` - Tapioca com Queijo
- `carne-com-batata.jpg` - Carne com Batata
- `peixe-com-legumes.jpg` - Peixe com Legumes
- `iogurte-com-fruta.jpg` - Iogurte com Frutas
- ... e mais 40+ imagens

Todas as imagens estão em:
```
https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/
```

## ⚠️ IMPORTANTE

- ✅ As correções são **automáticas** (não precisa executar SQL)
- ✅ As imagens já estão nos templates do banco
- ✅ Apenas o código TypeScript foi atualizado
- ✅ Basta **recarregar a página** para ver as imagens

## 🔧 ARQUIVOS MODIFICADOS

1. **`src/features/editor-v3/utils/normalization.ts`**
   - Função `normalizeSnapshotToV3` atualizada

2. **`src/features/editor-v3/components/MealCard.tsx`**
   - Adicionada renderização da imagem da refeição

## 🆘 SE AS IMAGENS NÃO APARECEREM

1. **Limpe o cache do navegador** (Ctrl+Shift+R)
2. **Verifique o console do navegador** (F12) para erros
3. **Verifique se as URLs das imagens estão corretas**:
   ```javascript
   // No console do navegador:
   console.log(meal.imageUrl);
   ```
4. **Verifique se o Supabase Storage está acessível**:
   - Abra uma imagem diretamente no navegador
   - Ex: https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pao-com-ovo.jpg

---

**Data**: 21/05/2026  
**Versão**: 1.0  
**Status**: ✅ Correções aplicadas - Recarregue a página!
