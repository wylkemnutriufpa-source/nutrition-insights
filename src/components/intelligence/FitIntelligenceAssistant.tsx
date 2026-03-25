/**
 * FitJourney Intelligence Assistant
 * 
 * Floating neural orb for patient experience.
 * Shows contextual prompts (hydration, workout, weekend risk).
 * Handles quick-tap responses and adaptive frequency.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Brain, X, Droplets, Dumbbell, AlertTriangle, Sparkles, Check } from "lucide-react";
import {
  generateCurrentPrompt,
  getHydrationResponse,
  shouldShowPrompt,
  type IntelligencePrompt,
  type BehavioralContext,
} from "@/lib/fitIntelligenceEngine";
import FitIntelligenceWizard from "./FitIntelligenceWizard";

const EASE = [0.22, 1, 0.36, 1] as const;
const CHECK_INTERVAL = 5 * 60_000; // Check every 5 min

export default function FitIntelligenceAssistant() {
  const { user, profile, roles } = useAuth();
  const [prompt, setPrompt] = useState<IntelligencePrompt | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [responding, setResponding] = useState(false);
  const [responseText, setResponseText] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const isPatient = !roles?.includes("nutritionist") && !roles?.includes("admin");
  const isEnabled = (profile as any)?.fit_intelligence_enabled === true;
  const isOnboarded = (profile as any)?.fit_intelligence_onboarded === true;

  // Show wizard if enabled but not onboarded
  useEffect(() => {
    if (user && isPatient && isEnabled && !isOnboarded) {
      const timer = setTimeout(() => setShowWizard(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [user, isPatient, isEnabled, isOnboarded]);

  // Prompt engine
  const checkForPrompt = useCallback(async () => {
    if (!user || !isPatient || !isEnabled || !isOnboarded) return;

    try {
      // Get behavioral profile
      const { data: bp } = await supabase
        .from("behavioral_profile" as any)
        .select("*")
        .eq("patient_id", user.id)
        .maybeSingle();

      if (!bp) return;

      // Get frequency config
      const { data: freq } = await supabase
        .from("fit_intelligence_frequency" as any)
        .select("*")
        .eq("patient_id", user.id)
        .maybeSingle();

      // Check cooldown
      const f = freq as any;
      if (f && !shouldShowPrompt(
        f.last_prompt_at ? new Date(f.last_prompt_at) : null,
        f.cooldown_minutes || 120,
        f.ignored_count || 0,
        f.engaged_count || 0,
      )) return;

      // Get today's hydration
      const today = new Date().toISOString().split('T')[0];
      const { data: hydration } = await supabase
        .from("fit_intelligence_hydration" as any)
        .select("*")
        .eq("patient_id", user.id)
        .eq("date", today)
        .maybeSingle();

      // Get clinical flags
      const { data: flags } = await supabase
        .from("patient_clinical_flags" as any)
        .select("flag_key")
        .eq("patient_id", user.id)
        .eq("is_active", true);

      // Count recent failures
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
      const { data: recentHydration } = await supabase
        .from("fit_intelligence_hydration" as any)
        .select("consumed_cups, target_cups")
        .eq("patient_id", user.id)
        .gte("date", weekAgo);

      const failureCount = (recentHydration || []).filter(
        (h: any) => h.consumed_cups < h.target_cups * 0.5
      ).length;

      const now = new Date();
      const ctx: BehavioralContext = {
        firstName: profile?.full_name?.split(' ')[0] || 'você',
        waterTarget: (hydration as any)?.target_cups || (bp as any).water_cups_per_day * 1.5 || 8,
        waterConsumed: (hydration as any)?.consumed_cups || 0,
        motivationStyle: (bp as any).motivation_style || 'gentle',
        messageTone: (bp as any).message_tone || 'funny',
        weekendDietBreaks: (bp as any).weekend_diet_breaks || false,
        forgetsWater: (bp as any).forgets_water || false,
        workoutTime: (bp as any).workout_time || 'morning',
        workoutBlocker: (bp as any).workout_blocker || null,
        cravingHours: (bp as any).craving_hours || [],
        failureCount,
        isWeekend: [0, 6].includes(now.getDay()),
        currentHour: now.getHours(),
        clinicalFlags: (flags || []).map((f: any) => f.flag_key),
      };

      const newPrompt = generateCurrentPrompt(ctx);
      if (newPrompt) {
        setPrompt(newPrompt);
        setExpanded(true);
        setResponseText(null);

        // Update last prompt time
        await supabase.from("fit_intelligence_frequency" as any).upsert({
          patient_id: user.id,
          last_prompt_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any, { onConflict: "patient_id" });
      }
    } catch (e) {
      console.error("FitIntelligence check error:", e);
    }
  }, [user, isPatient, isEnabled, isOnboarded, profile]);

  // Start periodic checks
  useEffect(() => {
    if (!isEnabled || !isOnboarded || !isPatient) return;

    // Check after 10s on mount
    const initialTimer = setTimeout(checkForPrompt, 10_000);
    intervalRef.current = setInterval(checkForPrompt, CHECK_INTERVAL);

    return () => {
      clearTimeout(initialTimer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkForPrompt, isEnabled, isOnboarded, isPatient]);

  // Handle quick action (e.g., hydration tap)
  const handleQuickAction = async (value: string) => {
    if (!user || !prompt) return;
    setResponding(true);

    try {
      const cups = parseInt(value);
      const today = new Date().toISOString().split('T')[0];

      if (prompt.type === 'hydration_check') {
        // Update hydration
        const { data: existing } = await supabase
          .from("fit_intelligence_hydration" as any)
          .select("*")
          .eq("patient_id", user.id)
          .eq("date", today)
          .maybeSingle();

        const ex = existing as any;
        const newConsumed = (ex?.consumed_cups || 0) + cups;
        const target = ex?.target_cups || 8;

        await supabase.from("fit_intelligence_hydration" as any).upsert({
          patient_id: user.id,
          date: today,
          target_cups: target,
          consumed_cups: newConsumed,
          last_updated_at: new Date().toISOString(),
        } as any, { onConflict: "patient_id,date" });

        setResponseText(getHydrationResponse(newConsumed, target, profile?.full_name?.split(' ')[0] || 'você'));
      }

      // Log interaction
      await supabase.from("fit_intelligence_interactions" as any).insert({
        patient_id: user.id,
        interaction_type: prompt.type,
        prompt_text: prompt.body,
        response_value: value,
        was_dismissed: false,
      } as any);

      // Update engaged count
      await supabase.rpc("increment_field" as any, {
        table_name: "fit_intelligence_frequency",
        field_name: "engaged_count",
        row_id: user.id,
      }).catch(() => {
        // Fallback: direct update
        supabase.from("fit_intelligence_frequency" as any)
          .update({ engaged_count: (1) } as any) // Will be incremented server-side ideally
          .eq("patient_id", user.id);
      });

      // Auto-dismiss after showing response
      setTimeout(() => {
        setExpanded(false);
        setPrompt(null);
        setResponseText(null);
      }, 3000);
    } catch (e) {
      toast.error("Erro ao registrar");
    }
    setResponding(false);
  };

  // Dismiss prompt
  const handleDismiss = async () => {
    if (user && prompt) {
      await supabase.from("fit_intelligence_interactions" as any).insert({
        patient_id: user.id,
        interaction_type: prompt.type,
        prompt_text: prompt.body,
        was_dismissed: true,
      } as any);
    }
    setExpanded(false);
    setTimeout(() => setPrompt(null), 400);
  };

  // Don't render for non-patients or disabled
  if (!isPatient || !user) return null;

  // Show wizard
  if (showWizard) {
    return (
      <FitIntelligenceWizard
        open={showWizard}
        onClose={() => setShowWizard(false)}
        patientId={user.id}
        patientName={profile?.full_name || ''}
      />
    );
  }

  if (!isEnabled || !prompt) return null;

  const iconMap: Record<string, any> = {
    hydration_check: Droplets,
    workout_reminder: Dumbbell,
    weekend_risk: AlertTriangle,
    motivation_nudge: Sparkles,
    emotional_response: Brain,
  };
  const PromptIcon = iconMap[prompt.type] || Brain;

  return (
    <AnimatePresence>
      {/* Floating Orb */}
      {!expanded && prompt && (
        <motion.button
          key="orb"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          onClick={() => setExpanded(true)}
          className="fixed bottom-24 right-4 z-[9990] w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-primary/20"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary)), hsl(152 60% 30%))",
          }}
        >
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Brain className="w-6 h-6 text-primary-foreground" />
          </motion.div>
          {/* Pulse ring */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-primary/40"
            animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
          />
        </motion.button>
      )}

      {/* Expanded Card */}
      {expanded && prompt && (
        <motion.div
          key="card"
          initial={{ opacity: 0, y: 100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.95 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="fixed bottom-20 right-4 left-4 sm:left-auto sm:w-[360px] z-[9990] rounded-2xl border border-primary/20 overflow-hidden shadow-2xl shadow-primary/10"
          style={{
            background: "linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <PromptIcon className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold">{prompt.title}</p>
                <Badge variant="outline" className="text-[9px] py-0 border-primary/20 text-primary">
                  Inteligência FitJourney
                </Badge>
              </div>
            </div>
            <button onClick={handleDismiss} className="p-1 rounded-lg hover:bg-muted transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Body */}
          <div className="px-4 pb-3">
            {responseText ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 py-3"
              >
                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 text-green-500" />
                </div>
                <p className="text-sm text-foreground/90">{responseText}</p>
              </motion.div>
            ) : (
              <p className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed py-1">
                {prompt.body}
              </p>
            )}
          </div>

          {/* Quick Actions */}
          {!responseText && prompt.quickActions && (
            <div className="px-4 pb-4">
              <div className="flex gap-2">
                {prompt.quickActions.map(action => (
                  <Button
                    key={action.value}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAction(action.value)}
                    disabled={responding}
                    className="flex-1 border-primary/20 hover:bg-primary/10 hover:border-primary/40 text-sm font-medium"
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Gradient bottom accent */}
          <div className="h-0.5 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
