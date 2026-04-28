/**
 * FitIntelligence Prompt Card
 * Premium floating card with cinematic entrance/exit.
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain, X, Droplets, Dumbbell, AlertTriangle, Sparkles,
  Check, Heart, Stethoscope, BellOff,
} from "lucide-react";
import type { IntelligencePrompt } from "@/lib/fitIntelligenceEngine";

const EASE = [0.16, 1, 0.3, 1] as const;

const iconMap: Record<string, typeof Brain> = {
  hydration_check: Droplets,
  hydration_progress: Droplets,
  hydration_failure: Droplets,
  workout_reminder: Dumbbell,
  weekend_risk: AlertTriangle,
  clinical_warning: Stethoscope,
  motivation_nudge: Sparkles,
  emotional_response: Heart,
  welcome_back: Brain,
};

/* Floating golden particles */
function GoldenDust({ count = 6 }: { count?: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{
            background: "radial-gradient(circle, hsl(45 100% 70%), transparent)",
            left: `${10 + Math.random() * 80}%`,
            bottom: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -40 - Math.random() * 60],
            x: [0, (Math.random() - 0.5) * 30],
            opacity: [0, 0.9, 0],
            scale: [0.5, 1.2, 0.3],
          }}
          transition={{
            duration: 2.5 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 3,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

interface Props {
  prompt: IntelligencePrompt;
  responseText: string | null;
  responding: boolean;
  onQuickAction: (value: string) => void;
  onDismiss: () => void;
  onSnooze?: () => void;
}

export default function FitIntelligencePromptCard({
  prompt,
  responseText,
  responding,
  onQuickAction,
  onDismiss,
  onSnooze,
}: Props) {
  const PromptIcon = iconMap[prompt.type] || Brain;
  const [isExiting, setIsExiting] = useState(false);

  // Auto-dismiss with evaporation after response
  useEffect(() => {
    if (responseText && !isExiting) {
      const timer = setTimeout(() => setIsExiting(true), 2400);
      return () => clearTimeout(timer);
    }
  }, [responseText, isExiting]);

  return (
    <motion.div
      key="card"
      initial={{
        opacity: 0,
        y: 300,
        scale: 0.6,
        filter: "blur(20px)",
      }}
      animate={isExiting ? {
        opacity: 0,
        scale: 1.08,
        filter: "blur(24px)",
        y: -30,
      } : {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
      }}
      exit={{
        opacity: 0,
        scale: 1.05,
        filter: "blur(20px)",
        y: -20,
      }}
      transition={isExiting ? {
        duration: 0.9,
        ease: [0.4, 0, 1, 1],
      } : {
        duration: 0.7,
        ease: EASE,
      }}
      className="fixed bottom-20 right-4 left-4 sm:left-auto sm:w-[380px] z-[80] rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(170deg, hsl(var(--card)) 0%, hsl(var(--background)) 60%, hsl(45 40% 12% / 0.3) 100%)",
        border: "1px solid hsl(45 80% 55% / 0.15)",
        boxShadow: "0 0 60px -10px hsl(45 80% 50% / 0.12), 0 25px 50px -15px hsl(0 0% 0% / 0.3), inset 0 1px 0 hsl(45 80% 70% / 0.08)",
      }}
    >
      {/* Golden particle field */}
      <GoldenDust />

      {/* Top golden shimmer line */}
      <motion.div
        className="h-[1px] w-full"
        style={{
          background: "linear-gradient(90deg, transparent 0%, hsl(45 90% 65% / 0.5) 30%, hsl(45 100% 75% / 0.8) 50%, hsl(45 90% 65% / 0.5) 70%, transparent 100%)",
        }}
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 relative">
        <div className="flex items-center gap-2.5">
          <motion.div
            className="w-8 h-8 rounded-xl flex items-center justify-center relative"
            style={{
              background: "linear-gradient(135deg, hsl(45 80% 50% / 0.15), hsl(var(--primary) / 0.1))",
              border: "1px solid hsl(45 80% 55% / 0.2)",
            }}
            animate={{ boxShadow: ["0 0 12px hsl(45 80% 55% / 0.1)", "0 0 20px hsl(45 80% 55% / 0.25)", "0 0 12px hsl(45 80% 55% / 0.1)"] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <PromptIcon className="w-4 h-4 text-primary" />
          </motion.div>
          <div>
            <p className="text-xs font-semibold text-foreground">{prompt.title}</p>
            <Badge
              variant="outline"
              className="text-[9px] py-0 mt-0.5 border-none px-0"
              style={{ color: "hsl(45 80% 65%)" }}
            >
              ✦ FitJourney Intelligence
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onSnooze && (
            <button
              onClick={onSnooze}
              className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
              title="Silenciar por 2h"
            >
              <BellOff className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pb-3">
        <AnimatePresence mode="wait">
          {responseText ? (
            <motion.div
              key="response"
              initial={{ opacity: 0, scale: 0.9, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="flex items-center gap-3 py-3"
            >
              <motion.div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(45 80% 50% / 0.1))",
                  border: "1px solid hsl(var(--primary) / 0.2)",
                }}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
              >
                <Check className="w-4 h-4 text-primary" />
              </motion.div>
              <p className="text-sm text-foreground/90 leading-relaxed">{responseText}</p>
            </motion.div>
          ) : (
            <motion.p
              key="body"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed py-1"
            >
              {prompt.body}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Quick Actions */}
      <AnimatePresence>
        {!responseText && prompt.quickActions && (
          <motion.div
            className="px-4 pb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10, height: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex gap-2">
              {prompt.quickActions.map((action, i) => (
                <motion.div
                  key={action.value}
                  className="flex-1"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.08 }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onQuickAction(action.value)}
                    disabled={responding}
                    className="w-full text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
                    style={{
                      borderColor: "hsl(45 80% 55% / 0.2)",
                      background: "hsl(45 80% 50% / 0.04)",
                    }}
                  >
                    {action.label}
                  </Button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom golden accent */}
      <motion.div
        className="h-[1px]"
        style={{
          background: "linear-gradient(90deg, transparent, hsl(45 90% 65% / 0.4), hsl(45 100% 75% / 0.6), hsl(45 90% 65% / 0.4), transparent)",
        }}
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  );
}
