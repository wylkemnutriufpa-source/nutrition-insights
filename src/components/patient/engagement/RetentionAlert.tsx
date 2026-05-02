
import React from "react";
import { AlertTriangle, AlertCircle, ArrowRight, Flame } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface RetentionAlertProps {
  riskLevel: "on_track" | "risco_leve" | "risco_alto";
}

export default function RetentionAlert({ riskLevel }: RetentionAlertProps) {
  const navigate = useNavigate();

  if (riskLevel === "on_track") return null;

  const config = {
    risco_leve: {
      icon: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
      title: "Sentimos sua falta ontem! 😟",
      description: "Que tal retomar seu plano agora? Pequenos passos levam a grandes resultados.",
      buttonText: "Ver meu plano",
      variant: "warning" as const,
      className: "bg-yellow-500/10 border-yellow-500/20",
    },
    risco_alto: {
      icon: <AlertCircle className="w-6 h-6 text-destructive" />,
      title: "Não deixe seu esforço se perder! 🔥",
      description: "Você está há alguns dias sem registrar suas refeições. Vamos voltar ao foco hoje?",
      buttonText: "Retomar Plano Agora",
      variant: "destructive" as const,
      className: "bg-destructive/10 border-destructive/20 shadow-lg shadow-destructive/5",
    },
  }[riskLevel];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Card className={`${config.className} border`}>
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-background/50">
              {config.icon}
            </div>
            <div>
              <h4 className="font-bold text-sm md:text-base">{config.title}</h4>
              <p className="text-xs md:text-sm text-muted-foreground">{config.description}</p>
            </div>
          </div>
          <Button 
            size="sm" 
            variant={config.variant === "warning" ? "outline" : "default"}
            className="whitespace-nowrap gap-2 hidden md:flex"
            onClick={() => navigate("/patient/meal-plan")}
          >
            {config.buttonText}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </CardContent>
        <div className="p-4 pt-0 md:hidden">
           <Button 
            size="sm" 
            className="w-full gap-2"
            variant={config.variant === "warning" ? "outline" : "default"}
            onClick={() => navigate("/patient/meal-plan")}
          >
            {config.buttonText}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
