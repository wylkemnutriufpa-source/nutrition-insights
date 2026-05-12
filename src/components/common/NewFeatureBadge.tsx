import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { isFeatureNew, dismissFeature } from "@/lib/newFeatures";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface NewFeatureBadgeProps {
  /** Route path or feature key to check */
  featureKey: string;
  /** "dot" = tiny pulsing dot, "badge" = small "Novo" label */
  variant?: "dot" | "badge";
  className?: string;
}

export default function NewFeatureBadge({ featureKey, variant = "dot", className = "" }: NewFeatureBadgeProps) {
  const entry = isFeatureNew(featureKey);
  if (!entry) return null;

  if (variant === "dot") {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`relative flex h-2.5 w-2.5 ${className}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                dismissFeature(featureKey);
              }}
            >
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                style={{ background: "hsl(40 65% 55%)" }} />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full"
                style={{ background: "linear-gradient(135deg, hsl(40 65% 55%), hsl(30 50% 50%))" }} />
            </motion.span>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs max-w-[200px] border-amber-500/30 bg-card">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-500 flex-shrink-0" />
              <span>{entry.changeNote}</span>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider cursor-default ${className}`}
            style={{
              background: "linear-gradient(135deg, hsl(40 65% 55% / 0.15), hsl(30 50% 50% / 0.1))",
              color: "hsl(40 65% 55%)",
              border: "1px solid hsl(40 65% 55% / 0.3)",
              boxShadow: "0 0 8px hsl(40 65% 55% / 0.15)",
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dismissFeature(featureKey);
            }}
          >
            <Sparkles className="w-2.5 h-2.5" />
            Novo
          </motion.span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-[200px] border-amber-500/30 bg-card">
          <span>{entry.changeNote}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
