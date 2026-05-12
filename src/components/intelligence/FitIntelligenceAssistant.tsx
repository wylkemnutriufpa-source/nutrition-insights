/**
 * FitJourney Intelligence Assistant
 * 
 * Floating neural orb for patient experience.
 * Uses context builder + prompt engine for adaptive prompts.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FitIntelligenceActivation from "./activation/FitIntelligenceActivation";
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

type FrequencyCounterField = "engaged_count" | "ignored_count";

type SessionPromptState = {
  shownAt: number;
  type: string;
};

const SESSION_PROMPT_KEY_PREFIX = "fit-intelligence:last-prompt:";
const sessionPromptCache = new Map<string, SessionPromptState>();

function getSessionPromptState(userId: string): SessionPromptState | null {
  const cached = sessionPromptCache.get(userId);
  if (cached) return cached;

  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(`${SESSION_PROMPT_KEY_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionPromptState;
    if (!parsed?.shownAt || !parsed?.type) return null;
    sessionPromptCache.set(userId, parsed);
    return parsed;
  } catch {
    return null;
  }
}

function setSessionPromptState(userId: string, state: SessionPromptState) {
  sessionPromptCache.set(userId, state);

  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(`${SESSION_PROMPT_KEY_PREFIX}${userId}`, JSON.stringify(state));
  } catch {
    // Ignore session storage issues and keep the in-memory fallback.
  }
}

async function upsertFrequencyState(patientId: string, payload: Record<string, unknown>) {
  await supabase.from("fit_intelligence_frequency" as any).upsert(
    {
      patient_id: patientId,
      updated_at: new Date().toISOString(),
      ...payload,
    } as any,
    { onConflict: "patient_id" }
  );
}

async function incrementFrequencyCounter(patientId: string, field: FrequencyCounterField) {
  const { data: current } = await supabase
    .from("fit_intelligence_frequency" as any)
    .select(field)
    .eq("patient_id", patientId)
    .maybeSingle();

  const currentValue = (current as unknown as Record<FrequencyCounterField, number | null> | null)?.[field] || 0;

  await upsertFrequencyState(patientId, {
    [field]: currentValue + 1,
  });
}

export default function FitIntelligenceAssistant() {
  const { user, profile, roles } = useAuth();
  const [prompt, setPrompt] = useState<IntelligencePrompt | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showActivation, setShowActivation] = useState(false);
  const [replayActivation, setReplayActivation] = useState(false);
  const [wizardJustCompleted, setWizardJustCompleted] = useState(false);
  const [responding, setResponding] = useState(false);
  const [responseText, setResponseText] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const checkingRef = useRef(false);

  const isPatient = !roles?.includes("nutritionist") && !roles?.includes("admin");
  const isEnabled = (profile as any)?.fit_intelligence_enabled === true;
  const isOnboarded = (profile as any)?.fit_intelligence_onboarded === true;
  const hasSeenActivation = (profile as any)?.fit_intelligence_first_experience_seen === true;
  const expiresAt = (profile as any)?.fit_intelligence_expires_at;
  const isExpired = expiresAt && new Date(expiresAt) < new Date();
  const isActiveAccess = isEnabled && !isExpired;
  const patientName = profile?.full_name || "";
  const intelligenceProfile = useMemo(
    () => ({
      fit_intelligence_enabled: (profile as any)?.fit_intelligence_enabled,
      fit_intelligence_onboarded: (profile as any)?.fit_intelligence_onboarded,
      fit_intelligence_snoozed_until: (profile as any)?.fit_intelligence_snoozed_until,
    }),
    [
      (profile as any)?.fit_intelligence_enabled,
      (profile as any)?.fit_intelligence_onboarded,
      (profile as any)?.fit_intelligence_snoozed_until,
    ]
  );

  // Show first-time activation experience
  useEffect(() => {
    if (user && isPatient && isActiveAccess && !hasSeenActivation) {
      const timer = setTimeout(() => setShowActivation(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [user, isPatient, isActiveAccess, hasSeenActivation]);

  // Show wizard if enabled but not onboarded (and activation already seen)
  useEffect(() => {
    if (user && isPatient && isActiveAccess && hasSeenActivation && !isOnboarded && !wizardJustCompleted) {
      const timer = setTimeout(() => setShowWizard(true), 2000);
      return () => clearTimeout(timer);
    }
    if (!isActiveAccess) setShowWizard(false);
  }, [user, isPatient, isActiveAccess, hasSeenActivation, isOnboarded, wizardJustCompleted]);

  // Clean up when feature is disabled
  useEffect(() => {
    if (!isActiveAccess) {
      setPrompt(null);
      setExpanded(false);
      setResponseText(null);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
    }
  }, [isActiveAccess]);

  // Prompt engine
  const checkForPrompt = useCallback(async () => {
    if (!user || !isPatient || !isActiveAccess || !isOnboarded) return;
    if (checkingRef.current || prompt) return;

    checkingRef.current = true;

    try {
      const ctx = await buildIntelligenceContext(
        user.id,
        patientName,
        intelligenceProfile
      );

      if (!ctx) { checkingRef.current = false; return; }

      const sessionPrompt = getSessionPromptState(user.id);
      const sessionIsNewer = !!sessionPrompt && sessionPrompt.shownAt > (ctx.lastPromptAt?.getTime() || 0);
      const effectiveLastPromptAt = sessionIsNewer ? new Date(sessionPrompt!.shownAt) : ctx.lastPromptAt;
      const effectiveLastPromptType = sessionIsNewer ? sessionPrompt!.type : ctx.lastPromptType;

      // Check snooze
      if (isSnoozed(ctx.snoozedUntil)) { checkingRef.current = false; return; }

      // Check cooldown
      if (!shouldShowPrompt(effectiveLastPromptAt, ctx.cooldownMinutes, ctx.ignoredCount, ctx.engagedCount)) {
        checkingRef.current = false;
        return;
      }

      // Fetch trainer data for workout-aware prompts
      let hasTrainer = false;
      let daysSinceLastWorkout: number | null = null;
      let weeklyWorkoutCount = 0;
      let lastWorkoutEffort: number | null = null;

      try {
        const { data: trainerLinks } = await (supabase as any)
          .from("patient_professional_links")
          .select("id")
          .eq("patient_id", user.id)
          .eq("professional_role", "trainer")
          .eq("link_status", "active")
          .limit(1);

        if (trainerLinks && trainerLinks.length > 0) {
          hasTrainer = true;
          const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
          const { data: completions } = await (supabase as any)
            .from("workout_completions")
            .select("completed_at, perceived_effort")
            .eq("student_id", user.id)
            .gte("completed_at", weekAgo)
            .order("completed_at", { ascending: false });

          if (completions && completions.length > 0) {
            weeklyWorkoutCount = completions.length;
            lastWorkoutEffort = completions[0].perceived_effort || null;
            const lastDate = new Date(completions[0].completed_at);
            daysSinceLastWorkout = Math.floor((Date.now() - lastDate.getTime()) / 86400000);
          } else {
            daysSinceLastWorkout = 7; // No completions in a week
          }
        }
      } catch {}

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
        preferredReminderWindows: ctx.preferredReminderWindows,
        failureCount: ctx.failureCount7d,
        isWeekend: ctx.isWeekend,
        currentHour: ctx.currentHour,
        clinicalFlags: ctx.clinicalFlags,
        lastPromptAt: effectiveLastPromptAt,
        lastPromptType: effectiveLastPromptType,
        hasTrainer,
        daysSinceLastWorkout,
        weeklyWorkoutCount,
        lastWorkoutEffort,
      };

      const newPrompt = generateCurrentPrompt(behavioralCtx);
      if (newPrompt) {
        setPrompt(newPrompt);
        setExpanded(true);
        setResponseText(null);
        setSessionPromptState(user.id, {
          shownAt: Date.now(),
          type: newPrompt.type,
        });

        // Update last prompt time + type
        await upsertFrequencyState(user.id, {
          last_prompt_at: new Date().toISOString(),
        });

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
      console.warn("[FitIntelligence] Prompt check failed:", e instanceof Error ? e.message : e);
    } finally {
      checkingRef.current = false;
    }
  }, [user, isPatient, isActiveAccess, isOnboarded, patientName, intelligenceProfile, prompt]);

  // Periodic checks
  useEffect(() => {
    if (!isActiveAccess || !isOnboarded || !isPatient) return;

    const initialTimer = setTimeout(checkForPrompt, 10_000);
    intervalRef.current = setInterval(checkForPrompt, CHECK_INTERVAL);

    return () => {
      clearTimeout(initialTimer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkForPrompt, isActiveAccess, isOnboarded, isPatient]);

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
          getHydrationResponse(newConsumed, target, patientName.split(" ")[0] || "você")
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
        await incrementFrequencyCounter(user.id, "engaged_count");
      } catch {}

      // Auto-dismiss
      setTimeout(() => {
        setExpanded(false);
        setPrompt(null);
        setResponseText(null);
      }, 3000);
    } catch (e) {
      console.warn("[FitIntelligence] Quick action error:", e instanceof Error ? e.message : e);
      toast.error("Não foi possível registrar. Tente novamente.");
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
        await incrementFrequencyCounter(user.id, "ignored_count");
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

  // Show first-time activation cinematic OR replay
  if ((showActivation && isActiveAccess && !hasSeenActivation) || replayActivation) {
    return (
      <FitIntelligenceActivation
        userId={user.id}
        onComplete={() => {
          setShowActivation(false);
          setReplayActivation(false);
        }}
      />
    );
  }

  // Show wizard
  if (showWizard && isActiveAccess && hasSeenActivation && !isOnboarded && !wizardJustCompleted) {
    return (
      <FitIntelligenceWizard
        open={showWizard}
        onClose={() => {
          setShowWizard(false);
          setWizardJustCompleted(true);
        }}
        patientId={user.id}
        patientName={profile?.full_name || ""}
      />
    );
  }

  if (!isActiveAccess) return null;

  // No prompt: show mini orb with replay option on long press
  if (!prompt) {
    return (
      <motion.button
        key="orb-idle"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.6 }}
        whileHover={{ opacity: 1, scale: 1.1 }}
        onContextMenu={(e) => {
          e.preventDefault();
          setReplayActivation(true);
        }}
        onClick={() => {
          // Long press hint
          toast("Segure para rever a apresentação ✨", { duration: 2000 });
        }}
        className="fixed bottom-24 right-4 z-[80] w-12 h-12 rounded-full flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary)), hsl(45 70% 40%))",
          boxShadow: "0 0 20px -5px hsl(45 80% 55% / 0.2)",
        }}
        title="Segure para rever apresentação"
      >
        <Brain className="w-5 h-5 text-primary-foreground" />
      </motion.button>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {/* Floating Orb — Premium golden emergence */}
      {!expanded && prompt && (
        <motion.button
          key="orb"
          initial={{ scale: 0, opacity: 0, y: 120, filter: "blur(16px)" }}
          animate={{ scale: 1, opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{
            scale: 1.3,
            opacity: 0,
            filter: "blur(12px)",
          }}
          transition={{
            type: "spring",
            stiffness: 180,
            damping: 18,
            mass: 1.2,
          }}
          onClick={() => setExpanded(true)}
          className="fixed bottom-24 right-4 z-[80] w-16 h-16 rounded-full flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary)), hsl(45 70% 40%), hsl(var(--primary)))",
            boxShadow: "0 0 40px -5px hsl(45 80% 55% / 0.3), 0 0 80px -10px hsl(45 80% 55% / 0.15), 0 8px 30px -8px hsl(0 0% 0% / 0.4)",
          }}
        >
          {/* Breathing glow */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle, hsl(45 90% 65% / 0.15), transparent 70%)",
            }}
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.4, 0.8, 0.4],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Pulse ring */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: "2px solid hsl(45 80% 60% / 0.3)" }}
            animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          />
          {/* Second pulse ring offset */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: "1px solid hsl(45 80% 65% / 0.2)" }}
            animate={{ scale: [1, 2.2], opacity: [0.3, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.6 }}
          />
          {/* Brain icon */}
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="relative z-10"
          >
            <Brain className="w-7 h-7 text-primary-foreground drop-shadow-lg" />
          </motion.div>
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
