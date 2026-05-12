import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@v1/components/ui/dialog";
import { Loader2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { type AutoFixStep, AUTOFIX_STEP_LABELS } from "@v1/lib/autoFixEngine";

const STEPS_ORDER: AutoFixStep[] = [
  "loading_context",
  "removing_blocked",
  "simplifying_breakfast",
  "simplifying_snacks",
  "standardizing_meals",
  "reducing_complexity",
  "rebalancing_macros",
  "creating_draft",
  "revalidating",
  "done",
];

interface Props {
  open: boolean;
  currentStep: AutoFixStep;
}

export default function AutoFixProgressModal({ open, currentStep }: Props) {
  const currentIndex = STEPS_ORDER.indexOf(currentStep);

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2 text-amber-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            Corrigindo Plano...
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <AnimatePresence mode="popLayout">
            {STEPS_ORDER.filter(s => s !== "done").map((step, i) => {
              const isDone = i < currentIndex;
              const isCurrent = step === currentStep;

              return (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: isCurrent || isDone ? 1 : 0.35, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="flex items-center gap-3 text-sm"
                >
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-muted-foreground/30 shrink-0" />
                  )}
                  <span className={isCurrent ? "text-foreground font-medium" : isDone ? "text-muted-foreground" : "text-muted-foreground/50"}>
                    {AUTOFIX_STEP_LABELS[step]}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
