import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Zap, Brain, ChefHat, Bot, Users, Utensils, ClipboardCheck,
  BarChart3, MessageSquare, Calendar, Target, Dumbbell,
  ShoppingCart, BookOpen, Pill, Camera, FileText, Heart,
  Crown, Search, Shield, Sparkles, DollarSign, Bell
} from "lucide-react";

const ALL_FEATURES = [
  // IA & Automação
  { name: "ia_plan", label: "Análise com IA", description: "Análise de refeições e corpo com inteligência artificial", icon: Brain, category: "IA & Automação" },
  { name: "automations", label: "Automações", description: "Motor de automação inteligente com regras personalizadas", icon: Bot, category: "IA & Automação" },
  { name: "recipe_generator", label: "Gerador de Receitas IA", description: "Geração automática de receitas com IA", icon: ChefHat, category: "IA & Automação" },
  { name: "autobot", label: "AutoBot (Chat IA)", description: "Assistente virtual com IA para pacientes", icon: Sparkles, category: "IA & Automação" },
  { name: "ai_body_analysis", label: "Análise Corporal IA", description: "Análise de composição corporal por fotos com IA", icon: Camera, category: "IA & Automação" },
  { name: "ai_anamnesis", label: "Anamnese Inteligente", description: "Insights automáticos de anamnese com IA", icon: Brain, category: "IA & Automação" },
  { name: "weekly_report_ai", label: "Relatório Semanal IA", description: "Geração automática de relatórios semanais", icon: FileText, category: "IA & Automação" },

  // Gestão de Pacientes
  { name: "patients", label: "Gestão de Pacientes", description: "Cadastro e acompanhamento de pacientes", icon: Users, category: "Gestão de Pacientes" },
  { name: "meal_plans", label: "Planos Alimentares", description: "Criação e gestão de planos alimentares", icon: Utensils, category: "Gestão de Pacientes" },
  { name: "protocols", label: "Protocolos", description: "Criação de protocolos clínicos personalizados", icon: ClipboardCheck, category: "Gestão de Pacientes" },
  { name: "programs", label: "Programas", description: "Programas estruturados com fases e metas", icon: Target, category: "Gestão de Pacientes" },
  { name: "physical_assessment", label: "Avaliação Física", description: "Registro completo de avaliações antropométricas", icon: Dumbbell, category: "Gestão de Pacientes" },
  { name: "supplements", label: "Suplementos", description: "Prescrição e gestão de suplementos", icon: Pill, category: "Gestão de Pacientes" },
  { name: "checkin_panel", label: "Painel de Check-ins", description: "Revisão de check-ins dos pacientes", icon: ClipboardCheck, category: "Gestão de Pacientes" },

  // Comunicação
  { name: "chat", label: "Chat", description: "Comunicação direta com pacientes via chat", icon: MessageSquare, category: "Comunicação" },
  { name: "appointments", label: "Agenda", description: "Agendamento de consultas e compromissos", icon: Calendar, category: "Comunicação" },
  { name: "notifications_push", label: "Push Notifications", description: "Envio de notificações push para pacientes", icon: Bell, category: "Comunicação" },
  { name: "feedbacks", label: "Feedbacks", description: "Sistema de feedback bidirecional", icon: MessageSquare, category: "Comunicação" },
  { name: "global_tips", label: "Dicas Globais", description: "Publicação de dicas para todos os pacientes", icon: BookOpen, category: "Comunicação" },

  // Ferramentas
  { name: "food_database", label: "Banco de Alimentos", description: "Acesso completo ao banco de alimentos TACO", icon: Utensils, category: "Ferramentas" },
  { name: "recipes", label: "Receitas", description: "Biblioteca de receitas compartilhadas", icon: ChefHat, category: "Ferramentas" },
  { name: "shopping_list", label: "Lista de Compras", description: "Geração de lista de compras para pacientes", icon: ShoppingCart, category: "Ferramentas" },
  { name: "diet_templates", label: "Templates de Dieta", description: "Templates pré-configurados de dietas", icon: BookOpen, category: "Ferramentas" },
  { name: "branding", label: "Branding", description: "Personalização visual da marca", icon: Heart, category: "Ferramentas" },

  // Relatórios & Financeiro
  { name: "reports", label: "Relatórios", description: "Geração de relatórios detalhados", icon: BarChart3, category: "Relatórios & Financeiro" },
  { name: "financial", label: "Financeiro", description: "Painel financeiro completo com gráficos", icon: DollarSign, category: "Relatórios & Financeiro" },
];

const CATEGORY_ICONS: Record<string, typeof Brain> = {
  "IA & Automação": Sparkles,
  "Gestão de Pacientes": Users,
  "Comunicação": MessageSquare,
  "Ferramentas": Utensils,
  "Relatórios & Financeiro": BarChart3,
};

interface NutritionistFeature {
  user_id: string;
  full_name: string;
  features: Record<string, boolean>;
}

export default function AdminFeatureControl() {
  const { user } = useAuth();
  const [nutritionists, setNutritionists] = useState<NutritionistFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedNut, setSelectedNut] = useState<string | null>(null);
  const [globalDefaults, setGlobalDefaults] = useState<Record<string, boolean>>({});

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
        ALL_FEATURES.forEach(f => { features[f.name] = true; });
        featureRows?.forEach((fr: any) => { features[fr.feature_name] = fr.status === "enabled"; });

        result.push({ user_id: r.user_id, full_name: profile?.full_name || "Nutricionista", features });
      }
      setNutritionists(result);
      if (result.length > 0) setSelectedNut(result[0].user_id);
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

  const toggleFeature = async (nutId: string, featureName: string, enabled: boolean) => {
    const newStatus = enabled ? "enabled" : "disabled";
    const { error } = await (supabase.from("professional_feature_usage" as any) as any).upsert(
      { nutritionist_id: nutId, feature_name: featureName, status: newStatus },
      { onConflict: "nutritionist_id,feature_name" }
    );
    if (error) { toast.error("Erro ao atualizar: " + error.message); return; }
    setNutritionists(prev => prev.map(n => n.user_id === nutId ? { ...n, features: { ...n.features, [featureName]: enabled } } : n));
    toast.success(`${featureName} ${enabled ? "habilitada" : "desabilitada"}`);
  };

  const toggleAllForNut = async (nutId: string, enabled: boolean) => {
    for (const f of ALL_FEATURES) {
      await toggleFeature(nutId, f.name, enabled);
    }
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

  const enabledCount = selectedNutData ? Object.values(selectedNutData.features).filter(Boolean).length : 0;
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
                    const count = Object.values(n.features).filter(Boolean).length;
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
                  <div className="grid grid-cols-3 gap-3">
                    <Card className="glass shadow-card">
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-primary">{enabledCount}</p>
                        <p className="text-xs text-muted-foreground">Ativas</p>
                      </CardContent>
                    </Card>
                    <Card className="glass shadow-card">
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-destructive">{totalCount - enabledCount}</p>
                        <p className="text-xs text-muted-foreground">Desativadas</p>
                      </CardContent>
                    </Card>
                    <Card className="glass shadow-card">
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-amber-500">{Object.keys(categories).length}</p>
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
                        onClick={() => toggleAllForNut(selectedNutData.user_id, true)}
                        className="px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                      >
                        Ativar Todas
                      </button>
                      <button
                        onClick={() => toggleAllForNut(selectedNutData.user_id, false)}
                        className="px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors"
                      >
                        Desativar Todas
                      </button>
                    </div>
                  </div>

                  {/* Feature categories */}
                  {Object.entries(filteredCategories).map(([category, features]) => {
                    const CatIcon = CATEGORY_ICONS[category] || Zap;
                    const activeInCat = features.filter(f => selectedNutData.features[f.name]).length;
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
                          <CardDescription className="text-xs">
                            {activeInCat === features.length ? "Todas ativas" : `${features.length - activeInCat} desativada(s)`}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {features.map(f => {
                            const isEnabled = selectedNutData.features[f.name] ?? true;
                            return (
                              <div
                                key={f.name}
                                className={`flex items-center justify-between py-2.5 px-3 rounded-lg transition-colors ${
                                  isEnabled ? "bg-muted/30" : "bg-destructive/5 border border-destructive/10"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                    isEnabled ? "bg-primary/10" : "bg-muted"
                                  }`}>
                                    <f.icon className={`w-4 h-4 ${isEnabled ? "text-primary" : "text-muted-foreground"}`} />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-medium">{f.label}</p>
                                      {!isEnabled && (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/30 text-amber-500">
                                          <Crown className="w-2.5 h-2.5 mr-0.5" />
                                          Premium
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{f.description}</p>
                                  </div>
                                </div>
                                <Switch
                                  checked={isEnabled}
                                  onCheckedChange={(checked) => toggleFeature(selectedNutData.user_id, f.name, checked)}
                                />
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
      </div>
    </DashboardLayout>
  );
}
