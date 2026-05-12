import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { resolvePatientDailyFocus, completeDailyFocus, type DailyFocus } from "@/lib/dailyFocusEngine";
import { resolveFocusAction, getFocusQuickActions } from "@/lib/focusActionResolver";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { safeNum } from "@/lib/formatMacros";
import {
  CheckCircle2, Droplets, UtensilsCrossed, AlertTriangle, TrendingUp,
  Sparkles, ChevronRight, ClipboardCheck, MessageSquare, ArrowRight, Clock,
} from "lucide-react";

const FOCUS_ICONS: Record<string, any> = {
  hydration: Droplets,
  meal: UtensilsCrossed,
  behavioral: ClipboardCheck,
  clinical_alert: AlertTriangle,
  progress: TrendingUp,
  motivation: Sparkles,
  checklist_task: ClipboardCheck,
  feedback: MessageSquare,
};

const QUICK_ACTION_ICONS: Record<string, any> = {
  ClipboardCheck, UtensilsCrossed, MessageSquare, TrendingUp,
};

const FOCUS_BG: Record<string, string> = {
  blue: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
  green: "from-green-500/20 to-green-600/10 border-green-500/30",
  orange: "from-orange-500/20 to-orange-600/10 border-orange-500/30",
  red: "from-red-500/20 to-red-600/10 border-red-500/30",
  purple: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
  primary: "from-primary/20 to-primary/10 border-primary/30",
};

export default function PatientDailyFocusHero() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [focusItems, setFocusItems] = useState<DailyFocus[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    resolvePatientDailyFocus(user.id)
      .then(setFocusItems)
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleFocusAction = (focus: DailyFocus) => {
    const action = resolveFocusAction(focus.focus_type, "patient");
    // Navigate to the correct module
    navigate(action.route);
  };

  const handleComplete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    await completeDailyFocus(id);
    setFocusItems(prev => prev.map(f => f.id === id ? { ...f, is_completed: true } : f));
  };

  if (loading || focusItems.length === 0) {
    // Show motivational empty state
    if (!loading) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/20 to-primary/10 border-primary/30 p-5"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-background/50 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">✨ Parabéns!</p>
              <h3 className="font-display font-bold text-lg">Tudo em dia!</h3>
              <p className="text-sm text-muted-foreground mt-1">Continue com a consistência. Seu progresso está sendo registrado.</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2 flex-wrap">
            {getFocusQuickActions().map(qa => {
              const QIcon = QUICK_ACTION_ICONS[qa.icon] || Sparkles;
              return (
                <Button key={qa.key} size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => navigate(qa.route)}>
                  <QIcon className="w-3.5 h-3.5" /> {qa.label}
                </Button>
              );
            })}
          </div>
        </motion.div>
      );
    }
    return null;
  }

  const hero = focusItems.find(f => !f.is_completed) || focusItems[0];
  const Icon = (hero?.focus_type && FOCUS_ICONS[hero.focus_type]) || Sparkles;
  const bgClass = (hero?.focus_color && FOCUS_BG[hero.focus_color]) || FOCUS_BG.primary;
  const pendingItems = focusItems.filter(f => !f.is_completed);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${bgClass} p-5 cursor-pointer shadow-sm hover:shadow-md transition-all duration-300 ring-1 ring-white/5 hover:ring-primary/20`}
        onClick={() => {
          console.log("[ACTION] Daily focus hero clicked");
          setModalOpen(true);
        }}
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-background/50 flex items-center justify-center shrink-0">
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">
              🎯 Seu foco agora
            </p>
            <h3 className="font-display font-bold text-lg leading-tight">{hero?.focus_title || "Carregando..."}</h3>
            <p className="text-sm text-muted-foreground mt-1">{hero?.focus_description || "Atualizando suas prioridades."}</p>

            {!hero.is_completed && (
              <div className="flex items-center gap-2 mt-3">
                <Button size="sm" className="gap-1.5" onClick={(e) => { e.stopPropagation(); handleFocusAction(hero); }}>
                  {hero.focus_action_label || "Ir agora"} <ArrowRight className="w-3.5 h-3.5" />
                </Button>
                {pendingItems.length > 1 && (
                  <Button size="sm" variant="outline" className="gap-1" onClick={(e) => { e.stopPropagation(); setModalOpen(true); }}>
                    +{pendingItems.length - 1} tarefas
                  </Button>
                )}
              </div>
            )}
            {hero.is_completed && (
              <p className="text-sm text-primary font-medium mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Concluído! 👏
              </p>
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
        </div>
      </motion.div>

      {/* Action Center Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              🎯 Centro de Ações do Dia
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Pending tasks */}
            {pendingItems.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tarefas prioritárias</p>
                {pendingItems.slice(0, 5).map((focus, idx) => {
                  const FIcon = FOCUS_ICONS[focus.focus_type] || Sparkles;
                  const action = resolveFocusAction(focus.focus_type, "patient");
                  return (
                    <motion.div
                      key={focus.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/30 transition-all"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FIcon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{focus.focus_title}</p>
                        <p className="text-xs text-muted-foreground truncate">{focus.focus_description}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 shrink-0 text-xs"
                        onClick={() => { setModalOpen(false); navigate(action.route); }}
                      >
                        Ir <ArrowRight className="w-3 h-3" />
                      </Button>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6">
                <Sparkles className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium">Todas as tarefas concluídas! 🎉</p>
                <p className="text-xs text-muted-foreground mt-1">Continue mantendo a consistência</p>
              </div>
            )}

            {/* Quick navigation */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Navegação rápida</p>
              <div className="grid grid-cols-2 gap-2">
                {getFocusQuickActions().map(qa => {
                  const QIcon = QUICK_ACTION_ICONS[qa.icon] || Sparkles;
                  return (
                    <button
                      key={qa.key}
                      onClick={() => { setModalOpen(false); navigate(qa.route); }}
                      className="flex items-center gap-2 p-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-all text-left"
                    >
                      <QIcon className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm font-medium">{qa.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Completed items */}
            {focusItems.filter(f => f.is_completed).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Concluídos hoje</p>
                {focusItems.filter(f => f.is_completed).map(focus => (
                  <div key={focus.id} className="flex items-center gap-3 p-2 rounded-lg opacity-60">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-sm line-through">{focus.focus_title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
