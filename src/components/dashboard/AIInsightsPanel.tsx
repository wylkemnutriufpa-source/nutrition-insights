import { motion } from "framer-motion";
import { Brain, TrendingUp, TrendingDown, AlertTriangle, Moon, Utensils, Activity, Heart } from "lucide-react";

interface Insight {
  title: string;
  description: string;
  category: string;
  affected_count?: number;
  severity: "info" | "warning" | "critical";
}

const categoryConfig: Record<string, { icon: any; color: string }> = {
  sleep: { icon: Moon, color: "text-info" },
  metabolism: { icon: Activity, color: "text-accent" },
  nutrition: { icon: Utensils, color: "text-primary" },
  adherence: { icon: TrendingDown, color: "text-warning" },
  risk: { icon: AlertTriangle, color: "text-destructive" },
  progress: { icon: TrendingUp, color: "text-success" },
};

const severityBg: Record<string, string> = {
  info: "bg-info/10 border-info/20",
  warning: "bg-warning/10 border-warning/20",
  critical: "bg-destructive/10 border-destructive/20",
};

export default function AIInsightsPanel({ insights, loading }: { insights: Insight[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-primary animate-pulse" />
          <h2 className="font-display font-semibold">Insights da IA</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-lg bg-muted/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!insights || insights.length === 0) {
    return (
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-5 h-5 text-primary" />
          <h2 className="font-display font-semibold">Insights da IA</h2>
        </div>
        <p className="text-sm text-muted-foreground">Adicione pacientes com anamnese para gerar insights clínicos.</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
          <Brain className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-display font-semibold">Insights da IA</h2>
          <p className="text-xs text-muted-foreground">Análise inteligente dos seus pacientes</p>
        </div>
      </div>
      <div className="space-y-2.5">
        {insights.map((insight, i) => {
          const config = categoryConfig[insight.category] || categoryConfig.progress;
          const Icon = config.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`rounded-lg border p-3.5 ${severityBg[insight.severity] || severityBg.info}`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{insight.title}</p>
                    {insight.affected_count && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-card text-muted-foreground font-medium">
                        {insight.affected_count} pacientes
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{insight.description}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
