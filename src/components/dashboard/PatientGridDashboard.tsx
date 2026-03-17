import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useLayoutPreference, ViewMode } from "@/hooks/useLayoutPreference";
import {
  UtensilsCrossed, CheckCircle2, Dumbbell, Brain,
  Calendar, TrendingUp, FileText, Activity,
  ChefHat, Heart, Calculator, Camera,
  LayoutGrid, List, ArrowRight, Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface GridCard {
  key: string;
  label: string;
  description: string;
  icon: any;
  route: string;
  gradient: string;
  badge?: { text: string; variant: "default" | "secondary" | "destructive" | "outline" };
  priority: number;
}

const PATIENT_CARDS: GridCard[] = [
  // Row 1 - Priority
  { key: "meal-plan", label: "Plano Alimentar", description: "Seu plano nutricional personalizado", icon: UtensilsCrossed, route: "/plano-alimentar", gradient: "from-emerald-500/10 to-emerald-600/5", priority: 1 },
  { key: "checklist", label: "Checklist", description: "Tarefas diárias de acompanhamento", icon: CheckCircle2, route: "/checklist", gradient: "from-sky-500/10 to-sky-600/5", priority: 1 },
  { key: "physical", label: "Avaliação Física", description: "Evolução corporal e medidas", icon: Dumbbell, route: "/physical-assessment", gradient: "from-violet-500/10 to-violet-600/5", priority: 1 },
  { key: "ai-insights", label: "IA Insights", description: "Análises inteligentes do seu progresso", icon: Brain, route: "/analyze", gradient: "from-amber-500/10 to-amber-600/5", priority: 1, badge: { text: "IA", variant: "secondary" } },

  // Row 2
  { key: "agenda", label: "Agenda", description: "Consultas e compromissos", icon: Calendar, route: "/appointments", gradient: "from-rose-500/10 to-rose-600/5", priority: 2 },
  { key: "timeline", label: "Timeline", description: "Jornada de transformação", icon: TrendingUp, route: "/jornada", gradient: "from-teal-500/10 to-teal-600/5", priority: 2 },
  { key: "protocols", label: "Protocolos", description: "Protocolos clínicos ativos", icon: FileText, route: "/protocols", gradient: "from-indigo-500/10 to-indigo-600/5", priority: 2 },
  { key: "metabolic", label: "Radar Metabólico", description: "Visão do seu metabolismo", icon: Activity, route: "/metabolic-radar", gradient: "from-pink-500/10 to-pink-600/5", priority: 2 },

  // Row 3
  { key: "recipes", label: "Receitas", description: "Receitas saudáveis e práticas", icon: ChefHat, route: "/recipes", gradient: "from-orange-500/10 to-orange-600/5", priority: 3 },
  { key: "clinical", label: "Decisão Clínica", description: "Recomendações personalizadas", icon: Heart, route: "/clinical-decision", gradient: "from-red-500/10 to-red-600/5", priority: 3 },
  { key: "calculators", label: "Calculadoras", description: "Ferramentas de cálculo", icon: Calculator, route: "/weight-calculator", gradient: "from-cyan-500/10 to-cyan-600/5", priority: 3 },
  { key: "body-ai", label: "Evolução Corporal IA", description: "Projeção visual de transformação", icon: Camera, route: "/body-analysis", gradient: "from-purple-500/10 to-purple-600/5", priority: 3, badge: { text: "Novo", variant: "default" } },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const cardAnim = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1 },
};

export default function PatientGridDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { patientView, setPatientView } = useLayoutPreference();

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Meu Painel</h2>
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
          <Button
            variant={patientView === "grid" ? "default" : "ghost"}
            size="sm"
            className="h-7 px-2 gap-1 text-xs"
            onClick={() => setPatientView("grid")}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Grade
          </Button>
          <Button
            variant={patientView === "list" ? "default" : "ghost"}
            size="sm"
            className="h-7 px-2 gap-1 text-xs"
            onClick={() => setPatientView("list")}
          >
            <List className="w-3.5 h-3.5" />
            Lista
          </Button>
        </div>
      </div>

      {/* Grid view */}
      {patientView === "grid" && (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
        >
          {PATIENT_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <motion.div key={card.key} variants={cardAnim}>
                <Card
                  className={`relative cursor-pointer border border-border/50 bg-gradient-to-br ${card.gradient} 
                    hover:shadow-lg hover:scale-[1.02] hover:border-primary/20 
                    active:scale-[0.98] transition-all duration-200 group overflow-hidden`}
                  onClick={() => navigate(card.route)}
                >
                  <div className="p-4 flex flex-col items-start gap-3 min-h-[120px]">
                    <div className="flex items-center justify-between w-full">
                      <div className="w-10 h-10 rounded-xl bg-card/80 border border-border/30 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                        <Icon className="w-5 h-5 text-foreground/80 group-hover:text-primary transition-colors" />
                      </div>
                      {card.badge && (
                        <Badge variant={card.badge.variant} className="text-[9px] h-5">
                          {card.badge.text}
                        </Badge>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-foreground leading-tight">{card.label}</h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{card.description}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all self-end" />
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* List view */}
      {patientView === "list" && (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-1.5"
        >
          {PATIENT_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <motion.div key={card.key} variants={cardAnim}>
                <Card
                  className="cursor-pointer border border-border/50 hover:border-primary/20 hover:bg-muted/30 transition-all group"
                  onClick={() => navigate(card.route)}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${card.gradient} border border-border/30 flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-4 h-4 text-foreground/80" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-foreground">{card.label}</h3>
                      <p className="text-xs text-muted-foreground truncate">{card.description}</p>
                    </div>
                    {card.badge && (
                      <Badge variant={card.badge.variant} className="text-[9px] h-5 flex-shrink-0">
                        {card.badge.text}
                      </Badge>
                    )}
                    <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors flex-shrink-0" />
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
