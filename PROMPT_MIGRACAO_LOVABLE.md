# Prompt para Lovable — Migração de Pacientes para Novo Supabase

Copie e cole este prompt no Lovable:

---

## 📋 TAREFA: Migrar Todos os Pacientes para Novo Supabase

Preciso que você crie uma **função de migração de dados** que:

### 🎯 Objetivo
Migrar TODOS os pacientes, planos de refeição e dados associados do **Supabase antigo** para o **novo Supabase**.

### 📊 Dados a Migrar
1. **Tabela `patients`** — Todos os pacientes
2. **Tabela `meal_plans`** — Todos os planos de refeição
3. **Tabela `meal_plan_items`** — Todos os itens dos planos
4. **Tabela `anamnesis`** — Todas as anamneses (se existir)
5. **Tabela `clinical_assessments`** — Todas as avaliações clínicas (se existir)

### 🔑 Credenciais

**Supabase Antigo (Origem):**
```
URL: https://vkrcobprntictsxqmjjl.supabase.co
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrcmNvYnBybnRpY3RzeHFtampsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODgzNjAsImV4cCI6MjA4ODU2NDM2MH0.7EeitVFMX1oFdtDCZpw7t1c6G5gnKjnvOhuScZ83VjU
```

**Novo Supabase (Destino):**
```
URL: https://bhyyxrllhmisxyobbgfn.supabase.co
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoeXl4cmxsaG1pc3h5b2JiZ2ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjUyNzYsImV4cCI6MjA5NTY0MTI3Nn0.M0adIJ5ot06i1Tr1nroR0YkEyh6skcpBGXB0HxkJyqo
```

### 🛠️ Implementação

Crie uma **função TypeScript** chamada `migratePatients()` que:

1. **Conecta ao Supabase antigo** usando as credenciais acima
2. **Extrai todos os dados** das tabelas listadas
3. **Conecta ao novo Supabase** usando as novas credenciais
4. **Insere os dados** mantendo os IDs originais (para não quebrar referências)
5. **Valida a migração** contando registros antes e depois
6. **Retorna um relatório** com:
   - Total de pacientes migrados
   - Total de planos migrados
   - Total de itens migrados
   - Erros (se houver)

### 📝 Requisitos

- ✅ Usar `@supabase/supabase-js` para conexão
- ✅ Manter integridade referencial (IDs iguais)
- ✅ Tratar erros graciosamente
- ✅ Adicionar logs detalhados
- ✅ Criar um botão "Migrar Dados" na interface (opcional, mas útil)
- ✅ Mostrar progresso da migração

### 🚀 Onde Colocar

Crie o arquivo em:
```
src/lib/migration/migratePatients.ts
```

E adicione um botão de teste em:
```
src/features/admin/MigrationPanel.tsx
```

### ⚠️ Importante

- **Não delete dados do Supabase antigo** — apenas copie
- **Teste com 1 paciente primeiro** antes de migrar todos
- **Faça backup** antes de executar
- **Valide os dados** após a migração

---

## 🎯 Resultado Esperado

Após executar a migração:
- ✅ Todos os pacientes aparecem no novo Supabase
- ✅ Todos os planos aparecem com os dados corretos
- ✅ Nenhum dado foi perdido
- ✅ Usuários conseguem fazer login e ver seus dados

---

**Pronto! Agora você consegue fazer login no novo Supabase e todos os pacientes estarão lá!**

