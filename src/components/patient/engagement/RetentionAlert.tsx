
import React from "react";
import { AlertTriangle, AlertCircle, ArrowRight, Flame, Moon, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface RetentionAlertProps {
  riskLevel: "on_track" | "risco_leve" | "risco_alto";
  isStreakAtRisk?: boolean;
  criticalNightMessage?: string | null;
  currentStreak?: number;
}

export default function RetentionAlert({ 
  riskLevel, 
  isStreakAtRisk, 
  criticalNightMessage,
  currentStreak = 0 
}: RetentionAlertProps) {
  const navigate = useNavigate();

  // Determine active alert configuration
  const getAlertConfig = () => {
    if (criticalNightMessage) {
      return {
        icon: <Moon className="w-5 h-5 text-indigo-500" />,
        title: "Ainda dá tempo! 🌙",
        description: criticalNightMessage,
        buttonText: "Fechar meu dia",
        variant: "default" as const,
        className: "bg-indigo-500/10 border-indigo-500/20",
      };
    }

    if (isStreakAtRisk && currentStreak > 0) {
      return {
        icon: <Flame className="w-5 h-5 text-orange-500 animate-bounce" />,
        title: "Sequência em risco! 🔥",
        description: `Você pode perder sua sequência de ${currentStreak} dias hoje. Não desista agora!`,
        buttonText: "Manter Sequência",
        variant: "default" as const,
        className: "bg-orange-500/10 border-orange-500/20 border-2",
      };
    }

    if (riskLevel === "risco_leve") {
      return {
        icon: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
        title: "Sentimos sua falta ontem! 😟",
        description: "Que tal retomar seu plano agora? Pequenos passos levam a grandes resultados.",
        buttonText: "Ver meu plano",
        variant: "warning" as const,
        className: "bg-yellow-500/10 border-yellow-500/20",
      };
    }

    if (riskLevel === "risco_alto") {
      return {
        icon: <AlertCircle className="w-6 h-6 text-destructive" />,
        title: "Não deixe seu esforço se perder! 🔥",
        description: "Você está há alguns dias sem registrar suas refeições. Vamos voltar ao foco hoje?",
        buttonText: "Retomar Plano Agora",
        variant: "destructive" as const,
        className: "bg-destructive/10 border-destructive/20 shadow-lg shadow-destructive/5",
      };
    }

    return null;
  };

  const config = getAlertConfig();
  if (!config) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mb-6"
    >
      <Card className={`${config.className} border overflow-hidden`}>
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full">
            <div className="p-2 rounded-full bg-background/50 shrink-0">
              {config.icon}
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-sm md:text-base leading-tight">{config.title}</h4>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{config.description}</p>
            </div>
          </div>
          <Button 
            size="sm" 
            variant={config.variant === "warning" ? "outline" : "default"}
            className="whitespace-nowrap gap-2 w-full md:w-auto"
            onClick={() => navigate("/patient-plan")}
          >
            {config.buttonText}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
