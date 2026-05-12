import { useEffect, useState } from "react";
import { supabase } from "@v1/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Input } from "@v1/components/ui/input";
import { Button } from "@v1/components/ui/button";
import { Badge } from "@v1/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import { Sparkles, Plus, Trash2, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AILimit {
  id: string;
  feature_key: string;
  plan_tier: string;
  max_uses: number;
  period_type: string;
  period_days: number;
}

const PLAN_TIERS = ["free", "pro", "elite"];
const PERIOD_TYPES = [
  { value: "daily", label: "Diário", days: 1 },
  { value: "monthly", label: "Mensal", days: 30 },
];

const AI_FEATURE_KEYS = [
  { key: "analyze_meal", label: "Análise de Refeição" },
  { key: "generate_recipe", label: "Gerador de Receitas" },
  { key: "body_analysis", label: "Análise Corporal" },
  
  { key: "anamnesis_insights", label: "Anamnese IA" },
  { key: "weekly_report", label: "Relatório Semanal" },
  { key: "clinical_decision", label: "Decisão Clínica IA" },
  { key: "meal_plan_gen", label: "Gerador Plano Alimentar" },
];

export default function AIUsageLimitsEditor() {
  const [limits, setLimits] = useState<AILimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchLimits = async () => {
    const { data, error } = await supabase
      .from("ai_usage_limits")
      .select("*")
      .order("feature_key")
      .order("plan_tier");
    if (error) {
      toast.error("Erro ao carregar limites: " + error.message);
    } else {
      setLimits((data as AILimit[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchLimits(); }, []);

  const updateLimit = async (limit: AILimit) => {
    setSaving(limit.id);
    const { error } = await supabase
      .from("ai_usage_limits")
      .update({
        max_uses: limit.max_uses,
        period_type: limit.period_type,
        period_days: limit.period_days,
      })
      .eq("id", limit.id);
    setSaving(null);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Limite atualizado!");
    }
  };

  const addLimit = async () => {
    const { data, error } = await supabase
      .from("ai_usage_limits")
      .insert({
        feature_key: "analyze_meal",
        plan_tier: "free",
        max_uses: 3,
        period_type: "daily",
        period_days: 1,
      })
      .select()
      .single();
    if (error) {
      toast.error("Erro ao criar: " + error.message);
    } else {
      setLimits(prev => [...prev, data as AILimit]);
      toast.success("Novo limite criado — edite os campos");
    }
  };

  const deleteLimit = async (id: string) => {
    const { error } = await supabase.from("ai_usage_limits").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover: " + error.message);
    } else {
      setLimits(prev => prev.filter(l => l.id !== id));
      toast.success("Limite removido");
    }
  };

  const setField = (id: string, field: keyof AILimit, value: any) => {
    setLimits(prev =>
      prev.map(l => {
        if (l.id !== id) return l;
        const updated = { ...l, [field]: value };
        if (field === "period_type") {
          updated.period_days = value === "monthly" ? 30 : 1;
        }
        return updated;
      })
    );
  };

  const grouped = PLAN_TIERS.reduce((acc, tier) => {
    acc[tier] = limits.filter(l => l.plan_tier === tier);
    return acc;
  }, {} as Record<string, AILimit[]>);

  const tierColors: Record<string, string> = {
    free: "bg-muted text-muted-foreground",
    pro: "bg-primary/10 text-primary",
    elite: "bg-warning/10 text-warning",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="glass shadow-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Limites de Uso IA por Plano
          </CardTitle>
          <Button size="sm" variant="outline" onClick={addLimit} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Novo Limite
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Configure quantas vezes cada feature de IA pode ser usada por período (diário/mensal) em cada plano.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {PLAN_TIERS.map(tier => {
          const tierLimits = grouped[tier] || [];
          if (tierLimits.length === 0 && tier !== "free") return null;
          return (
            <div key={tier} className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className={tierColors[tier]}>
                  {tier === "free" ? "Gratuito" : tier === "pro" ? "Pro" : "Elite"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {tierLimits.length} regra(s)
                </span>
              </div>
              {tierLimits.length === 0 ? (
                <p className="text-xs text-muted-foreground pl-2">Nenhum limite configurado</p>
              ) : (
                <div className="space-y-2">
                  {tierLimits.map(limit => {
                    const featureLabel = AI_FEATURE_KEYS.find(f => f.key === limit.feature_key)?.label || limit.feature_key;
                    return (
                      <div
                        key={limit.id}
                        className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/50"
                      >
                        {/* Feature Key */}
                        <Select
                          value={limit.feature_key}
                          onValueChange={v => setField(limit.id, "feature_key", v)}
                        >
                          <SelectTrigger className="w-[180px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AI_FEATURE_KEYS.map(f => (
                              <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Plan Tier */}
                        <Select
                          value={limit.plan_tier}
                          onValueChange={v => setField(limit.id, "plan_tier", v)}
                        >
                          <SelectTrigger className="w-[100px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PLAN_TIERS.map(t => (
                              <SelectItem key={t} value={t}>
                                {t === "free" ? "Gratuito" : t === "pro" ? "Pro" : "Elite"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Max Uses */}
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min={0}
                            value={limit.max_uses}
                            onChange={e => setField(limit.id, "max_uses", parseInt(e.target.value) || 0)}
                            className="w-[70px] h-8 text-xs text-center"
                          />
                          <span className="text-xs text-muted-foreground">usos</span>
                        </div>

                        {/* Period */}
                        <Select
                          value={limit.period_type}
                          onValueChange={v => setField(limit.id, "period_type", v)}
                        >
                          <SelectTrigger className="w-[110px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PERIOD_TYPES.map(p => (
                              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Actions */}
                        <div className="flex items-center gap-1 ml-auto">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            disabled={saving === limit.id}
                            onClick={() => updateLimit(limit)}
                          >
                            {saving === limit.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Save className="w-3.5 h-3.5 text-primary" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => deleteLimit(limit.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {limits.length === 0 && (
          <div className="text-center py-8">
            <Sparkles className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum limite configurado ainda</p>
            <p className="text-xs text-muted-foreground">Clique em "Novo Limite" para começar</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
