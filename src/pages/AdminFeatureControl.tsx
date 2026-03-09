import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Zap, Brain, ChefHat, Bot } from "lucide-react";

const FEATURES = [
  { name: "ia_plan", label: "Análise com IA", description: "Análise de refeições e corpo com IA", icon: Brain },
  { name: "automations", label: "Automações", description: "Motor de automação inteligente", icon: Bot },
  { name: "recipe_generator", label: "Gerador de Receitas", description: "Geração de receitas com IA", icon: ChefHat },
];

interface NutritionistFeature {
  user_id: string;
  full_name: string;
  features: Record<string, boolean>;
}

export default function AdminFeatureControl() {
  const { user } = useAuth();
  const [nutritionists, setNutritionists] = useState<NutritionistFeature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: nutRoles } = await supabase.from("user_roles").select("user_id").eq("role", "nutritionist");
      if (!nutRoles) { setLoading(false); return; }

      const result: NutritionistFeature[] = [];
      for (const r of nutRoles) {
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", r.user_id).single();
        const { data: featureRows } = await supabase
          .from("professional_feature_usage" as any)
          .select("feature_name, status")
          .eq("nutritionist_id", r.user_id);

        const features: Record<string, boolean> = {};
        FEATURES.forEach(f => { features[f.name] = true; }); // default enabled
        featureRows?.forEach((fr: any) => { features[fr.feature_name] = fr.status === "enabled"; });

        result.push({ user_id: r.user_id, full_name: profile?.full_name || "Nutricionista", features });
      }
      setNutritionists(result);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const toggleFeature = async (nutId: string, featureName: string, enabled: boolean) => {
    const newStatus = enabled ? "enabled" : "disabled";
    const { error } = await (supabase.from("professional_feature_usage" as any) as any).upsert(
      { nutritionist_id: nutId, feature_name: featureName, status: newStatus },
      { onConflict: "nutritionist_id,feature_name" }
    );
    if (error) { toast.error("Erro ao atualizar: " + error.message); return; }
    setNutritionists(prev => prev.map(n => n.user_id === nutId ? { ...n, features: { ...n.features, [featureName]: enabled } } : n));
    toast.success(`Feature ${enabled ? "habilitada" : "desabilitada"}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Zap className="w-8 h-8 text-warning" />
          <div>
            <h1 className="font-display text-2xl font-bold">Feature Flags</h1>
            <p className="text-muted-foreground text-sm">Controle de funcionalidades por nutricionista</p>
          </div>
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
          <div className="space-y-4">
            {nutritionists.map(n => (
              <Card key={n.user_id} className="glass shadow-card">
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-base flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">{n.full_name[0]?.toUpperCase()}</span>
                    </div>
                    {n.full_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {FEATURES.map(f => (
                    <div key={f.name} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <f.icon className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{f.label}</p>
                          <p className="text-xs text-muted-foreground">{f.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={n.features[f.name] ?? true}
                        onCheckedChange={(checked) => toggleFeature(n.user_id, f.name, checked)}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
