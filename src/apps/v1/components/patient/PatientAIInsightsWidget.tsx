import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingDown, TrendingUp, Utensils, Clock, Lightbulb, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { safeNum } from "@/lib/formatMacros";

interface AIInsight {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  type: "warning" | "info" | "success" | "suggestion";
}

export default function PatientAIInsightsWidget() {
  const { user } = useAuth();
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [confidence, setConfidence] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function analyze() {
      try {
        const result: AIInsight[] = [];
        let dataPoints = 0;

        // 1. Get latest clinical snapshots (last 14 days)
        const { data: snapshots } = await (supabase as any)
          .from("clinical_daily_snapshots")
          .select("adherence_score, dropout_risk_score, momentum_direction, checklist_completion_rate, snapshot_date")
          .eq("patient_id", user!.id)
          .order("snapshot_date", { ascending: false })
          .limit(14);

        if (snapshots?.length) {
          dataPoints += snapshots.length;
          
          // Adherence trend
          const recent = snapshots.slice(0, 7);
          const older = snapshots.slice(7, 14);
          
          if (recent.length >= 3) {
            const recentAvg = recent.reduce((a: number, s: any) => a + (safeNum(s?.adherence_score)), 0) / recent.length;
            
            if (older.length >= 3) {
              const olderAvg = older.reduce((a: number, s: any) => a + (safeNum(s?.adherence_score)), 0) / older.length;
              const delta = Math.round(recentAvg - olderAvg);
              
              if (delta < -15) {
                result.push({
                  icon: TrendingDown,
                  text: `Adesão caiu ${Math.abs(delta)}% nos últimos 7 dias`,
                  type: "warning",
                });
              } else if (delta > 10) {
                result.push({
                  icon: TrendingUp,
                  text: `Adesão subiu ${delta}% na última semana — continue assim!`,
                  type: "success",
                });
              }
            }

            // Checklist completion
            const avgChecklist = recent.reduce((a: number, s: any) => a + (safeNum(s?.checklist_completion_rate)), 0) / recent.length;
            if (avgChecklist < 40) {
              result.push({
                icon: Activity,
                text: `Checklist diário em ${Math.round(avgChecklist)}% — tente completar ao menos 3 itens por dia`,
                type: "info",
              });
            }
          }
        }

        // 2. Get meal adherence patterns
        const { data: adherence } = await (supabase as any)
          .from("meal_plan_adherence")
          .select("meal_type, adherence_status, logged_at")
          .eq("patient_id", user!.id)
          .order("logged_at", { ascending: false })
          .limit(50);

        if (adherence?.length) {
          dataPoints += adherence.length;
          
          // Find most skipped meal type
          const skippedByType: Record<string, number> = {};
          const totalByType: Record<string, number> = {};
          
          for (const a of adherence) {
            const type = a.meal_type ?? "other";
            totalByType[type] = (totalByType[type] ?? 0) + 1;
            if (a.adherence_status === "skipped") {
              skippedByType[type] = (skippedByType[type] ?? 0) + 1;
            }
          }

          let worstMeal = "";
          let worstRate = 0;
          for (const [type, total] of Object.entries(totalByType)) {
            const skipped = skippedByType[type] ?? 0;
            const rate = skipped / total;
            if (rate > worstRate && total >= 5) {
              worstRate = rate;
              worstMeal = type;
            }
          }

          const mealLabels: Record<string, string> = {
            breakfast: "café da manhã",
            lunch: "almoço",
            dinner: "jantar",
            snack: "lanche",
            morning_snack: "lanche da manhã",
            afternoon_snack: "lanche da tarde",
          };

          if (worstRate > 0.3 && worstMeal) {
            result.push({
              icon: Utensils,
              text: `Maior dificuldade: ${mealLabels[worstMeal] ?? worstMeal}`,
              type: "warning",
            });
          }

          // Detect late meal pattern
          const lateCount = adherence.filter((a: any) => {
            if (!a.logged_at) return false;
            const hour = new Date(a.logged_at).getHours();
            return hour >= 22 || hour < 5;
          }).length;

          if (lateCount > 5) {
            result.push({
              icon: Clock,
              text: "Padrão detectado: registros em horários tardios",
              type: "info",
            });
          }
        }

        // 3. Generate suggestions based on findings
        if (result.some(r => r.type === "warning")) {
          const hasLowAdherence = result.some(r => r.text.includes("caiu"));
          const hasMealIssue = result.some(r => r.text.includes("dificuldade"));
          
          if (hasMealIssue) {
            const meal = result.find(r => r.text.includes("dificuldade"))?.text.split(": ")[1] ?? "";
            result.push({
              icon: Lightbulb,
              text: `Sugestão: simplifique o ${meal} com receitas rápidas`,
              type: "suggestion",
            });
          } else if (hasLowAdherence) {
            result.push({
              icon: Lightbulb,
              text: "Sugestão: foque em 2-3 metas pequenas por dia",
              type: "suggestion",
            });
          }
        }

        // If no insights, add motivational
        if (result.length === 0) {
          result.push({
            icon: TrendingUp,
            text: "Continue registrando suas atividades para insights personalizados!",
            type: "info",
          });
        }

        // Calculate confidence based on data points
        const conf = Math.min(95, Math.round(30 + (safeNum(dataPoints) / 60) * 65));
        setConfidence(conf);
        setInsights(result);
      } catch (e) {
        console.error("Patient AI insights error:", e);
      } finally {
        setLoading(false);
      }
    }

    analyze();
  }, [user]);

  if (loading) {
    return (
      <Card className="border-accent/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-accent animate-pulse" />
            <span className="text-sm text-muted-foreground">Analisando seus dados...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (insights.length === 0) return null;

  const typeStyles: Record<string, string> = {
    warning: "text-warning",
    info: "text-info",
    success: "text-success",
    suggestion: "text-accent",
  };

  const typeBullets: Record<string, string> = {
    warning: "bg-warning",
    info: "bg-info",
    success: "bg-success",
    suggestion: "bg-accent",
  };

  return (
    <Card className="relative overflow-hidden border-accent/20 bg-gradient-to-br from-accent/5 via-background to-primary/5">
      <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

      <CardHeader className="pb-2 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-primary flex items-center justify-center">
              <Brain className="w-4 h-4 text-primary-foreground" />
            </div>
            <CardTitle className="text-sm font-display">AI Insights</CardTitle>
          </div>
          {confidence > 0 && (
            <Badge variant="outline" className="text-[10px] border-accent/30 text-accent">
              {confidence}% confiança
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="relative z-10 pt-0 space-y-2">
        {insights.map((insight, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-start gap-2.5 p-2 rounded-lg bg-background/40"
          >
            <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0", typeBullets[insight.type])} />
            <div className="flex items-start gap-2 min-w-0">
              <insight.icon className={cn("w-3.5 h-3.5 mt-0.5 flex-shrink-0", typeStyles[insight.type])} />
              <p className="text-xs text-foreground/90 leading-relaxed">{insight.text}</p>
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}
