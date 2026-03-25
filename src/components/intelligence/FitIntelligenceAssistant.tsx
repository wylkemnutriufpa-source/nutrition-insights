/**
 * FitJourney Intelligence Assistant
 * 
 * Floating neural orb for patient experience.
 * Uses context builder + prompt engine for adaptive prompts.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Brain } from "lucide-react";
import {
  generateCurrentPrompt,
  getHydrationResponse,
  shouldShowPrompt,
  isSnoozed,
  type IntelligencePrompt,
  type BehavioralContext,
} from "@/lib/fitIntelligenceEngine";
import { buildIntelligenceContext } from "@/lib/fitIntelligenceContext";
import FitIntelligenceWizard from "./FitIntelligenceWizard";
import FitIntelligencePromptCard from "./FitIntelligencePromptCard";

const CHECK_INTERVAL = 5 * 60_000; // 5 min

export default function FitIntelligenceAssistant() {
  const { user, profile, roles } = useAuth();
  const [prompt, setPrompt] = useState<IntelligencePrompt | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardJustCompleted, setWizardJustCompleted] = useState(false);
  const [responding, setResponding] = useState(false);
  const [responseText, setResponseText] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const checkingRef = useRef(false);

  const isPatient = !roles?.includes("nutritionist") && !roles?.includes("admin");
  const isEnabled = (profile as any)?.fit_intelligence_enabled === true;
  const isOnboarded = (profile as any)?.fit_intelligence_onboarded === true;

  // Show wizard if enabled but not onboarded
  useEffect(() => {
    if (user && isPatient && isEnabled && !isOnboarded && !wizardJustCompleted) {
      const timer = setTimeout(() => setShowWizard(true), 2000);
      return () => clearTimeout(timer);
    }
    if (!isEnabled) setShowWizard(false);
  }, [user, isPatient, isEnabled, isOnboarded, wizardJustCompleted]);

  // Clean up when feature is disabled
  useEffect(() => {
    if (!isEnabled) {
      setPrompt(null);
      setExpanded(false);
      setResponseText(null);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
    }
  }, [isEnabled]);

  // Prompt engine
  const checkForPrompt = useCallback(async () => {
    if (!user || !isPatient || !isEnabled || !isOnboarded) return;
    if (checkingRef.current || prompt) return;

    checkingRef.current = true;

    try {
      const ctx = await buildIntelligenceContext(
        user.id,
        profile?.full_name || "",
        profile as any
      );

      if (!ctx) { checkingRef.current = false; return; }

      // Check snooze
      if (isSnoozed(ctx.snoozedUntil)) { checkingRef.current = false; return; }

      // Check cooldown
      if (!shouldShowPrompt(ctx.lastPromptAt, ctx.cooldownMinutes, ctx.ignoredCount, ctx.engagedCount)) {
        checkingRef.current = false;
        return;
      }

      const behavioralCtx: BehavioralContext = {
        firstName: ctx.firstName,
        waterTarget: ctx.waterTarget,
        waterConsumed: ctx.waterConsumed,
        motivationStyle: ctx.motivationStyle,
        messageTone: ctx.messageTone,
        weekendDietBreaks: ctx.weekendDietBreaks,
        forgetsWater: ctx.forgetsWater,
        workoutTime: ctx.workoutTime,
        workoutBlocker: ctx.workoutBlocker,
        cravingHours: ctx.cravingHours,
        failureCount: ctx.failureCount7d,
        isWeekend: ctx.isWeekend,
        currentHour: ctx.currentHour,
        clinicalFlags: ctx.clinicalFlags,
      };

      const newPrompt = generateCurrentPrompt(behavioralCtx);
      if (newPrompt) {
        setPrompt(newPrompt);
        setExpanded(true);
        setResponseText(null);

        // Update last prompt time + type
        await supabase.from("fit_intelligence_frequency" as any).upsert(
          {
            patient_id: user.id,
            last_prompt_at: new Date().toISOString(),
            last_prompt_type: newPrompt.type,
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: "patient_id" }
        );

        // Log prompt shown
        await supabase.from("fit_intelligence_interactions" as any).insert({
          patient_id: user.id,
          interaction_type: newPrompt.type,
          prompt_title: newPrompt.title,
          prompt_text: newPrompt.body,
          was_dismissed: false,
        } as any);

        // Update last_seen_at
        await supabase
          .from("profiles")
          .update({ fit_intelligence_last_seen_at: new Date().toISOString() } as any)
          .eq("user_id", user.id);
      }
    } catch (e) {
      console.error("FitIntelligence check error:", e);
    } finally {
      checkingRef.current = false;
    }
  }, [user, isPatient, isEnabled, isOnboarded, profile, prompt]);

  // Periodic checks
  useEffect(() => {
    if (!isEnabled || !isOnboarded || !isPatient) return;

    const initialTimer = setTimeout(checkForPrompt, 10_000);
    intervalRef.current = setInterval(checkForPrompt, CHECK_INTERVAL);

    return () => {
      clearTimeout(initialTimer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkForPrompt, isEnabled, isOnboarded, isPatient]);

  // Handle quick action
  const handleQuickAction = async (value: string) => {
    if (!user || !prompt || responding) return;
    setResponding(true);

    try {
      const cups = parseInt(value);
      if (isNaN(cups) || cups <= 0) { setResponding(false); return; }

      const today = new Date().toISOString().split("T")[0];

      if (prompt.type === "hydration_check") {
        const { data: existing } = await supabase
          .from("fit_intelligence_hydration" as any)
          .select("*")
          .eq("patient_id", user.id)
          .eq("date", today)
          .maybeSingle();

        const ex = existing as any;
        const newConsumed = (ex?.consumed_cups || 0) + cups;
        const target = ex?.target_cups || 8;

        await supabase.from("fit_intelligence_hydration" as any).upsert(
          {
            patient_id: user.id,
            date: today,
            target_cups: target,
            consumed_cups: newConsumed,
            last_updated_at: new Date().toISOString(),
          } as any,
          { onConflict: "patient_id,date" }
        );

        setResponseText(
          getHydrationResponse(newConsumed, target, profile?.full_name?.split(" ")[0] || "você")
        );
      }

      // Log response
      await supabase.from("fit_intelligence_interactions" as any).insert({
        patient_id: user.id,
        interaction_type: prompt.type,
        prompt_title: prompt.title,
        prompt_text: prompt.body,
        response_value: value,
        was_dismissed: false,
      } as any);

      // Increment engaged count
      try {
        const { data: curFreq } = await supabase
          .from("fit_intelligence_frequency" as any)
          .select("engaged_count")
          .eq("patient_id", user.id)
          .maybeSingle();
        await supabase
          .from("fit_intelligence_frequency" as any)
          .update({
            engaged_count: ((curFreq as any)?.engaged_count || 0) + 1,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("patient_id", user.id);
      } catch {}

      // Auto-dismiss
      setTimeout(() => {
        setExpanded(false);
        setPrompt(null);
        setResponseText(null);
      }, 3000);
    } catch {
      toast.error("Erro ao registrar");
    }
    setResponding(false);
  };

  // Dismiss
  const handleDismiss = async () => {
    if (user && prompt) {
      await supabase.from("fit_intelligence_interactions" as any).insert({
        patient_id: user.id,
        interaction_type: prompt.type,
        prompt_title: prompt.title,
        prompt_text: prompt.body,
        was_dismissed: true,
      } as any);

      try {
        const { data: curFreq } = await supabase
          .from("fit_intelligence_frequency" as any)
          .select("ignored_count")
          .eq("patient_id", user.id)
          .maybeSingle();
        await supabase
          .from("fit_intelligence_frequency" as any)
          .update({
            ignored_count: ((curFreq as any)?.ignored_count || 0) + 1,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("patient_id", user.id);
      } catch {}
    }
    setExpanded(false);
    setTimeout(() => {
      setPrompt(null);
      setResponseText(null);
    }, 400);
  };

  // Snooze 2 hours
  const handleSnooze = async () => {
    if (!user) return;
    const snoozedUntil = new Date(Date.now() + 2 * 60 * 60_000).toISOString();
    await supabase
      .from("profiles")
      .update({ fit_intelligence_snoozed_until: snoozedUntil } as any)
      .eq("user_id", user.id);

    if (prompt) {
      await supabase.from("fit_intelligence_interactions" as any).insert({
        patient_id: user.id,
        interaction_type: "snooze",
        prompt_title: prompt.title,
        prompt_text: prompt.body,
        response_value: "snooze_2h",
        was_dismissed: true,
      } as any);
    }

    toast("Silenciado por 2 horas 🔕");
    setExpanded(false);
    setTimeout(() => {
      setPrompt(null);
      setResponseText(null);
    }, 400);
  };

  if (!isPatient || !user) return null;

  // Show wizard
  if (showWizard && isEnabled && !isOnboarded) {
    return (
      <FitIntelligenceWizard
        open={showWizard}
        onClose={() => setShowWizard(false)}
        patientId={user.id}
        patientName={profile?.full_name || ""}
      />
    );
  }

  if (!isEnabled || !prompt) return null;

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
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-primary/40"
            animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
          />
        </motion.button>
      )}

      {/* Expanded Card */}
      {expanded && prompt && (
        <FitIntelligencePromptCard
          prompt={prompt}
          responseText={responseText}
          responding={responding}
          onQuickAction={handleQuickAction}
          onDismiss={handleDismiss}
          onSnooze={handleSnooze}
        />
      )}
    </AnimatePresence>
  );
}
