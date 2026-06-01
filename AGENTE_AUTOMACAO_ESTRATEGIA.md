# 🤖 Agente de Automação — FitJourney 2.0

## 🎯 Objetivo

Criar um agente inteligente que automatize tarefas repetitivas, valide dados, e mantenha a qualidade do código.

---

## 📊 AGENTES SUGERIDOS

### 1. **Agente de Validação de Determinismo** (CRÍTICO)
**Quando:** Toda vez que código clínico é modificado
**O que faz:**
- Valida que cálculos são determinísticos
- Executa testes de determinismo
- Bloqueia merge se falhar
- Gera relatório de auditoria

**Trigger:** `preToolUse` para modificações em `src/lib/clinical-engine.ts`

```json
{
  "name": "Validar Determinismo",
  "eventType": "preToolUse",
  "toolTypes": ".*clinical.*",
  "hookAction": "askAgent",
  "outputPrompt": "Validar que este código mantém determinismo total. Verificar: sem fallbacks, sem random, sem estado global, validação rigorosa."
}
```

---

### 2. **Agente de Validação de RLS** (CRÍTICO)
**Quando:** Toda vez que queries SQL são modificadas
**O que faz:**
- Valida que RLS policies estão corretas
- Verifica validação de user_id
- Bloqueia queries sem RLS
- Gera relatório de segurança

**Trigger:** `preToolUse` para modificações em SQL

```json
{
  "name": "Validar RLS",
  "eventType": "preToolUse",
  "toolTypes": ".*sql.*",
  "hookAction": "askAgent",
  "outputPrompt": "Validar que esta query respeita RLS. Verificar: validação de user_id, sem exceções de segurança, sem dados públicos sensíveis."
}
```

---

### 3. **Agente de Testes Automáticos** (IMPORTANTE)
**Quando:** Código é commitado
**O que faz:**
- Executa testes unitários
- Executa testes de integração
- Gera cobertura de testes
- Bloqueia merge se cobertura < 80%

**Trigger:** `postToolUse` para writes em `src/`

```json
{
  "name": "Executar Testes",
  "eventType": "postToolUse",
  "toolTypes": "write",
  "hookAction": "runCommand",
  "command": "npm run test:coverage"
}
```

---

### 4. **Agente de Linting e Formatação** (IMPORTANTE)
**Quando:** Arquivo TypeScript é salvo
**O que faz:**
- Executa ESLint
- Executa Prettier
- Corrige automaticamente
- Bloqueia merge se erros

**Trigger:** `fileEdited` para arquivos `.ts` e `.tsx`

```json
{
  "name": "Lint e Formata",
  "eventType": "fileEdited",
  "patterns": ["src/**/*.ts", "src/**/*.tsx"],
  "hookAction": "runCommand",
  "command": "npm run lint:fix && npm run format"
}
```

---

### 5. **Agente de Validação de Schema** (IMPORTANTE)
**Quando:** Migrations SQL são criadas
**O que faz:**
- Valida sintaxe SQL
- Verifica integridade referencial
- Valida RLS policies
- Testa em banco de teste

**Trigger:** `fileCreated` para migrations

```json
{
  "name": "Validar Schema",
  "eventType": "fileCreated",
  "patterns": ["supabase/migrations/*.sql"],
  "hookAction": "askAgent",
  "outputPrompt": "Validar esta migration: sintaxe SQL correta, integridade referencial, RLS policies, sem dados sensíveis."
}
```

---

### 6. **Agente de Auditoria de Commits** (IMPORTANTE)
**Quando:** Commit é feito
**O que faz:**
- Valida mensagem de commit
- Verifica que código foi testado
- Verifica que documentação foi atualizada
- Bloqueia commits ruins

**Trigger:** `promptSubmit` quando commit é feito

```json
{
  "name": "Auditar Commit",
  "eventType": "promptSubmit",
  "hookAction": "askAgent",
  "outputPrompt": "Validar commit: mensagem descritiva, código testado, documentação atualizada, sem secrets, sem arquivos temporários."
}
```

---

### 7. **Agente de Documentação Automática** (IMPORTANTE)
**Quando:** Código é commitado
**O que faz:**
- Gera documentação de APIs
- Atualiza README
- Gera changelog
- Valida documentação

**Trigger:** `postTaskExecution` após task completada

```json
{
  "name": "Gerar Documentação",
  "eventType": "postTaskExecution",
  "hookAction": "runCommand",
  "command": "npm run docs:generate && npm run docs:validate"
}
```

---

### 8. **Agente de Segurança** (CRÍTICO)
**Quando:** Código é commitado
**O que faz:**
- Verifica secrets no código
- Valida dependências
- Verifica vulnerabilidades
- Bloqueia commits com secrets

**Trigger:** `preToolUse` para writes

```json
{
  "name": "Verificar Segurança",
  "eventType": "preToolUse",
  "toolTypes": "write",
  "hookAction": "runCommand",
  "command": "npm run security:check"
}
```

---

### 9. **Agente de Performance** (IMPORTANTE)
**Quando:** Código clínico é modificado
**O que faz:**
- Executa testes de performance
- Valida que não há regressão
- Gera relatório de performance
- Bloqueia se performance piora

**Trigger:** `postToolUse` para modificações em `src/lib/clinical-engine.ts`

```json
{
  "name": "Validar Performance",
  "eventType": "postToolUse",
  "toolTypes": ".*clinical.*",
  "hookAction": "runCommand",
  "command": "npm run perf:test"
}
```

---

### 10. **Agente de Qualidade de Código** (IMPORTANTE)
**Quando:** PR é criada
**O que faz:**
- Analisa complexidade ciclomática
- Valida cobertura de testes
- Verifica duplicação de código
- Gera relatório de qualidade

**Trigger:** `promptSubmit` quando PR é criada

```json
{
  "name": "Qualidade de Código",
  "eventType": "promptSubmit",
  "hookAction": "runCommand",
  "command": "npm run quality:check"
}
```

---

## 🔄 FLUXO DE AUTOMAÇÃO COMPLETO

```
1. Desenvolvedor edita arquivo
   ↓
2. Agente de Linting valida
   ↓
3. Desenvolvedor faz commit
   ↓
4. Agente de Auditoria valida commit
   ↓
5. Agente de Segurança verifica secrets
   ↓
6. Agente de Testes executa testes
   ↓
7. Agente de Performance valida
   ↓
8. Agente de Qualidade analisa
   ↓
9. Agente de Documentação gera docs
   ↓
10. Merge automático se tudo passar
```

---

## 🛠️ IMPLEMENTAÇÃO

### Passo 1: Criar Hooks

```bash
# Criar hook de linting
kiro hook create \
  --name "Lint on Save" \
  --event "fileEdited" \
  --patterns "src/**/*.ts,src/**/*.tsx" \
  --action "runCommand" \
  --command "npm run lint:fix"

# Criar hook de testes
kiro hook create \
  --name "Test on Commit" \
  --event "promptSubmit" \
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

### Passo 2: Configurar Scripts

```json
{
  "scripts": {
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "format": "prettier --write src",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "test:determinism": "vitest --grep 'determinismo'",
    "test:rls": "vitest --grep 'RLS'",
    "perf:test": "vitest --grep 'performance'",
    "security:check": "npm audit && git-secrets --scan",
    "quality:check": "sonarqube-scanner",
    "docs:generate": "typedoc src",
    "docs:validate": "node scripts/validate-docs.js"
  }
}
```

### Passo 3: Criar Agentes Customizados

```typescript
// .kiro/agents/determinismo-validator.ts
export const determinismoValidator = {
  name: 'Determinismo Validator',
  description: 'Valida que código clínico é determinístico',
  
  async validate(code: string): Promise<ValidationResult> {
    // Verificar sem fallbacks
    if (code.includes('||') && code.includes('??')) {
      return { valid: false, reason: 'Fallback detectado' };
    }
    
    // Verificar sem random
    if (code.includes('Math.random') || code.includes('crypto.random')) {
      return { valid: false, reason: 'Random detectado' };
    }
    
    // Verificar validação rigorosa
    if (!code.includes('throw new') && code.includes('if')) {
      return { valid: false, reason: 'Sem validação rigorosa' };
    }
    
    return { valid: true };
  }
};
```

---

## 📊 BENEFÍCIOS

| Agente | Benefício |
|--------|-----------|
| Determinismo | Garante cálculos corretos |
| RLS | Garante segurança |
| Testes | Garante qualidade |
| Linting | Garante consistência |
| Schema | Garante integridade |
| Commits | Garante rastreabilidade |
| Documentação | Garante manutenibilidade |
| Segurança | Garante proteção |
| Performance | Garante velocidade |
| Qualidade | Garante excelência |

---

## 🚀 PRÓXIMOS PASSOS

1. **Criar** hooks de automação
2. **Configurar** scripts npm
3. **Implementar** agentes customizados
4. **Testar** fluxo completo
5. **Documentar** automação
6. **Monitorar** em produção

---

**O FitJourney 2.0 será automatizado, seguro e de alta qualidade!**
