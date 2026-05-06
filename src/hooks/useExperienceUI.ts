import { useMemo } from "react";
import { useExperienceMode } from "./useExperienceMode";

/**
 * Semantic UI helpers derived from the current experience mode.
 * Use these to conditionally render UI elements by complexity level.
 */
export function useExperienceUI() {
  const { mode, minMode, isBasic, isPro, isAdvanced, isFeatureEnabled } = useExperienceMode();

  return useMemo(() => ({
    mode,
    isBasic,
    isPro,
    isAdvanced,
    minMode,

    // ── UI visibility helpers ──
    /** Show meal macros (calories, protein, carbs, fat) */
    showMacros: true, 
    /** Show full plan structure and adjustments */
    showPlanStructure: isFeatureEnabled("diet-builder"),
    /** Show advanced technical details (engine version, metadata, full logs) */
    showTechnicalDetails: isAdvanced,

    /** Show clinical intelligence panels (alerts, insights, AI briefing) */
    showClinicalIntelligence: isFeatureEnabled("analytics"),
    /** Show advanced metrics, charts, dense analytics */
    showAdvancedMetrics: isAdvanced,
    /** Show automation controls (rules, pipelines, auto-actions) */
    showAutomation: isFeatureEnabled("automation"),
    /** Show IFJ engine features (clinical decisions, flags, behavioral) */
    showIFJEngine: isFeatureEnabled("clinical-intelligence"),
    /** Show full IFJ engine (simulation, projections, orchestration) */
    showIFJFull: isAdvanced,
    /** Show simplified one-action CTAs instead of multi-option menus */
    showSimplifiedActions: isBasic,
    /** Show protocol management */
    showProtocols: isFeatureEnabled("protocols"),
    /** Show branding, integrations, CRM */
    showBusinessTools: isAdvanced,
    /** Show risk panels, churn prediction */
    showRiskAnalysis: isFeatureEnabled("clinical-risk"),
    /** Show revenue simulators, financial analytics */
    showFinancialTools: isFeatureEnabled("financial"),
    
    // New visibility helpers for basic mode simplification
    showTimeline: isFeatureEnabled("journey"),
    showExperienceToggle: minMode("pro"),
    showGuidedTour: minMode("pro"),
    showDetailedAdherence: minMode("pro"),

    // ── Text helpers ──
    dashboardTitle: isBasic ? "Minha Dieta" : isPro ? "Dashboard Pro" : "Comando Avançado",
    dashboardSubtitle: isBasic
      ? "Sua alimentação de hoje"
      : isPro
      ? "Acompanhamento clínico e macros"
      : "Dados completos · Projeções · Performance",
  }), [mode, minMode, isBasic, isPro, isAdvanced, isFeatureEnabled]);
}
