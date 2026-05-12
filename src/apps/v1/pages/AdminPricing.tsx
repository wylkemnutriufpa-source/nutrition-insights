import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { supabase } from "@v1/integrations/supabase/client";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Input } from "@v1/components/ui/input";
import { Label } from "@v1/components/ui/label";
import { Switch } from "@v1/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@v1/components/ui/tabs";
import { Badge } from "@v1/components/ui/badge";
import { Textarea } from "@v1/components/ui/textarea";
import { toast } from "sonner";
import {
  Crown, Zap, Save, DollarSign, Users, Briefcase, Plus, Trash2, Star,
  GripVertical, Check
} from "lucide-react";
import PrestigeBadge from "@v1/components/prestige/PrestigeBadge";
import type { PrestigePlan } from "@v1/hooks/usePrestige";

// ─── Types ───
interface PricingPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number | null;
  features: string[];
  max_patients: number | null;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
  currency: string;
}

interface PointRule {
  id: string;
  action_key: string;
  action_label: string;
  points: number;
  daily_limit: number | null;
  icon: string;
  is_active: boolean;
}

export default function AdminPricing() {
  const [tab, setTab] = useState("patients");
  const [prestigePlans, setPrestigePlans] = useState<any[]>([]);
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
  const [pointRules, setPointRules] = useState<PointRule[]>([]);
  const [saving, setSaving] = useState(false);
  const [newFeature, setNewFeature] = useState<Record<string, string>>({});
  const [payments, setPayments] = useState<any[]>([]);

  const fetchAll = () => {
    Promise.all([
      supabase.from("prestige_plans").select("*").order("display_order"),
      supabase.from("pricing_plans").select("*").order("sort_order"),
      supabase.from("ranking_point_rules").select("*").order("action_key"),
      supabase.from("payments").select("amount, status, gateway, created_at").order("created_at", { ascending: false }).limit(500),
    ]).then(([pr, pp, ru, pay]) => {
      setPrestigePlans(pr.data || []);
      setPricingPlans(
        (pp.data || []).map((p: any) => ({
          ...p,
          features: Array.isArray(p.features) ? p.features : [],
        }))
      );
      setPointRules((ru.data as PointRule[]) || []);
      setPayments(pay.data || []);
    });
  };

  useEffect(() => { fetchAll(); }, []);

  // Financial summary
  const financialSummary = useMemo(() => {
    const paid = payments.filter(p => p.status === "paid");
    const totalRevenue = paid.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const thisMonth = paid.filter(p => {
      const d = new Date(p.created_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const monthlyRevenue = thisMonth.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return { totalRevenue, monthlyRevenue, totalPayments: paid.length };
  }, [payments]);

  // ─── Prestige Plans (Pacientes) ───
  const updatePrestige = (id: string, field: string, value: any) =>
    setPrestigePlans((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));

  const addNewPrestigePlan = async () => {
    const slug = `prestige-${Date.now()}`;
    const { data, error } = await supabase
      .from("prestige_plans")
      .insert({
        name: "Novo Plano",
        slug,
        color: "#6366f1",
        badge_icon: "⭐",
        badge_label: "Novo",
        display_order: prestigePlans.length + 1,
        price_monthly: 0,
      })
      .select()
      .single();
    if (error) {
      toast.error("Erro ao criar plano: " + error.message);
      return;
    }
    if (data) {
      setPrestigePlans((prev) => [...prev, data]);
      toast.success("Novo plano de paciente criado!");
    }
  };

  const deletePrestigePlan = async (id: string) => {
    if (!confirm("Excluir este plano de paciente?")) return;
    const { error } = await supabase.from("prestige_plans").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      setPrestigePlans((prev) => prev.filter((p) => p.id !== id));
      toast.success("Plano removido!");
    }
  };

  const savePrestigePlans = async () => {
    setSaving(true);
    for (const plan of prestigePlans) {
      const { id, created_at, updated_at, ...rest } = plan;
      await supabase.from("prestige_plans").update({ ...rest, updated_at: new Date().toISOString() }).eq("id", id);
    }
    toast.success("Planos de pacientes atualizados!");
    setSaving(false);
  };

  // ─── Pricing Plans (Profissionais) ───
  const updatePricing = (id: string, field: string, value: any) =>
    setPricingPlans((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));

  const addFeature = (planId: string) => {
    const feat = newFeature[planId]?.trim();
    if (!feat) return;
    setPricingPlans((prev) =>
      prev.map((p) =>
        p.id === planId ? { ...p, features: [...p.features, feat] } : p
      )
    );
    setNewFeature((prev) => ({ ...prev, [planId]: "" }));
  };

  const removeFeature = (planId: string, index: number) =>
    setPricingPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? { ...p, features: p.features.filter((_, i) => i !== index) }
          : p
      )
    );

  const savePricingPlans = async () => {
    setSaving(true);
    for (const plan of pricingPlans) {
      const { id, ...rest } = plan;
      await supabase
        .from("pricing_plans")
        .update({ ...rest, updated_at: new Date().toISOString() })
        .eq("id", id);
    }
    toast.success("Planos de profissionais atualizados!");
    setSaving(false);
  };

  const addNewPricingPlan = async () => {
    const slug = `plan-${Date.now()}`;
    const { data, error } = await supabase
      .from("pricing_plans")
      .insert({
        name: "Novo Plano",
        slug,
        description: "",
        price_monthly: 0,
        features: [],
        sort_order: pricingPlans.length + 1,
      })
      .select()
      .single();
    if (error) {
      toast.error("Erro ao criar plano: " + error.message);
      return;
    }
    if (data) {
      setPricingPlans((prev) => [
        ...prev,
        { ...data, features: Array.isArray(data.features) ? data.features as string[] : [] },
      ]);
      toast.success("Novo plano criado!");
    }
  };

  const deletePricingPlan = async (id: string) => {
    if (!confirm("Excluir este plano de profissional?")) return;
    const { error } = await supabase.from("pricing_plans").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      setPricingPlans((prev) => prev.filter((p) => p.id !== id));
      toast.success("Plano removido!");
    }
  };

  // ─── Point Rules ───
  const updateRule = (id: string, field: string, value: any) =>
    setPointRules((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));

  const saveRules = async () => {
    setSaving(true);
    for (const rule of pointRules) {
      await supabase
        .from("ranking_point_rules")
        .update({
          action_label: rule.action_label,
          points: rule.points,
          daily_limit: rule.daily_limit,
          icon: rule.icon,
          is_active: rule.is_active,
        })
        .eq("id", rule.id);
    }
    toast.success("Regras de pontuação atualizadas!");
    setSaving(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-primary" /> Gestão de Planos & Preços
          </h1>
          <p className="text-muted-foreground text-sm">
            Configure planos para pacientes e profissionais, preços, features e pontuação
          </p>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="glass shadow-card">
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold font-display text-primary">
                R$ {financialSummary.monthlyRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-muted-foreground">Receita do Mês</p>
            </CardContent>
          </Card>
          <Card className="glass shadow-card">
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold font-display text-accent">
                R$ {financialSummary.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-muted-foreground">Receita Total</p>
            </CardContent>
          </Card>
          <Card className="glass shadow-card">
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold font-display">{financialSummary.totalPayments}</p>
              <p className="text-[11px] text-muted-foreground">Pagamentos Recebidos</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-3 w-full max-w-lg">
            <TabsTrigger value="patients" className="gap-1.5">
              <Crown className="w-4 h-4" /> Pacientes
            </TabsTrigger>
            <TabsTrigger value="professionals" className="gap-1.5">
              <Briefcase className="w-4 h-4" /> Profissionais
            </TabsTrigger>
            <TabsTrigger value="points" className="gap-1.5">
              <Zap className="w-4 h-4" /> Pontos
            </TabsTrigger>
          </TabsList>

          {/* ═══ TAB: Patient Prestige Plans ═══ */}
          <TabsContent value="patients" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold flex items-center gap-2">
                <Users className="w-5 h-5" /> Planos de Prestígio (Pacientes)
              </h2>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {prestigePlans.length} planos
                </Badge>
                <Button variant="outline" size="sm" onClick={addNewPrestigePlan} className="gap-1.5">
                  <Plus className="w-4 h-4" /> Novo Plano
                </Button>
              </div>
            </div>

            {prestigePlans.map((plan) => (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-l-4" style={{ borderLeftColor: plan.color }}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PrestigeBadge plan={plan as PrestigePlan} size="sm" />
                        <span style={{ color: plan.color }}>{plan.name}</span>
                        {plan.crown_enabled && <Crown className="w-4 h-4" style={{ color: plan.color }} />}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Ordem: {plan.display_order}</span>
                        <Button variant="ghost" size="sm" onClick={() => deletePrestigePlan(plan.id)} className="text-destructive hover:text-destructive h-7 w-7 p-0">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Basic info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <Label className="text-xs">Nome</Label>
                        <Input value={plan.name} onChange={(e) => updatePrestige(plan.id, "name", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Slug</Label>
                        <Input value={plan.slug} onChange={(e) => updatePrestige(plan.id, "slug", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Cor</Label>
                        <div className="flex gap-2">
                          <input type="color" value={plan.color} onChange={(e) => updatePrestige(plan.id, "color", e.target.value)} className="w-10 h-9 rounded cursor-pointer" />
                          <Input value={plan.color} onChange={(e) => updatePrestige(plan.id, "color", e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Ordem</Label>
                        <Input type="number" value={plan.display_order} onChange={(e) => updatePrestige(plan.id, "display_order", Number(e.target.value))} />
                      </div>
                    </div>

                    {/* Visual */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <Label className="text-xs">Badge Icon</Label>
                        <Input value={plan.badge_icon} onChange={(e) => updatePrestige(plan.id, "badge_icon", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Badge Label</Label>
                        <Input value={plan.badge_label} onChange={(e) => updatePrestige(plan.id, "badge_label", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Efeito Visual</Label>
                        <select
                          value={plan.effect_type}
                          onChange={(e) => updatePrestige(plan.id, "effect_type", e.target.value)}
                          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="none">Nenhum</option>
                          <option value="glow">Glow</option>
                          <option value="shimmer">Shimmer</option>
                          <option value="golden">Golden</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs">Multiplicador IA</Label>
                        <Input type="number" step="0.1" value={plan.ai_usage_multiplier} onChange={(e) => updatePrestige(plan.id, "ai_usage_multiplier", Number(e.target.value))} />
                      </div>
                    </div>

                    {/* Toggles */}
                    <div className="flex flex-wrap gap-6">
                      <div className="flex items-center gap-2">
                        <Switch checked={plan.crown_enabled} onCheckedChange={(v) => updatePrestige(plan.id, "crown_enabled", v)} />
                        <Label className="text-xs">Coroa</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={plan.ranking_highlight} onCheckedChange={(v) => updatePrestige(plan.id, "ranking_highlight", v)} />
                        <Label className="text-xs">Destaque Ranking</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={plan.is_active} onCheckedChange={(v) => updatePrestige(plan.id, "is_active", v)} />
                        <Label className="text-xs">Ativo</Label>
                      </div>
                    </div>

                    {/* Prices */}
                    <div>
                      <Label className="text-xs font-semibold mb-2 block">Preços (R$)</Label>
                      <div className="grid grid-cols-4 gap-3">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Mensal</Label>
                          <Input type="number" value={plan.price_monthly || 0} onChange={(e) => updatePrestige(plan.id, "price_monthly", Number(e.target.value))} />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Trimestral</Label>
                          <Input type="number" value={plan.price_quarterly || ""} onChange={(e) => updatePrestige(plan.id, "price_quarterly", e.target.value ? Number(e.target.value) : null)} />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Semestral</Label>
                          <Input type="number" value={plan.price_semiannual || ""} onChange={(e) => updatePrestige(plan.id, "price_semiannual", e.target.value ? Number(e.target.value) : null)} />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Anual</Label>
                          <Input type="number" value={plan.price_annual || ""} onChange={(e) => updatePrestige(plan.id, "price_annual", e.target.value ? Number(e.target.value) : null)} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            <Button onClick={savePrestigePlans} disabled={saving} className="gap-2">
              <Save className="w-4 h-4" /> Salvar Planos de Pacientes
            </Button>
          </TabsContent>

          {/* ═══ TAB: Professional Pricing Plans ═══ */}
          <TabsContent value="professionals" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold flex items-center gap-2">
                <Briefcase className="w-5 h-5" /> Planos para Profissionais
              </h2>
              <Button variant="outline" size="sm" onClick={addNewPricingPlan} className="gap-1.5">
                <Plus className="w-4 h-4" /> Novo Plano
              </Button>
            </div>

            {pricingPlans.map((plan) => (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card className={plan.is_featured ? "border-primary/50 shadow-glow" : ""}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {plan.is_featured && <Star className="w-4 h-4 text-primary fill-primary" />}
                        {plan.name}
                        {!plan.is_active && <Badge variant="secondary" className="text-[10px]">Inativo</Badge>}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deletePricingPlan(plan.id)} className="text-destructive hover:text-destructive h-7 w-7 p-0">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Basic */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <Label className="text-xs">Nome</Label>
                        <Input value={plan.name} onChange={(e) => updatePricing(plan.id, "name", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Slug</Label>
                        <Input value={plan.slug} onChange={(e) => updatePricing(plan.id, "slug", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Ordem</Label>
                        <Input type="number" value={plan.sort_order} onChange={(e) => updatePricing(plan.id, "sort_order", Number(e.target.value))} />
                      </div>
                      <div>
                        <Label className="text-xs">Max Pacientes</Label>
                        <Input type="number" value={plan.max_patients ?? ""} onChange={(e) => updatePricing(plan.id, "max_patients", e.target.value ? Number(e.target.value) : null)} placeholder="Ilimitado" />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">Descrição</Label>
                      <Textarea value={plan.description || ""} onChange={(e) => updatePricing(plan.id, "description", e.target.value)} rows={2} />
                    </div>

                    {/* Prices */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">R$/mês</Label>
                        <Input type="number" value={plan.price_monthly} onChange={(e) => updatePricing(plan.id, "price_monthly", Number(e.target.value))} />
                      </div>
                      <div>
                        <Label className="text-xs">R$/ano</Label>
                        <Input type="number" value={plan.price_yearly ?? ""} onChange={(e) => updatePricing(plan.id, "price_yearly", e.target.value ? Number(e.target.value) : null)} />
                      </div>
                    </div>

                    {/* Toggles */}
                    <div className="flex gap-6">
                      <div className="flex items-center gap-2">
                        <Switch checked={plan.is_featured} onCheckedChange={(v) => updatePricing(plan.id, "is_featured", v)} />
                        <Label className="text-xs">Destaque</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={plan.is_active} onCheckedChange={(v) => updatePricing(plan.id, "is_active", v)} />
                        <Label className="text-xs">Ativo</Label>
                      </div>
                    </div>

                    {/* Features */}
                    <div>
                      <Label className="text-xs font-semibold mb-2 block">Features incluídas</Label>
                      <div className="space-y-1.5">
                        {plan.features.map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/50">
                            <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="text-sm flex-1">{feat}</span>
                            <button onClick={() => removeFeature(plan.id, idx)} className="text-destructive hover:text-destructive/80 p-0.5">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Input
                          placeholder="Nova feature..."
                          value={newFeature[plan.id] || ""}
                          onChange={(e) => setNewFeature((prev) => ({ ...prev, [plan.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeature(plan.id))}
                          className="text-sm"
                        />
                        <Button variant="outline" size="sm" onClick={() => addFeature(plan.id)} className="shrink-0">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            <Button onClick={savePricingPlans} disabled={saving} className="gap-2">
              <Save className="w-4 h-4" /> Salvar Planos de Profissionais
            </Button>
          </TabsContent>

          {/* ═══ TAB: Point Rules ═══ */}
          <TabsContent value="points" className="space-y-4 mt-4">
            <h2 className="font-display font-semibold flex items-center gap-2">
              <Zap className="w-5 h-5 text-accent" /> Regras de Pontuação do Ranking
            </h2>
            <Card>
              <CardContent className="space-y-3 pt-6">
                {pointRules.map((rule) => (
                  <div key={rule.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30">
                    <Input value={rule.icon} onChange={(e) => updateRule(rule.id, "icon", e.target.value)} className="w-12 text-center" />
                    <div className="flex-1">
                      <Input value={rule.action_label} onChange={(e) => updateRule(rule.id, "action_label", e.target.value)} className="text-sm" />
                      <span className="text-xs text-muted-foreground">{rule.action_key}</span>
                    </div>
                    <div className="w-20">
                      <Label className="text-[10px]">Pontos</Label>
                      <Input type="number" value={rule.points} onChange={(e) => updateRule(rule.id, "points", Number(e.target.value))} />
                    </div>
                    <div className="w-20">
                      <Label className="text-[10px]">Limite/dia</Label>
                      <Input type="number" value={rule.daily_limit ?? ""} onChange={(e) => updateRule(rule.id, "daily_limit", e.target.value ? Number(e.target.value) : null)} />
                    </div>
                    <Switch checked={rule.is_active} onCheckedChange={(v) => updateRule(rule.id, "is_active", v)} />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Button onClick={saveRules} disabled={saving} className="gap-2">
              <Save className="w-4 h-4" /> Salvar Regras de Pontuação
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
