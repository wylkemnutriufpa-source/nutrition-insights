import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import type { JourneyStatus } from "@/hooks/usePatientJourneyStatus";
import FitJourneyLogo from "@/components/common/FitJourneyLogo";

interface Props {
  status: JourneyStatus;
}

const STATUS_CONFIG: Record<string, { emoji: string; title: string; subtitle: string; action?: { label: string; route: string } }> = {
  lead_created: {
    emoji: "👋",
    title: "Bem-vindo(a)!",
    subtitle: "Seu profissional está preparando tudo para você. Em breve sua jornada começa!",
  },
  awaiting_payment: {
    emoji: "💳",
    title: "Quase lá!",
    subtitle: "Aguardando confirmação do pagamento para liberar seu acesso.",
  },
  awaiting_consent: {
    emoji: "✅",
    title: "Só mais um passo!",
    subtitle: "Aceite o termo de consentimento para começar.",
    action: { label: "Aceitar e continuar", route: "/consent-required" },
  },
  awaiting_onboarding_release: {
    emoji: "⏳",
    title: "Estamos quase prontos!",
    subtitle: "Seu profissional está finalizando a preparação. Você será notificado(a).",
  },
};

export default function OnboardingGateScreen({ status }: Props) {
  const navigate = useNavigate();
  const config = STATUS_CONFIG[status || "lead_created"] || STATUS_CONFIG.lead_created;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm text-center space-y-8"
      >
        <FitJourneyLogo size="lg" />

        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="text-5xl block"
        >
          {config.emoji}
        </motion.span>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{config.title}</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">{config.subtitle}</p>
        </div>

        {!config.action && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-muted-foreground">Aguardando liberação</span>
          </div>
        )}

        {config.action && (
          <Button
            onClick={() => navigate(config.action!.route)}
            size="lg"
            className="w-full gap-2 text-base"
          >
            <Sparkles className="w-4 h-4" />
            {config.action.label}
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </motion.div>
    </div>
  );
}
