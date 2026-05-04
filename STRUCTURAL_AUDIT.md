# 🗺️ FitJourney Structural Flow Map (Audit)

## 1. Onboarding Flow
- **Initiation**: Professional creates patient or Patient registers via invite link.
- **Entry point**: `/cadastro` or `/invite-patient`.
- **Primary Data Source**: `profiles`, `onboarding_pipelines`.
- **State Transition**: `awaiting_consent` -> `onboarding_slides` -> `anamnesis` -> `collecting_profile`.
- **Dependencies**: `profiles.tenant_id`, `onboarding_pipelines.status`.

## 2. Plan Generation Flow (Engine)
- **Trigger**: Button "Gerar via Onboarding" in Editor V3 or Onboarding Pipeline Auto-gen.
- **Input**: `patient_anamnesis.answers`, `onboarding_pipelines` (weight/height).
- **Process**: Edge Function `generate-meal-plan` (Smart Engine).
- **Contract**: `EngineOutputSchema`.
- **Output**: `meal_plans` (draft) + `meal_plan_items`.
- **Divergence Point**: If anamnesis is incomplete, engine might return empty or inconsistent items.

## 3. Editor V3 (Elite) Flow
- **Entry point**: `/v3/:patientId`.
- **State Source**: `v3_drafts` (authoritative for editing).
- **Sync**: `useDraftSync` (Local Storage + DB).
- **Contract Enforcement**: Every change via `dispatch` is validated by `criticalContracts.ts`.
- **Promotion**: `promoteDraftToMealPlan` converts `v3_drafts` -> `meal_plans`.

## 4. Stability Rules (Anti-Bypass)
- **Rule 1**: Only 1 active plan per patient (Enforced by DB trigger).
- **Rule 2**: No status change without Clinical Validation.
- **Rule 3**: Any structural violation blocks UI rendering or saving.
- **Rule 4**: `patient_state` in `profiles` is the ONLY source for navigation.
