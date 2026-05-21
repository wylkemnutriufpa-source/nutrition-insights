#!/bin/bash

# 🛡️ Script para aplicar Defense in Depth ao banco de dados
# Este script aplica a migração de constraints e auditoria

set -e

echo "🛡️  Aplicando Defense in Depth ao banco de dados..."
echo ""

# Verificar se Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI não encontrado. Instale com: npm install -g supabase"
    exit 1
fi

# Verificar se estamos em um projeto Supabase
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Arquivo supabase/config.toml não encontrado"
    exit 1
fi

echo "✅ Supabase CLI encontrado"
echo ""

# Listar migrações pendentes
echo "📋 Migrações pendentes:"
supabase migration list --linked || true
echo ""

# Aplicar migrações
echo "🚀 Aplicando migrações..."
supabase db push

echo ""
echo "✅ Migrações aplicadas com sucesso!"
echo ""

# Executar health check
echo "🏥 Executando health check..."
supabase sql --file supabase/migrations/20260520_defense_in_depth_constraints.sql --linked || true

echo ""
echo "✅ Defense in Depth aplicado com sucesso!"
echo ""
echo "📊 Próximos passos:"
echo "1. Verificar audit_log: SELECT * FROM audit_log_view LIMIT 10;"
echo "2. Executar health check: SELECT * FROM health_check();"
echo "3. Verificar integridade: SELECT * FROM check_data_integrity();"
echo "4. Limpar dados órfãos: SELECT * FROM cleanup_orphaned_data();"
