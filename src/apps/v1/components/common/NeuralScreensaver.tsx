import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowRight, Compass, AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { checkShouldRestore, clearSessionContext, saveSessionContext, type SessionContext } from "@/lib/sessionContext";
import { getWeekendRiskPrompt, type BehavioralContext } from "@/lib/fitIntelligenceEngine";
import NeuralLoading from "@/components/system-entry/NeuralLoading";

const EASE_PREMIUM = [0.22, 1, 0.36, 1] as const;

type ScreensaverStage = "sleeping" | "waking" | "awake";

/**
 * Neural Screensaver — Premium session restore experience.
 * 
 * When user returns after inactivity:
 * 1. Full-screen neural brain animates as screensaver ("sleeping")
 * 2. On click/tap → neural waves expand + welcome message ("waking" → "awake")
 * 3. Two buttons: continue where they were OR explore the system
 */
export default function NeuralScreensaver() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [active, setActive] = useState(false);
  const [stage, setStage] = useState<ScreensaverStage>("sleeping");
  const [restoreCtx, setRestoreCtx] = useState<SessionContext | null>(null);
  const [weekendTip, setWeekendTip] = useState<string | null>(null);
  const dismissedRef = useRef(false);

  // Check on visibility change
  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveSessionContext(location.pathname, user.id);
      } else if (document.visibilityState === "visible" && !dismissedRef.current) {
        const ctx = checkShouldRestore(location.pathname, user.id);
        if (ctx) {
          setRestoreCtx(ctx);
          setStage("sleeping");
          setActive(true);
          dismissedRef.current = true; // only show once per return
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [user, location.pathname]);

  // Also check on mount
  useEffect(() => {
    if (!user) return;
    const ctx = checkShouldRestore(location.pathname, user.id);
    if (ctx) {
      setRestoreCtx(ctx);
      setStage("sleeping");
      setActive(true);
      dismissedRef.current = true;
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save route on navigation
  useEffect(() => {
    if (!user) return;
    saveSessionContext(location.pathname, user.id);
  }, [location.pathname, user]);

  useEffect(() => {
    // REDIRECT PROTECTION: Do not show screensaver during onboarding/consent
    const path = location.pathname;
    const isProtected = path.startsWith("/onboarding") || path.startsWith("/consent") || path.startsWith("/anamnesis") || path.startsWith("/intake");
    if (isProtected) {
      dismissedRef.current = true;
      setActive(false);
      return;
    }
    dismissedRef.current = false;
  }, [location.pathname]);

  const handleScreenClick = useCallback(async () => {
    if (stage === "sleeping") {
      setStage("waking");

      // Log screensaver wake interaction
      if (user && (profile as any)?.fit_intelligence_enabled) {
        supabase.from("fit_intelligence_interactions" as any).insert({
          patient_id: user.id,
          interaction_type: "screensaver_wake",
          was_dismissed: false,
        } as any).then(() => {});

        // Fetch weekend tip if applicable
        const isWeekend = [0, 6].includes(new Date().getDay());
        if (isWeekend) {
          const { data: bp } = await supabase
            .from("behavioral_profile" as any)
            .select("weekend_diet_breaks, craving_hours")
            .eq("patient_id", user.id)
            .maybeSingle();
          const { data: flags } = await supabase
            .from("patient_clinical_flags" as any)
            .select("flag_key")
            .eq("patient_id", user.id)
            .eq("is_active", true);
          
          if (bp || flags) {
            const ctx: BehavioralContext = {
              firstName: profile?.full_name?.split(' ')[0] || '',
              waterTarget: 8, waterConsumed: 0,
              motivationStyle: 'gentle', messageTone: 'funny',
              weekendDietBreaks: (bp as any)?.weekend_diet_breaks || false,
              forgetsWater: false, workoutTime: 'morning',
              workoutBlocker: null,
              cravingHours: (bp as any)?.craving_hours || [],
              preferredReminderWindows: [9, 12, 15, 18],
              failureCount: 0, isWeekend: true,
              currentHour: new Date().getHours(),
              clinicalFlags: (flags || []).map((f: any) => f.flag_key),
              lastPromptAt: null,
              lastPromptType: null,
              hasTrainer: false,
              daysSinceLastWorkout: null,
              weeklyWorkoutCount: 0,
              lastWorkoutEffort: null,
            };
            const tip = getWeekendRiskPrompt(ctx);
            if (tip) setWeekendTip(tip.body);
          }
        }
      }

      setTimeout(() => setStage("awake"), 800);
    }
  }, [stage, user, profile]);

  const handleContinue = useCallback(() => {
    if (!restoreCtx) return;
    const route = restoreCtx.route;
    clearSessionContext();
    setActive(false);
    setRestoreCtx(null);
    navigate(route);
  }, [restoreCtx, navigate]);

  const handleExplore = useCallback(() => {
    clearSessionContext();
    setActive(false);
    setRestoreCtx(null);
    // Stay on current route
  }, []);

  const firstName = profile?.full_name?.split(" ")[0] || "você";

  if (!active || !restoreCtx) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="neural-screensaver"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, filter: "blur(20px)", scale: 1.05 }}
        transition={{ duration: 0.8, ease: EASE_PREMIUM }}
        className="fixed inset-0 z-[130] flex flex-col items-center justify-center overflow-hidden cursor-pointer"
        style={{
          background: "radial-gradient(ellipse at 50% 40%, hsl(152 30% 8%) 0%, hsl(222 40% 5%) 45%, hsl(0 0% 2%) 100%)",
        }}
        onClick={stage === "sleeping" ? handleScreenClick : undefined}
      >
        {/* Breathing ambient background */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{
            background: [
              "radial-gradient(ellipse at 50% 40%, hsl(152 25% 9%) 0%, hsl(222 40% 5%) 45%, hsl(0 0% 2%) 100%)",
              "radial-gradient(ellipse at 50% 40%, hsl(152 30% 11%) 0%, hsl(222 40% 6%) 45%, hsl(0 0% 2%) 100%)",
              "radial-gradient(ellipse at 50% 40%, hsl(152 25% 9%) 0%, hsl(222 40% 5%) 45%, hsl(0 0% 2%) 100%)",
            ],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Volumetric light */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[55%] w-[500px] h-[500px] md:w-[700px] md:h-[700px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, hsl(var(--primary) / 0.08) 0%, hsl(var(--primary) / 0.02) 40%, transparent 65%)",
          }}
          animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Neural brain — hero */}
        <motion.div
          className="relative z-10 pointer-events-none"
          animate={
            stage === "waking"
              ? { scale: [0.75, 0.9, 0.7], opacity: [1, 1, 0.8] }
              : stage === "awake"
                ? { scale: 0.7, y: -40, opacity: 0.6 }
                : { scale: 0.75, opacity: 1 }
          }
          transition={{
            duration: stage === "waking" ? 0.8 : 0.9,
            ease: EASE_PREMIUM,
          }}
        >
          <NeuralLoading active={true} durationMultiplier={1} />
        </motion.div>

        {/* Neural wave expansion on click */}
        <AnimatePresence>
          {stage === "waking" && (
            <motion.div
              key="wave"
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
              style={{
                width: 200,
                height: 200,
                background: "radial-gradient(circle, hsl(var(--primary) / 0.25) 0%, hsl(var(--primary) / 0.05) 50%, transparent 70%)",
              }}
              initial={{ scale: 0.3, opacity: 0.8 }}
              animate={{ scale: 8, opacity: 0 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          )}
        </AnimatePresence>

        {/* Sleeping hint — "tap to wake" */}
        <AnimatePresence>
          {stage === "sleeping" && (
            <motion.p
              key="hint"
              className="absolute bottom-16 text-[11px] tracking-[0.2em] uppercase text-muted-foreground/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              Toque para continuar
            </motion.p>
          )}
        </AnimatePresence>

        {/* Welcome content — after wake */}
        <AnimatePresence>
          {stage === "awake" && (
            <motion.div
              key="welcome"
              className="relative z-20 flex flex-col items-center gap-6 px-6 pointer-events-auto"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE_PREMIUM }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Welcome text */}
              <div className="text-center space-y-2">
                <motion.h1
                  className="text-2xl md:text-3xl font-bold"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                  initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.6, delay: 0.1, ease: EASE_PREMIUM }}
                >
                  Olá, {firstName}! 👋
                </motion.h1>

                <motion.p
                  className="text-sm text-muted-foreground/70"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 0.9, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.25, ease: EASE_PREMIUM }}
                >
                  Bem-vindo(a) de volta! O que gostaria de fazer?
                </motion.p>
              </div>

              {/* Weekend risk tip from FitJourney Intelligence */}
              {weekendTip && (
                <motion.div
                  className="flex items-start gap-2 px-4 py-3 rounded-xl max-w-sm"
                  style={{ background: "hsl(var(--primary) / 0.08)", border: "1px solid hsl(var(--primary) / 0.15)" }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.35, ease: EASE_PREMIUM }}
                >
                  <AlertTriangle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground/80 whitespace-pre-line">{weekendTip}</p>
                </motion.div>
              )}


              <motion.div
                className="flex flex-col sm:flex-row gap-3 w-full max-w-sm"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4, ease: EASE_PREMIUM }}
              >
                {/* Continue where left off */}
                <button
                  onClick={handleContinue}
                  className="flex-1 group relative flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-300 overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--primary)), hsl(152 60% 35%))",
                    color: "hsl(var(--primary-foreground))",
                    boxShadow: "0 8px 32px hsl(var(--primary) / 0.3), 0 0 0 1px hsl(var(--primary) / 0.2)",
                  }}
                >
                  {/* Shimmer effect */}
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: "linear-gradient(90deg, transparent 0%, hsl(0 0% 100% / 0.1) 50%, transparent 100%)",
                    }}
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }}
                  />
                  <ArrowRight className="w-4 h-4" />
                  <span className="relative z-10">
                    Continuar em {restoreCtx.routeLabel}
                  </span>
                </button>

                {/* Explore */}
                <button
                  onClick={handleExplore}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl text-sm font-medium transition-all duration-300 hover:bg-white/[0.08]"
                  style={{
                    background: "hsl(0 0% 100% / 0.04)",
                    color: "hsl(var(--primary) / 0.9)",
                    border: "1px solid hsl(var(--primary) / 0.15)",
                  }}
                >
                  <Compass className="w-4 h-4" />
                  Explorar o sistema
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subtle loading bar at bottom */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 w-32 h-[1.5px] rounded-full overflow-hidden pointer-events-none"
          style={{ background: "hsl(var(--primary) / 0.1)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: stage === "sleeping" ? 0.6 : 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              background: "linear-gradient(90deg, hsl(var(--primary) / 0.6), hsl(var(--primary)), hsl(var(--accent) / 0.8))",
            }}
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
