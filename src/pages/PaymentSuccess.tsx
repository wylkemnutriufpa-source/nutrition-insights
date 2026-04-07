import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function PaymentSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-redirect after 15 seconds
    const timer = setTimeout(() => navigate("/dashboard"), 15000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Card className="glass shadow-card overflow-hidden border-primary/20">
          <div className="h-1.5 gradient-primary" />
          <CardContent className="pt-10 pb-8 px-8 text-center space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center"
            >
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </motion.div>

            <div className="space-y-2">
              <h1 className="text-2xl font-display font-bold text-foreground">
                Pagamento Confirmado! 🎉
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Obrigado pela sua confiança! Seu plano foi ativado com sucesso.
              </p>
            </div>

            <div className="bg-muted/30 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-center gap-2 text-primary">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-semibold">O que acontece agora?</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Seu acesso já está liberado. Explore todas as funcionalidades do seu plano e comece a transformar seus resultados!
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Button
                onClick={() => navigate("/dashboard")}
                className="w-full gap-2"
                size="lg"
              >
                Ir para o Dashboard
                <ArrowRight className="w-4 h-4" />
              </Button>
              <p className="text-[10px] text-muted-foreground">
                Redirecionamento automático em 15 segundos
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
