/**
 * Intelligence Showcase Modal — Premium upsell for patients
 * Shows what FitJourney Intelligence does and encourages upgrade
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Brain, Droplets, Dumbbell, Moon, Sparkles, MessageSquare, Crown, Lock, ArrowRight } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

const FEATURES = [
  { icon: Brain, label: "Assistente Inteligente", desc: "Um orb neural que aprende seu ritmo e se comunica na hora certa", color: "text-amber-500" },
  { icon: Droplets, label: "Controle de Hidratação", desc: "Lembretes adaptativos de ingestão de água com metas personalizadas", color: "text-blue-400" },
  { icon: Dumbbell, label: "Lembrete de Treino", desc: "Notificações inteligentes próximas ao seu horário de atividade", color: "text-emerald-400" },
  { icon: Moon, label: "Alertas de Fim de Semana", desc: "Prevenção de riscos alimentares baseada nas suas restrições", color: "text-violet-400" },
  { icon: MessageSquare, label: "Puxão de Orelha", desc: "Respostas emocionais escalonadas para manter sua adesão", color: "text-rose-400" },
  { icon: Sparkles, label: "Motivação Contextual", desc: "Mensagens personalizadas no tom que mais funciona pra você", color: "text-yellow-400" },
];

export default function IntelligenceShowcaseModal({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg border-amber-500/30 overflow-hidden p-0">
        {/* Golden Header */}
        <div className="relative p-6 pb-4"
          style={{ background: "linear-gradient(135deg, hsl(35 40% 8%) 0%, hsl(40 30% 12%) 100%)" }}
        >
          <motion.div
            className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl"
            style={{ background: "radial-gradient(circle, hsl(45 100% 50% / 0.2), transparent)" }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <div className="relative z-10 flex items-center gap-4">
            <motion.div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, hsl(45 100% 45%), hsl(35 100% 35%))",
                boxShadow: "0 0 20px hsl(45 100% 50% / 0.4)",
              }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Brain className="w-7 h-7 text-amber-950" />
            </motion.div>
            <div>
              <DialogTitle className="text-lg"
                style={{
                  background: "linear-gradient(180deg, #FFD700 0%, #FFFACD 50%, #FFD700 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Inteligência FitJourney
              </DialogTitle>
              <p className="text-xs text-amber-200/60 mt-0.5">Seu copiloto comportamental de saúde</p>
            </div>
            <Badge className="ml-auto bg-amber-500/20 text-amber-400 border border-amber-500/30 gap-1">
              <Crown className="w-3 h-3" /> Premium
            </Badge>
          </div>
        </div>

        {/* Features */}
        <div className="p-6 pt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            A Inteligência FitJourney é uma presença ativa que acompanha você ao longo do dia, com lembretes, perguntas e incentivos baseados no seu perfil comportamental.
          </p>
          <div className="grid gap-2">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.08 }}
                className="flex items-start gap-3 p-2.5 rounded-lg bg-card border border-border/50"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <f.icon className={`w-4 h-4 ${f.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{f.label}</p>
                  <p className="text-[11px] text-muted-foreground">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 mt-4">
            <Lock className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <p className="text-xs text-muted-foreground flex-1">
              Este recurso é exclusivo para pacientes com <span className="font-semibold text-amber-500">plano Prestígio</span> ativo. Fale com seu nutricionista para liberar!
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
