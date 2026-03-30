import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useLayoutPreference } from "@/hooks/useLayoutPreference";
import { useExperienceUI } from "@/hooks/useExperienceUI";
import FitJourneyTimeline from "@/components/timeline/FitJourneyTimeline";
import {
  UtensilsCrossed, CheckCircle2, Calendar, Dumbbell,
  TrendingUp, Brain, Camera, Target,
  LayoutGrid, List, ArrowRight, Sparkles, Rocket, ChevronRight, ChefHat,
} from "lucide-react";
import NewFeatureBadge from "@/components/common/NewFeatureBadge";

type MinMode = "basic" | "pro" | "advanced";

interface GridCard {
  key: string;
  label: string;
  description: string;
  icon: any;
  route: string;
  gradient: string;
  badge?: { text: string; variant: "default" | "secondary" | "destructive" | "outline" };
  row: number;
  /** Minimum experience mode to show this card. Defaults to "basic" */
  minMode?: MinMode;
}

const PATIENT_CARDS: GridCard[] = [
  // Row 1 — Essenciais (basic)
  { key: "meal-plan", label: "Plano Alimentar", description: "Seu plano nutricional personalizado", icon: UtensilsCrossed, route: "/my-diet", gradient: "from-emerald-500/10 to-emerald-600/5", row: 1, minMode: "basic" },
  { key: "physical", label: "Avaliação Física", description: "Evolução corporal e medidas", icon: Dumbbell, route: "/checkin", gradient: "from-violet-500/10 to-violet-600/5", row: 1, minMode: "basic" },
  { key: "recipes", label: "Receitas", description: "Receitas saudáveis e práticas", icon: ChefHat, route: "/recipes", gradient: "from-orange-500/10 to-orange-600/5", row: 1, minMode: "basic" },

  // Row 2 — Acompanhamento (pro+)
  { key: "checklist", label: "Checklist Diário", description: "Tarefas e hábitos do dia", icon: CheckCircle2, route: "/checklist", gradient: "from-sky-500/10 to-sky-600/5", row: 2, minMode: "pro" },
  { key: "agenda", label: "Agenda / Reavaliação", description: "Consultas e compromissos", icon: Calendar, route: "/appointments", gradient: "from-rose-500/10 to-rose-600/5", row: 2, minMode: "pro" },
  { key: "evolution", label: "Evolução e Gráficos", description: "Visualize seu progresso completo", icon: TrendingUp, route: "/journey", gradient: "from-teal-500/10 to-teal-600/5", row: 2, minMode: "pro" },

  // Row 3 — Estratégia futura (advanced)
  { key: "ai-insights", label: "IA Insights", description: "Análises inteligentes do seu progresso", icon: Brain, route: "/analyze", gradient: "from-amber-500/10 to-amber-600/5", row: 3, minMode: "advanced", badge: { text: "IA", variant: "secondary" } },
  { key: "body-ai", label: "Projeção Corporal", description: "Projeção visual de transformação com IA", icon: Camera, route: "/body-projection", gradient: "from-purple-500/10 to-purple-600/5", row: 3, minMode: "advanced", badge: { text: "Novo", variant: "default" } },
  { key: "goals", label: "Metas e Projeção", description: "Metas, objetivos e projeção de peso", icon: Target, route: "/weekly-goals", gradient: "from-orange-500/10 to-orange-600/5", row: 3, minMode: "advanced" },
];

const ROW_LABELS: Record<number, string> = {
  1: "Essencial",
  2: "Acompanhamento",
  3: "Estratégia Avançada",
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
  const { user } = useAuth();
  const expUI = useExperienceUI();
  const [onboarding, setOnboarding] = useState<any>(null);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("onboarding_pipelines" as any)
      .select("id, status, current_step")
      .eq("patient_id", user.id)
      .in("status", ["active", "in_progress", "pending"])
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) setOnboarding(data[0]);
      });
  }, [user?.id]);

  // Filter cards by experience mode
  const visibleCards = PATIENT_CARDS.filter((c) => expUI.minMode(c.minMode ?? "basic"));
  const visibleRows = [...new Set(visibleCards.map((c) => c.row))].sort();

  const ONBOARDING_KEY = "patient_onboarding_completed";
  const onboardingDone = localStorage.getItem(ONBOARDING_KEY) === "true";
  const showOnboardingCard = onboarding || !onboardingDone;

  return (
    <div className="space-y-6">
      {/* Onboarding Card — top priority */}
      {showOnboardingCard && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card
            className="relative cursor-pointer overflow-hidden border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-600/5 to-teal-500/10 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 group"
            onClick={() => navigate("/onboarding-paciente")}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center gap-4 p-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 flex-shrink-0">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground">Onboarding FitJourney</h3>
                  <Badge variant="default" className="text-[9px] h-5 bg-emerald-600 hover:bg-emerald-500">
                    {onboarding ? (onboarding as any).status === "active" ? "Em andamento" : "Pendente" : "Iniciar"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {onboarding
                    ? `Etapa atual: ${(onboarding as any).current_step || (onboarding as any).status}`
                    : "Conheça o sistema e comece sua jornada de transformação"}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-emerald-500/60 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
            </div>
          </Card>
        </motion.div>
      )}

      {/* FitJourney Timeline — hidden in basic mode */}
      {!expUI.isBasic && <FitJourneyTimeline compact maxHeight="400px" />}

      {/* Header with view toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">{expUI.isBasic ? "Minha Jornada" : "Meu Painel"}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{expUI.isBasic ? "Foque no essencial para seguir seu plano" : "Acesse tudo em um só lugar"}</p>
        </div>
        {!expUI.isBasic && (
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
        )}
      </div>

      {/* Grid view */}
      {patientView === "grid" && (
        <div className="space-y-5">
          {visibleRows.map((row) => {
            const rowCards = visibleCards.filter((c) => c.row === row);
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
                              <NewFeatureBadge featureKey={card.key} variant="badge" />
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
          {visibleCards.map((card) => {
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
                    <NewFeatureBadge featureKey={card.key} variant="dot" />
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
