---
name: "sovereign-architecture"
description: "Usar quando modificar qualquer fluxo relacionado a meal plans, snapshots, templates, Patient App, PDF, renderização clínica ou pipeline alimentar. Aplicar arquitetura soberana imutável e impedir heurísticas, recalculadores frontend, hydration runtime ou inferência dinâmica."
---

&nbsp;

SOBERANIA ARQUITETURAL — FITJOURNEY

&nbsp;

O sistema FitJourney opera sob arquitetura soberana.

&nbsp;

REGRAS ABSOLUTAS:

&nbsp;

- Snapshot V3 é IMUTÁVEL (Mudanças estruturais exigem V4)

- Frontend é APENAS renderizador passivo

- ISOLAMENTO TEMPORAL: Proibido usar new Date().getDay() para decisão clínica. O dia exibido é ditado pelo protocolo/snapshot.

- VALIDADDOR SOBERANO: Nenhum plano é publicado sem validação total de "Snapshot Gordo" (Macros, Imagens, Quantidades).

- MODO FORENSE: Obrigatório manter ferramentas de inspeção de snapshot RAW para auditoria.

- Nenhuma lógica pode recalcular macros runtime

- Nenhuma lógica pode hidratar dados clínicos

- Nenhuma lógica pode inferir refeições

- Nenhuma lógica pode normalizar meal plans runtime


&nbsp;

PROIBIDO:

&nbsp;

- normalizeMealPlan

- reconcileMealPlanMacros runtime

- calculatePrimaryTotals

- hydration assíncrona

- heurísticas

- fallback inteligente

- inferência frontend

- resolver engines

- remapeamento manual de snapshot

&nbsp;

PATIENT APP:

&nbsp;

- READ ONLY

- SNAPSHOT → RENDER

- ZERO processamento adicional

&nbsp;

PDF:

&nbsp;

- Deve usar o MESMO snapshot do Patient App

- Proibido regex heurístico

- Proibido inferência de meal type

&nbsp;

EDITOR:

&nbsp;

- Toda validação acontece ANTES da publicação

- Snapshot publicado nasce completo

- display_quantity obrigatório

- macros obrigatórios

- substitutions obrigatórias

&nbsp;

VEREDITO:

&nbsp;

Se o frontend precisa “pensar”:

o backend falhou.