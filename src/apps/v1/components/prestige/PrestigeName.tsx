import type { PrestigePlan } from "@v1/hooks/usePrestige";
import { Crown } from "lucide-react";

interface PrestigeNameProps {
  name: string;
  plan: PrestigePlan | null;
  className?: string;
}

export default function PrestigeName({ name, plan, className = "" }: PrestigeNameProps) {
  const isGolden = plan?.effect_type === "golden" || plan?.crown_enabled;

  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${className}`}>
      {plan?.crown_enabled && (
        <Crown className="w-4 h-4" style={{ color: plan.color }} />
      )}
      <span
        style={isGolden ? {
          backgroundImage: `linear-gradient(135deg, ${plan?.color || '#f59e0b'}, #fbbf24, ${plan?.color || '#f59e0b'})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        } : plan?.color ? { color: plan.color } : undefined}
      >
        {name}
      </span>
    </span>
  );
}
