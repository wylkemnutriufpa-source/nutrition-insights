# 🚀 EXECUTAR SCHEMA AGORA — Criar Tabelas e Alimentos

## ⚡ PROBLEMA IDENTIFICADO

O banco de dados antigo (`vkrcobprntictsxqmjjl`) **não tem as tabelas criadas**. Por isso a query falhou:

```
ERROR: 42P01: relation "foods" does not exist
```

## ✅ SOLUÇÃO

Vamos executar o `SCHEMA_COMPLETO_COM_ALIMENTOS.sql` para criar:
- ✅ Tabelas: `patients`, `foods`, `v3_diet_templates`, `meal_plans`, `meal_plan_items`
- ✅ 84 alimentos com imagens
- ✅ 1 template de exemplo
- ✅ RLS policies

---

## 🔧 PASSO A PASSO

### Passo 1: Abra Supabase Dashboard
1. Vá em https://app.supabase.com
2. Faça login
3. Selecione o projeto: **`vkrcobprntictsxqmjjl`** (o antigo)

### Passo 2: Vá em SQL Editor
1. Clique em **SQL Editor** (no menu esquerdo)
2. Clique em **New Query**

### Passo 3: Copie o SQL
1. Abra o arquivo: `SCHEMA_COMPLETO_COM_ALIMENTOS.sql`
2. **Copie TODO o conteúdo** (Ctrl+A, Ctrl+C)

### Passo 4: Cole no Supabase
1. Cole no SQL Editor do Supabase (Ctrl+V)
2. Clique em **Run** (ou Ctrl+Enter)

### Passo 5: Aguarde a Execução
- Vai levar alguns segundos
- Você deve ver: ✅ **Success**
- No final, vai mostrar:
  ```
  patients | 0
  foods | 84
  v3_diet_templates | 1
  ```

---

## ✅ RESULTADO ESPERADO

Após executar:

```
table_name | row_count
-----------|----------
patients   | 0
foods      | 84
v3_diet_templates | 1
```

**Isso significa:**
- ✅ 84 alimentos foram criados
- ✅ 1 template foi criado
- ✅ 0 pacientes (normal, nenhum usuário criou ainda)

---

## 🧪 VALIDAÇÃO

Após executar, execute esta query para confirmar:

```sql
SELECT 
  (SELECT COUNT(*) FROM foods) as alimentos,
  (SELECT COUNT(*) FROM v3_diet_templates) as templates,
  (SELECT COUNT(*) FROM patients) as pacientes;
```

**Resultado esperado:**
```
alimentos | templates | pacientes
----------|-----------|----------
84        | 1         | 0
```

---

## 🚀 PRÓXIMO PASSO

Após executar o schema:

1. **Recarregue o frontend** (F5)
2. **Faça login**
3. **Você deve ver o template "Prático Café da Manhã"**
4. **Clique no template**
5. **Você deve ver um plano de refeição com alimentos**

---

## ⚠️ SE ALGO DER ERRADO

### Erro: "relation already exists"
- Significa que as tabelas já existem
- Tudo bem, o SQL tem `IF NOT EXISTS`
- Continua funcionando

### Erro: "permission denied"
- Você não tem permissão para criar tabelas
- Verifique se está logado como admin no Supabase

### Erro: "syntax error"
- Pode ter copiado errado
- Tente copiar novamente

---

## 📞 PRÓXIMO PASSO

1. **Agora:** Execute o SQL no Supabase
2. **Depois:** Recarregue o frontend
3. **Teste:** Faça login e veja os templates

**Vamos lá! Execute o SQL agora!**
