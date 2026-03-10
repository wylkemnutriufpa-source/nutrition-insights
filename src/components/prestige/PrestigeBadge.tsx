import { motion } from "framer-motion";
import type { PrestigePlan } from "@/hooks/usePrestige";

interface PrestigeBadgeProps {
  plan: PrestigePlan | null;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export default function PrestigeBadge({ plan, size = "md", showLabel = true, className = "" }: PrestigeBadgeProps) {
  if (!plan) return null;

  const sizeMap = { sm: "w-5 h-5 text-xs", md: "w-7 h-7 text-sm", lg: "w-10 h-10 text-lg" };
  const textSize = { sm: "text-[10px]", md: "text-xs", lg: "text-sm" };

  const effectClass = plan.effect_type === "golden"
    ? "animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.5)]"
    : plan.effect_type === "shimmer"
    ? "animate-pulse shadow-[0_0_10px_rgba(139,92,246,0.4)]"
    : plan.effect_type === "glow"
    ? "shadow-[0_0_8px_rgba(59,130,246,0.4)]"
    : "";

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center gap-1.5 ${className}`}
    >
      <div
        className={`${sizeMap[size]} rounded-full flex items-center justify-center ${effectClass}`}
        style={{ backgroundColor: plan.color + "20", border: `2px solid ${plan.color}` }}
      >
        <span>{plan.badge_icon}</span>
      </div>
      {showLabel && (
        <span className={`${textSize[size]} font-semibold`} style={{ color: plan.color }}>
          {plan.badge_label || plan.name}
        </span>
      )}
    </motion.div>
  );
}
