/**
 * IFJ Predictive Briefing — Weekly intelligent predictions dashboard
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  TrendingDown, AlertTriangle, Activity, Target, RefreshCw, Loader2,
  Brain, BarChart3, Zap, ArrowDown, ArrowUp, Minus
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface Prediction {
  patient_name: string;
  patient_id: string;
  type: string;
  severity: string;
  score: number;
  trend?: number;
  message: string;
  action: string;
}

interface BriefingData {
  predictions: Prediction[];
  narrative: string;
  summary: {
    total_patients: number;
    at_risk: number;
    plateaus: number;
    adherence_drops: number;
    critical_count: number;
    upcoming_milestones: number;
  };
  generated_at: string;
}

const TYPE_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  dropout_risk: { icon: AlertTriangle, label: "Risco de Abandono", color: "text-destructive" },
  plateau: { icon: Minus, label: "Platô Detectado", color: "text-orange-500" },
  adherence_drop: { icon: TrendingDown, label: "Queda de Adesão", color: "text-amber-500" },
};

export default function IFJPredictiveBriefing() {
  const { user } = useAuth();
  const [data, setData] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showNarrative, setShowNarrative] = useState(false);

  const loadBriefing = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("ifj-predictive-briefing");
      if (error) throw error;
      setData(result);
    } catch (e) {
      toast.error("Erro ao gerar briefing preditivo");
    }
    setLoading(false);
  };

  useEffect(() => { loadBriefing(); }, [user]);

  return (
    <Card className="border-amber-500/20 bg-background/95 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-amber-500/20 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-violet-500" />
            </div>
            <div>
              <span className="bg-gradient-to-r from-violet-500 to-amber-500 bg-clip-text text-transparent font-bold">
                IFJ Briefing Preditivo
              </span>
              <p className="text-[10px] text-muted-foreground font-normal">Previsões inteligentes da semana</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={loadBriefing} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !data && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500/50" />
              <p className="text-xs text-muted-foreground">Analisando tendências clínicas...</p>
            </div>
          </div>
        )}

        {data && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "Pacientes", value: data.summary.total_patients, icon: Target, color: "text-primary" },
                { label: "Em Risco", value: data.summary.at_risk, icon: AlertTriangle, color: "text-destructive" },
                { label: "Em Platô", value: data.summary.plateaus, icon: Minus, color: "text-orange-500" },
                { label: "Críticos", value: data.summary.critical_count, icon: Zap, color: "text-red-500" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="p-3 rounded-lg bg-muted/30 text-center border border-amber-500/5"
                >
                  <item.icon className={`w-4 h-4 mx-auto mb-1 ${item.color}`} />
                  <p className="text-lg font-bold">{item.value}</p>
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Predictions */}
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {data.predictions.length === 0 && (
                  <div className="text-center py-8">
                    <Activity className="w-8 h-8 mx-auto text-emerald-500/50 mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhuma previsão crítica — carteira saudável! 🎉</p>
                  </div>
                )}
                {data.predictions.map((pred, i) => {
                  const config = TYPE_CONFIG[pred.type] || TYPE_CONFIG.dropout_risk;
                  const Icon = config.icon;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-3 rounded-lg bg-muted/20 border space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${config.color}`} />
                          <span className="text-sm font-medium">{pred.patient_name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className={`text-[9px] ${
                            pred.severity === "critical" ? "border-destructive/30 text-destructive" : "border-orange-500/30 text-orange-500"
                          }`}>
                            {pred.severity === "critical" ? "Crítico" : "Atenção"}
                          </Badge>
                          {pred.trend !== undefined && (
                            pred.trend > 0 ? <ArrowUp className="w-3 h-3 text-destructive" /> :
                            pred.trend < 0 ? <ArrowDown className="w-3 h-3 text-emerald-500" /> : null
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{pred.message}</p>
                      <p className="text-[10px] text-primary/80 flex items-center gap-1">
                        <Zap className="w-3 h-3" /> {pred.action}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* AI Narrative */}
            {data.narrative && (
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-amber-500/20 text-amber-600"
                  onClick={() => setShowNarrative(!showNarrative)}
                >
                  <Brain className="w-4 h-4 mr-2" />
                  {showNarrative ? "Ocultar" : "Ver"} Briefing Narrativo IA
                </Button>
                <AnimatePresence>
                  {showNarrative && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5"
                    >
                      <ScrollArea className="max-h-[300px]">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{data.narrative}</ReactMarkdown>
                        </div>
                      </ScrollArea>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <p className="text-[9px] text-muted-foreground/50 text-right">
              Gerado em {new Date(data.generated_at).toLocaleString("pt-BR")}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
