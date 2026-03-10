import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Crown, Trophy, Settings2, Zap, Save } from "lucide-react";
import PrestigeBadge from "@/components/prestige/PrestigeBadge";
import type { PrestigePlan } from "@/hooks/usePrestige";

interface PointRule {
  id: string;
  action_key: string;
  action_label: string;
  points: number;
  daily_limit: number | null;
  icon: string;
  is_active: boolean;
}

export default function AdminPrestige() {
  const [plans, setPlans] = useState<any[]>([]);
  const [rules, setRules] = useState<PointRule[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("prestige_plans").select("*").order("display_order"),
      supabase.from("ranking_point_rules").select("*").order("action_key"),
    ]).then(([p, r]) => {
      setPlans(p.data || []);
      setRules((r.data as PointRule[]) || []);
    });
  }, []);

  const updatePlan = (id: string, field: string, value: any) => {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const updateRule = (id: string, field: string, value: any) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const savePlans = async () => {
    setSaving(true);
    for (const plan of plans) {
      const { id, created_at, updated_at, ...rest } = plan;
      await supabase.from("prestige_plans").update({ ...rest, updated_at: new Date().toISOString() }).eq("id", id);
    }
    toast.success("Planos atualizados!");
    setSaving(false);
  };

  const saveRules = async () => {
    setSaving(true);
    for (const rule of rules) {
      await supabase.from("ranking_point_rules").update({
        action_label: rule.action_label,
        points: rule.points,
        daily_limit: rule.daily_limit,
        icon: rule.icon,
        is_active: rule.is_active,
      }).eq("id", rule.id);
    }
    toast.success("Regras de pontuação atualizadas!");
    setSaving(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Crown className="w-7 h-7 text-accent" /> Prestígio & Ranking
          </h1>
          <p className="text-muted-foreground text-sm">
            Configure planos de prestígio, badges, efeitos visuais e sistema de pontos
          </p>
        </div>

        <Tabs defaultValue="plans">
          <TabsList>
            <TabsTrigger value="plans" className="gap-1"><Crown className="w-4 h-4" /> Planos</TabsTrigger>
            <TabsTrigger value="points" className="gap-1"><Zap className="w-4 h-4" /> Pontos</TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="space-y-4 mt-4">
            {plans.map((plan) => (
              <motion.div key={plan.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PrestigeBadge plan={plan as PrestigePlan} size="sm" />
                        {plan.name}
                      </div>
                      <span className="text-xs text-muted-foreground">Ordem: {plan.display_order}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <Label className="text-xs">Nome</Label>
                        <Input value={plan.name} onChange={(e) => updatePlan(plan.id, "name", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Cor (hex)</Label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={plan.color}
                            onChange={(e) => updatePlan(plan.id, "color", e.target.value)}
                            className="w-10 h-9 rounded cursor-pointer"
                          />
                          <Input value={plan.color} onChange={(e) => updatePlan(plan.id, "color", e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Badge Icon</Label>
                        <Input value={plan.badge_icon} onChange={(e) => updatePlan(plan.id, "badge_icon", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Badge Label</Label>
                        <Input value={plan.badge_label} onChange={(e) => updatePlan(plan.id, "badge_label", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Efeito</Label>
                        <select
                          value={plan.effect_type}
                          onChange={(e) => updatePlan(plan.id, "effect_type", e.target.value)}
                          className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                        >
                          <option value="none">Nenhum</option>
                          <option value="glow">Glow</option>
                          <option value="shimmer">Shimmer</option>
                          <option value="golden">Golden</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs">Multiplicador IA</Label>
                        <Input type="number" value={plan.ai_usage_multiplier} onChange={(e) => updatePlan(plan.id, "ai_usage_multiplier", Number(e.target.value))} />
                      </div>
                      <div className="flex items-center gap-2 pt-5">
                        <Switch checked={plan.crown_enabled} onCheckedChange={(v) => updatePlan(plan.id, "crown_enabled", v)} />
                        <Label className="text-xs">Coroa</Label>
                      </div>
                      <div className="flex items-center gap-2 pt-5">
                        <Switch checked={plan.ranking_highlight} onCheckedChange={(v) => updatePlan(plan.id, "ranking_highlight", v)} />
                        <Label className="text-xs">Destaque Ranking</Label>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-3 mt-3">
                      <div>
                        <Label className="text-xs">R$/mês</Label>
                        <Input type="number" value={plan.price_monthly || 0} onChange={(e) => updatePlan(plan.id, "price_monthly", Number(e.target.value))} />
                      </div>
                      <div>
                        <Label className="text-xs">R$/trimestre</Label>
                        <Input type="number" value={plan.price_quarterly || ""} onChange={(e) => updatePlan(plan.id, "price_quarterly", e.target.value ? Number(e.target.value) : null)} />
                      </div>
                      <div>
                        <Label className="text-xs">R$/semestre</Label>
                        <Input type="number" value={plan.price_semiannual || ""} onChange={(e) => updatePlan(plan.id, "price_semiannual", e.target.value ? Number(e.target.value) : null)} />
                      </div>
                      <div>
                        <Label className="text-xs">R$/anual</Label>
                        <Input type="number" value={plan.price_annual || ""} onChange={(e) => updatePlan(plan.id, "price_annual", e.target.value ? Number(e.target.value) : null)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            <Button onClick={savePlans} disabled={saving} className="gap-2">
              <Save className="w-4 h-4" /> Salvar Planos
            </Button>
          </TabsContent>

          <TabsContent value="points" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-4 h-4 text-accent" /> Regras de Pontuação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {rules.map((rule) => (
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
              <Save className="w-4 h-4" /> Salvar Regras
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
