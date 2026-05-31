# 📋 Checklist Operacional — FitJourney 1.0 vs 2.0

## 🎯 Objetivo

Documentar tudo que funcionava no 1.0, o que NÃO deve ser feito no 2.0, e como blindar o core para máxima estabilidade.

---

## 📊 FUNCIONALIDADES DO 1.0 QUE FUNCIONAVAM

### ✅ Autenticação e Usuários
- [x] Login com email/senha
- [x] Registro de novos usuários
- [x] Recuperação de senha
- [x] Perfil de usuário
- [x] Logout

### ✅ Pacientes
- [x] Criar paciente
- [x] Editar dados do paciente
- [x] Listar pacientes
- [x] Deletar paciente
- [x] Anamnese (questionário inicial)

### ✅ Planos de Refeição
- [x] Criar plano a partir de template
- [x] Editar plano (quantidades, substituições)
- [x] Visualizar plano por dia
- [x] Exportar PDF
- [x] Duplicar plano

### ✅ Alimentos e Substituições
- [x] Banco de alimentos com macros
- [x] Substituições de alimentos
- [x] Buscar alimentos
- [x] Filtrar por categoria

### ✅ Templates
- [x] Templates pré-configurados
- [x] Templates por caloria (1200, 1500, 1800, 2000, 2500)
- [x] Templates por objetivo (emagrecimento, ganho, manutenção)
- [x] Visualizar template antes de usar

### ✅ Relatórios
- [x] Exportar PDF com plano
- [x] Exportar com macros
- [x] Exportar com imagens dos alimentos

---

## 🔴 PROBLEMAS DO 1.0 QUE NÃO DEVEM REPETIR NO 2.0

### 1. **Falta de Determinismo no Motor Clínico**
**Problema:** O motor de cálculo de macros era fuzzy, com fallbacks silenciosos.
```
❌ ERRADO (1.0):
- Se não encontrava alimento exato, usava "similar"
- Se não tinha macro, usava valor padrão
- Resultados inconsistentes entre execuções
```

**Solução 2.0:**
```
✅ CORRETO (2.0):
- Determinismo total: mesma entrada = mesma saída
- Sem fallbacks silenciosos
- Erro explícito se dados faltam
- Auditoria de cada cálculo
```

### 2. **RLS Policies Quebradas**
**Problema:** Usuários conseguiam ver dados de outros usuários.
```
❌ ERRADO (1.0):
- RLS policies mal configuradas
- Anon key conseguia ler tudo
- Sem validação de ownership
```

**Solução 2.0:**
```
✅ CORRETO (2.0):
- RLS policies rigorosas
- Validação de user_id em TODAS as queries
- Sem exceções
- Testes de segurança automatizados
```

### 3. **Snapshots Mutáveis**
**Problema:** Planos publicados eram recalculados quando alimentos mudavam.
```
❌ ERRADO (1.0):
- plan_snapshot era referência, não cópia
- Se alimento era deletado, plano quebrava
- Histórico perdido
```

**Solução 2.0:**
```
✅ CORRETO (2.0):
- plan_snapshot é JSONB imutável
- Cópia completa dos dados no momento da criação
- Histórico preservado
- Sem dependências externas
```

### 4. **Anamnese com Fallbacks**
**Problema:** Se anamnese faltava, usava valores padrão silenciosamente.
```
❌ ERRADO (1.0):
- Anamnese opcional
- Fallback para perfil padrão
- Resultados imprecisos
```

**Solução 2.0:**
```
✅ CORRETO (2.0):
- Anamnese OBRIGATÓRIA
- Sem fallbacks
- Erro explícito se falta
- Validação rigorosa
```

### 5. **Edição Sem Auditoria**
**Problema:** Não havia registro de quem mudou o quê e quando.
```
❌ ERRADO (1.0):
- Sem logs de edição
- Sem versionamento
- Sem rastreabilidade
```

**Solução 2.0:**
```
✅ CORRETO (2.0):
- Auditoria completa
- Versionamento de planos
- Rastreabilidade total
- Rollback possível
```

### 6. **Substituições Sem Validação**
**Problema:** Podia substituir alimento por qualquer outro, sem validação.
```
❌ ERRADO (1.0):
- Sem validação de compatibilidade
- Substituições inválidas aceitas
- Macros desbalanceadas
```

**Solução 2.0:**
```
✅ CORRETO (2.0):
- Validação de compatibilidade
- Macros devem estar próximas
- Rejeição explícita de substituições inválidas
- Regras clínicas respeitadas
```

### 7. **Falta de Validação de Entrada**
**Problema:** Dados inválidos eram aceitos silenciosamente.
```
❌ ERRADO (1.0):
- Sem validação de tipos
- Sem validação de ranges
- Sem validação de formatos
```

**Solução 2.0:**
```
✅ CORRETO (2.0):
- Validação rigorosa em TODAS as entradas
- Tipos TypeScript strict
- Ranges validados
- Formatos verificados
```

---

## 🛡️ BLINDAGEM DO CORE — CHECKLIST 2.0

### 1. **Determinismo Total**
- [ ] Todos os cálculos são determinísticos
- [ ] Mesma entrada = mesma saída SEMPRE
- [ ] Sem random, sem fuzzy matching
- [ ] Sem fallbacks silenciosos
- [ ] Testes de determinismo automatizados

### 2. **RLS Policies Rigorosas**
- [ ] Todas as tabelas têm RLS ativada
- [ ] Todas as policies validam user_id
- [ ] Sem exceções de segurança
- [ ] Testes de RLS automatizados
- [ ] Auditoria de acesso

### 3. **Snapshots Imutáveis**
- [ ] plan_snapshot é JSONB completo
- [ ] Cópia de dados no momento da criação
- [ ] Sem referências externas
- [ ] Histórico preservado
- [ ] Rollback possível

### 4. **Anamnese Obrigatória**
- [ ] Anamnese é REQUIRED
- [ ] Sem fallbacks
- [ ] Validação rigorosa
- [ ] Erro explícito se falta
- [ ] Testes de validação

### 5. **Auditoria Completa**
- [ ] Logs de todas as mudanças
- [ ] Versionamento de planos
- [ ] Rastreabilidade total
- [ ] Timestamps em UTC
- [ ] User ID em cada operação

### 6. **Validação de Substituições**
- [ ] Validação de compatibilidade
- [ ] Macros devem estar próximas (±10%)
- [ ] Rejeição explícita de inválidas
- [ ] Regras clínicas respeitadas
- [ ] Testes de validação

### 7. **Validação de Entrada**
- [ ] TypeScript strict mode
- [ ] Validação de tipos
- [ ] Validação de ranges
- [ ] Validação de formatos
- [ ] Testes de validação

### 8. **Tratamento de Erros**
- [ ] Sem erros silenciosos
- [ ] Mensagens de erro claras
- [ ] Stack traces em dev
- [ ] Logging estruturado
- [ ] Alertas para erros críticos

### 9. **Performance**
- [ ] Índices em todas as foreign keys
- [ ] Índices em campos de busca
- [ ] Queries otimizadas
- [ ] Sem N+1 queries
- [ ] Testes de performance

### 10. **Testes Automatizados**
- [ ] Testes unitários do motor clínico
- [ ] Testes de integração
- [ ] Testes de RLS
- [ ] Testes de determinismo
- [ ] Testes de performance
- [ ] Cobertura > 80%

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO 2.0

### Fase 1: Core Clínico (CRÍTICO)
- [ ] Motor de cálculo determinístico
- [ ] Validação de macros
- [ ] Validação de substituições
- [ ] Testes de determinismo
- [ ] Documentação de regras clínicas

### Fase 2: Segurança (CRÍTICO)
- [ ] RLS policies rigorosas
- [ ] Validação de entrada
- [ ] Auditoria de acesso
- [ ] Testes de RLS
- [ ] Documentação de segurança

### Fase 3: Dados (CRÍTICO)
- [ ] Snapshots imutáveis
- [ ] Versionamento de planos
- [ ] Auditoria completa
- [ ] Rollback possível
- [ ] Testes de integridade

### Fase 4: Observabilidade (IMPORTANTE)
- [ ] Logging estruturado
- [ ] Alertas para erros
- [ ] Métricas de performance
- [ ] Dashboards
- [ ] Documentação de troubleshooting

### Fase 5: Testes (IMPORTANTE)
- [ ] Testes unitários
- [ ] Testes de integração
- [ ] Testes de RLS
- [ ] Testes de performance
- [ ] CI/CD pipeline

### Fase 6: Documentação (IMPORTANTE)
- [ ] Arquitetura
- [ ] Regras clínicas
- [ ] Políticas de segurança
- [ ] Guia de troubleshooting
- [ ] Runbooks

---

## 🚨 RED FLAGS — O QUE NÃO FAZER

### ❌ NÃO FAÇA ISSO
1. **Fallbacks silenciosos** — Sempre erro explícito
2. **Fuzzy matching** — Sempre match exato
3. **Valores padrão** — Sempre erro se falta
4. **RLS policies fracas** — Sempre rigoroso
5. **Snapshots mutáveis** — Sempre imutável
6. **Sem auditoria** — Sempre log tudo
7. **Sem validação** — Sempre valide entrada
8. **Sem testes** — Sempre teste tudo
9. **Sem documentação** — Sempre documente
10. **Sem monitoramento** — Sempre monitore

---

## ✅ PRINCÍPIOS DO 2.0

### 1. **Determinismo**
Mesma entrada = mesma saída SEMPRE. Sem exceções.

### 2. **Explicitação**
Erros explícitos, nunca silenciosos. Falhe rápido, falhe claro.

### 3. **Imutabilidade**
Dados publicados são imutáveis. Histórico preservado.

### 4. **Auditoria**
Tudo é registrado. Rastreabilidade total.

### 5. **Validação**
Valide TUDO. Entrada, saída, estado.

### 6. **Segurança**
RLS rigorosa. Sem exceções.

### 7. **Observabilidade**
Logs estruturados. Métricas. Alertas.

### 8. **Testabilidade**
Tudo é testável. Cobertura > 80%.

---

## 📞 PRÓXIMOS PASSOS

1. **Revisar** este checklist com o time
2. **Priorizar** as fases de implementação
3. **Criar** issues no GitHub para cada item
4. **Implementar** fase por fase
5. **Testar** rigorosamente
6. **Documentar** tudo
7. **Monitorar** em produção

---

**O 2.0 será muito mais estável que o 1.0. Vamos fazer certo desta vez!**
