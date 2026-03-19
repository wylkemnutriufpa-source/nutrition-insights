import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSmartResume, SmartResumeData } from "@/hooks/useSmartResume";
import {
  LayoutDashboard, Users, UtensilsCrossed, Trophy, Target,
  Leaf, ClipboardCheck, CheckCircle2, Activity,
  MessageSquare, ChefHat, ShoppingCart, Apple,
  BarChart3, Zap, TrendingUp, BookOpen, Pill, Dumbbell,
  Flame, ArrowRight, Compass, Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";

const ICON_MAP: Record<string, any> = {
  LayoutDashboard, Users, UtensilsCrossed, Trophy, Target,
  Leaf, ClipboardCheck, CheckCircle2, Activity,
  MessageSquare, ChefHat, ShoppingCart, Apple,
  BarChart3, Zap, TrendingUp, BookOpen, Pill, Dumbbell,
  Flame, Compass, Sparkles,
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

interface SmartResumeModalProps {
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

export default function SmartResumeModal({ externalOpen, onExternalOpenChange }: SmartResumeModalProps = {}) {
  const { data, loading, dismiss, forceShow } = useSmartResume();
  const navigate = useNavigate();

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
      </DialogContent>
    </Dialog>
  );
}
