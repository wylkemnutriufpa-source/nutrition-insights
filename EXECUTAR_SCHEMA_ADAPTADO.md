# 🔧 EXECUTAR SCHEMA ADAPTADO — Banco Antigo

## 🔴 PROBLEMA

O SQL anterior falhou porque a tabela `v3_diet_templates` já existe no banco antigo, mas com uma estrutura diferente. A coluna `kcal_target` não existe.

```
ERROR: 42703: column "kcal_target" of relation "v3_diet_templates" does not exist
```

## ✅ SOLUÇÃO

Criei um SQL adaptado que:
- ✅ Cria apenas as tabelas que NÃO existem (`foods`, `food_substitutions`)
- ✅ Não tenta recriar `v3_diet_templates` (já existe)
- ✅ Popula 84 alimentos
- ✅ Respeita a estrutura existente do banco antigo

---

## 🔧 PASSO A PASSO

### Passo 1: Abra Supabase Dashboard
1. Vá em https://app.supabase.com
2. Faça login
3. Selecione o projeto: **`vkrcobprntictsxqmjjl`** (o antigo)

### Passo 2: Vá em SQL Editor
1. Clique em **SQL Editor** (no menu esquerdo)
2. Clique em **New Query**

### Passo 3: Copie o SQL Adaptado
1. Abra o arquivo: `SCHEMA_ADAPTADO_BANCO_ANTIGO.sql`
2. **Copie TODO o conteúdo** (Ctrl+A, Ctrl+C)

### Passo 4: Cole no Supabase
1. Cole no SQL Editor do Supabase (Ctrl+V)
2. Clique em **Run** (ou Ctrl+Enter)

### Passo 5: Aguarde a Execução
- Vai levar alguns segundos
- Você deve ver: ✅ **Success**
- No final, vai mostrar:
  ```
  foods | 84
  v3_diet_templates | (número que já existia)
  ```

---

## ✅ RESULTADO ESPERADO

Após executar:

```
table_name | row_count
-----------|----------
foods      | 84
v3_diet_templates | (número existente)
```

**Isso significa:**
- ✅ 84 alimentos foram criados
- ✅ Templates existentes foram preservados
- ✅ Nenhum erro de conflito

---

## 🧪 VALIDAÇÃO

Após executar, execute esta query para confirmar:

```sql
SELECT 
  (SELECT COUNT(*) FROM foods) as alimentos,
  (SELECT COUNT(*) FROM v3_diet_templates) as templates;
```

**Resultado esperado:**
```
alimentos | templates
----------|----------
84        | (número > 0)
```

---

## 🚀 PRÓXIMO PASSO

Após executar o schema adaptado:

1. **Recarregue o frontend** (F5)
2. **Faça login**
3. **Você deve ver os templates existentes**
4. **Clique em um template**
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

1. **Agora:** Execute o SQL adaptado no Supabase
2. **Depois:** Recarregue o frontend
3. **Teste:** Faça login e veja os templates

**Vamos lá! Execute o SQL adaptado agora!**
