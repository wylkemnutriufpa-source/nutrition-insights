/**
 * FitJourney — Feature Flags System (BLOCO 7)
 * 
 * Controle de recursos sensíveis por flag.
 * Se uma feature nova der problema, pode ser desligada sem derrubar fluxos críticos.
 * 
 * Flags são carregadas do banco (tabela feature_flags) com fallback local.
 * Em caso de falha de rede, usa cache local → default seguro.
 */

import { supabase } from "@/integrations/supabase/client";
import { logWarn } from "@/lib/monitoring";

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string;
  /** Se true, falha silenciosamente ao invés de quebrar */
  gracefulDegradation: boolean;
}

/** Default flags — sempre disponíveis mesmo sem banco */
const DEFAULT_FLAGS: Record<string, FeatureFlag> = {
  whatsapp_integration: {
    key: "whatsapp_integration",
    enabled: true,
    description: "Integração WhatsApp via Z-API",
    gracefulDegradation: true,
  },
  premium_loaders: {
    key: "premium_loaders",
    enabled: true,
    description: "Loaders premium com animações",
    gracefulDegradation: true,
  },
  clinical_analytics: {
    key: "clinical_analytics",
    enabled: true,
    description: "Analytics clínico avançado",
    gracefulDegradation: true,
  },
  behavior_learning: {
    key: "behavior_learning",
    enabled: true,
    description: "Motor de aprendizado comportamental",
    gracefulDegradation: true,
  },
  metabolic_score: {
    key: "metabolic_score",
    enabled: true,
    description: "Score metabólico e classificação",
    gracefulDegradation: true,
  },
  clinical_automations: {
    key: "clinical_automations",
    enabled: true,
    description: "Automações clínicas (flags → tarefas → mensagens)",
    gracefulDegradation: true,
  },
  ai_meal_generator: {
    key: "ai_meal_generator",
    enabled: true,
    description: "Gerador de plano alimentar com IA",
    gracefulDegradation: true,
  },
  recipe_ai_generation: {
    key: "recipe_ai_generation",
    enabled: true,
    description: "Geração de receitas com IA",
    gracefulDegradation: true,
  },
  body_projection: {
    key: "body_projection",
    enabled: true,
    description: "Projeção corporal futura com digital twin",
    gracefulDegradation: true,
  },
  semi_autonomous_protocols: {
    key: "semi_autonomous_protocols",
    enabled: true,
    description: "Transições semi-autônomas de protocolo",
    gracefulDegradation: true,
  },
  llm_global_enabled: {
    key: "llm_global_enabled",
    enabled: false,
    description: "Controle master de IA LLM — somente admin pode ativar",
    gracefulDegradation: true,
  },
};
// ========== Runtime State ==========

const CACHE_KEY = "fj_feature_flags";
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
let memoryCache: Record<string, FeatureFlag> | null = null;

/** Load flags from DB with cache */
async function loadFlags(): Promise<Record<string, FeatureFlag>> {
  // Memory cache first
  if (memoryCache) return memoryCache;

  // SessionStorage cache
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.ts < CACHE_TTL) {
        memoryCache = parsed.flags;
        return memoryCache!;
      }
    }
  } catch { /* ignore */ }

  // Try DB
  try {
    const { data, error } = await supabase
      .from("feature_flags" as any)
      .select("key,enabled,description,graceful_degradation")
      .throwOnError();

    if (!error && data && Array.isArray(data)) {
      const flags: Record<string, FeatureFlag> = { ...DEFAULT_FLAGS };
      for (const row of data as any[]) {
        flags[row.key] = {
          key: row.key,
          enabled: row.enabled ?? true,
          description: row.description ?? "",
          gracefulDegradation: row.graceful_degradation ?? true,
        };
      }
      memoryCache = flags;
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ flags, ts: Date.now() }));
      } catch { /* quota exceeded */ }
      return flags;
    }
  } catch {
    logWarn("FeatureFlags", "Falha ao carregar flags do banco, usando defaults");
  }

  // Fallback to defaults
  memoryCache = { ...DEFAULT_FLAGS };
  return memoryCache;
}

/** Check if a feature is enabled — synchronous with fallback */
export function isFeatureEnabled(key: string): boolean {
  // Check memory cache first (sync)
  if (memoryCache && key in memoryCache) {
    return memoryCache[key].enabled;
  }
  // Check defaults
  if (key in DEFAULT_FLAGS) {
    return DEFAULT_FLAGS[key].enabled;
  }
  // Unknown flag → enabled by default (don't block new features)
  return true;
}

/** Async check with DB loading */
export async function checkFeature(key: string): Promise<boolean> {
  const flags = await loadFlags();
  return flags[key]?.enabled ?? true;
}

/** Get all flags (async) */
export async function getAllFlags(): Promise<FeatureFlag[]> {
  const flags = await loadFlags();
  return Object.values(flags);
}

/** Invalidate cache (after admin toggle) */
export function invalidateFeatureFlags() {
  memoryCache = null;
  try { sessionStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
}

/** Initialize flags on app boot (fire-and-forget) */
export function initFeatureFlags() {
  loadFlags().catch(() => {
    logWarn("FeatureFlags", "Inicialização falhou, usando defaults");
  });
}

// ========== React Hook ==========

import { useState, useEffect } from "react";

export function useFeatureFlag(key: string): { enabled: boolean; loading: boolean } {
  const [enabled, setEnabled] = useState(() => isFeatureEnabled(key));
  const [loading, setLoading] = useState(!memoryCache);

  useEffect(() => {
    let cancelled = false;
    checkFeature(key).then((result) => {
      if (!cancelled) {
        setEnabled(result);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [key]);

  return { enabled, loading };
}

/** Guard component — renders children only if feature is enabled */
export function FeatureGate({
  feature,
  children,
  fallback = null,
}: {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { enabled, loading } = useFeatureFlag(feature);
  if (loading) return null;
  return enabled ? <>{children}</> : <>{fallback}</>;
}
