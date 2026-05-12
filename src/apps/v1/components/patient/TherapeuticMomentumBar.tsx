import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { getTherapeuticMomentum } from "@/lib/therapeuticPriorityEngine";
import { Flame, AlertTriangle, TrendingUp, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { safeNum } from "@/lib/formatMacros";

const MOMENTUM_CONFIG: Record<string, { icon: any; bg: string; text: string }> = {
  green: { icon: TrendingUp, bg: "bg-green-500/10 border-green-500/30", text: "text-green-600" },
  orange: { icon: AlertTriangle, bg: "bg-orange-500/10 border-orange-500/30", text: "text-orange-600" },
  red: { icon: Flame, bg: "bg-red-500/10 border-red-500/30", text: "text-red-600" },
};

export default function TherapeuticMomentumBar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [momentum, setMomentum] = useState<{ score: number; label: string; color: string } | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    getTherapeuticMomentum(user.id).then(setMomentum);
  }, [user?.id]);

  if (!momentum) return null;

  const config = (momentum?.color && MOMENTUM_CONFIG[momentum.color]) || MOMENTUM_CONFIG.orange;
  const Icon = config?.icon || AlertTriangle;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        console.log("[ACTION] Momentum bar clicked");
        navigate("/journey");
      }}
      className={`rounded-xl border ${config.bg} p-3 flex items-center gap-3 cursor-pointer hover:shadow-md transition-all duration-300 group`}
    >
      <div className={`w-10 h-10 rounded-lg bg-background/50 flex items-center justify-center ${config.text}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground font-medium">Momentum Terapêutico</p>
        <div className="flex items-center gap-2 mt-0.5">
          <div className="flex-1 h-1.5 rounded-full bg-background/50">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                momentum?.color === "green" ? "bg-green-500" :
                momentum?.color === "orange" ? "bg-orange-500" : "bg-red-500"
              }`}
              style={{ width: `${safeNum(momentum?.score)}%` }}
            />
          </div>
          <span className={`text-xs font-bold ${config?.text || "text-orange-600"}`}>{momentum?.label || "Estável"}</span>
        </div>
      </div>
    </motion.div>
  );
}
