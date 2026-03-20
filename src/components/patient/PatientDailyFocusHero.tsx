import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { resolvePatientDailyFocus, completeDailyFocus, type DailyFocus } from "@/lib/dailyFocusEngine";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Droplets, UtensilsCrossed, AlertTriangle, TrendingUp, Sparkles } from "lucide-react";

const FOCUS_ICONS: Record<string, any> = {
  hydration: Droplets,
  meal: UtensilsCrossed,
  behavioral: CheckCircle2,
  clinical_alert: AlertTriangle,
  progress: TrendingUp,
  motivation: Sparkles,
};

const FOCUS_BG: Record<string, string> = {
  blue: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
  green: "from-green-500/20 to-green-600/10 border-green-500/30",
  orange: "from-orange-500/20 to-orange-600/10 border-orange-500/30",
  red: "from-red-500/20 to-red-600/10 border-red-500/30",
  purple: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
  primary: "from-primary/20 to-primary/10 border-primary/30",
};

const FOCUS_TEXT: Record<string, string> = {
  blue: "text-blue-500",
  green: "text-green-500",
  orange: "text-orange-500",
  red: "text-red-500",
  purple: "text-purple-500",
  primary: "text-primary",
};

export default function PatientDailyFocusHero() {
  const { user } = useAuth();
  const [focusItems, setFocusItems] = useState<DailyFocus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    resolvePatientDailyFocus(user.id)
      .then(setFocusItems)
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleComplete = async (id: string) => {
    await completeDailyFocus(id);
    setFocusItems(prev => prev.map(f => f.id === id ? { ...f, is_completed: true } : f));
  };

  if (loading || focusItems.length === 0) return null;

  const hero = focusItems.find(f => !f.is_completed) || focusItems[0];
  const Icon = FOCUS_ICONS[hero.focus_type] || Sparkles;
  const bgClass = FOCUS_BG[hero.focus_color] || FOCUS_BG.primary;
  const textClass = FOCUS_TEXT[hero.focus_color] || FOCUS_TEXT.primary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${bgClass} p-5`}
    >
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl bg-background/50 flex items-center justify-center shrink-0 ${textClass}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">
            🎯 Seu foco agora
          </p>
          <h3 className="font-display font-bold text-lg leading-tight">
            {hero.focus_title}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {hero.focus_description}
          </p>
          {hero.focus_action_label && !hero.is_completed && (
            <Button
              size="sm"
              className="mt-3"
              onClick={() => handleComplete(hero.id)}
            >
              {hero.focus_action_label}
            </Button>
          )}
          {hero.is_completed && (
            <p className="text-sm text-primary font-medium mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Concluído! 👏
            </p>
          )}
        </div>
      </div>

      {/* Secondary focus items */}
      {focusItems.filter(f => f.id !== hero.id && !f.is_completed).length > 0 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {focusItems.filter(f => f.id !== hero.id && !f.is_completed).slice(0, 3).map(f => {
            const FIcon = FOCUS_ICONS[f.focus_type] || Sparkles;
            return (
              <button
                key={f.id}
                onClick={() => handleComplete(f.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background/40 border border-border/50 text-xs font-medium shrink-0 hover:bg-background/60 transition-all"
              >
                <FIcon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="truncate max-w-[120px]">{f.focus_title}</span>
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
