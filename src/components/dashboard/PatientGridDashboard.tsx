import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useLayoutPreference } from "@/hooks/useLayoutPreference";
import { useExperienceUI } from "@/hooks/useExperienceUI";
import { usePatientLifecycleState } from "@/hooks/usePatientLifecycleState";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/queries/queryKeys";
import { supabase } from "@/integrations/supabase/client";
import FitJourneyTimeline from "@/components/timeline/FitJourneyTimeline";
import InlineExperienceToggle from "@/components/dashboard/InlineExperienceToggle";
import ExperienceModeStatusSection from "@/components/dashboard/ExperienceModeStatusSection";
import PlanRequestButton from "@/components/patient/PlanRequestButton";
import {
  UtensilsCrossed, CheckCircle2, Calendar, Dumbbell,
  TrendingUp, Brain, Camera, Camera as CameraIcon, Target,
  LayoutGrid, List, ArrowRight, Sparkles, Rocket, ChevronRight, ChefHat,
  Shield, Activity,
} from "lucide-react";
import NewFeatureBadge from "@/components/common/NewFeatureBadge";

const DailyMealPlanInline = lazy(() => import("@/components/patient/DailyMealPlanInline"));

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
  // Row 1 — Essenciais (basic) — Plano + Feedback + Receitas (renderizados manualmente no bloco basic)
  // ⚠️ Os 3 essenciais do basic estão hard-coded no bloco isBasic. Veja o regression guard abaixo.

  // Row 2 — Acompanhamento (pro+) — TODAS desbloqueadas a partir de "pro"
  { key: "workouts", label: "Meus Treinos", description: "Veja seu plano de treino e registre", icon: Dumbbell, route: "/my-workouts", gradient: "from-blue-600/10 to-blue-700/5", row: 2, minMode: "pro" },
  { key: "physical", label: "Avaliação Física", description: "Evolução corporal e medidas", icon: TrendingUp, route: "/checkin", gradient: "from-violet-500/10 to-violet-600/5", row: 2, minMode: "pro" },
  { key: "checklist", label: "Checklist Diário", description: "Tarefas e hábitos do dia", icon: CheckCircle2, route: "/checklist", gradient: "from-sky-500/10 to-sky-600/5", row: 2, minMode: "pro" },
  { key: "agenda", label: "Agenda / Reavaliação", description: "Consultas e compromissos", icon: Calendar, route: "/appointments", gradient: "from-rose-500/10 to-rose-600/5", row: 2, minMode: "pro" },
  { key: "evolution", label: "Evolução e Gráficos", description: "Visualize seu progresso completo", icon: TrendingUp, route: "/journey", gradient: "from-teal-500/10 to-teal-600/5", row: 2, minMode: "pro" },

  // Row 3 — Inteligência (também liberado a partir de "pro" — sem travas artificiais)
  { key: "ai-insights", label: "IA Insights", description: "Análises inteligentes do seu progresso", icon: Brain, route: "/analyze", gradient: "from-amber-500/10 to-amber-600/5", row: 3, minMode: "pro", badge: { text: "IA", variant: "secondary" } },
  { key: "body-ai", label: "Projeção Corporal", description: "Projeção visual de transformação com IA", icon: Camera, route: "/body-projection", gradient: "from-purple-500/10 to-purple-600/5", row: 3, minMode: "pro", badge: { text: "Novo", variant: "default" } },
  { key: "goals", label: "Metas e Projeção", description: "Metas, objetivos e projeção de peso", icon: Target, route: "/weekly-goals", gradient: "from-orange-500/10 to-orange-600/5", row: 3, minMode: "pro" },
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
  const lifecycle = usePatientLifecycleState();

  const queryClient = useQueryClient();

  // Setup Realtime listener for published plans to ensure instant reflection on the dashboard
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`patient_dashboard_realtime:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meal_plans',
          filter: `patient_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("[Sync] Meal plan changed, invalidating dashboard:", payload);
          // Invalidate all relevant patient dashboard queries
          queryClient.invalidateQueries({
            queryKey: queryKeys.dashboard.patient(user.id),
          });
          // Also invalidate specific meal plan queries
          queryClient.invalidateQueries({
            queryKey: queryKeys.mealPlans.all(user.id),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  useEffect(() => {
    if (!user?.id || lifecycle.isLoading) return;
    if (lifecycle.showOnboarding) {
      navigate("/onboarding", { replace: true });
    }
  }, [user?.id, lifecycle.isLoading, lifecycle.showOnboarding, navigate]);

  // Filter cards by experience mode
  const visibleCards = PATIENT_CARDS.filter((c) => expUI.minMode(c.minMode ?? "basic"));
  const visibleRows = [...new Set(visibleCards.map((c) => c.row))].sort();

  // Onboarding blocking logic — only block if essential steps are missing
  const showOnboardingCard = lifecycle.showOnboarding;
  const blockDashboard = lifecycle.isBlocked;

  if (lifecycle.isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🛡️ REGRESSION GUARD — BASIC MODE PATIENT DASHBOARD
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (expUI.isBasic && !blockDashboard && !showOnboardingCard) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <ExperienceModeStatusSection />
        
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <UtensilsCrossed className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">Olá! 👋</h2>
            <p className="text-muted-foreground text-sm">Seu dia simplificado em um só lugar.</p>
          </div>
          <InlineExperienceToggle />
        </div>

        <div className="space-y-4">
          <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
            <DailyMealPlanInline />
          </Suspense>

          <PlanRequestButton />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card
              className="cursor-pointer border border-primary/20 bg-primary/5 hover:border-primary/40 transition-all p-4 flex items-center gap-3 group"
              onClick={() => navigate("/checkin")}
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <CameraIcon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold">Enviar Feedback</h3>
                <p className="text-[10px] text-muted-foreground">Mande seu peso e fotos</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-all" />
            </Card>

            <Card
              className="cursor-pointer border border-orange-500/20 bg-orange-500/5 hover:border-orange-500/40 transition-all p-4 flex items-center gap-3 group"
              onClick={() => navigate("/recipes")}
            >
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                <ChefHat className="w-5 h-5 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold">Receitas</h3>
                <p className="text-[10px] text-muted-foreground">Pratos saudáveis para você</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-orange-500 transition-all" />
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Onboarding Card — top priority */}
      {showOnboardingCard && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card
            className="relative cursor-pointer overflow-hidden border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-600/5 to-teal-500/10 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 group"
            onClick={() => navigate("/onboarding")}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center gap-4 p-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 flex-shrink-0">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground">Complete sua Anamnese</h3>
                  <Badge variant="default" className="text-[9px] h-5 bg-emerald-600 hover:bg-emerald-500">
                    Obrigatório
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Conclua todo o onboarding para que seu profissional possa criar e entregar seu plano personalizado.
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-emerald-500/60 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
            </div>
          </Card>
        </motion.div>
      )}

      {/* If onboarding not done, block access to the rest */}
      {blockDashboard && (
        <div className="text-center py-8 space-y-4">
          <div className="bg-destructive/10 text-destructive text-xs font-medium px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 mx-auto">
            <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
            Acesso Bloqueado
          </div>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            {lifecycle.blockReason || "Para acessar seus recursos, conclua as etapas essenciais do onboarding primeiro."}
          </p>
          <Button onClick={() => navigate("/onboarding")} className="gap-2">
            <Rocket className="w-4 h-4" /> Continuar Onboarding
          </Button>
        </div>
      )}

      {!blockDashboard && (<>

      <ExperienceModeStatusSection />

      {/* Experience Mode Toggle + Plan Request */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <InlineExperienceToggle />
        <PlanRequestButton />
      </div>

      {/* PRO+: Show daily meal plan */}
      <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
        <DailyMealPlanInline />
      </Suspense>

      {/* FitJourney Timeline — pro+ only */}
      {!expUI.isBasic && <FitJourneyTimeline compact maxHeight="300px" />}

      {/* Advanced Insights — Advanced mode only */}
      {expUI.isAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4 border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-bold">Análise Técnica</h4>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Modo de engenharia ativado. Visualizando metadados de adesão, versão do motor IFJ e indicadores de consistência metabólica.
            </p>
          </Card>
          <Card className="p-4 border-violet-500/20 bg-violet-500/5">
            <div className="flex items-center gap-2 mb-2">
              <Rocket className="w-4 h-4 text-violet-600" />
              <h4 className="text-sm font-bold">Performance</h4>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Projeções de médio prazo baseadas no seu histórico atual de registros e aderência calórica real.
            </p>
          </Card>
        </div>
      )}

      {/* Header with view toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {expUI.isPro ? "Meu Acompanhamento" : "Painel de Controle"}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {expUI.isPro ? "Foco em macros e adesão" : "Gestão completa da sua jornada"}
          </p>
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
                              {expUI.isAdvanced && <NewFeatureBadge featureKey={card.key} variant="badge" />}
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
      
      {/* Advanced Technical Footer */}
      {expUI.isAdvanced && (
        <div className="pt-8 pb-4 text-center space-y-2">
          <Separator className="mb-4 opacity-50" />
          <div className="flex items-center justify-center gap-4 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            <span className="flex items-center gap-1.5"><Shield className="w-3 h-3" /> Engine v3.4.1</span>
            <span className="flex items-center gap-1.5"><Rocket className="w-3 h-3" /> Clinical Core active</span>
            <span className="flex items-center gap-1.5"><Activity className="w-3 h-3" /> Real-time Sync</span>
          </div>
          <p className="text-[9px] text-muted-foreground/60 italic">
            FitJourney Advanced Terminal • Registered patient ID: {user?.id?.slice(0, 8)}...
          </p>
        </div>
      )}
      </>
      )}
    </div>
  );
}
