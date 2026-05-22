---
name: "forensic-audit"
description: "Usar para auditar a integridade de snapshots, diagnosticar falhas de renderização clínica ou investigar discrepâncias entre App/PDF. Ativar modo forense para ver dados brutos."
---

&nbsp;

AUDITORIA FORENSE — FITJOURNEY

&nbsp;

OBJETIVO:
Garantir que o que está salvo no banco (Snapshot) é EXATAMENTE o que o paciente vê.

&nbsp;

PROCEDIMENTOS:
1. Usar ForensicSnapshotViewer para inspecionar o JSON bruto.
2. Validar campos críticos:
   - snapshot_version: "v3"
   - days[].meals[].items[].visual.image_url (Obrigatório)
   - days[].meals[].items[].macros.kcal (Obrigatório)
   - days[].meals[].items[].quantity_display (Obrigatório)
3. Detectar Fallbacks: Se o código usa "||" ou fallbacks para dados clínicos, é uma violação.
4. Detectar Heurísticas: Se o código usa regex ou inferência de strings, é uma violação.

&nbsp;

FRASES DE CONTROLE:
- "O frontend nunca pensa. O snapshot já nasce pensando."
- "Se abrir vazio, o snapshot está magro. Bloquear publicação."
