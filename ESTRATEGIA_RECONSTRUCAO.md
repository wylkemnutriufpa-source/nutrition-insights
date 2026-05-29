# 🔧 Estratégia de Reconstrução — Sem Apagar Tudo

## 📋 O Problema

Você quer apagar tudo porque:
- Templates não estão como quer
- Banco de refeição não está disponível
- Banco de alimentos não está disponível

**Mas apagar tudo é arriscado.** Vamos reconstruir cirurgicamente.

---

## 🎯 PLANO DE AÇÃO (45 minutos)

### Fase 1: Diagnóstico (5 min)
1. Execute `QUERIES_DIAGNOSTICO.sql` no Supabase
2. Veja quantos alimentos, templates, pacientes tem
3. Identifique o que está vazio

### Fase 2: Limpeza (10 min)
Se necessário, limpar dados quebrados:
```sql
-- Deletar templates vazios
DELETE FROM v3_diet_templates WHERE jsonb_array_length(plan_snapshot->'days') = 0;

-- Deletar alimentos sem informação nutricional
DELETE FROM foods WHERE kcal_100g IS NULL;

-- Deletar planos órfãos
DELETE FROM meal_plans WHERE patient_id NOT IN (SELECT id FROM patients);
```

### Fase 3: Reconstrução (20 min)
1. Executar `SCHEMA_COMPLETO_COM_ALIMENTOS.sql` para garantir schema correto
2. Popular 84 alimentos com imagens
3. Criar templates corretos (1200, 1500, 1800, 2000, 2500 kcal)
4. Testar no frontend

### Fase 4: Validação (10 min)
1. Fazer login no frontend
2. Ver templates
3. Selecionar um template
4. Ver plano de refeição
5. Testar edição e substituição

---

## 🚀 PASSO A PASSO

### Passo 1: Diagnosticar

Abra Supabase Dashboard → SQL Editor e execute:

```sql
SELECT 
  (SELECT COUNT(*) FROM foods) as alimentos,
  (SELECT COUNT(*) FROM v3_diet_templates) as templates,
  (SELECT COUNT(*) FROM patients) as pacientes,
  (SELECT COUNT(*) FROM meal_plans) as planos,
  (SELECT COUNT(*) FROM meal_plan_items) as itens;
```

**Anote os números.**

---

### Passo 2: Limpar (se necessário)

Se algum número está 0 ou muito baixo, execute:

```sql
-- Limpar templates vazios
DELETE FROM v3_diet_templates 
WHERE plan_snapshot IS NULL 
   OR plan_snapshot = '{}'::jsonb;

-- Limpar alimentos sem dados
DELETE FROM foods 
WHERE kcal_100g IS NULL 
   OR name IS NULL;

-- Limpar planos órfãos
DELETE FROM meal_plans 
WHERE patient_id NOT IN (SELECT id FROM patients);
```

---

### Passo 3: Reconstruir

Execute o arquivo `SCHEMA_COMPLETO_COM_ALIMENTOS.sql` no Supabase SQL Editor.

**Isso vai:**
- ✅ Criar schema correto (se não existir)
- ✅ Popular 84 alimentos com imagens
- ✅ Criar 1 template de exemplo
- ✅ Configurar RLS policies

---

### Passo 4: Criar Templates Corretos

Você quer quantos templates? Para quais calorias?

**Exemplo:**
- 5 templates de 1200 kcal
- 5 templates de 1500 kcal
- 5 templates de 1800 kcal
- 5 templates de 2000 kcal
- 5 templates de 2500 kcal

**Total: 25 templates**

Se for isso, execute:

```sql
-- Template 1200 kcal - Opção 1
INSERT INTO v3_diet_templates (title, slug, description, kcal_target, plan_snapshot, tags, active)
VALUES (
  'Dieta 1200 kcal - Opção 1',
  'dieta-1200-opcao-1',
  'Plano de 1200 calorias com proteína alta',
  1200,
  '{"days": [{"meals": [{"time": "breakfast", "items": []}]}]}'::jsonb,
  '["saude", "emagrecimento"]'::jsonb,
  true
);

-- Repita para outras opções...
```

---

## ⚠️ IMPORTANTE

**Não apague tudo.** Reconstruir é mais rápido que começar do zero.

Se você apagar:
1. Perde histórico de pacientes
2. Perde dados de planos antigos
3. Precisa recriar tudo do zero (2+ horas)

Se você reconstruir:
1. Mantém dados históricos
2. Limpa apenas o que está quebrado
3. Reconstrói em 45 minutos

---

## 🎯 RESULTADO ESPERADO

Após 45 minutos:

✅ Banco de dados limpo
✅ 84 alimentos disponíveis
✅ 25 templates criados (ou quantos você quiser)
✅ Frontend funciona
✅ Usuários conseguem fazer login
✅ Conseguem ver templates
✅ Conseguem criar planos
✅ Conseguem editar e fazer substituições

---

## 📞 PRÓXIMO PASSO

1. Execute `QUERIES_DIAGNOSTICO.sql`
2. Me mostre os números
3. Vamos decidir se precisa limpar ou reconstruir
4. Executa o SQL correto
5. Testa no frontend

**Vamos lá? Não desista ainda!**
