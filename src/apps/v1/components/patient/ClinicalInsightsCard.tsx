import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { getLearnedPatterns } from "@/lib/clinicalLearningEngine";
import { Brain, TrendingUp, Utensils, Dumbbell, Sparkles, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { safeNum } from "@/lib/formatMacros";

const TYPE_ICONS: Record<string, any> = {
  nutrition: Utensils,
  behavior: Brain,
  metabolic: TrendingUp,
  training: Dumbbell,
  engagement: Sparkles,
};

const TYPE_LABELS: Record<string, string> = {
  nutrition: "Nutrição",
  behavior: "Comportamento",
  metabolic: "Metabólico",
  training: "Treino",
  engagement: "Engajamento",
};

export default function ClinicalInsightsCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patterns, setPatterns] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    getLearnedPatterns(user.id).then(setPatterns);
  }, [user?.id]);

  if (patterns.length === 0) return null;

  return (
    <Card className="glass border-border/50 hover:border-primary/30 transition-all duration-300 cursor-pointer group" onClick={() => navigate("/journey")}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-display flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          O que aprendemos sobre você
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {(patterns || []).slice(0, 5).map((p: any) => {
          const Icon = (p?.learning_type && TYPE_ICONS[p.learning_type]) || Sparkles;
          return (
            <div key={p?.id || Math.random()} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
              <Icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium">{p?.learned_pattern_description || "Padrão identificado"}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {(p?.learning_type && TYPE_LABELS[p.learning_type]) || p?.learning_type || "Geral"} · Confiança: {Math.round(safeNum(p?.confidence_score))}%
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
