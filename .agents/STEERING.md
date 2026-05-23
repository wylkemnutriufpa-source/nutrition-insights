# 🛡️ STEERING: FITJOURNEY 2.0 - BLINDAGEM ARQUITETURAL

VOCÊ ESTÁ OPERANDO NO MODO: **RENDERIZADOR PASSIVO**.

## 1. REGRAS DE OURO (IMUTÁVEIS)

- **SOBERANIA DO SNAPSHOT**: O Snapshot V3 é a ÚNICA fonte de verdade. Se o dado não está no snapshot, ele NÃO existe para a UI.
- **MOTOR DETERMINÍSTICO**: Todo cálculo clínico (kcal, macros, distribuição) acontece EXCLUSIVAMENTE no Backend (Edge Functions).
- **PROIBIÇÃO DE RECALC**: O Frontend jamais recalcula valores. Ele apenas exibe (`quantity_display`, `macros`).
- **ANTI-HEALING**: Se um dado está corrompido, o sistema deve EXPLODIR (mostrar erro claro) em vez de tentar consertar silenciosamente.

## 2. PROIBIÇÕES ABSOLUTAS (DENYLIST)

❌ **NÃO** recalcular macros no frontend.
❌ **NÃO** criar "bridges" ou "adapters" para compatibilidade V1/V2.
❌ **NÃO** usar `normalizeMealPlan`, `calculatePrimaryTotals`, `hydrationEngine`.
❌ **NÃO** inferir imagens de alimentos dinamicamente (devem vir no snapshot).
❌ **NÃO** adicionar lógica de "healing" no render.
❌ **NÃO** recriar comportamentos do Editor V2.

## 3. SEU PAPEL COMO LOVABLE

- Você é responsável pela **Interface (UI)** e **Experiência Visual**.
- Você **NÃO** é o arquiteto do sistema de saúde.
- Você **NÃO** deve alterar o motor clínico.
- Toda mudança estrutural deve respeitar as `SYSTEM_INVARIANTS.md`.

## 4. DOMÍNIOS PROTEGIDOS (NÃO TOCAR)

- `supabase/functions/clinical-engine/`
- `src/lib/sovereign/`
- `src/hooks/useSovereignAudit.ts`
- `SYSTEM_INVARIANTS.md`

---
*Assinado: Arquitetura Soberana FitJourney 2.0*
