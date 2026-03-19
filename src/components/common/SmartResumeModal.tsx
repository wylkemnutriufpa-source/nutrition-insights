import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSmartResume, SmartResumeData, IntelligenceMetric } from "@/hooks/useSmartResume";
import {
  LayoutDashboard, Users, UtensilsCrossed, Trophy, Target,
  Leaf, ClipboardCheck, CheckCircle2, Activity,
  MessageSquare, ChefHat, ShoppingCart, Apple,
  BarChart3, Zap, TrendingUp, BookOpen, Pill, Dumbbell,
  Flame, ArrowRight, Compass, Sparkles, Monitor, Cpu, Wifi,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ICON_MAP: Record<string, any> = {
  LayoutDashboard, Users, UtensilsCrossed, Trophy, Target,
  Leaf, ClipboardCheck, CheckCircle2, Activity,
  MessageSquare, ChefHat, ShoppingCart, Apple,
  BarChart3, Zap, TrendingUp, BookOpen, Pill, Dumbbell,
  Flame, Compass, Sparkles, Monitor, Cpu, Wifi,
};

function getIcon(name: string) {
  return ICON_MAP[name] || LayoutDashboard;
}

function formatTimeAway(hours: number): string {
  if (hours < 1) return "menos de 1 hora";
  if (hours < 24) return `${Math.round(hours)} hora${Math.round(hours) > 1 ? "s" : ""}`;
  const days = Math.round(hours / 24);
  return `${days} dia${days > 1 ? "s" : ""}`;
}

/* ─── Intelligence Projection Modal ─── */
function IntelligenceProjectionModal({
  open,
  onClose,
  metrics,
}: {
  open: boolean;
  onClose: () => void;
  metrics: IntelligenceMetric[];
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-0 bg-transparent shadow-2xl">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, rotateX: 15 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.9, rotateX: 10 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="relative rounded-2xl overflow-hidden"
              style={{
                background: "linear-gradient(135deg, hsl(160 30% 8% / 0.95), hsl(180 20% 6% / 0.98))",
                border: "1px solid hsl(150 60% 40% / 0.2)",
                boxShadow: "0 0 80px hsl(150 80% 40% / 0.08), inset 0 1px 0 hsl(150 60% 60% / 0.1)",
              }}
            >
              {/* Holographic scanline effect */}
              <motion.div
                className="absolute inset-0 pointer-events-none z-0"
                style={{
                  background: "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(150 80% 50% / 0.02) 2px, hsl(150 80% 50% / 0.02) 4px)",
                }}
              />
              <motion.div
                className="absolute inset-0 pointer-events-none z-0"
                style={{ background: "linear-gradient(180deg, transparent 0%, hsl(150 60% 50% / 0.04) 50%, transparent 100%)" }}
                animate={{ y: ["-100%", "200%"] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              />

              {/* Header */}
              <div className="relative z-10 px-6 pt-5 pb-3">
                <div className="flex items-center gap-3">
                  <motion.div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, hsl(150 60% 25%), hsl(180 50% 30%))",
                      boxShadow: "0 0 20px hsl(150 80% 50% / 0.3)",
                    }}
                    animate={{ boxShadow: ["0 0 20px hsl(150 80% 50% / 0.2)", "0 0 30px hsl(150 80% 50% / 0.5)", "0 0 20px hsl(150 80% 50% / 0.2)"] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Cpu className="w-5 h-5 text-emerald-400" />
                  </motion.div>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-400 tracking-wide">CENTRAL DE INTELIGÊNCIA</h3>
                    <p className="text-[10px] text-emerald-500/50 uppercase tracking-widest">Monitoramento contínuo ativo</p>
                  </div>
                  <motion.div
                    className="ml-auto flex items-center gap-1.5"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Wifi className="w-3 h-3 text-emerald-500/60" />
                    <span className="text-[9px] text-emerald-500/60 font-mono">LIVE</span>
                  </motion.div>
                </div>

                {/* Progress bar */}
                <div className="mt-3 h-[1px] w-full bg-emerald-900/30 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-emerald-500/50 via-emerald-400/80 to-emerald-500/50"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                    style={{ width: "60%" }}
                  />
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="relative z-10 px-6 pb-6 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  {metrics.map((metric, idx) => {
                    const MetricIcon = getIcon(metric.icon);
                    const colorMap: Record<string, { glow: string; text: string; border: string; bg: string }> = {
                      emerald: { glow: "hsl(150 80% 50%)", text: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/8" },
                      amber: { glow: "hsl(40 90% 50%)", text: "text-amber-400", border: "border-amber-500/20", bg: "bg-amber-500/8" },
                      sky: { glow: "hsl(200 90% 50%)", text: "text-sky-400", border: "border-sky-500/20", bg: "bg-sky-500/8" },
                      rose: { glow: "hsl(350 80% 55%)", text: "text-rose-400", border: "border-rose-500/20", bg: "bg-rose-500/8" },
                      violet: { glow: "hsl(270 80% 60%)", text: "text-violet-400", border: "border-violet-500/20", bg: "bg-violet-500/8" },
                      orange: { glow: "hsl(25 90% 55%)", text: "text-orange-400", border: "border-orange-500/20", bg: "bg-orange-500/8" },
                    };
                    const colors = colorMap[metric.color] || colorMap.sky;
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 0.1 + idx * 0.08, duration: 0.35 }}
                        className={`relative rounded-xl ${colors.bg} border ${colors.border} p-3.5 overflow-hidden backdrop-blur-sm`}
                      >
                        {/* Scanning light */}
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent"
                          initial={{ x: "-100%" }}
                          animate={{ x: "200%" }}
                          transition={{ duration: 4, repeat: Infinity, delay: idx * 0.5, ease: "linear" }}
                        />
                        {/* Corner glow */}
                        <div
                          className="absolute -top-1 -right-1 w-8 h-8 rounded-full opacity-20 blur-lg"
                          style={{ background: colors.glow }}
                        />
                        <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${colors.glow}15` }}>
                              <MetricIcon className={`w-3.5 h-3.5 ${colors.text}`} />
                            </div>
                            <span className="text-[10px] text-muted-foreground/80 font-medium tracking-wide uppercase">{metric.label}</span>
                          </div>
                          <p className={`text-lg font-bold ${colors.text} leading-tight font-mono`}>{metric.value}</p>
                          {metric.detail && (
                            <p className="text-[9px] text-muted-foreground/50 mt-1 font-mono">{metric.detail}</p>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Bottom status bar */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="mt-4 flex items-center justify-between px-2"
                >
                  <div className="flex items-center gap-1.5">
                    <motion.div
                      className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <span className="text-[9px] text-emerald-500/50 font-mono uppercase">
                      {metrics.length} sinais capturados
                    </span>
                  </div>
                  <span className="text-[9px] text-muted-foreground/30 font-mono">
                    FitJourney AI Engine v2.1
                  </span>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Screen Visor Component ─── */
function IntelligenceVisor({ metrics, onClick }: { metrics: IntelligenceMetric[]; onClick: () => void }) {
  const topMetrics = metrics.slice(0, 3);
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.28 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="w-full text-left cursor-pointer group"
    >
      <div
        className="relative rounded-xl overflow-hidden p-3"
        style={{
          background: "linear-gradient(135deg, hsl(160 25% 10% / 0.8), hsl(180 20% 8% / 0.9))",
          border: "1px solid hsl(150 50% 35% / 0.25)",
          boxShadow: "0 0 30px hsl(150 80% 40% / 0.05), inset 0 1px 0 hsl(150 50% 60% / 0.08)",
        }}
      >
        {/* Scanline overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            background: "repeating-linear-gradient(0deg, transparent, transparent 1px, hsl(150 80% 50% / 0.015) 1px, hsl(150 80% 50% / 0.015) 2px)",
          }}
        />
        {/* Scanning beam */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(180deg, transparent, hsl(150 60% 50% / 0.06), transparent)" }}
          animate={{ y: ["-50%", "150%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />

        {/* Header */}
        <div className="relative z-10 flex items-center gap-2 mb-2">
          <Monitor className="w-3 h-3 text-emerald-500/60" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-500/70">Dados coletados</span>
          <motion.div
            className="w-1 h-1 rounded-full bg-emerald-500 ml-auto"
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
          <span className="text-[8px] text-emerald-500/40 font-mono group-hover:text-emerald-400/70 transition-colors">
            ABRIR PROJEÇÃO →
          </span>
        </div>

        {/* Mini metrics preview */}
        <div className="relative z-10 flex gap-2">
          {topMetrics.map((m, i) => {
            const MetricIcon = getIcon(m.icon);
            const colorClass = m.color === "emerald" ? "text-emerald-400" : m.color === "amber" ? "text-amber-400" : m.color === "rose" ? "text-rose-400" : m.color === "violet" ? "text-violet-400" : m.color === "orange" ? "text-orange-400" : "text-sky-400";
            return (
              <div key={i} className="flex-1 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.03]">
                <MetricIcon className={`w-3 h-3 ${colorClass} shrink-0`} />
                <div className="min-w-0">
                  <p className={`text-[10px] font-bold font-mono ${colorClass} truncate`}>{m.value}</p>
                  <p className="text-[7px] text-muted-foreground/40 truncate">{m.label}</p>
                </div>
              </div>
            );
          })}
        </div>
        {metrics.length > 3 && (
          <p className="relative z-10 text-[8px] text-emerald-500/40 font-mono mt-1.5 text-right">
            +{metrics.length - 3} sinais capturados
          </p>
        )}
      </div>
    </motion.button>
  );
}

interface SmartResumeModalProps {
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

export default function SmartResumeModal({ externalOpen, onExternalOpenChange }: SmartResumeModalProps = {}) {
  const { data, loading, dismiss, forceShow } = useSmartResume();
  const navigate = useNavigate();
  const [projectionOpen, setProjectionOpen] = useState(false);

  // When external trigger opens the modal, force-fetch data
  useEffect(() => {
    if (externalOpen) {
      forceShow();
    }
  }, [externalOpen, forceShow]);

  const isOpen = externalOpen || (!loading && data?.shouldShow);

  const handleClose = () => {
    dismiss();
    onExternalOpenChange?.(false);
  };

  const handleContinue = () => {
    if (data?.pendingAction) {
      navigate(data.pendingAction.route);
    } else {
      navigate("/");
    }
    handleClose();
  };

  const handleDashboard = () => {
    navigate("/");
    handleClose();
  };

  const handleExplore = () => {
    handleClose();
  };

  if (!isOpen || (!data && !loading)) return null;

  return (
    <Dialog open={!!isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 bg-transparent shadow-2xl">
        {loading && !data ? (
          <div className="bg-card rounded-2xl border border-border/50 p-8 flex flex-col items-center gap-4">
            <motion.div
              className="relative"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <motion.div
                className="absolute -inset-3 rounded-full"
                style={{ background: "radial-gradient(circle, hsl(150 80% 50% / 0.3), transparent 70%)" }}
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span className="text-4xl select-none relative z-10">🧠</span>
            </motion.div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">Analisando seus dados...</p>
              <p className="text-xs text-muted-foreground mt-1">Inteligência FitJourney está processando</p>
            </div>
            <div className="w-32 h-1 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-emerald-500"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 3, ease: "easeInOut" }}
              />
            </div>
          </div>
        ) : data ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="bg-card rounded-2xl border border-border/50 overflow-hidden"
        >
          {/* Header with gradient + Brain Intelligence */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[hsl(150_60%_15%/0.6)] via-[hsl(170_50%_12%/0.4)] to-primary/5 p-6 pb-4">
            {/* Neural background particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: 3,
                    height: 3,
                    left: `${15 + i * 18}%`,
                    top: `${20 + (i % 3) * 25}%`,
                    background: "radial-gradient(circle, hsl(150 80% 55%), transparent)",
                    boxShadow: "0 0 6px hsl(150 80% 55% / 0.5)",
                  }}
                  animate={{ opacity: [0, 0.7, 0], scale: [0.5, 1.2, 0.5] }}
                  transition={{ duration: 3, repeat: Infinity, delay: i * 0.5, ease: "easeInOut" }}
                />
              ))}
            </div>

            <div className="relative flex items-start gap-4">
              {/* Animated Brain Icon */}
              <motion.div className="relative flex-shrink-0">
                {/* Ambient glow */}
                <motion.div
                  className="absolute -inset-2 rounded-full"
                  style={{
                    background: "radial-gradient(circle, hsl(150 80% 50% / 0.3) 0%, hsl(140 70% 45% / 0.1) 50%, transparent 70%)",
                  }}
                  animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="w-12 h-12 rounded-xl flex items-center justify-center relative z-10"
                  style={{
                    background: "linear-gradient(135deg, hsl(150 60% 30%), hsl(170 70% 35%))",
                    boxShadow: "0 0 25px hsl(150 80% 50% / 0.35), inset 0 1px 1px rgba(255,255,255,0.2)",
                  }}
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 6, repeat: Infinity }}
                >
                  <span className="text-2xl leading-none select-none" style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.4))" }}>🧠</span>
                </motion.div>
                {/* Pulse ring */}
                <motion.div
                  className="absolute inset-0 rounded-xl"
                  style={{ border: "1.5px solid hsl(150 70% 50% / 0.4)" }}
                  animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                />
              </motion.div>

              <div className="flex-1 min-w-0">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.05 }}
                  className="flex items-center gap-1.5 mb-1"
                >
                  <span className="text-[10px] uppercase tracking-widest font-semibold text-emerald-400/80">
                    Inteligência FitJourney
                  </span>
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-xl font-bold text-foreground"
                >
                  {data.greeting}
                </motion.h2>
                {data.hoursAway > 0 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-sm text-muted-foreground mt-1"
                  >
                    Você esteve fora por {formatTimeAway(data.hoursAway)}
                  </motion.p>
                )}
              </div>
            </div>

            {/* Streak badge */}
            {data.streakDays > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25 }}
                className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/20"
              >
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-bold text-orange-500">
                  {data.streakDays} dia{data.streakDays > 1 ? "s" : ""} consecutivo{data.streakDays > 1 ? "s" : ""}! 🔥
                </span>
              </motion.div>
            )}
          </div>

          {/* Intelligence Collected Metrics */}
          {data.collectedMetrics && data.collectedMetrics.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
              className="px-6 pt-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/80">
                  Dados coletados pela IA
                </p>
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {data.collectedMetrics.map((metric, idx) => {
                  const MetricIcon = getIcon(metric.icon);
                  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
                    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/20" },
                    amber: { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/20" },
                    sky: { bg: "bg-sky-500/10", text: "text-sky-500", border: "border-sky-500/20" },
                    rose: { bg: "bg-rose-500/10", text: "text-rose-500", border: "border-rose-500/20" },
                    violet: { bg: "bg-violet-500/10", text: "text-violet-500", border: "border-violet-500/20" },
                    orange: { bg: "bg-orange-500/10", text: "text-orange-500", border: "border-orange-500/20" },
                  };
                  const colors = colorMap[metric.color] || colorMap.sky;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + idx * 0.06 }}
                      className={`relative rounded-xl ${colors.bg} border ${colors.border} p-3 overflow-hidden`}
                    >
                      {/* Subtle scanning effect */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                        initial={{ x: "-100%" }}
                        animate={{ x: "200%" }}
                        transition={{ duration: 3, repeat: Infinity, delay: idx * 0.4, ease: "linear" }}
                      />
                      <div className="relative z-10">
                        <div className="flex items-center gap-1.5 mb-1">
                          <MetricIcon className={`w-3 h-3 ${colors.text}`} />
                          <span className="text-[10px] text-muted-foreground font-medium truncate">{metric.label}</span>
                        </div>
                        <p className={`text-base font-bold ${colors.text} leading-tight`}>{metric.value}</p>
                        {metric.detail && (
                          <p className="text-[9px] text-muted-foreground/70 mt-0.5 truncate">{metric.detail}</p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          <div className="p-6 pt-4 space-y-5">
            {/* Recent Activities */}
            {data.recentActivities.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Últimas atividades
                </p>
                <div className="flex gap-2">
                  {data.recentActivities.map((activity, idx) => {
                    const Icon = getIcon(activity.icon);
                    return (
                      <motion.button
                        key={idx}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 + idx * 0.05 }}
                        onClick={() => { navigate(activity.route); dismiss(); }}
                        className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/50 hover:bg-muted border border-border/30 hover:border-border transition-all group"
                      >
                        <Icon className="w-4 h-4 text-primary shrink-0 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-medium text-foreground truncate">{activity.title}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Pending Action */}
            {data.pendingAction && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="p-4 rounded-xl bg-warning/5 border border-warning/20"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-warning/15 flex items-center justify-center shrink-0 mt-0.5">
                    <Zap className="w-4 h-4 text-warning" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{data.pendingAction.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{data.suggestion}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* If no pending action, show suggestion */}
            {!data.pendingAction && data.suggestion && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="p-4 rounded-xl bg-primary/5 border border-primary/20"
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-primary shrink-0" />
                  <p className="text-sm text-foreground">{data.suggestion}</p>
                </div>
              </motion.div>
            )}

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="space-y-2"
            >
              <Button
                onClick={handleContinue}
                className="w-full gap-2 h-11 text-sm font-semibold"
                size="lg"
              >
                <ArrowRight className="w-4 h-4" />
                {data.pendingAction ? "Continuar de onde parou" : "Ir para o painel"}
              </Button>

              <div className="flex gap-2">
                <Button
                  onClick={handleDashboard}
                  variant="outline"
                  className="flex-1 h-10 text-xs"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 mr-1.5" />
                  Painel principal
                </Button>
                <Button
                  onClick={handleExplore}
                  variant="ghost"
                  className="flex-1 h-10 text-xs"
                >
                  <Compass className="w-3.5 h-3.5 mr-1.5" />
                  Explorar
                </Button>
              </div>
            </motion.div>
          </div>
        </motion.div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
