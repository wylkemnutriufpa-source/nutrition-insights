import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, PartyPopper, ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

interface PhaseInfo {
  phase: number;
  title: string;
  icon: string;
  color: string;
  completedTitle: string;
  nextDescription: string;
}

const PHASE_DATA: Record<number, PhaseInfo> = {
  2: {
    phase: 2,
    title: "Déficit Estratégico",
    icon: "📉",
    color: "from-orange-500 to-amber-400",
    completedTitle: "Fase 1 — Reset Metabólico",
    nextDescription: "Agora vamos iniciar o déficit calórico controlado com foco em preservar sua massa magra, otimizar sua composição corporal e fortalecer seus hábitos alimentares com mais precisão.",
  },
  3: {
    phase: 3,
    title: "Definição Corporal",
    icon: "✨",
    color: "from-purple-500 to-pink-400",
    completedTitle: "Fase 2 — Déficit Estratégico",
    nextDescription: "Vamos intensificar os ajustes para refinar seus resultados com mais estratégia, consistência e definição. Reforço proteico, timing de carboidratos otimizado e disciplina máxima no checklist.",
  },
  4: {
    phase: 4,
    title: "Manutenção Inteligente",
    icon: "🏆",
    color: "from-emerald-500 to-green-400",
    completedTitle: "Fase 3 — Definição Corporal",
    nextDescription: "Agora o foco é consolidar seus resultados e transformar sua evolução em um estilo de vida sustentável. Vamos rebalancear gradualmente sua alimentação e preservar tudo que você conquistou.",
  },
};

export default function PhaseTransitionModal() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [phaseInfo, setPhaseInfo] = useState<PhaseInfo | null>(null);
  const [dismissedPhases, setDismissedPhases] = useState<number[]>([]);

  useEffect(() => {
    if (!user) return;

    // Check for unread phase transition notifications
    const checkTransition = async () => {
      const { data: notifications } = await supabase
        .from("notifications")
        .select("id, title, metadata, is_read")
        .eq("user_id", user.id)
        .eq("type", "program")
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!notifications) return;

      // Look for phase transition notifications
      for (const n of notifications) {
        let detectedPhase: number | null = null;

        if (n.title?.includes("Protocolo 2") || n.title?.includes("Fase 2")) detectedPhase = 2;
        else if (n.title?.includes("Fase 3")) detectedPhase = 3;
        else if (n.title?.includes("Fase 4")) detectedPhase = 4;

        if (detectedPhase && PHASE_DATA[detectedPhase] && !dismissedPhases.includes(detectedPhase)) {
          setPhaseInfo(PHASE_DATA[detectedPhase]);
          setShowModal(true);

          // Mark as read
          await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("id", n.id);

          break;
        }
      }
    };

    checkTransition();
  }, [user, dismissedPhases]);

  const handleDismiss = () => {
    if (phaseInfo) {
      setDismissedPhases(prev => [...prev, phaseInfo.phase]);
    }
    setShowModal(false);
    setPhaseInfo(null);
  };

  if (!showModal || !phaseInfo) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleDismiss}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 30 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Gradient header */}
          <div className={`bg-gradient-to-r ${phaseInfo.color} p-6 text-white relative overflow-hidden`}>
            {/* Animated sparkles */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute -bottom-8 -left-8 w-24 h-24 bg-white/10 rounded-full blur-xl"
            />

            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>

            <div className="relative">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", damping: 10 }}
                className="flex items-center gap-2 mb-3"
              >
                <PartyPopper className="w-6 h-6" />
                <span className="text-sm font-semibold uppercase tracking-wider">Parabéns!</span>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-white/90 text-sm mb-2"
              >
                Você encerrou com sucesso a <strong>{phaseInfo.completedTitle}</strong>!
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-center gap-3 mt-4"
              >
                <span className="text-4xl">{phaseInfo.icon}</span>
                <div>
                  <p className="text-xs text-white/70 uppercase tracking-wider">Entrando na</p>
                  <h2 className="font-display text-xl font-bold">
                    Fase {phaseInfo.phase}: {phaseInfo.title}
                  </h2>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-start gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm font-medium">O que vem pela frente</p>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {phaseInfo.nextDescription}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Button
                onClick={handleDismiss}
                className={`w-full bg-gradient-to-r ${phaseInfo.color} text-white border-0 gap-2 font-semibold`}
              >
                Vamos lá! <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
