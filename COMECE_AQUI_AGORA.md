# 🚀 COMECE AQUI AGORA — Sem Apagar Tudo

## ⚡ RESUMO EXECUTIVO

Você está frustrado porque nada funciona. Mas antes de apagar tudo, vamos diagnosticar em **5 minutos** o que realmente está quebrado.

---

## 🔍 PASSO 1: DIAGNOSTICAR (5 min)

### 1.1 Abra Supabase Dashboard
- Vá em https://app.supabase.com
- Selecione o projeto: **`vkrcobprntictsxqmjjl`** (o antigo)

### 1.2 Vá em SQL Editor
- Clique em **SQL Editor** (no menu esquerdo)

### 1.3 Execute esta query:
```sql
SELECT 
  (SELECT COUNT(*) FROM foods) as alimentos,
  (SELECT COUNT(*) FROM v3_diet_templates) as templates,
  (SELECT COUNT(*) FROM patients) as pacientes,
  (SELECT COUNT(*) FROM meal_plans) as planos,
  (SELECT COUNT(*) FROM meal_plan_items) as itens;
```

### 1.4 Anote os números
Você vai ver algo como:
```
alimentos | templates | pacientes | planos | itens
----------|-----------|-----------|--------|------
    84    |     1     |     0     |   0    |  0
```

---

## 📊 INTERPRETAÇÃO DOS NÚMEROS

### Se você vê:
- **alimentos: 84** ✅ Banco de alimentos está OK
- **templates: 0 ou 1** ❌ Precisa criar mais templates
- **pacientes: 0** ✅ Normal (nenhum usuário criou paciente ainda)
- **planos: 0** ✅ Normal (nenhum plano foi criado)

### Se você vê:
- **alimentos: 0** ❌ Banco de alimentos está vazio
- **templates: 0** ❌ Nenhum template
- **pacientes: 0** ✅ Normal

---

## 🔧 PASSO 2: RECONSTRUIR (20 min)

### Cenário A: Alimentos estão OK, mas templates faltam

Execute no SQL Editor:

```sql
-- Criar 5 templates de 1200 kcal
INSERT INTO v3_diet_templates (title, slug, description, kcal_target, plan_snapshot, tags, active)
VALUES 
  ('Dieta 1200 kcal - Opção 1', 'dieta-1200-opcao-1', 'Plano de 1200 calorias', 1200, '{"days": []}'::jsonb, '["saude"]'::jsonb, true),
  ('Dieta 1200 kcal - Opção 2', 'dieta-1200-opcao-2', 'Plano de 1200 calorias', 1200, '{"days": []}'::jsonb, '["saude"]'::jsonb, true),
  ('Dieta 1200 kcal - Opção 3', 'dieta-1200-opcao-3', 'Plano de 1200 calorias', 1200, '{"days": []}'::jsonb, '["saude"]'::jsonb, true),
  ('Dieta 1200 kcal - Opção 4', 'dieta-1200-opcao-4', 'Plano de 1200 calorias', 1200, '{"days": []}'::jsonb, '["saude"]'::jsonb, true),
  ('Dieta 1200 kcal - Opção 5', 'dieta-1200-opcao-5', 'Plano de 1200 calorias', 1200, '{"days": []}'::jsonb, '["saude"]'::jsonb, true);

-- Criar 5 templates de 1500 kcal
INSERT INTO v3_diet_templates (title, slug, description, kcal_target, plan_snapshot, tags, active)
VALUES 
  ('Dieta 1500 kcal - Opção 1', 'dieta-1500-opcao-1', 'Plano de 1500 calorias', 1500, '{"days": []}'::jsonb, '["saude"]'::jsonb, true),
  ('Dieta 1500 kcal - Opção 2', 'dieta-1500-opcao-2', 'Plano de 1500 calorias', 1500, '{"days": []}'::jsonb, '["saude"]'::jsonb, true),
  ('Dieta 1500 kcal - Opção 3', 'dieta-1500-opcao-3', 'Plano de 1500 calorias', 1500, '{"days": []}'::jsonb, '["saude"]'::jsonb, true),
  ('Dieta 1500 kcal - Opção 4', 'dieta-1500-opcao-4', 'Plano de 1500 calorias', 1500, '{"days": []}'::jsonb, '["saude"]'::jsonb, true),
  ('Dieta 1500 kcal - Opção 5', 'dieta-1500-opcao-5', 'Plano de 1500 calorias', 1500, '{"days": []}'::jsonb, '["saude"]'::jsonb, true);
```

**Repita para 1800, 2000, 2500 kcal se quiser.**

---

### Cenário B: Alimentos estão vazios

Execute no SQL Editor:

```sql
-- Executar o arquivo SCHEMA_COMPLETO_COM_ALIMENTOS.sql
-- Copie TODO o conteúdo e cole aqui
```

Ou:

1. Abra o arquivo `SCHEMA_COMPLETO_COM_ALIMENTOS.sql`
2. Copie TODO o conteúdo
3. Cole no SQL Editor do Supabase
4. Clique em "Run"

---

## ✅ PASSO 3: VALIDAR (10 min)

### 3.1 Recarregue o frontend
- Abra http://localhost:5173 (ou seu dev server)
- Recarregue a página (F5)

### 3.2 Faça login
- Use suas credenciais

### 3.3 Veja os templates
- Você deve ver uma lista de templates
- Clique em um template
- Você deve ver um plano de refeição

### 3.4 Teste edição
- Tente editar uma quantidade
- Tente fazer uma substituição
- Tente exportar PDF

---

## 🎯 RESULTADO

Se tudo funcionar:
✅ Banco de alimentos está OK
✅ Templates estão criados
✅ Planos funcionam
✅ Edição funciona
✅ Substituição funciona

**Você não precisa apagar nada!**

---

## ⚠️ SE AINDA NÃO FUNCIONAR

Se depois de fazer tudo isso ainda não funcionar:

1. Me mostre os números do diagnóstico
2. Me mostre qual etapa está quebrada
3. Vamos debugar especificamente

**Mas 90% das vezes é só falta de dados no banco.**

---

## 📞 PRÓXIMO PASSO

1. **Agora:** Execute a query de diagnóstico
2. **Anote os números**
3. **Me mostre os números**
4. **Vamos reconstruir baseado nos números**

**Não desista! Vamos resolver isso em 45 minutos, não em 2+ horas apagando tudo.**

---

**Vamos lá? Execute a query agora!**
