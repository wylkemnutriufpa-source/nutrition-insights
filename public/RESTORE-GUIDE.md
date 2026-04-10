# Guia Oficial de Restore — FitJourney SQL Backup

> Última atualização: 2026-04-10

---

## Status do Backup

| Aspecto | Status |
|---------|--------|
| Validação estrutural (contagem de objetos, ordem de dependência) | ✅ Confirmado |
| Restore real executado em staging | ❌ Não executado (requer projeto Supabase separado) |
| Superusuário necessário | ❌ Não — dump usa ordem segura sem `session_replication_role` |

---

## O que o backup inclui

- ✅ Extensions e tipos (enums)
- ✅ Tabelas (DDL sem constraints na primeira passada)
- ✅ Funções e views
- ✅ Dados (INSERT com `ON CONFLICT DO NOTHING`)
- ✅ Constraints, indexes e triggers (pós-dados)
- ✅ RLS (`ENABLE ROW LEVEL SECURITY` + `CREATE POLICY`)
- ✅ Cron jobs (`cron.schedule()`)

## O que NÃO está incluído

- ❌ `auth.users` (gerenciado pelo Supabase Auth)
- ❌ Storage objects/buckets (gerenciados pelo Supabase Storage)
- ❌ Vault secrets
- ❌ Configurações de projeto (auth providers, SMTP, etc.)
- ❌ Edge Functions (versionadas no repositório Git)
- ❌ Realtime subscriptions

---

## Passo a Passo — Teste Real de Restore

### 1. Gerar o backup

1. Acesse o preview/produção autenticado como admin
2. Vá em **Configurações** → seção **Backup do Banco de Dados**
3. Clique em **Gerar Backup SQL**
4. Aguarde o download do arquivo `.sql`
5. Verifique o relatório de auditoria na tela (contagens de objetos)

### 2. Criar projeto Supabase limpo

```bash
# Via CLI (ou crie pelo dashboard em https://supabase.com/dashboard)
supabase projects create fitjourney-staging --org-id <seu-org-id> --region sa-east-1
```

### 3. Conectar ao banco staging

```bash
# Obtenha a connection string no dashboard do projeto staging
# Settings → Database → Connection string (URI)
export STAGING_DB_URL="postgresql://postgres.[ref]:[password]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"
```

### 4. Executar o restore

```bash
# Restaurar o dump completo
psql "$STAGING_DB_URL" -f fitjourney_backup_YYYY-MM-DD.sql 2>&1 | tee restore.log

# Verificar erros
grep -i "error" restore.log
```

### 5. Rodar queries de validação pós-restore

Execute cada query no staging e compare com as contagens de produção:

```sql
-- Tabelas
SELECT count(*) AS tables FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Funções
SELECT count(*) AS functions FROM information_schema.routines 
WHERE routine_schema = 'public';

-- Triggers
SELECT count(*) AS triggers FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- Indexes
SELECT count(*) AS indexes FROM pg_indexes WHERE schemaname = 'public';

-- Views
SELECT count(*) AS views FROM information_schema.views 
WHERE table_schema = 'public';

-- Constraints (FK + Unique + Check)
SELECT count(*) AS constraints FROM information_schema.table_constraints 
WHERE constraint_schema = 'public' AND constraint_type IN ('FOREIGN KEY', 'UNIQUE', 'CHECK');

-- Tabelas com RLS habilitado
SELECT count(*) AS rls_tables FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;

-- Policies
SELECT count(*) AS policies FROM pg_policies WHERE schemaname = 'public';

-- Cron jobs
SELECT count(*) AS cron_jobs FROM cron.job;

-- Total de linhas por tabela (top 20)
SELECT schemaname, relname, n_live_tup 
FROM pg_stat_user_tables 
WHERE schemaname = 'public' 
ORDER BY n_live_tup DESC LIMIT 20;
```

### 6. Checklist de comparação

| Objeto | Produção | Staging | Match? |
|--------|----------|---------|--------|
| Tabelas | 345 | ___ | |
| Funções | 203 | ___ | |
| Triggers | 126 | ___ | |
| Indexes | 832 | ___ | |
| Views | 3 | ___ | |
| Constraints | 488 | ___ | |
| RLS Tables | 345 | ___ | |
| Policies | 803 | ___ | |
| Cron Jobs | 18 | ___ | |

### 7. Teste funcional

1. Configure as variáveis de ambiente do frontend para apontar ao projeto staging
2. Crie um usuário de teste via Supabase Auth
3. Teste login, listagem de pacientes e criação de plano alimentar
4. Confirme que RLS está bloqueando acesso cross-tenant

---

## Troubleshooting

| Erro | Causa | Solução |
|------|-------|---------|
| `permission denied for schema cron` | pg_cron não habilitado no staging | Habilite em Database → Extensions |
| `relation already exists` | Restore executado duas vezes | Use projeto limpo ou `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` |
| `violates foreign key constraint` | Ordem incorreta (versão antiga do dump) | Atualize o backup — versão atual usa ordem segura |
| `role "authenticated" does not exist` | Supabase roles não existem fora do Supabase | Use apenas projetos Supabase para restore |

---

## Veredito

O backup é **estruturalmente completo** e projetado para ser restaurável em qualquer projeto Supabase limpo sem permissões de superusuário. A prova definitiva requer execução do passo a passo acima em um ambiente real.
