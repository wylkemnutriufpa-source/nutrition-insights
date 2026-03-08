#!/usr/bin/env bash
# ============================================================
# P2 Security Audit Script — Nutrition Dashboard Backend
# Gerado em: 2026-03-08
# Uso: bash audit-p2.sh [caminho-do-repo]
# ============================================================

set -euo pipefail

REPO="${1:-.}"
REPORT="audit-p2-report-$(date +%Y%m%d-%H%M%S).txt"
PASS=0
WARN=0
FAIL=0

# --- helpers ---
header()  { printf '\n\e[1;36m══════ %s ══════\e[0m\n' "$1"; echo "" >> "$REPORT"; echo "══════ $1 ══════" >> "$REPORT"; }
ok()      { printf '  \e[32m✅ PASS\e[0m  %s\n' "$1"; echo "  ✅ PASS  $1" >> "$REPORT"; ((PASS++)); }
warn()    { printf '  \e[33m⚠️  WARN\e[0m  %s\n' "$1"; echo "  ⚠️  WARN  $1" >> "$REPORT"; ((WARN++)); }
fail()    { printf '  \e[31m❌ FAIL\e[0m  %s\n' "$1"; echo "  ❌ FAIL  $1" >> "$REPORT"; ((FAIL++)); }
detail()  { printf '         %s\n' "$1"; echo "         $1" >> "$REPORT"; }

cd "$REPO"
echo "P2 Security Audit — $(date)" > "$REPORT"
echo "Repo: $(pwd)" >> "$REPORT"

# ============================================================
header "1. API Key Exposure (P2-8)"
# ============================================================

# 1a. Hardcoded keys in Python files
KEYS_FOUND=$(grep -rn --include="*.py" -E '(sk-[a-zA-Z0-9]{20,}|sk-proj-|"sk-)' . 2>/dev/null || true)
if [ -n "$KEYS_FOUND" ]; then
  fail "API keys hardcoded em arquivos Python"
  echo "$KEYS_FOUND" | while IFS= read -r line; do detail "$line"; done
else
  ok "Nenhuma API key hardcoded encontrada em *.py"
fi

# 1b. OPENAI_API_KEY usage
KEY_USAGE=$(grep -rn --include="*.py" 'OPENAI_API_KEY' . 2>/dev/null || true)
if [ -n "$KEY_USAGE" ]; then
  # Check if loaded from env
  ENV_LOAD=$(echo "$KEY_USAGE" | grep -c 'os\.environ\|os\.getenv\|environ\.get' || true)
  TOTAL=$(echo "$KEY_USAGE" | wc -l | tr -d ' ')
  if [ "$ENV_LOAD" -eq "$TOTAL" ]; then
    ok "OPENAI_API_KEY carregada via variável de ambiente ($TOTAL ocorrências)"
  else
    warn "OPENAI_API_KEY encontrada — verificar se TODAS vêm de env var"
    echo "$KEY_USAGE" | while IFS= read -r line; do detail "$line"; done
  fi
else
  warn "OPENAI_API_KEY não encontrada — verificar nome da variável usada"
fi

# 1c. .gitignore check
if [ -f .gitignore ]; then
  if grep -qE '^\s*\.env\s*$|^\s*\.env\.\*' .gitignore; then
    ok ".env está no .gitignore"
  else
    fail ".env NÃO está no .gitignore"
  fi
else
  fail ".gitignore não existe"
fi

# 1d. .env committed
if [ -f .env ]; then
  fail "Arquivo .env existe no repositório (pode estar commitado)"
else
  ok "Nenhum .env no diretório do repositório"
fi

# ============================================================
header "2. IDOR Risk (P2-3)"
# ============================================================

IDOR_HITS=$(grep -rn --include="*.py" 'patient_id' routes/ 2>/dev/null || true)
if [ -n "$IDOR_HITS" ]; then
  TOTAL=$(echo "$IDOR_HITS" | wc -l | tr -d ' ')
  # Check for ownership verification
  OWNERSHIP=$(grep -rn --include="*.py" -A5 'patient_id' routes/ 2>/dev/null | grep -cE 'user_patient_id|ownership|access.denied|403|check_.*link' || true)
  if [ "$OWNERSHIP" -gt 0 ]; then
    warn "patient_id usado em $TOTAL linhas — ownership check encontrado ($OWNERSHIP ocorrências), mas revisar completude"
  else
    fail "patient_id usado em $TOTAL linhas em routes/ — NENHUM ownership check detectado"
  fi
  echo "$IDOR_HITS" | while IFS= read -r line; do detail "$line"; done
else
  ok "Nenhuma referência a patient_id em routes/ (ou diretório não existe)"
fi

# ============================================================
header "3. Authorization by Role (P2-2)"
# ============================================================

AUTH_DEPS=$(grep -rn --include="*.py" 'Depends(get_current_user)' routes/ 2>/dev/null || true)
if [ -n "$AUTH_DEPS" ]; then
  TOTAL=$(echo "$AUTH_DEPS" | wc -l | tr -d ' ')
  ROLE_CHECKS=$(grep -rn --include="*.py" -E 'require_role|user_type|user_role|allowed_roles|role.*check' routes/ 2>/dev/null | wc -l | tr -d ' ')
  if [ "$ROLE_CHECKS" -eq 0 ]; then
    fail "$TOTAL endpoints usam get_current_user — NENHUM role check detectado"
  elif [ "$ROLE_CHECKS" -lt "$TOTAL" ]; then
    warn "$TOTAL endpoints com auth, apenas $ROLE_CHECKS com role check — revisar gaps"
  else
    ok "Todos os $TOTAL endpoints autenticados parecem ter role check"
  fi
  echo "$AUTH_DEPS" | while IFS= read -r line; do detail "$line"; done
else
  warn "Nenhum Depends(get_current_user) encontrado em routes/ — verificar mecanismo de auth"
fi

# ============================================================
header "4. Input Validation — AI Endpoints (P2-1)"
# ============================================================

# 4a. Locate AI endpoints
AI_ENDPOINTS=$(grep -rn --include="*.py" -E '(analyze.meal|analyze.body|/analyze)' . 2>/dev/null || true)
if [ -n "$AI_ENDPOINTS" ]; then
  detail "Endpoints de IA encontrados:"
  echo "$AI_ENDPOINTS" | while IFS= read -r line; do detail "$line"; done
else
  warn "Nenhum endpoint /analyze encontrado — verificar nomes reais"
fi

# 4b. Check for Pydantic validation
SCHEMAS=$(grep -rn --include="*.py" -E '(Field\(|max_length|min_length|BaseModel)' . 2>/dev/null | grep -v '__pycache__' || true)
if [ -n "$SCHEMAS" ]; then
  HAS_MAX=$(echo "$SCHEMAS" | grep -c 'max_length' || true)
  if [ "$HAS_MAX" -gt 0 ]; then
    ok "Validação Pydantic com max_length encontrada ($HAS_MAX ocorrências)"
  else
    warn "BaseModel/Field encontrados, mas NENHUM max_length — inputs podem não ter limite"
  fi
else
  fail "Nenhuma validação Pydantic (Field/BaseModel) encontrada"
fi

# ============================================================
header "5. AI Call Timeout (P2-7)"
# ============================================================

HTTP_CALLS=$(grep -rn --include="*.py" -E '(httpx\.(AsyncClient|Client)|requests\.(post|get))' . 2>/dev/null | grep -v '__pycache__' || true)
if [ -n "$HTTP_CALLS" ]; then
  TOTAL=$(echo "$HTTP_CALLS" | wc -l | tr -d ' ')
  WITH_TIMEOUT=$(echo "$HTTP_CALLS" | grep -c 'timeout' || true)
  if [ "$WITH_TIMEOUT" -eq "$TOTAL" ]; then
    ok "Todas as $TOTAL chamadas HTTP têm timeout explícito"
  elif [ "$WITH_TIMEOUT" -gt 0 ]; then
    warn "$WITH_TIMEOUT de $TOTAL chamadas HTTP têm timeout — restante sem"
  else
    fail "$TOTAL chamadas HTTP encontradas — NENHUMA com timeout explícito"
  fi
  echo "$HTTP_CALLS" | while IFS= read -r line; do detail "$line"; done
else
  warn "Nenhuma chamada httpx/requests encontrada — verificar client HTTP usado"
fi

# ============================================================
header "6. Frontend XSS Risk (P2-4)"
# ============================================================

XSS_HITS=$(grep -rn --include="*.js" --include="*.jsx" --include="*.tsx" --include="*.ts" 'dangerouslySetInnerHTML' . 2>/dev/null | grep -v 'node_modules' || true)
if [ -n "$XSS_HITS" ]; then
  TOTAL=$(echo "$XSS_HITS" | wc -l | tr -d ' ')
  fail "dangerouslySetInnerHTML encontrado em $TOTAL locais"
  echo "$XSS_HITS" | while IFS= read -r line; do detail "$line"; done
else
  ok "Nenhum dangerouslySetInnerHTML encontrado"
fi

# ============================================================
header "7. Upload Validation (P2-5)"
# ============================================================

UPLOAD_HITS=$(grep -rn --include="*.py" -E '(UploadFile|upload|file.*upload|multipart)' routes/ 2>/dev/null || true)
if [ -n "$UPLOAD_HITS" ]; then
  SIZE_CHECK=$(echo "$UPLOAD_HITS" | grep -cE '(MAX_FILE_SIZE|content_length|file_size|max.*size)' || true)
  TYPE_CHECK=$(grep -rn --include="*.py" -E '(content_type|mime|magic|ALLOWED_TYPES)' routes/ 2>/dev/null | wc -l | tr -d ' ')
  if [ "$SIZE_CHECK" -eq 0 ] && [ "$TYPE_CHECK" -eq 0 ]; then
    fail "Endpoints de upload encontrados — SEM validação de tamanho ou tipo"
  elif [ "$SIZE_CHECK" -eq 0 ]; then
    warn "Upload encontrado com validação de tipo, mas SEM limite de tamanho"
  elif [ "$TYPE_CHECK" -eq 0 ]; then
    warn "Upload encontrado com limite de tamanho, mas SEM validação de tipo"
  else
    ok "Upload com validação de tamanho e tipo detectada"
  fi
  echo "$UPLOAD_HITS" | while IFS= read -r line; do detail "$line"; done
else
  ok "Nenhum endpoint de upload encontrado em routes/"
fi

# ============================================================
header "8. Sensitive Logging (P2-6)"
# ============================================================

LOG_HITS=$(grep -rn --include="*.py" -E '(logger\.(info|debug|warning)|print\()' . 2>/dev/null | grep -v '__pycache__' | grep -iE '(body|payload|password|token|secret|patient|meal|weight|height)' || true)
if [ -n "$LOG_HITS" ]; then
  TOTAL=$(echo "$LOG_HITS" | wc -l | tr -d ' ')
  warn "$TOTAL linhas de log potencialmente contêm dados sensíveis — revisar"
  echo "$LOG_HITS" | while IFS= read -r line; do detail "$line"; done
else
  ok "Nenhum log com dados potencialmente sensíveis detectado"
fi

# ============================================================
header "RESUMO"
# ============================================================

TOTAL=$((PASS + WARN + FAIL))
printf '\n  \e[32m✅ %d PASS\e[0m  |  \e[33m⚠️  %d WARN\e[0m  |  \e[31m❌ %d FAIL\e[0m  |  Total: %d checks\n\n' "$PASS" "$WARN" "$FAIL" "$TOTAL"

echo "" >> "$REPORT"
echo "RESUMO: ✅ $PASS PASS | ⚠️  $WARN WARN | ❌ $FAIL FAIL | Total: $TOTAL checks" >> "$REPORT"

printf 'Relatório salvo em: \e[1m%s\e[0m\n' "$REPORT"
echo ""

if [ "$FAIL" -gt 0 ]; then
  printf '\e[31m⚠️  %d falhas críticas detectadas — ação necessária.\e[0m\n' "$FAIL"
  exit 1
else
  printf '\e[32m✔ Nenhuma falha crítica. Revisar os warnings manualmente.\e[0m\n'
  exit 0
fi
