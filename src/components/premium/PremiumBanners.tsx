import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Brain, Radar, Shield, Zap, Crown, ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { ClinicalIntelligenceUpsellModal } from "./ClinicalIntelligenceUpsellModal";

export function PremiumControlTowerBanner() {
  const { subscription, isAdmin } = useAuth();
  const hasAccess = isAdmin || (subscription.subscribed && 
    (subscription.subscription_tier?.toLowerCase() === "premium" || subscription.subscription_tier?.toLowerCase() === "enterprise"));
  const [upsellOpen, setUpsellOpen] = useState(false);

  const handleClick = () => {
    if (!hasAccess) {
      setUpsellOpen(true);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={handleClick}
        className={`relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-zinc-950 via-zinc-900 to-emerald-950/30 ${!hasAccess ? "cursor-pointer hover:border-emerald-500/40 transition-colors" : ""}`}
      >
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-[80px] -translate-y-1/4 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-sky-500/8 rounded-full blur-[60px] translate-y-1/4 -translate-x-1/4" />

        <div className="relative z-10 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-sky-500/15 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/10">
            <Brain className="w-6 h-6 text-emerald-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-bold text-white">Clinical Control Tower</h3>
              <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 text-[9px] h-4 px-1.5 gap-0.5">
                <Crown className="w-2.5 h-2.5" /> PRO
              </Badge>
            </div>
            <p className="text-xs text-white/40 leading-relaxed max-w-md">
              Centro de comando de inteligência clínica em tempo real. Radar de prioridades, feed de IA, 
              matriz de saúde e transparência de automação.
            </p>
            <div className="flex items-center gap-3 mt-2">
              {[
                { icon: Radar, label: "Radar" },
                { icon: Zap, label: "IA" },
                { icon: Shield, label: "Automação" },
              ].map(f => (
                <span key={f.label} className="flex items-center gap-1 text-[10px] text-white/25">
                  <f.icon className="w-3 h-3 text-emerald-500/50" /> {f.label}
                </span>
              ))}
            </div>
          </div>

          {hasAccess ? (
            <Link to="/control-tower">
              <Button
                size="sm"
                className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white border-0 gap-1.5 shadow-lg shadow-emerald-500/20"
              >
                Acessar <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          ) : (
            <Button
              size="sm"
              className="bg-white/10 hover:bg-white/15 text-white/60 border border-white/10 gap-1.5"
              onClick={handleClick}
            >
              <Lock className="w-3.5 h-3.5" /> Descobrir
            </Button>
          )}
        </div>
      </motion.div>

      <ClinicalIntelligenceUpsellModal open={upsellOpen} onOpenChange={setUpsellOpen} />
    </>
  );
}

export function PatientIntelligenceBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-zinc-950/80 via-zinc-900/60 to-emerald-950/20"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/8 rounded-full blur-[60px]" />

      <div className="relative z-10 p-4 sm:p-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-sky-500/10 flex items-center justify-center flex-shrink-0">
          <Brain className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">Inteligência FitJourney</h3>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <p className="text-[11px] text-white/35">
            Sua evolução está sendo analisada por inteligência clínica avançada
          </p>
        </div>
      </div>
    </motion.div>
  );
}
