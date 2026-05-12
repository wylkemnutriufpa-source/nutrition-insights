import { motion } from "framer-motion";
import { ShieldCheck, CreditCard, Crown, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@v1/components/ui/button";
import { Card, CardContent } from "@v1/components/ui/card";
import FitJourneyLogo from "@v1/components/common/FitJourneyLogo";
import { useAuth } from "@v1/lib/auth";

export default function PaymentRequired() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg"
      >
        <div className="flex justify-center mb-8">
          <FitJourneyLogo size="lg" />
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-card overflow-hidden">
          {/* Premium header strip */}
          <div className="h-1.5 bg-gradient-to-r from-primary via-amber-400 to-primary" />

          <CardContent className="pt-8 pb-8 space-y-6 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto"
            >
              <ShieldCheck className="w-8 h-8 text-amber-500" />
            </motion.div>

            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                Acesso requer pagamento ativo
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Para acessar o onboarding, anamnese e plano alimentar, você precisa ter um 
                pagamento confirmado ou um plano ativo com seu profissional.
              </p>
            </div>

            {/* What qualifies */}
            <div className="text-left space-y-3 bg-muted/30 rounded-xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                O que libera seu acesso:
              </p>
              <div className="flex items-start gap-3">
                <CreditCard className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span className="text-sm text-foreground">Pagamento de consulta confirmado</span>
              </div>
              <div className="flex items-start gap-3">
                <Crown className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <span className="text-sm text-foreground">Plano de prestígio ativo (Pro, Premium ou superior)</span>
              </div>
              <div className="flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span className="text-sm text-foreground">Liberação direta pelo seu profissional</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Entre em contato com seu nutricionista para regularizar seu acesso.
            </p>

            {/* Animated pulse indicator */}
            <div className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs text-muted-foreground">Aguardando confirmação de pagamento...</span>
            </div>

            <Button variant="outline" onClick={signOut} className="w-full gap-2 mt-4">
              Sair da conta <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
