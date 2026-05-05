import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FEATURE_REGISTRY, getFeaturesByCategory, type FeatureDefinition } from "@/lib/featureRegistry";
import AIUsageLimitsEditor from "@/components/admin/AIUsageLimitsEditor";
import {
  Zap, Users, Utensils, BarChart3, MessageSquare,
  Crown, Search, Shield, Sparkles, Clock
} from "lucide-react";

const ALL_FEATURES = FEATURE_REGISTRY;
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "IA & Automação": Sparkles,
  "Gestão de Pacientes": Users,
  "Comunicação": MessageSquare,
  "Ferramentas": Utensils,
  "Relatórios & Financeiro": BarChart3,
};

type FeatureStatus = "enabled" | "disabled" | "coming_soon";

interface NutritionistFeature {
  user_id: string;
  full_name: string;
  features: Record<string, FeatureStatus>;
}

export default function AdminFeatureControl() {
  const { user } = useAuth();
  const [nutritionists, setNutritionists] = useState<NutritionistFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedNut, setSelectedNut] = useState<string | null>(null);
  const [globalDefaults, setGlobalDefaults] = useState<Record<string, boolean>>({});
  const [expConfigs, setExpConfigs] = useState<any[]>([]);
  const [savingExp, setSavingExp] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      // 1. Fetch Nutritionists and their professional feature usage
      const { data: nutRoles } = await supabase.from("user_roles").select("user_id").eq("role", "nutritionist");
      
      // 2. Fetch Experience Configurations (Dynamic UI settings)
      const { data: configs } = await supabase.from("experience_configurations").select("*").order("role, mode, feature_key");
      if (configs) setExpConfigs(configs);

      if (!nutRoles) { setLoading(false); return; }

      const result: NutritionistFeature[] = [];
      for (const r of nutRoles) {
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", r.user_id).maybeSingle();
        const { data: featureRows } = await supabase
          .from("professional_feature_usage" as any)
          .select("feature_name, status")
          .eq("nutritionist_id", r.user_id);

        const existingNames = new Set((featureRows || []).map((fr: any) => fr.feature_name));
        const features: Record<string, FeatureStatus> = {};

        // Auto-sync: insert new features that don't exist in DB yet
        const newFeatures = ALL_FEATURES.filter(f => !existingNames.has(f.name));
        if (newFeatures.length > 0) {
          const inserts = newFeatures.map(f => ({
            nutritionist_id: r.user_id,
            feature_name: f.name,
            status: "enabled",
          }));
          await (supabase.from("professional_feature_usage" as any) as any).upsert(inserts, { onConflict: "nutritionist_id,feature_name" });
        }

        ALL_FEATURES.forEach(f => { features[f.name] = "enabled"; });
        featureRows?.forEach((fr: any) => { features[fr.feature_name] = (fr.status as FeatureStatus) || "enabled"; });

        result.push({ user_id: r.user_id, full_name: profile?.full_name || "Nutricionista", features });
      }
      setNutritionists(result);
      if (result.length > 0 && !selectedNut) setSelectedNut(result[0].user_id);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  // Initialize global defaults from first load
  useEffect(() => {
    const defaults: Record<string, boolean> = {};
    ALL_FEATURES.forEach(f => { defaults[f.name] = true; });
    setGlobalDefaults(defaults);
  }, []);

  const setFeatureStatus = async (nutId: string, featureName: string, status: FeatureStatus) => {
    const { error } = await (supabase.from("professional_feature_usage" as any) as any).upsert(
      { nutritionist_id: nutId, feature_name: featureName, status },
      { onConflict: "nutritionist_id,feature_name" }
    );
    if (error) { toast.error("Erro ao atualizar: " + error.message); return; }
    setNutritionists(prev => prev.map(n => n.user_id === nutId ? { ...n, features: { ...n.features, [featureName]: status } } : n));
    const labels: Record<FeatureStatus, string> = { enabled: "habilitada", disabled: "desabilitada (Premium)", coming_soon: "marcada como Em Breve" };
    toast.success(`${featureName} ${labels[status]}`);
  };

  const setAllForNut = async (nutId: string, status: FeatureStatus) => {
    for (const f of ALL_FEATURES) {
      await setFeatureStatus(nutId, f.name, status);
    }
  };

  const toggleExpFeature = async (role: string, mode: string, featureKey: string, currentStatus: boolean) => {
    setSavingExp(true);
    const { error } = await supabase
      .from("experience_configurations")
      .upsert({
        role,
        mode,
        feature_key: featureKey,
        is_enabled: !currentStatus,
        updated_at: new Date().toISOString()
      }, { onConflict: "role,mode,feature_key" });

    if (error) {
      toast.error("Erro ao atualizar configuração: " + error.message);
    } else {
      setExpConfigs(prev => {
        const idx = prev.findIndex(c => c.role === role && c.mode === mode && c.feature_key === featureKey);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], is_enabled: !currentStatus };
          return updated;
        }
        return [...prev, { role, mode, feature_key: featureKey, is_enabled: !currentStatus }];
      });
      toast.success(`Feature ${featureKey} ${!currentStatus ? 'ativada' : 'desativada'} para ${role} em modo ${mode}`);
    }
    setSavingExp(false);
  };

  const selectedNutData = nutritionists.find(n => n.user_id === selectedNut);

  const categories = useMemo(() => {
    const cats: Record<string, typeof ALL_FEATURES> = {};
    ALL_FEATURES.forEach(f => {
      if (!cats[f.category]) cats[f.category] = [];
      cats[f.category].push(f);
    });
    return cats;
  }, []);

  const filteredFeatures = useMemo(() => {
    if (!search) return ALL_FEATURES;
    const s = search.toLowerCase();
    return ALL_FEATURES.filter(f => f.label.toLowerCase().includes(s) || f.description.toLowerCase().includes(s) || f.category.toLowerCase().includes(s));
  }, [search]);

  const filteredCategories = useMemo(() => {
    const cats: Record<string, typeof ALL_FEATURES> = {};
    filteredFeatures.forEach(f => {
      if (!cats[f.category]) cats[f.category] = [];
      cats[f.category].push(f);
    });
    return cats;
  }, [filteredFeatures]);

  const enabledCount = selectedNutData ? Object.values(selectedNutData.features).filter(s => s === "enabled").length : 0;
  const comingSoonCount = selectedNutData ? Object.values(selectedNutData.features).filter(s => s === "coming_soon").length : 0;
  const totalCount = ALL_FEATURES.length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Controle de Features</h1>
              <p className="text-muted-foreground text-sm">
                Gerencie todas as {totalCount} funcionalidades do sistema — defina o que é premium
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-sm px-3 py-1 gap-1">
            <Shield className="w-3.5 h-3.5" />
            Admin Only
          </Badge>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : nutritionists.length === 0 ? (
          <Card className="glass shadow-card">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Nenhum nutricionista encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar - Nutritionist List */}
            <div className="lg:col-span-1 space-y-3">
              <Card className="glass shadow-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Nutricionistas ({nutritionists.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {nutritionists.map(n => {
                    const count = Object.values(n.features).filter(s => s === "enabled").length;
                    const isSelected = selectedNut === n.user_id;
                    return (
                      <button
                        key={n.user_id}
                        onClick={() => setSelectedNut(n.user_id)}
                        className={`w-full text-left p-3 rounded-lg transition-all ${
                          isSelected
                            ? "bg-primary/10 border border-primary/30 shadow-sm"
                            : "hover:bg-muted/50 border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          }`}>
                            {n.full_name[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{n.full_name}</p>
                            <p className="text-xs text-muted-foreground">{count}/{totalCount} ativas</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Main Content - Feature Grid */}
            <div className="lg:col-span-3 space-y-4">
              {selectedNutData && (
                <>
                   {/* Stats bar */}
                   <div className="grid grid-cols-4 gap-3">
                     <Card className="glass shadow-card">
                       <CardContent className="p-4 text-center">
                         <p className="text-2xl font-bold text-primary">{enabledCount}</p>
                         <p className="text-xs text-muted-foreground">Ativas</p>
                       </CardContent>
                     </Card>
                     <Card className="glass shadow-card">
                       <CardContent className="p-4 text-center">
                         <p className="text-2xl font-bold text-destructive">{totalCount - enabledCount - comingSoonCount}</p>
                         <p className="text-xs text-muted-foreground">Premium</p>
                       </CardContent>
                     </Card>
                     <Card className="glass shadow-card">
                       <CardContent className="p-4 text-center">
                         <p className="text-2xl font-bold text-info">{comingSoonCount}</p>
                         <p className="text-xs text-muted-foreground">Em Breve</p>
                       </CardContent>
                     </Card>
                     <Card className="glass shadow-card">
                       <CardContent className="p-4 text-center">
                         <p className="text-2xl font-bold text-warning">{Object.keys(categories).length}</p>
                         <p className="text-xs text-muted-foreground">Categorias</p>
                       </CardContent>
                     </Card>
                   </div>

                   {/* Search and bulk actions */}
                   <div className="flex flex-col sm:flex-row gap-3">
                     <div className="relative flex-1">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                       <Input
                         placeholder="Buscar feature..."
                         value={search}
                         onChange={e => setSearch(e.target.value)}
                         className="pl-9"
                       />
                     </div>
                     <div className="flex gap-2">
                       <button
                         onClick={() => setAllForNut(selectedNutData.user_id, "enabled")}
                         className="px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                       >
                         Ativar Todas
                       </button>
                       <button
                         onClick={() => setAllForNut(selectedNutData.user_id, "disabled")}
                         className="px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors"
                       >
                         Desativar Todas
                       </button>
                     </div>
                   </div>

                  {/* Feature categories */}
                  {Object.entries(filteredCategories).map(([category, features]) => {
                    const CatIcon = CATEGORY_ICONS[category] || Zap;
                    const activeInCat = features.filter(f => selectedNutData.features[f.name] === "enabled").length;
                    return (
                      <Card key={category} className="glass shadow-card">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-display flex items-center gap-2">
                              <CatIcon className="w-5 h-5 text-primary" />
                              {category}
                            </CardTitle>
                            <Badge variant={activeInCat === features.length ? "default" : "secondary"} className="text-xs">
                              {activeInCat}/{features.length}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {features.map(f => {
                            const status: FeatureStatus = selectedNutData.features[f.name] ?? "enabled";
                            return (
                              <div
                                key={f.name}
                                className={`flex items-center justify-between py-2.5 px-3 rounded-lg transition-colors ${
                                  status === "enabled" ? "bg-muted/30" : status === "coming_soon" ? "bg-info/5 border border-info/10" : "bg-destructive/5 border border-destructive/10"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                    status === "enabled" ? "bg-primary/10" : status === "coming_soon" ? "bg-info/10" : "bg-muted"
                                  }`}>
                                    <f.icon className={`w-4 h-4 ${status === "enabled" ? "text-primary" : status === "coming_soon" ? "text-info" : "text-muted-foreground"}`} />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-medium">{f.label}</p>
                                      {status === "disabled" && (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-warning/30 text-warning">
                                          <Crown className="w-2.5 h-2.5 mr-0.5" />
                                          Premium
                                        </Badge>
                                      )}
                                      {status === "coming_soon" && (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-info/30 text-info">
                                          <Clock className="w-2.5 h-2.5 mr-0.5" />
                                          Em Breve
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{f.description}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  {(["enabled", "disabled", "coming_soon"] as FeatureStatus[]).map(s => {
                                    const labels: Record<FeatureStatus, string> = { enabled: "✓", disabled: "💎", coming_soon: "🕐" };
                                    const titles: Record<FeatureStatus, string> = { enabled: "Ativa", disabled: "Premium", coming_soon: "Em Breve" };
                                    const active = status === s;
                                    const colors: Record<FeatureStatus, string> = {
                                      enabled: active ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-primary/20",
                                      disabled: active ? "bg-warning text-warning-foreground" : "bg-muted/50 text-muted-foreground hover:bg-warning/20",
                                      coming_soon: active ? "bg-info text-info-foreground" : "bg-muted/50 text-muted-foreground hover:bg-info/20",
                                    };
                                    return (
                                      <button
                                        key={s}
                                        title={titles[s]}
                                        onClick={() => setFeatureStatus(selectedNutData.user_id, f.name, s)}
                                        className={`w-8 h-8 rounded-md text-xs font-bold transition-all ${colors[s]}`}
                                      >
                                        {labels[s]}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        )}

        {/* AI Usage Limits Editor */}
        <AIUsageLimitsEditor />
      </div>
    </DashboardLayout>
  );
}
