import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, CreditCard, Stethoscope, ArrowRight, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { type JourneyStatus, IS_FLUID_STATE } from "@/hooks/usePatientJourneyStatus";
import FitJourneyLogo from "@/components/common/FitJourneyLogo";

interface Props {
  status: JourneyStatus;
}

export { IS_FLUID_STATE };

const STATUS_CONFIG: Record<string, { icon: React.ElementType; title: string; description: string; action?: { label: string; route: string } }> = {
  lead_created: {
    icon: Clock,
    title: "Iniciando sua jornada",
    description: "Prepare-se para transformar sua saúde. Você será redirecionado para o onboarding em instantes.",
  },
  awaiting_payment: {
    icon: CreditCard,
    title: "Aguardando pagamento",
    description: "Seu acesso completo será liberado assim que o pagamento for confirmado pelo seu profissional.",
    action: { label: "Aguardando confirmação", route: "/payment-required" },
  },
  awaiting_onboarding_release: {
    icon: Stethoscope,
    title: "Preparando seu acesso",
    description: "Seu profissional está configurando os detalhes finais do seu perfil clínico. Em breve você poderá começar.",
  },
};

export default function OnboardingGateScreen({ status }: Props) {
  const navigate = useNavigate();
  const [showRetry, setShowRetry] = useState(false);
  const config = STATUS_CONFIG[status || "lead_created"] || STATUS_CONFIG.lead_created;
  const Icon = config.icon;

  // Auto-redirect lead_created to onboarding
  useEffect(() => {
    console.log(`[OnboardingGateScreen] Current status: ${status}`);
    
    // Mostre o botão de tentar novamente após 8 segundos se não houver redirecionamento
    const retryTimer = setTimeout(() => setShowRetry(true), 8000);

    if (status === "lead_created") {
      const timer = setTimeout(() => {
        console.log("[OnboardingGate:Redirect] Directing lead_created to /onboarding");
        navigate("/onboarding", { replace: true });
      }, 2000);
      return () => {
        clearTimeout(timer);
        clearTimeout(retryTimer);
      };
    }

    return () => clearTimeout(retryTimer);
  }, [status, navigate]);

  const handleRetry = () => {
    console.log("[OnboardingGate:Retry] Forcing refresh...");
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div className="flex justify-center mb-8">
          <FitJourneyLogo size="lg" />
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-card">
          <CardContent className="pt-8 pb-8 space-y-6 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto"
            >
              <Icon className="w-8 h-8 text-primary" />
            </motion.div>

            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">{config.title}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{config.description}</p>
            </div>

            {/* Animated pulse indicator */}
            <div className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs text-muted-foreground">Aguardando...</span>
            </div>

            {config.action && (
              <Button onClick={() => navigate(config.action!.route)} className="w-full gap-2">
                {config.action.label} <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
