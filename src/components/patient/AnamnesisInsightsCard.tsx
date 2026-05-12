import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@v1/integrations/supabase/client";
import {
  Brain, Shield, ShieldAlert, ShieldCheck, Target, Heart,
  Flame, Droplets, Moon, Dumbbell, Lightbulb, ArrowRight,
  Sparkles, TrendingUp, AlertTriangle, CheckCircle2
} from "lucide-react";
import { Button } from "@v1/components/ui/button";

interface AnamnesisInsight {
  id: string;
  risk_level: string;
  primary_goal: string;
  metabolic_profile: string;
  main_pains: string[];
  nutrition_focus: string[];
  behavior_focus: string[];
  movement_focus: string[];
  suggested_protocol: string;
  personalized_tips: { tip: string; category: string; icon: string }[];
  ai_summary: string;
  created_at: string;
}

interface Recommendation {
  id: string;
  category: string;
  title: string;
  description: string;
  priority: string;
  icon: string;
  is_completed: boolean;
}

const riskConfig = {
  low: { icon: ShieldCheck, color: "text-success", bg: "bg-success/10", label: "Baixo" },
  medium: { icon: Shield, color: "text-warning", bg: "bg-warning/10", label: "Médio" },
  high: { icon: ShieldAlert, color: "text-destructive", bg: "bg-destructive/10", label: "Alto" },
};

const categoryIcons: Record<string, string> = {
  nutrition: "🥗",
  exercise: "🏋️",
  sleep: "😴",
  hydration: "💧",
  behavior: "🧠",
  supplement: "💊",
  motivation: "🌟",
  planning: "📦",
};

// Full card for nutritionist view
export function AnamnesisInsightsFull({ userId }: { userId: string }) {
  const [insight, setInsight] = useState<AnamnesisInsight | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    Promise.all([
      supabase
        .from("anamnesis_ai_insights" as any)
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("patient_recommendations" as any)
        .select("*")
        .eq("user_id", userId)
        .order("priority")
    ]).then(([insightRes, recRes]) => {
      const data = (insightRes.data as any)?.[0] || null;
      setInsight(data);
      setRecommendations((recRes.data as any) || []);
      setLoading(false);
    });
  }, [userId]);

  if (loading) {
    return (
      <div className="glass rounded-xl p-6 animate-pulse">
        <div className="h-6 w-48 bg-muted rounded mb-4" />
        <div className="space-y-3">
          <div className="h-4 w-full bg-muted rounded" />
          <div className="h-4 w-3/4 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!insight) {
    return (
      <div className="glass rounded-xl p-6 text-center">
        <Brain className="w-10 h-10 mx-auto text-muted-foreground mb-3 opacity-40" />
        <p className="text-sm text-muted-foreground">Anamnese inteligente ainda não gerada.</p>
        <p className="text-xs text-muted-foreground mt-1">O paciente precisa preencher a anamnese.</p>
      </div>
    );
  }

  const risk = riskConfig[insight.risk_level as keyof typeof riskConfig] || riskConfig.low;
  const RiskIcon = risk.icon;

  return (
    <div className="space-y-4">
      {/* Header with Risk */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-start justify-between mb-4">
          <h3 className="font-display font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" /> Leitura Inteligente da Anamnese
          </h3>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${risk.bg}`}>
            <RiskIcon className={`w-4 h-4 ${risk.color}`} />
            <span className={`text-xs font-semibold ${risk.color}`}>Risco {risk.label}</span>
          </div>
        </div>

        {/* AI Summary */}
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">{insight.ai_summary}</p>

        {/* Goal & Protocol */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary">Objetivo</span>
            </div>
            <p className="text-sm font-medium">{insight.primary_goal}</p>
          </div>
          <div className="p-3 rounded-lg bg-accent/5 border border-accent/10">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-xs font-semibold text-accent">Protocolo Sugerido</span>
            </div>
            <p className="text-sm font-medium">{insight.suggested_protocol}</p>
          </div>
        </div>
      </div>

      {/* Metabolic Profile */}
      <div className="glass rounded-xl p-5">
        <h4 className="font-display font-semibold text-sm mb-2 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" /> Perfil Metabólico
        </h4>
        <p className="text-sm text-muted-foreground">{insight.metabolic_profile}</p>
      </div>

      {/* Focus Areas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Nutrition Focus */}
        <div className="glass rounded-xl p-4">
          <h4 className="font-display font-semibold text-xs mb-3 flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" /> Foco Nutricional
          </h4>
          <ul className="space-y-1.5">
            {(insight.nutrition_focus || []).map((f, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span> {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Behavior Focus */}
        <div className="glass rounded-xl p-4">
          <h4 className="font-display font-semibold text-xs mb-3 flex items-center gap-2">
            <Heart className="w-4 h-4 text-pink-500" /> Foco Comportamental
          </h4>
          <ul className="space-y-1.5">
            {(insight.behavior_focus || []).map((f, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span> {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Movement Focus */}
        <div className="glass rounded-xl p-4">
          <h4 className="font-display font-semibold text-xs mb-3 flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-blue-500" /> Foco de Movimento
          </h4>
          <ul className="space-y-1.5">
            {(insight.movement_focus || []).map((f, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span> {f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Main Pains */}
      <div className="glass rounded-xl p-5">
        <h4 className="font-display font-semibold text-sm mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning" /> Principais Dores Observadas
        </h4>
        <div className="flex flex-wrap gap-2">
          {(insight.main_pains || []).map((pain, i) => (
            <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-warning/10 text-warning font-medium">
              {pain}
            </span>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="glass rounded-xl p-5">
          <h4 className="font-display font-semibold text-sm mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-accent" /> Recomendações
          </h4>
          <div className="space-y-2">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  rec.is_completed
                    ? "bg-success/5 border-success/20 opacity-60"
                    : rec.priority === "high"
                    ? "bg-destructive/5 border-destructive/10"
                    : "bg-card border-border"
                }`}
              >
                <span className="text-lg">{rec.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{rec.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{rec.description}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  rec.priority === "high" ? "bg-destructive/10 text-destructive" :
                  rec.priority === "medium" ? "bg-warning/10 text-warning" :
                  "bg-success/10 text-success"
                }`}>
                  {rec.priority === "high" ? "Alta" : rec.priority === "medium" ? "Média" : "Baixa"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Compact card for patient dashboard
export function SmartPlanCard() {
  const [insight, setInsight] = useState<AnamnesisInsight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("anamnesis_ai_insights" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      setInsight((data as any)?.[0] || null);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="glass rounded-xl p-5 animate-pulse">
        <div className="h-5 w-40 bg-muted rounded mb-3" />
        <div className="h-4 w-full bg-muted rounded" />
      </div>
    );
  }

  if (!insight) return null;

  const risk = riskConfig[insight.risk_level as keyof typeof riskConfig] || riskConfig.low;
  const RiskIcon = risk.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-5 border-primary/20"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" /> Seu Plano Inteligente
        </h3>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${risk.bg}`}>
          <RiskIcon className={`w-3 h-3 ${risk.color}`} />
          <span className={`text-[10px] font-semibold ${risk.color}`}>{risk.label}</span>
        </div>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{insight.ai_summary}</p>

      {/* Quick Focus Tags */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-muted-foreground mb-2">FOCOS INICIAIS</p>
        <div className="flex flex-wrap gap-1.5">
          {(insight.nutrition_focus || []).slice(0, 3).map((f, i) => (
            <span key={i} className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
              🥗 {f}
            </span>
          ))}
          {(insight.behavior_focus || []).slice(0, 2).map((f, i) => (
            <span key={i} className="text-[10px] px-2 py-1 rounded-full bg-accent/10 text-accent font-medium">
              🧠 {f}
            </span>
          ))}
        </div>
      </div>

      {/* Goal */}
      <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-primary">Objetivo</span>
        </div>
        <p className="text-sm font-medium mt-1">{insight.primary_goal}</p>
      </div>
    </motion.div>
  );
}

export default AnamnesisInsightsCard;

function AnamnesisInsightsCard() {
  return null; // Use named exports instead
}
