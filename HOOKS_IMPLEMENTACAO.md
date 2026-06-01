# 🎣 Hooks de Automação — Implementação Prática

## 🎯 Objetivo

Implementar hooks que automatizam validação, testes e segurança no FitJourney 2.0.

---

## 📋 HOOKS A CRIAR

### Hook 1: Validar Determinismo (CRÍTICO)

**Arquivo:** `.kiro/hooks/validate-determinismo.json`

```json
{
  "name": "Validar Determinismo",
  "version": "1.0.0",
  "description": "Valida que código clínico é determinístico antes de ser commitado",
  "when": {
    "type": "preToolUse",
    "toolTypes": ".*clinical.*"
  },
  "then": {
    "type": "askAgent",
    "prompt": "Validar que este código mantém determinismo total: sem fallbacks silenciosos, sem random, sem estado global, validação rigorosa de entrada, cálculos sempre iguais para mesma entrada."
  }
}
```

---

### Hook 2: Validar RLS (CRÍTICO)

**Arquivo:** `.kiro/hooks/validate-rls.json`

```json
{
  "name": "Validar RLS",
  "version": "1.0.0",
  "description": "Valida que queries SQL respeitam RLS policies",
  "when": {
    "type": "preToolUse",
    "toolTypes": ".*sql.*"
  },
  "then": {
    "type": "askAgent",
    "prompt": "Validar que esta query SQL respeita RLS: validação de user_id, sem exceções de segurança, sem dados públicos sensíveis, policies corretas."
  }
}
```

---

### Hook 3: Lint on Save (IMPORTANTE)

**Arquivo:** `.kiro/hooks/lint-on-save.json`

```json
{
  "name": "Lint on Save",
  "version": "1.0.0",
  "description": "Executa ESLint e Prettier quando arquivo TypeScript é salvo",
  "when": {
    "type": "fileEdited",
    "patterns": ["src/**/*.ts", "src/**/*.tsx"]
  },
  "then": {
    "type": "runCommand",
    "command": "npm run lint:fix && npm run format",
    "timeout": 30
  }
}
```

---

### Hook 4: Testes on Commit (IMPORTANTE)

**Arquivo:** `.kiro/hooks/test-on-commit.json`

```json
{
  "name": "Testes on Commit",
  "version": "1.0.0",
  "description": "Executa testes quando código é commitado",
  "when": {
    "type": "postToolUse",
    "toolTypes": "write"
  },
  "then": {
    "type": "runCommand",
    "command": "npm run test:coverage",
    "timeout": 60
  }
}
```

---

### Hook 5: Validar Schema (IMPORTANTE)

**Arquivo:** `.kiro/hooks/validate-schema.json`

```json
{
  "name": "Validar Schema",
  "version": "1.0.0",
  "description": "Valida migrations SQL quando são criadas",
  "when": {
    "type": "fileCreated",
    "patterns": ["supabase/migrations/*.sql"]
  },
  "then": {
    "type": "askAgent",
    "prompt": "Validar esta migration SQL: sintaxe correta, integridade referencial, RLS policies, sem dados sensíveis, sem breaking changes."
  }
}
```

---

### Hook 6: Segurança (CRÍTICO)

**Arquivo:** `.kiro/hooks/security-check.json`

```json
{
  "name": "Verificar Segurança",
  "version": "1.0.0",
  "description": "Verifica secrets e vulnerabilidades antes de commit",
  "when": {
    "type": "preToolUse",
    "toolTypes": "write"
  },
  "then": {
    "type": "runCommand",
    "command": "npm run security:check",
    "timeout": 30
  }
}
```

---

### Hook 7: Auditoria de Commit (IMPORTANTE)

**Arquivo:** `.kiro/hooks/audit-commit.json`

```json
{
  "name": "Auditoria de Commit",
  "version": "1.0.0",
  "description": "Valida qualidade do commit antes de fazer push",
  "when": {
    "type": "promptSubmit"
  },
  "then": {
    "type": "askAgent",
    "prompt": "Validar commit: mensagem descritiva em português, código testado, documentação atualizada, sem secrets, sem arquivos temporários, sem breaking changes."
  }
}
```

---

### Hook 8: Performance (IMPORTANTE)

**Arquivo:** `.kiro/hooks/validate-performance.json`

```json
{
  "name": "Validar Performance",
  "version": "1.0.0",
  "description": "Valida performance do código clínico",
  "when": {
    "type": "postToolUse",
    "toolTypes": ".*clinical.*"
  },
  "then": {
    "type": "runCommand",
    "command": "npm run perf:test",
    "timeout": 60
  }
}
```

---

### Hook 9: Documentação (IMPORTANTE)

**Arquivo:** `.kiro/hooks/generate-docs.json`

```json
{
  "name": "Gerar Documentação",
  "version": "1.0.0",
  "description": "Gera documentação automática após task completada",
  "when": {
    "type": "postTaskExecution"
  },
  "then": {
    "type": "runCommand",
    "command": "npm run docs:generate && npm run docs:validate",
    "timeout": 60
  }
}
```

---

### Hook 10: Qualidade de Código (IMPORTANTE)

**Arquivo:** `.kiro/hooks/quality-check.json`

```json
{
  "name": "Qualidade de Código",
  "version": "1.0.0",
  "description": "Valida qualidade de código antes de merge",
  "when": {
    "type": "promptSubmit"
  },
  "then": {
    "type": "runCommand",
    "command": "npm run quality:check",
    "timeout": 60
  }
}
```

---

## 🔧 SCRIPTS NPM

**Arquivo:** `package.json`

```json
{
  "scripts": {
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "format": "prettier --write src",
    "test": "vitest",
    "test:coverage": "vitest --coverage --run",
    "test:determinismo": "vitest --grep 'determinismo' --run",
    "test:rls": "vitest --grep 'RLS' --run",
    "perf:test": "vitest --grep 'performance' --run",
    "security:check": "npm audit --audit-level=moderate && git-secrets --scan",
    "quality:check": "eslint src --ext .ts,.tsx && prettier --check src",
    "docs:generate": "typedoc src --out docs",
    "docs:validate": "node scripts/validate-docs.js",
    "pre-commit": "npm run lint:fix && npm run test:coverage && npm run security:check"
  }
}
```

---

## 📁 ESTRUTURA DE DIRETÓRIOS

```
.kiro/
├── hooks/
│   ├── validate-determinismo.json
│   ├── validate-rls.json
│   ├── lint-on-save.json
│   ├── test-on-commit.json
│   ├── validate-schema.json
│   ├── security-check.json
│   ├── audit-commit.json
│   ├── validate-performance.json
│   ├── generate-docs.json
│   └── quality-check.json
├── agents/
│   ├── determinismo-validator.ts
│   ├── rls-validator.ts
│   ├── security-validator.ts
│   └── quality-validator.ts
└── scripts/
    ├── validate-docs.js
    ├── check-determinismo.js
    └── check-rls.js
```

---

## 🚀 COMO CRIAR OS HOOKS

### Opção 1: Via Kiro UI

```bash
# Abrir Kiro Hook UI
kiro hook ui

# Ou via command palette
Ctrl+Shift+P → "Open Kiro Hook UI"
```

### Opção 2: Via CLI

```bash
# Criar hook de linting
kiro hook create \
  --name "Lint on Save" \
  --event "fileEdited" \
  --patterns "src/**/*.ts,src/**/*.tsx" \
  --action "runCommand" \
  --command "npm run lint:fix && npm run format"

# Criar hook de testes
kiro hook create \
  --name "Test on Commit" \
  --event "postToolUse" \
  --toolTypes "write" \
  --action "runCommand" \
  --command "npm run test:coverage"

# Criar hook de segurança
kiro hook create \
  --name "Security Check" \
  --event "preToolUse" \
  --toolTypes "write" \
  --action "runCommand" \
  --command "npm run security:check"
```

### Opção 3: Criar Manualmente

1. Criar arquivo `.kiro/hooks/meu-hook.json`
2. Copiar JSON do hook
3. Salvar arquivo
4. Kiro carrega automaticamente

---

## 🧪 TESTAR HOOKS

```bash
# Testar hook de linting
npm run lint:fix

# Testar hook de testes
npm run test:coverage

# Testar hook de segurança
npm run security:check

# Testar hook de qualidade
npm run quality:check
```

---

## 📊 FLUXO DE EXECUÇÃO

```
1. Desenvolvedor edita arquivo.ts
   ↓
2. Hook "Lint on Save" executa
   ↓
3. ESLint + Prettier corrigem
   ↓
4. Desenvolvedor faz commit
   ↓
5. Hook "Test on Commit" executa
   ↓
6. Testes rodam (cobertura > 80%)
   ↓
7. Hook "Security Check" executa
   ↓
8. Verifica secrets e vulnerabilidades
   ↓
9. Se tudo passar → Commit aceito
   ↓
10. Se falhar → Commit bloqueado
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Criar diretório `.kiro/hooks/`
- [ ] Criar 10 hooks JSON
- [ ] Adicionar scripts npm
- [ ] Testar cada hook
- [ ] Documentar hooks
- [ ] Treinar time
- [ ] Monitorar em produção

---

## 📞 PRÓXIMOS PASSOS

1. **Criar** hooks JSON
2. **Adicionar** scripts npm
3. **Testar** fluxo completo
4. **Documentar** para o time
5. **Monitorar** execução

---

**Os hooks vão automatizar tudo e manter a qualidade alta!**
