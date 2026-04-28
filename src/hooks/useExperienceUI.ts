import { useMemo } from "react";
import { useExperienceMode } from "./useExperienceMode";

/**
 * Semantic UI helpers derived from the current experience mode.
 * Use these to conditionally render UI elements by complexity level.
 */
export function useExperienceUI() {
  const { mode, minMode, isBasic, isPro, isAdvanced } = useExperienceMode();

  return useMemo(() => ({
    mode,
    isBasic,
    isPro,
    isAdvanced,
    minMode,

    // ── UI visibility helpers ──
    /** Show meal macros (calories, protein, carbs, fat) */
    showMacros: minMode("pro"),
    /** Show full plan structure and adjustments */
    showPlanStructure: minMode("pro"),
    /** Show advanced technical details (engine version, metadata, full logs) */
    showTechnicalDetails: minMode("advanced"),

    /** Show clinical intelligence panels (alerts, insights, AI briefing) */
    showClinicalIntelligence: minMode("pro"),
    /** Show advanced metrics, charts, dense analytics */
    showAdvancedMetrics: minMode("advanced"),
    /** Show automation controls (rules, pipelines, auto-actions) */
    showAutomation: minMode("advanced"),
    /** Show IFJ engine features (clinical decisions, flags, behavioral) */
    showIFJEngine: minMode("pro"),
    /** Show full IFJ engine (simulation, projections, orchestration) */
    showIFJFull: minMode("advanced"),
    /** Show simplified one-action CTAs instead of multi-option menus */
    showSimplifiedActions: isBasic,
    /** Show protocol management */
    showProtocols: minMode("pro"),
    /** Show branding, integrations, CRM */
    showBusinessTools: minMode("advanced"),
    /** Show risk panels, churn prediction */
    showRiskAnalysis: minMode("pro"),
    /** Show revenue simulators, financial analytics */
    showFinancialTools: minMode("advanced"),
    
    // New visibility helpers for basic mode simplification
    showTimeline: minMode("pro"),
    showExperienceToggle: minMode("pro"),
    showGuidedTour: minMode("pro"),

    // ── Text helpers ──
    /** Dashboard title by mode */
    dashboardTitle: isBasic ? "Meu Plano" : isPro ? "Dashboard Pro" : "Comando Avançado",
    dashboardSubtitle: isBasic
      ? "Sua alimentação de hoje"
      : isPro
      ? "Acompanhamento clínico e macros"
      : "Dados completos · Projeções · Performance",
  }), [mode, minMode, isBasic, isPro, isAdvanced]);
}
