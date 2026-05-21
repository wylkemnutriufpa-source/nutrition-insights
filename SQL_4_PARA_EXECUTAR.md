# 🚀 SQL 4 - 50 TEMPLATES SOBERANOS

## ✅ PRONTO PARA EXECUTAR NO SUPABASE

---

## 📋 INSTRUÇÕES

1. **Abra o Supabase SQL Editor**
2. **Copie TODO o conteúdo do arquivo abaixo**
3. **Cole no SQL Editor**
4. **Clique em "Run"**

---

## 📂 ARQUIVO SQL

**Localização**: `supabase/migrations/20260521003300_templates_soberanos_50.sql`

**Conteúdo**: 50 templates completos com imagens reais

---

## 🎯 O QUE ESTE SQL FAZ

### Insere 50 templates na tabela `meal_plan_templates`:

- ✅ **20 templates de SAÚDE** (1500-2200 kcal)
- ✅ **9 templates de EMAGRECIMENTO** (1200-1600 kcal)
- ✅ **13 templates de HIPERTROFIA** (1900-2800 kcal)
- ✅ **8 templates CLÍNICOS** (1400-2000 kcal)

### Cada template inclui:
- Nome descritivo
- Categoria (saude, emagrecimento, hipertrofia, clinico)
- Descrição
- Estrutura JSON com:
  - Dias da semana
  - 4 refeições por dia (café, almoço, lanche, jantar)
  - Imagens reais do Supabase Storage
  - Alimentos com quantidades e calorias

---

## 📊 TEMPLATES INCLUÍDOS

### 🥗 SAÚDE (20)
1. Saúde Equilibrado 1800 kcal
2. Nordeste Tradicional 1800 kcal
3. Sul Tradicional 2000 kcal
4. Vegetariano 1600 kcal
5. Nordeste Cuscuz 1600 kcal
6. Sul Churrasco 2100 kcal
7. Mediterrânea 1800 kcal
8. Norte Tradicional 1800 kcal
9. Centro-Oeste Tradicional 1900 kcal
10. Saúde 1500 kcal
11. Saúde 2000 kcal
12. Churrasco Fit 2100 kcal
13. Costela Fit 2200 kcal
14. Stroganoff Fit 1900 kcal
15. Camarão Fit 2000 kcal
16. Coxa e Sobrecoxa 1800 kcal
17. Açaí Fit 1700 kcal
18. Crepioca Fit 1600 kcal
19. Filé de Porco 1900 kcal
20. Filé de Tilápia 1700 kcal
21. Bolo de Macaxeira 1800 kcal

### 🔥 EMAGRECIMENTO (9)
1. Emagrecimento Prático 1400 kcal
2. Emagrecimento Low Carb 1500 kcal
3. Detox 1300 kcal
4. Jejum Intermitente 1600 kcal
5. Cetogênica 1600 kcal
6. Emagrecimento 1200 kcal
7. Emagrecimento 1500 kcal
8. Ovos Cozidos 1500 kcal

### 💪 HIPERTROFIA (13)
1. Hipertrofia Prática 2200 kcal
2. Hipertrofia Alto Carbo 2500 kcal
3. Atleta Endurance 2800 kcal
4. Pré-Treino 1900 kcal
5. Café da Manhã Reforçado 2200 kcal
6. Crossfit 2400 kcal
7. Natação 2300 kcal
8. Ciclismo 2600 kcal
9. Hipertrofia 2300 kcal
10. Hipertrofia 2600 kcal

### 🏥 CLÍNICO (8)
1. Diabetes Controlado 1700 kcal
2. Gestante 2000 kcal
3. Idoso 1500 kcal
4. Criança 1400 kcal
5. Hipertensão 1700 kcal
6. Colesterol Alto 1600 kcal
7. Renal 1500 kcal
8. Canja Fit 1400 kcal

### 🍱 ESPECIAIS (2)
1. Marmita Fit 1700 kcal
2. Vegano 1700 kcal
3. Paleo 1900 kcal

---

## ⚠️ IMPORTANTE

### Antes de executar:
- ✅ Certifique-se de que os **SQL 1, 2 e 3** já foram executados
- ✅ Verifique se a tabela `meal_plan_templates` existe
- ✅ Confirme que as imagens estão no Supabase Storage

### Após executar:
```sql
-- Verificar quantos templates foram criados
SELECT COUNT(*) FROM meal_plan_templates;
-- Deve retornar: 62 (12 de restrições + 50 soberanos)

-- Ver todos os templates
SELECT name, category, description 
FROM meal_plan_templates 
ORDER BY category, name;
```

---

## 🔗 ARQUIVO PARA COPIAR

**Caminho completo**:
```
c:\Users\55919\Downloads\nutrition-insights-fitjourney2.0\nutrition-insights-fitjourney2.0\supabase\migrations\20260521003300_templates_soberanos_50.sql
```

**Abra este arquivo**, copie TODO o conteúdo e cole no Supabase SQL Editor.

---

## 📝 OBSERVAÇÕES

- O arquivo tem **~563 linhas** de código SQL
- Cada INSERT cria 1 template completo
- As imagens usam URLs do Supabase Storage
- Estrutura JSON está validada e pronta para uso

---

## ✅ PRÓXIMOS PASSOS APÓS EXECUTAR

1. **Testar no sistema**:
   - Acessar interface de seleção de templates
   - Verificar se as imagens carregam
   - Testar cópia e renderização

2. **Validar dados**:
   ```sql
   -- Ver template específico
   SELECT * FROM meal_plan_templates 
   WHERE name = 'Saúde Equilibrado 1800 kcal';
   
   -- Ver estrutura JSON
   SELECT name, meals 
   FROM meal_plan_templates 
   LIMIT 1;
   ```

3. **Integrar com o sistema**:
   - Componente de seleção de templates
   - Sistema de cópia e renderização
   - Interface de edição

---

## 🎉 RESULTADO ESPERADO

Após executar este SQL, você terá:
- ✅ 50 templates soberanos completos
- ✅ Imagens reais do Supabase Storage
- ✅ Estrutura JSON validada
- ✅ Cálculos calóricos precisos
- ✅ Variações regionais, clínicas e esportivas
- ✅ Sistema pronto para CLASSIFICA → ESCOLHE → COPIA → RENDERIZA

---

**Data**: 21/05/2026
**Status**: ✅ PRONTO PARA EXECUTAR
**Commit**: `bab94b369`
**Branch**: `fitjourney2.0`
