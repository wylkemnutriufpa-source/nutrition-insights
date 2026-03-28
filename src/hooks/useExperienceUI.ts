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

    // ── Text helpers ──
    /** Dashboard title by mode */
    dashboardTitle: isBasic ? "Meu Painel" : isPro ? "Dashboard Clínico" : "Centro de Comando Clínico",
    dashboardSubtitle: isBasic
      ? "Visão geral dos seus pacientes"
      : isPro
      ? "Inteligência clínica ao seu alcance"
      : "Controle total · Automação · Inteligência IFJ",
  }), [mode, minMode, isBasic, isPro, isAdvanced]);
}
