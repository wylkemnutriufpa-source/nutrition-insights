import { motion } from "framer-motion";
import { Flame, Trophy, Shield, Zap, Users } from "lucide-react";

interface Props {
  totalAthletes: number;
  avgScore: number;
  alertCount: number;
}

export default function CoachHeroBanner({ totalAthletes, avgScore, alertCount }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-border/50 bg-card"
    >
      {/* Background layers */}
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/8 via-transparent to-red-600/8" />
      <div className="absolute inset-0 premium-shimmer pointer-events-none" />

      <div className="relative p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Left — branding */}
          <div className="flex items-center gap-5">
            <motion.div
              initial={{ scale: 0.8, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", bounce: 0.4 }}
              className="relative"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-xl shadow-orange-500/25">
                <Flame className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center border-2 border-card">
                <Trophy className="w-3 h-3 text-white" />
              </div>
            </motion.div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
                Coach <span className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">Bodybuilder</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Prep Center · Sistema Premium de Preparação Física
              </p>
            </div>
          </div>

          {/* Right — quick metrics */}
          <div className="flex items-center gap-4 md:gap-6">
            <HeroMetric icon={Users} value={totalAthletes} label="Atletas" />
            <div className="w-px h-10 bg-border/50 hidden md:block" />
            <HeroMetric
              icon={Zap}
              value={avgScore}
              label="Score Médio"
              valueColor={avgScore >= 70 ? "text-emerald-400" : avgScore >= 40 ? "text-amber-400" : "text-red-400"}
            />
            {alertCount > 0 && (
              <>
                <div className="w-px h-10 bg-border/50 hidden md:block" />
                <HeroMetric icon={Shield} value={alertCount} label="Alertas" valueColor="text-red-400" />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom gradient line */}
      <div className="h-1 w-full bg-gradient-to-r from-orange-500 via-red-500 to-orange-500" />
    </motion.div>
  );
}

function HeroMetric({ icon: Icon, value, label, valueColor = "text-foreground" }: {
  icon: any; value: number; label: string; valueColor?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div>
        <p className={`text-xl font-black ${valueColor}`}>{value}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}
