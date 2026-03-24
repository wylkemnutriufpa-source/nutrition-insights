import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLayoutPreference } from "@/hooks/useLayoutPreference";
import FitJourneyTimeline from "@/components/timeline/FitJourneyTimeline";
import {
  UtensilsCrossed, CheckCircle2, Calendar, Dumbbell,
  TrendingUp, Brain, Camera, Target,
  LayoutGrid, List, ArrowRight, Sparkles,
} from "lucide-react";

interface GridCard {
  key: string;
  label: string;
  description: string;
  icon: any;
  route: string;
  gradient: string;
  badge?: { text: string; variant: "default" | "secondary" | "destructive" | "outline" };
  row: number;
}

const PATIENT_CARDS: GridCard[] = [
  // Row 1 — Ação imediata
  { key: "meal-plan", label: "Plano Alimentar", description: "Seu plano nutricional personalizado", icon: UtensilsCrossed, route: "/my-diet", gradient: "from-emerald-500/10 to-emerald-600/5", row: 1 },
  { key: "checklist", label: "Checklist Diário", description: "Tarefas e hábitos do dia", icon: CheckCircle2, route: "/checklist", gradient: "from-sky-500/10 to-sky-600/5", row: 1 },
  { key: "agenda", label: "Agenda / Reavaliação", description: "Consultas e compromissos", icon: Calendar, route: "/appointments", gradient: "from-rose-500/10 to-rose-600/5", row: 1 },

  // Row 2 — Acompanhamento
  { key: "physical", label: "Avaliação Física", description: "Evolução corporal e medidas", icon: Dumbbell, route: "/checkin", gradient: "from-violet-500/10 to-violet-600/5", row: 2 },
  { key: "evolution", label: "Evolução e Gráficos", description: "Visualize seu progresso completo", icon: TrendingUp, route: "/journey", gradient: "from-teal-500/10 to-teal-600/5", row: 2 },
  { key: "ai-insights", label: "IA Insights", description: "Análises inteligentes do seu progresso", icon: Brain, route: "/analyze", gradient: "from-amber-500/10 to-amber-600/5", row: 2, badge: { text: "IA", variant: "secondary" } },

  // Row 3 — Estratégia futura
  { key: "body-ai", label: "Projeção Corporal", description: "Projeção visual de transformação com IA", icon: Camera, route: "/body-projection", gradient: "from-purple-500/10 to-purple-600/5", row: 3, badge: { text: "Novo", variant: "default" } },
  { key: "goals", label: "Metas e Projeção", description: "Metas, objetivos e projeção de peso", icon: Target, route: "/weekly-goals", gradient: "from-orange-500/10 to-orange-600/5", row: 3 },
];

const ROW_LABELS: Record<number, string> = {
  1: "Ação Imediata",
  2: "Acompanhamento",
  3: "Estratégia Futura",
};

const ROW_ICONS: Record<number, any> = {
  1: Sparkles,
  2: TrendingUp,
  3: Target,
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const cardAnim = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1 },
};

export default function PatientGridDashboard() {
  const navigate = useNavigate();
  const { patientView, setPatientView } = useLayoutPreference();

  const rows = [1, 2, 3];

  return (
    <div className="space-y-6">
      {/* Header with view toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Meu Painel</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Acesse tudo em um só lugar</p>
        </div>
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
        <div className="space-y-5">
          {rows.map((row) => {
            const rowCards = PATIENT_CARDS.filter((c) => c.row === row);
            const RowIcon = ROW_ICONS[row];
            return (
              <div key={row}>
                <div className="flex items-center gap-2 mb-2.5">
                  <RowIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {ROW_LABELS[row]}
                  </span>
                </div>
                <motion.div
                  variants={container}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                >
                  {rowCards.map((card) => {
                    const Icon = card.icon;
                    return (
                      <motion.div key={card.key} variants={cardAnim}>
                        <Card
                          className={`relative cursor-pointer border border-border/50 bg-gradient-to-br ${card.gradient}
                            hover:shadow-lg hover:scale-[1.02] hover:border-primary/20
                            active:scale-[0.98] transition-all duration-200 group overflow-hidden`}
                          onClick={() => navigate(card.route)}
                        >
                          <div className="p-4 flex flex-col items-start gap-3 min-h-[110px]">
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
              </div>
            );
          })}
        </div>
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
