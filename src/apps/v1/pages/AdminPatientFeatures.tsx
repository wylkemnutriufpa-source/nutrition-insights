import { useEffect, useState, useMemo } from "react";
import { supabase } from "@v1/integrations/supabase/client";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Badge } from "@v1/components/ui/badge";
import { Button } from "@v1/components/ui/button";
import { Input } from "@v1/components/ui/input";
import { Switch } from "@v1/components/ui/switch";
import { toast } from "sonner";
import {
  Crown, Search, Shield, Save, Users, Sparkles, Check, X,
  Brain, ChefHat, MessageSquare, Heart, Utensils, Zap, Target
} from "lucide-react";
import { PATIENT_FEATURE_REGISTRY, getPatientFeaturesByCategory } from "@v1/lib/patientFeatureRegistry";
import type { PrestigePlan } from "@v1/hooks/usePrestige";
import PrestigeBadge from "@v1/components/prestige/PrestigeBadge";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "Alimentação": Utensils,
  "IA & Análises": Brain,
  "Engajamento": Zap,
  "Comunicação": MessageSquare,
  "Saúde & Ferramentas": Heart,
};

export default function AdminPatientFeatures() {
  const [plans, setPlans] = useState<PrestigePlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  // Map: feature_key -> enabled
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [dirty, setDirty] = useState(false);

  // Load plans
  useEffect(() => {
    supabase
      .from("prestige_plans")
      .select("*")
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }) => {
        const list = (data || []) as any as PrestigePlan[];
        setPlans(list);
        if (list.length > 0) setSelectedPlanId(list[0].id);
        setLoading(false);
      });
  }, []);

  // Load features for selected plan
  useEffect(() => {
    if (!selectedPlanId) return;
    supabase
      .from("patient_plan_features")
      .select("feature_key, enabled")
      .eq("plan_id", selectedPlanId)
      .then(({ data }) => {
        const map: Record<string, boolean> = {};
        // Default all to true
        PATIENT_FEATURE_REGISTRY.forEach(f => { map[f.key] = true; });
        // Override with DB values
        (data || []).forEach((row: any) => {
          map[row.feature_key] = row.enabled;
        });
        setFeatures(map);
        setDirty(false);
      });
  }, [selectedPlanId]);

  const toggleFeature = (key: string) => {
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }));
    setDirty(true);
  };

  const setAllFeatures = (enabled: boolean) => {
    const updated: Record<string, boolean> = {};
    PATIENT_FEATURE_REGISTRY.forEach(f => { updated[f.key] = enabled; });
    setFeatures(updated);
    setDirty(true);
  };

  const saveFeatures = async () => {
    if (!selectedPlanId) return;
    setSaving(true);

    const rows = Object.entries(features).map(([feature_key, enabled]) => ({
      plan_id: selectedPlanId,
      feature_key,
      enabled,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("patient_plan_features")
      .upsert(rows, { onConflict: "plan_id,feature_key" });

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Permissões atualizadas!");
      setDirty(false);
    }
    setSaving(false);
  };

  const selectedPlan = plans.find(p => p.id === selectedPlanId);
  const categories = useMemo(() => getPatientFeaturesByCategory(), []);

  const filteredCategories = useMemo(() => {
    if (!search) return categories;
    const q = search.toLowerCase();
    const result: Record<string, typeof PATIENT_FEATURE_REGISTRY> = {};
    Object.entries(categories).forEach(([cat, feats]) => {
      const filtered = feats.filter(f =>
        f.label.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        cat.toLowerCase().includes(q)
      );
      if (filtered.length > 0) result[cat] = filtered;
    });
    return result;
  }, [categories, search]);

  const enabledCount = Object.values(features).filter(Boolean).length;
  const totalCount = PATIENT_FEATURE_REGISTRY.length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Features do Paciente</h1>
              <p className="text-muted-foreground text-sm">
                Configure quais funcionalidades cada plano de paciente pode acessar
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-sm px-3 py-1 gap-1">
            <Shield className="w-3.5 h-3.5" /> Admin Only
          </Badge>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : plans.length === 0 ? (
          <Card className="glass">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Nenhum plano de paciente encontrado. Crie planos em Planos & Preços.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar - Plan selection */}
            <div className="lg:col-span-1 space-y-3">
              <Card className="glass shadow-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Crown className="w-4 h-4 text-primary" />
                    Planos ({plans.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {plans.map(plan => {
                    const isSelected = selectedPlanId === plan.id;
                    return (
                      <button
                        key={plan.id}
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={`w-full text-left p-3 rounded-lg transition-all ${
                          isSelected
                            ? "shadow-sm"
                            : "hover:bg-muted/50 border border-transparent"
                        }`}
                        style={isSelected ? {
                          backgroundColor: plan.color + "15",
                          borderColor: plan.color + "40",
                          border: `1px solid ${plan.color}40`,
                        } : undefined}
                      >
                        <div className="flex items-center gap-3">
                          <PrestigeBadge plan={plan} size="sm" showLabel={false} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={isSelected ? { color: plan.color } : undefined}>
                              {plan.name}
                            </p>
                            <p className="text-xs text-muted-foreground">{plan.badge_label}</p>
                          </div>
                          {plan.crown_enabled && (
                            <Crown className="w-4 h-4" style={{ color: plan.color }} />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Quick compare */}
              <Card className="glass shadow-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground">Comparação rápida</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {plans.map(p => (
                    <div key={p.id} className="flex items-center justify-between text-xs py-1">
                      <span style={{ color: p.color }}>{p.badge_icon} {p.name}</span>
                      <span className="text-muted-foreground">
                        R${p.price_monthly}/mês
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3 space-y-4">
              {selectedPlan && (
                <>
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <Card className="glass shadow-card">
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-primary">{enabledCount}</p>
                        <p className="text-xs text-muted-foreground">Habilitadas</p>
                      </CardContent>
                    </Card>
                    <Card className="glass shadow-card">
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-destructive">{totalCount - enabledCount}</p>
                        <p className="text-xs text-muted-foreground">Bloqueadas</p>
                      </CardContent>
                    </Card>
                    <Card className="glass shadow-card">
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold" style={{ color: selectedPlan.color }}>
                          {Math.round((enabledCount / totalCount) * 100)}%
                        </p>
                        <p className="text-xs text-muted-foreground">Acesso</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Search + Bulk */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Buscar feature..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAllFeatures(true)}
                        className="px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                      >
                        Ativar Todas
                      </button>
                      <button
                        onClick={() => setAllFeatures(false)}
                        className="px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors"
                      >
                        Bloquear Todas
                      </button>
                    </div>
                  </div>

                  {/* Feature grid by category */}
                  {Object.entries(filteredCategories).map(([category, feats]) => {
                    const CatIcon = CATEGORY_ICONS[category] || Target;
                    const activeInCat = feats.filter(f => features[f.key]).length;
                    return (
                      <Card key={category} className="glass shadow-card">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-display flex items-center gap-2">
                              <CatIcon className="w-5 h-5 text-primary" />
                              {category}
                            </CardTitle>
                            <Badge variant={activeInCat === feats.length ? "default" : "secondary"} className="text-xs">
                              {activeInCat}/{feats.length}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {feats.map(f => {
                            const enabled = features[f.key] ?? true;
                            return (
                              <div
                                key={f.key}
                                className={`flex items-center justify-between py-2.5 px-3 rounded-lg transition-colors ${
                                  enabled ? "bg-muted/30" : "bg-destructive/5 border border-destructive/10"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                    enabled ? "bg-primary/10" : "bg-muted"
                                  }`}>
                                    <f.icon className={`w-4 h-4 ${enabled ? "text-primary" : "text-muted-foreground"}`} />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-medium">{f.label}</p>
                                      {!enabled && (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-destructive/30 text-destructive">
                                          <X className="w-2.5 h-2.5 mr-0.5" /> Bloqueado
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{f.description}</p>
                                  </div>
                                </div>
                                <Switch
                                  checked={enabled}
                                  onCheckedChange={() => toggleFeature(f.key)}
                                />
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    );
                  })}

                  {/* Save */}
                  <Button onClick={saveFeatures} disabled={saving || !dirty} className="gap-2" size="lg">
                    <Save className="w-4 h-4" />
                    {saving ? "Salvando..." : dirty ? "Salvar Permissões" : "Salvo ✓"}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
