import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingDown, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";

interface PatientSignals {
  adherenceScore?: number;
  adherenceTrend?: number; // delta from previous week
  streakDays?: number;
  mealsPerDay?: number;
  checklistPct?: number;
  weightStagnationDays?: number;
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: "caloric" | "behavioral" | "protocol" | "engagement";
  priority: "high" | "medium" | "low";
  icon: string;
}

function generateRecommendations(signals: PatientSignals): Recommendation[] {
  const recs: Recommendation[] = [];

  // Low adherence → simplify plan
  if ((signals.adherenceScore ?? 100) < 40) {
    recs.push({
      id: "simplify_plan",
      title: "Simplificar Plano Alimentar",
      description: `Score de aderência em ${Math.round(signals.adherenceScore ?? 0)}%. Considere reduzir a complexidade do plano: menos refeições, substituições mais simples.`,
      category: "caloric",
      priority: "high",
      icon: "📋",
    });
  }

  // Dropping trend → motivational intervention
  if ((signals.adherenceTrend ?? 0) < -15) {
    recs.push({
      id: "motivational_intervention",
      title: "Intervenção Motivacional",
      description: `Aderência caiu ${Math.abs(Math.round(signals.adherenceTrend ?? 0))}% vs semana anterior. Agende conversa rápida para entender dificuldades e ajustar expectativas.`,
      category: "behavioral",
      priority: "high",
      icon: "💬",
    });
  }

  // Low meal tracking → simplify tracking
  if ((signals.mealsPerDay ?? 3) < 1.5) {
    recs.push({
      id: "simplify_tracking",
      title: "Facilitar Registro de Refeições",
      description: "Paciente registra menos de 2 refeições/dia. Sugira fotos rápidas ao invés de detalhamento completo.",
      category: "behavioral",
      priority: "medium",
      icon: "📸",
    });
  }

  // Streak break → micro-goals
  if ((signals.streakDays ?? 1) === 0) {
    recs.push({
      id: "micro_goals",
      title: "Ativar Micro-Metas",
      description: "Streak zerado. Crie missões simples (1-2 tarefas/dia) para reconstruir hábito gradualmente.",
      category: "engagement",
      priority: "medium",
      icon: "🎯",
    });
  }

  // Weight stagnation → review calories
  if ((signals.weightStagnationDays ?? 0) > 14) {
    recs.push({
      id: "review_calories",
      title: "Revisar Meta Calórica",
      description: `Peso estável há ${signals.weightStagnationDays} dias. Considere ajuste de 10-15% nas calorias ou mudança de estratégia (jejum intermitente, ciclagem de carboidratos).`,
      category: "caloric",
      priority: "medium",
      icon: "⚖️",
    });
  }

  // Good adherence → increase complexity
  if ((signals.adherenceScore ?? 0) > 80 && (signals.streakDays ?? 0) > 7) {
    recs.push({
      id: "increase_complexity",
      title: "Paciente Pronto para Desafio",
      description: `Aderência ${Math.round(signals.adherenceScore ?? 0)}% com ${signals.streakDays} dias de streak. Considere aumentar intensidade, adicionar suplementação ou novos hábitos.`,
      category: "protocol",
      priority: "low",
      icon: "🚀",
    });
  }

  // High checklist, low meals → focus shift
  if ((signals.checklistPct ?? 0) > 70 && (signals.mealsPerDay ?? 3) < 2) {
    recs.push({
      id: "focus_meals",
      title: "Redirecionar Foco para Alimentação",
      description: "Paciente cumpre checklist mas não registra refeições. O plano pode estar complexo demais para a rotina atual.",
      category: "behavioral",
      priority: "medium",
      icon: "🍽️",
    });
  }

  return recs.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });
}

const PRIORITY_CONFIG = {
  high: { variant: "destructive" as const, icon: AlertTriangle },
  medium: { variant: "default" as const, icon: TrendingDown },
  low: { variant: "secondary" as const, icon: CheckCircle2 },
};

interface SmartRecommendationsPanelProps {
  signals: PatientSignals;
}

export function SmartRecommendationsPanel({ signals }: SmartRecommendationsPanelProps) {
  const recommendations = useMemo(() => generateRecommendations(signals), [signals]);

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500/50" />
          <p className="text-sm text-muted-foreground">Paciente no caminho certo! Sem recomendações no momento.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          Recomendações Inteligentes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {recommendations.map((rec) => {
          const config = PRIORITY_CONFIG[rec.priority];
          return (
            <div key={rec.id} className="p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0 mt-0.5">{rec.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium">{rec.title}</p>
                    <Badge variant={config.variant} className="text-[10px]">
                      {rec.priority === "high" ? "Urgente" : rec.priority === "medium" ? "Sugerido" : "Opcional"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{rec.description}</p>
                </div>
              </div>
            </div>
          );
        })}
        <p className="text-[10px] text-muted-foreground text-center pt-2">
          ⚠️ Sugestões automáticas — o nutricionista decide a conduta
        </p>
      </CardContent>
    </Card>
  );
}

export { generateRecommendations };
export type { PatientSignals, Recommendation };
