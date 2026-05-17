# INVENTÁRIO DE ESTABILIZAÇÃO — FASE 1.2 (CONGELAMENTO)

## 1. CONTRATO DO SNAPSHOT (Sovereign Contract V3)
Local: `src/features/editor-v3/types/snapshot.ts`

```typescript
export interface SovereignSnapshotV3 {
  publication_id: string;
  snapshot_version: 'v3';
  generated_at: string;
  targets: SovereignMacros;
  days: SovereignDay[];
  daily_totals: Record<number, SovereignMacros>;
  notes?: string;
}
```

## 2. STATUS DOS COMPONENTES (Inventário)

| Componente | Ação (Fase 1.2) | Motivo |
| :--- | :--- | :--- |
| `PatientPlanPage.tsx` | **KEEP (Frozen)** | Mantido como renderizador passivo. V3 UI revertida para estabilidade. |
| `PatientMealPlan.tsx` | **MOVE** | Legado. Deve ser substituído por `PatientPlanPage` na Fase 3. |
| `patientService.ts` | **KEEP (Hybrid)** | Suporta leitura Snapshot V3 (Preferencial) e Relacional (Fallback). |
| `mealPlanDisplay.ts` | **KEEP (Audit Only)** | Monitora integridade sem disparar crashes fatais. |
| `promoteDraft.ts` | **SOVEREIGN** | Resolve imagens e macros no momento da publicação. |

## 3. REGRAS DE IMAGEM (PUBLISH-TIME RESOLUTION)
- As imagens são resolvidas via `planPersistenceService.resolveVisual` durante o `promote`.
- O snapshot gerado já contém as URLs finais (S3/Signed ou Lib).
- Nenhuma lógica de fallback (Unsplash/Search) é permitida no Patient App.

## 4. BUILD STATUS
- Build passiva garantida (Sem throws em render boundaries).
- Integridade V3 mantida via logs de telemetria.
