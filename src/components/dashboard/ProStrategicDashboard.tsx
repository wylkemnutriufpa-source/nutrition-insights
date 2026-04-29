import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, ClipboardCheck, AlertTriangle, Trophy,
  TrendingUp, Activity, ArrowRight, Brain,
  Calendar, MessageSquare, BarChart3, Zap, FlaskConical, Sparkles,
} from "lucide-react";

const STRATEGIC_CARDS = [
  { key: "patients", label: "Central de Pacientes", description: "Gestão completa do portfolio", icon: Users, route: "/patients", gradient: "from-emerald-500/10 to-emerald-600/5", size: "large" },
  { key: "pending", label: "Planos Pendentes", description: "Aprovações e revisões aguardando", icon: ClipboardCheck, route: "/meal-plans", gradient: "from-amber-500/10 to-amber-600/5", size: "large" },
  { key: "alerts", label: "Alertas Clínicos IA", description: "Pacientes que precisam de atenção", icon: AlertTriangle, route: "/clinical-risk", gradient: "from-red-500/10 to-red-600/5", badge: "Urgente" },
  { key: "ranking", label: "Ranking Pacientes", description: "Engajamento e gamificação", icon: Trophy, route: "/ranking", gradient: "from-amber-500/10 to-yellow-500/5" },
  { key: "evolution", label: "Evoluções Recentes", description: "Últimos progressos registrados", icon: TrendingUp, route: "/patients", gradient: "from-sky-500/10 to-sky-600/5" },
  { key: "engagement", label: "Engajamento Semanal", description: "Adesão e consistência da semana", icon: Activity, route: "/reports", gradient: "from-violet-500/10 to-violet-600/5" },
  { key: "copilot", label: "Copilot Clínico", description: "Assistente IA de decisão", icon: Brain, route: "/clinical-intelligence", gradient: "from-purple-500/10 to-purple-600/5", badge: "IA" },
  { key: "agenda", label: "Agenda do Dia", description: "Consultas e compromissos", icon: Calendar, route: "/appointments", gradient: "from-rose-500/10 to-rose-600/5" },
  { key: "chat", label: "Mensagens", description: "Chat com pacientes", icon: MessageSquare, route: "/chat", gradient: "from-teal-500/10 to-teal-600/5" },
  { key: "analytics", label: "Analytics Avançado", description: "Métricas e tendências", icon: BarChart3, route: "/reports", gradient: "from-indigo-500/10 to-indigo-600/5" },
  { key: "lab-interpreter", label: "Interpretador de Exames", description: "Análise bioquímica com IA", icon: FlaskConical, route: "/lab-interpreter", gradient: "from-teal-500/10 to-emerald-500/5", badge: "Premium" },
  { key: "editor", label: "Editor Premium V2", description: "Criar e editar planos", icon: Zap, route: "/editor-v2", gradient: "from-primary/10 to-primary/5" },
  { key: "editor-v3", label: "Editor Elite V3", description: "Modo avançado (Semana/Dia)", icon: Sparkles, route: "/meal-plan-editor-v3", gradient: "from-purple-500/10 to-purple-600/5", badge: "Elite" },
  { key: "automations", label: "Automações", description: "Regras e gatilhos", icon: Zap, route: "/automation", gradient: "from-cyan-500/10 to-cyan-600/5" },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const cardAnim = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1 },
};

export default function ProStrategicDashboard() {
  const navigate = useNavigate();

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
    >
      {STRATEGIC_CARDS.map((card) => {
        const Icon = card.icon;
        const isLarge = card.size === "large";
        return (
          <motion.div
            key={card.key}
            variants={cardAnim}
            className={isLarge ? "col-span-2 lg:col-span-1" : ""}
          >
            <Card
              className={`relative cursor-pointer border border-border/50 bg-gradient-to-br ${card.gradient}
                hover:shadow-lg hover:scale-[1.02] hover:border-primary/20
                active:scale-[0.98] transition-all duration-200 group overflow-hidden h-full`}
              onClick={() => navigate(card.route)}
            >
              <div className="p-4 flex flex-col items-start gap-3 min-h-[130px]">
                <div className="flex items-center justify-between w-full">
                  <div className="w-10 h-10 rounded-xl bg-card/80 border border-border/30 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                    <Icon className="w-5 h-5 text-foreground/80 group-hover:text-primary transition-colors" />
                  </div>
                  {card.badge && (
                    <Badge variant="secondary" className="text-[9px] h-5">
                      {card.badge}
                    </Badge>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground leading-tight">{card.label}</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{card.description}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all self-end" />
              </div>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
