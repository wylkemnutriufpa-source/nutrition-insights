# Technical Design — Plan Generation Cockpit

## Architecture

```
PatientDetail.tsx
  └── [Button "Gerar Plano"] → opens PlanGenerationCockpit modal
        ├── Option 1 (Automático): 
        │     → supabase.rpc("classify_and_assign_sovereign_template")
        │     → returns plan_id
        │     → navigate("/editor-v3/{patientId}/{planId}")
        │
        ├── Option 2 (Manual com Template):
        │     → Opens PremiumGallery (reuse existing component)
        │     → User selects template
        │     → navigate("/editor-v3/{patientId}?templateId={id}&kcal={target}")
        │
        └── Option 3 (Manual do Zero):
              → navigate("/editor-v3/{patientId}?mode=scratch")
```

## Components

### New: `src/components/patient/PlanGenerationCockpit.tsx`
- Modal with 3 cards (Automático, Template, Do Zero)
- Props: `patientId`, `hasAnamnesis`, `onClose`, `open`
- Fetches patient anamnesis status on mount
- Calls RPC for Option 1
- Opens PremiumGallery inline for Option 2
- Navigates for all options

### Modified: `src/pages/PatientDetail.tsx`
- Add "Gerar Plano" button in the header/actions area
- Import and render PlanGenerationCockpit modal

### Modified: `src/features/editor-v3/components/EditorV3Page.tsx`
- Read `searchParams.get("templateId")` → auto-apply template on mount
- Read `searchParams.get("kcal")` → set target kcal
- Read `searchParams.get("mode")` → if "scratch", start empty

## Data Flow

1. **Automatic**: RPC creates `meal_plans` row with snapshot → Editor loads it via planId
2. **Template**: Editor reads templateId from URL → calls `handleSelectProfile` with that template
3. **Scratch**: Editor starts empty, targets come from `calculate_clinical_kcal_target` RPC called on mount
