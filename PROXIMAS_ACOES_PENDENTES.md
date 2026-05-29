# Próximas Ações Pendentes (28 de Maio de 2026)

**Status:** 📋 PLANEJAMENTO  
**Prioridade:** 🔴 CRÍTICA

---

## 📋 Resumo de Pendências

Após corrigir os problemas de PDF e substituições, ainda existem **4 problemas críticos** reportados por Igor:

| # | Problema | Status | Prioridade | Estimativa |
|---|----------|--------|-----------|-----------|
| 1 | Redirect ao editar plano | ⏳ Pendente | 🔴 CRÍTICA | 30 min |
| 2 | Desagrupar 6 templates | ⏳ Pendente | 🔴 CRÍTICA | 45 min |
| 3 | Botão de sincronização semanal | ⏳ Pendente | 🟡 ALTA | 60 min |
| 4 | Ovo em unidades (não gramas) | ⏳ Pendente | 🟡 ALTA | 20 min |

---

## 🔴 Problema 1: Redirect ao Editar Plano (Context Loss)

### Sintoma
```
Quando estou mexendo na dieta de alguém, se a página atualizar, 
redireciona pro dashboard principal (ele já disse que corrigiu umas 4x e nada)
```

### Causa Provável
- Perda de contexto ao recarregar a página
- Falta de persistência de estado do editor
- Redirecionamento automático para dashboard

### Onde Corrigir
- `src/features/editor-v3/` — Componentes do editor
- `src/lib/auth.tsx` — Sincronização de sessão
- `src/pages/` — Rotas e redirecionamentos

### Plano de Ação
1. Identificar onde o redirecionamento está acontecendo
2. Implementar persistência de estado do editor
3. Restaurar contexto ao recarregar
4. Testar com múltiplas recargas

### Estimativa
⏱️ 30 minutos

---

## 🔴 Problema 2: Desagrupar 6 Templates

### Sintoma
```
6 templates têm refeições agrupadas ao invés de separadas:
- Café com leite com pão com ovo (tudo junto)
- Deveria ser: Café com leite | Pão | Ovo (cada um com sua gramagem)
```

### Causa Provável
- Templates foram criados com itens agrupados
- Falta de validação ao criar templates
- Estrutura de dados incorreta

### Onde Corrigir
- Banco de dados: `v3_diet_templates` → `plan_snapshot`
- SQL: Desagrupar itens em 6 templates específicos

### Plano de Ação
1. Executar `DIAGNOSTICO_TEMPLATES_ESTRUTURA.sql` para auditar
2. Executar `DESAGRUPAR_6_TEMPLATES_AUTOMATICO.sql` para criar backup
3. Executar `EXTRAIR_6_TEMPLATES_PARA_ANALISE.sql` para identificar
4. Executar UPDATE SQL para cada template (fornecido em `CORRIGIR_6_TEMPLATES_AGRUPADOS.md`)
5. Validar com `DIAGNOSTICO_TEMPLATES_ESTRUTURA.sql`

### Estimativa
⏱️ 45 minutos

### Arquivos Disponíveis
- `DIAGNOSTICO_TEMPLATES_ESTRUTURA.sql` — Auditoria
- `DESAGRUPAR_6_TEMPLATES_AUTOMATICO.sql` — Backup e desagrupamento
- `EXTRAIR_6_TEMPLATES_PARA_ANALISE.sql` — Extração de IDs
- `CORRIGIR_6_TEMPLATES_AGRUPADOS.md` — Guia passo-a-passo
- `EXECUTAR_DESAGRUPAMENTO_PASSO_A_PASSO.md` — Instruções detalhadas

---

## 🟡 Problema 3: Botão de Sincronização Semanal

### Sintoma
```
Não tem botão para sincronizar o plano para toda a semana
Quando ajusta um dia, não ajusta o restante dos dias
```

### Causa Provável
- Falta de implementação do botão
- Falta de lógica de sincronização semanal
- Falta de UI para o recurso

### Onde Corrigir
- `src/features/editor-v3/` — Componentes do editor
- `src/components/meal-plan/` — Componentes de plano
- `src/lib/` — Lógica de sincronização

### Plano de Ação
1. Criar botão "Sincronizar Semana" no editor
2. Implementar lógica de cópia de dia para semana
3. Adicionar confirmação de ação
4. Testar sincronização

### Estimativa
⏱️ 60 minutos

---

## 🟡 Problema 4: Ovo em Unidades (Não Gramas)

### Sintoma
```
Ovo está saindo 150gr de ovo (deveria ser em unidades)
Arroz 100gr está como 2 colheres (correto)
```

### Causa Provável
- Ovo não tem `display_unit` correto no snapshot
- Falta de mapeamento de unidades naturais para ovo
- Dados do template incorretos

### Onde Corrigir
- `v3_diet_templates` → `plan_snapshot` — Dados do template
- `src/lib/mealPlanFoodRules.ts` — Regras de unidades
- `supabase/functions/_shared/clinical-engine.ts` — Mapeamento

### Plano de Ação
1. Auditar templates para encontrar ovo com "gr"
2. Atualizar `display_unit` para "unidade"
3. Atualizar `display_quantity` para quantidade correta
4. Testar PDF

### Estimativa
⏱️ 20 minutos

---

## 📊 Priorização

### Fase 1 (Hoje) — Crítica
1. ✅ **PDF e Substituições** — COMPLETO
2. ⏳ **Redirect ao editar** — PRÓXIMO
3. ⏳ **Desagrupar templates** — PRÓXIMO

### Fase 2 (Amanhã) — Alta
4. ⏳ **Sincronização semanal** — PLANEJADO
5. ⏳ **Ovo em unidades** — PLANEJADO

---

## 🔧 Recursos Disponíveis

### Documentação
- `AUDITORIA_FORENSE_LOVABLE_DEGRADACAO.md` — O que Lovable quebrou
- `AUDITORIA_PROBLEMAS_PDF_SUBSTITUICOES.md` — Problemas de PDF
- `CORRECOES_PDF_SUBSTITUICOES_28_MAIO.md` — Correções implementadas
- `CORRIGIR_6_TEMPLATES_AGRUPADOS.md` — Guia de desagrupamento
- `EXECUTAR_DESAGRUPAMENTO_PASSO_A_PASSO.md` — Instruções SQL

### Scripts SQL
- `DIAGNOSTICO_TEMPLATES_ESTRUTURA.sql` — Auditoria
- `DESAGRUPAR_6_TEMPLATES_AUTOMATICO.sql` — Backup e desagrupamento
- `EXTRAIR_6_TEMPLATES_PARA_ANALISE.sql` — Extração de IDs

### Código
- `supabase/functions/_shared/clinical-engine.ts` — Motor determinístico
- `src/lib/pdfExportPremium.ts` — Renderização de PDF
- `src/features/editor-v3/` — Editor V3

---

## 🚀 Próximos Passos

### Imediato (Hoje)
1. ✅ Testar PDF com Igor
2. ⏳ Corrigir redirect ao editar plano
3. ⏳ Desagrupar 6 templates

### Curto Prazo (Amanhã)
4. ⏳ Implementar botão de sincronização semanal
5. ⏳ Corrigir ovo em unidades

### Médio Prazo (Esta Semana)
6. ⏳ Validar todos os templates
7. ⏳ Testar fluxo completo com Igor
8. ⏳ Documentar Sprint K

---

## 📝 Notas

- **Determinismo:** Manter princípio de determinismo em todas as correções
- **Anamnese:** Anamnese é a única fonte de verdade
- **Snapshots:** Snapshots são imutáveis após publicação
- **Erros:** Todos os erros devem ser explícitos
- **Passividade:** Patient App é 100% passivo

---

**Status:** 📋 PLANEJADO  
**Data:** 28 de Maio de 2026  
**Próxima Revisão:** Após teste com Igor

