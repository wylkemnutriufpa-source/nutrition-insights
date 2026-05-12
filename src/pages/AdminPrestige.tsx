import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Crown, Zap, Save, Plus, Trash2, X, Sparkles, Loader2, Users, Search, UserPlus, UserMinus, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import PrestigeBadge from "@/components/prestige/PrestigeBadge";
import PatientPickerDropdown from "@/components/common/PatientPickerDropdown";
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

interface PatientInfo {
  user_id: string;
  full_name: string;
}

interface MemberInfo {
  id: string;
  patient_id: string;
  plan_id: string;
  full_name: string;
}

const DEFAULT_PLANS = [
  { name: "Basic", slug: "basic", display_order: 1, color: "#6b7280", badge_icon: "⬡", badge_label: "BASIC", crown_enabled: false, effect_type: "none", ranking_highlight: false, ai_usage_multiplier: 1, price_monthly: 0 },
  { name: "Elite", slug: "elite", display_order: 2, color: "#94a3b8", badge_icon: "✦", badge_label: "ELITE", crown_enabled: false, effect_type: "glow", ranking_highlight: false, ai_usage_multiplier: 2, price_monthly: 49.90, price_quarterly: 129.90 },
  { name: "Pro", slug: "pro", display_order: 3, color: "#8b5cf6", badge_icon: "◆", badge_label: "PRO", crown_enabled: false, effect_type: "shimmer", ranking_highlight: true, ai_usage_multiplier: 3, price_monthly: 79.90, price_semiannual: 399.90 },
  { name: "Premium", slug: "premium", display_order: 4, color: "#f59e0b", badge_icon: "👑", badge_label: "PREMIUM", crown_enabled: true, effect_type: "golden", ranking_highlight: true, ai_usage_multiplier: 5, price_monthly: 129.90, price_annual: 1199.90 },
];

export default function AdminPrestige() {
  const { user, isAdmin } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [rules, setRules] = useState<PointRule[]>([]);
  const [saving, setSaving] = useState(false);
  const [newFeatureInputs, setNewFeatureInputs] = useState<Record<string, string>>({});

  // Members tab state
  const [allPatients, setAllPatients] = useState<PatientInfo[]>([]);
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [memberSearch, setMemberSearch] = useState<Record<string, string>>({});
  const [assigning, setAssigning] = useState<string | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("prestige_plans").select("*").order("display_order"),
      supabase.from("ranking_point_rules").select("*").order("action_key"),
    ]).then(([p, r]) => {
      setPlans(p.data || []);
      setRules((r.data as PointRule[]) || []);
    });
  }, []);

  const loadMembers = async () => {
    if (membersLoaded) return;
    
    const [patientsRes, membersRes] = await Promise.all([
      // Admin sees all patients; nutritionist sees only their own
      isAdmin
        ? supabase.from("profiles").select("user_id, full_name")
        : supabase
            .from("nutritionist_patients")
            .select("patient_id")
            .eq("nutritionist_id", user?.id || "")
            .eq("status", "active"),
      supabase
        .from("patient_prestige")
        .select("id, patient_id, plan_id")
        .eq("is_active", true),
    ]);

    let patientList: PatientInfo[] = [];
    if (isAdmin) {
      patientList = (patientsRes.data || []).map((p: any) => ({
        user_id: p.user_id,
        full_name: p.full_name || "Sem nome",
      })).sort((a, b) => a.full_name.localeCompare(b.full_name));
    } else if (patientsRes.data) {
      const patientIds = patientsRes.data.map((p: any) => p.patient_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", patientIds);
      patientList = (profiles || []).map((p: any) => ({
        user_id: p.user_id,
        full_name: p.full_name || "Sem nome",
      })).sort((a, b) => a.full_name.localeCompare(b.full_name));
    }

    const memberList: MemberInfo[] = (membersRes.data || []).map((m: any) => {
      const patient = patientList.find(p => p.user_id === m.patient_id);
      return {
        id: m.id,
        patient_id: m.patient_id,
        plan_id: m.plan_id,
        full_name: patient?.full_name || "Paciente",
      };
    });

    setAllPatients(patientList);
    setMembers(memberList);
    setMembersLoaded(true);
  };

  const assignPatient = async (patientId: string, planId: string) => {
    setAssigning(patientId);
    
    // Deactivate any existing prestige
    await supabase
      .from("patient_prestige")
      .update({ is_active: false })
      .eq("patient_id", patientId)
      .eq("is_active", true);

    // Insert new
    const { data, error } = await supabase
      .from("patient_prestige")
      .insert({
        patient_id: patientId,
        plan_id: planId,
        is_active: true,
        assigned_by: user?.id,
      })
      .select("id")
      .single();

    if (error) {
      toast.error("Erro: " + error.message);
      setAssigning(null);
      return;
    }

    const patient = allPatients.find(p => p.user_id === patientId);
    const plan = plans.find(p => p.id === planId);

    // Update local state
    setMembers(prev => [
      ...prev.filter(m => m.patient_id !== patientId),
      { id: data.id, patient_id: patientId, plan_id: planId, full_name: patient?.full_name || "Paciente" },
    ]);

    toast.success(`${patient?.full_name} → ${plan?.name}!`);
    setAssigning(null);
  };

  const removeFromPlan = async (memberId: string, patientName: string) => {
    await supabase.from("patient_prestige").update({ is_active: false }).eq("id", memberId);
    setMembers(prev => prev.filter(m => m.id !== memberId));
    toast.success(`${patientName} removido do plano`);
  };

  const updatePlan = (id: string, field: string, value: any) => {
    setPlans(prev => prev.map(p => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const updateRule = (id: string, field: string, value: any) => {
    setRules(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const addFeature = (planId: string) => {
    const text = (newFeatureInputs[planId] || "").trim();
    if (!text) return;
    setPlans(prev => prev.map(p => {
      if (p.id !== planId) return p;
      const features = Array.isArray(p.features) ? [...p.features, text] : [text];
      return { ...p, features };
    }));
    setNewFeatureInputs(prev => ({ ...prev, [planId]: "" }));
  };

  const removeFeature = (planId: string, index: number) => {
    setPlans(prev => prev.map(p => {
      if (p.id !== planId) return p;
      const features = Array.isArray(p.features) ? p.features.filter((_: any, i: number) => i !== index) : [];
      return { ...p, features };
    }));
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
        action_label: rule.action_label, points: rule.points,
        daily_limit: rule.daily_limit, icon: rule.icon, is_active: rule.is_active,
      }).eq("id", rule.id);
    }
    toast.success("Regras de pontuação atualizadas!");
    setSaving(false);
  };

  const addNewPlan = async () => {
    const order = plans.length > 0 ? Math.max(...plans.map(p => p.display_order)) + 1 : 1;
    const { data, error } = await supabase.from("prestige_plans").insert({
      name: `Novo Plano ${order}`,
      slug: `plan-${order}`,
      display_order: order,
      color: "#6b7280",
      badge_icon: "⭐",
      badge_label: `PLANO ${order}`,
      features: [],
    }).select().single();
    if (error) { toast.error("Erro: " + error.message); return; }
    setPlans(prev => [...prev, data]);
    toast.success("Novo plano criado!");
  };

  const deletePlan = async (id: string) => {
    if (!confirm("Remover este plano de prestígio?")) return;
    const { error } = await supabase.from("prestige_plans").delete().eq("id", id);
    if (error) { toast.error("Erro: " + error.message); return; }
    setPlans(prev => prev.filter(p => p.id !== id));
    toast.success("Plano removido");
  };

  const seedDefaults = async () => {
    if (!confirm("Isso criará os 4 planos padrão (Basic, Elite, Pro, Premium). Continuar?")) return;
    setSaving(true);
    for (const d of DEFAULT_PLANS) {
      const existing = plans.find(p => p.slug === d.slug);
      if (!existing) {
        await supabase.from("prestige_plans").insert({ ...d, features: [] });
      }
    }
    const { data } = await supabase.from("prestige_plans").select("*").order("display_order");
    setPlans(data || []);
    toast.success("Planos padrão criados!");
    setSaving(false);
  };

  // Get unassigned patients for a given plan's search
  const getAvailablePatients = (planId: string) => {
    const assignedIds = new Set(members.map(m => m.patient_id));
    return allPatients.filter(p => !assignedIds.has(p.user_id));
  };

  const getPlanMembers = (planId: string) => {
    return members.filter(m => m.plan_id === planId).sort((a, b) => a.full_name.localeCompare(b.full_name));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Crown className="w-7 h-7 text-accent" /> Prestígio & Ranking
            </h1>
            <p className="text-muted-foreground text-sm">
              Configure planos de prestígio, badges, efeitos visuais e sistema de pontos
            </p>
          </div>
          <div className="flex gap-2">
            {plans.length === 0 && (
              <Button variant="outline" size="sm" onClick={seedDefaults} disabled={saving} className="gap-1.5">
                <Sparkles className="w-4 h-4" /> Criar Padrões
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={addNewPlan} className="gap-1.5">
              <Plus className="w-4 h-4" /> Novo Plano
            </Button>
          </div>
        </div>

        <Tabs defaultValue="plans" onValueChange={(v) => { if (v === "members") loadMembers(); }}>
          <TabsList>
            <TabsTrigger value="plans" className="gap-1"><Crown className="w-4 h-4" /> Planos</TabsTrigger>
            <TabsTrigger value="members" className="gap-1"><Users className="w-4 h-4" /> Membros</TabsTrigger>
            <TabsTrigger value="points" className="gap-1"><Zap className="w-4 h-4" /> Pontos</TabsTrigger>
          </TabsList>

          {/* ─── PLANS TAB ─── */}
          <TabsContent value="plans" className="space-y-4 mt-4">
            {plans.map(plan => {
              const features = Array.isArray(plan.features) ? plan.features : [];
              return (
                <motion.div key={plan.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Card className="relative">
                    <Button
                      variant="ghost" size="sm"
                      className="absolute top-3 right-3 h-7 w-7 p-0"
                      onClick={() => deletePlan(plan.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <PrestigeBadge plan={plan as PrestigePlan} size="sm" clickable={false} />
                        {plan.name}
                        <span className="text-xs text-muted-foreground ml-auto mr-8">Ordem: {plan.display_order}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <Label className="text-xs">Nome</Label>
                          <Input value={plan.name} onChange={e => updatePlan(plan.id, "name", e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Slug</Label>
                          <Input value={plan.slug} onChange={e => updatePlan(plan.id, "slug", e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Cor (hex)</Label>
                          <div className="flex gap-2">
                            <input type="color" value={plan.color} onChange={e => updatePlan(plan.id, "color", e.target.value)} className="w-10 h-9 rounded cursor-pointer" />
                            <Input value={plan.color} onChange={e => updatePlan(plan.id, "color", e.target.value)} />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Ordem</Label>
                          <Input type="number" value={plan.display_order} onChange={e => updatePlan(plan.id, "display_order", Number(e.target.value))} />
                        </div>
                        <div>
                          <Label className="text-xs">Badge Icon</Label>
                          <Input value={plan.badge_icon} onChange={e => updatePlan(plan.id, "badge_icon", e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Badge Label</Label>
                          <Input value={plan.badge_label} onChange={e => updatePlan(plan.id, "badge_label", e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Efeito</Label>
                          <select
                            value={plan.effect_type}
                            onChange={e => updatePlan(plan.id, "effect_type", e.target.value)}
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
                          <Input type="number" step="0.5" value={plan.ai_usage_multiplier} onChange={e => updatePlan(plan.id, "ai_usage_multiplier", Number(e.target.value))} />
                        </div>
                      </div>

                      <div className="flex gap-6">
                        <div className="flex items-center gap-2">
                          <Switch checked={plan.crown_enabled} onCheckedChange={v => updatePlan(plan.id, "crown_enabled", v)} />
                          <Label className="text-xs">Coroa 👑</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch checked={plan.ranking_highlight} onCheckedChange={v => updatePlan(plan.id, "ranking_highlight", v)} />
                          <Label className="text-xs">Destaque Ranking</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch checked={plan.is_active !== false} onCheckedChange={v => updatePlan(plan.id, "is_active", v)} />
                          <Label className="text-xs">Ativo</Label>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs font-semibold mb-2 block">Preços (R$)</Label>
                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Mensal</Label>
                            <Input type="number" step="0.01" value={plan.price_monthly || 0} onChange={e => updatePlan(plan.id, "price_monthly", Number(e.target.value))} />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Trimestral</Label>
                            <Input type="number" step="0.01" value={plan.price_quarterly || ""} onChange={e => updatePlan(plan.id, "price_quarterly", e.target.value ? Number(e.target.value) : null)} />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Semestral</Label>
                            <Input type="number" step="0.01" value={plan.price_semiannual || ""} onChange={e => updatePlan(plan.id, "price_semiannual", e.target.value ? Number(e.target.value) : null)} />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Anual</Label>
                            <Input type="number" step="0.01" value={plan.price_annual || ""} onChange={e => updatePlan(plan.id, "price_annual", e.target.value ? Number(e.target.value) : null)} />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <Label className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-primary" />
                          Recursos incluídos ({features.length})
                        </Label>
                        <div className="space-y-1.5">
                          {features.map((feat: string, i: number) => (
                            <div key={i} className="flex items-center gap-2 group">
                              <Input
                                value={feat}
                                onChange={e => {
                                  const newFeats = [...features];
                                  newFeats[i] = e.target.value;
                                  updatePlan(plan.id, "features", newFeats);
                                }}
                                className="h-8 text-sm"
                              />
                              <button
                                onClick={() => removeFeature(plan.id, i)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-4 h-4 text-destructive" />
                              </button>
                            </div>
                          ))}
                          <div className="flex gap-2 mt-1">
                            <Input
                              placeholder="Novo recurso..."
                              value={newFeatureInputs[plan.id] || ""}
                              onChange={e => setNewFeatureInputs(prev => ({ ...prev, [plan.id]: e.target.value }))}
                              onKeyDown={e => e.key === "Enter" && addFeature(plan.id)}
                              className="h-8 text-sm"
                            />
                            <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => addFeature(plan.id)}>
                              <Plus className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                        <Label className="text-[10px] text-muted-foreground mb-2 block">Preview</Label>
                        <div className="flex items-center gap-3">
                          {plan.crown_enabled && <Crown className="w-5 h-5" style={{ color: plan.color }} />}
                          <span className="font-semibold" style={plan.effect_type === "golden" ? {
                            backgroundImage: `linear-gradient(135deg, ${plan.color}, #fbbf24, ${plan.color})`,
                            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                          } : { color: plan.color }}>
                            Ana Costa
                          </span>
                          <PrestigeBadge plan={plan as PrestigePlan} size="sm" clickable={false} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}

            <Button onClick={savePlans} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Planos
            </Button>
          </TabsContent>

          {/* ─── MEMBERS TAB ─── */}
          <TabsContent value="members" className="space-y-4 mt-4">
            {!membersLoaded ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {plans.filter(p => p.is_active !== false).map(plan => {
                  const planMembers = getPlanMembers(plan.id);
                  const available = getAvailablePatients(plan.id);
                  const search = memberSearch[plan.id] || "";

                  return (
                    <Card key={plan.id} className="relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${plan.color}, ${plan.color}88)` }} />
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <PrestigeBadge plan={plan as PrestigePlan} size="sm" clickable={false} />
                          <span style={{ color: plan.color }}>{plan.name}</span>
                          <span className="ml-auto text-xs text-muted-foreground font-normal">
                            {planMembers.length} membro{planMembers.length !== 1 ? "s" : ""}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                      {/* Search to add */}
                        <PatientPickerDropdown
                          patients={available.map(p => ({ id: p.user_id, name: p.full_name }))}
                          onSelect={(patientId) => assignPatient(patientId, plan.id)}
                          loading={assigning}
                        />

                        <Separator />

                        {/* Current members */}
                        <ScrollArea className="max-h-48">
                          <div className="space-y-1">
                            {planMembers.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-4">Nenhum membro neste plano</p>
                            ) : (
                              planMembers.map(member => (
                                <div
                                  key={member.id}
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted/50 group transition-all"
                                >
                                  <div
                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: plan.color }}
                                  />
                                  <span className="text-sm flex-1 truncate">{member.full_name}</span>
                                  <button
                                    onClick={() => removeFromPlan(member.id, member.full_name)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Remover do plano"
                                  >
                                    <UserMinus className="w-3.5 h-3.5 text-destructive" />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ─── POINTS TAB ─── */}
          <TabsContent value="points" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-4 h-4 text-accent" /> Regras de Pontuação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {rules.map(rule => (
                  <div key={rule.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30">
                    <Input value={rule.icon} onChange={e => updateRule(rule.id, "icon", e.target.value)} className="w-12 text-center" />
                    <div className="flex-1">
                      <Input value={rule.action_label} onChange={e => updateRule(rule.id, "action_label", e.target.value)} className="text-sm" />
                      <span className="text-xs text-muted-foreground">{rule.action_key}</span>
                    </div>
                    <div className="w-20">
                      <Label className="text-[10px]">Pontos</Label>
                      <Input type="number" value={rule.points} onChange={e => updateRule(rule.id, "points", Number(e.target.value))} />
                    </div>
                    <div className="w-20">
                      <Label className="text-[10px]">Limite/dia</Label>
                      <Input type="number" value={rule.daily_limit ?? ""} onChange={e => updateRule(rule.id, "daily_limit", e.target.value ? Number(e.target.value) : null)} />
                    </div>
                    <Switch checked={rule.is_active} onCheckedChange={v => updateRule(rule.id, "is_active", v)} />
                  </div>
                ))}
                {rules.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhuma regra de pontuação cadastrada</p>
                )}
              </CardContent>
            </Card>
            <div className="flex items-center gap-3">
              <Button onClick={saveRules} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Regras
              </Button>
              <Button variant="destructive" onClick={() => setResetDialogOpen(true)} className="gap-2">
                <RotateCcw className="w-4 h-4" />
                Zerar Pontos do Ranking
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Reset Confirmation Dialog */}
        <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Zerar Pontos do Ranking</DialogTitle>
              <DialogDescription>
                Todos os pontos serão arquivados e o ranking será reiniciado do zero.
                Os dados históricos ficam preservados no arquivo para consulta futura.
                Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setResetDialogOpen(false)}>Cancelar</Button>
              <Button
                variant="destructive"
                disabled={resetting}
                onClick={async () => {
                  setResetting(true);
                  try {
                    const { data, error } = await (supabase.rpc as any)("reset_all_ranking_points");
                    if (error) throw error;
                    const result = data as any;
                    toast.success(`Ranking zerado! ${result?.archived_count ?? 0} registros arquivados.`);
                    setResetDialogOpen(false);
                  } catch (err: any) {
                    toast.error("Erro ao zerar ranking: " + err.message);
                  } finally {
                    setResetting(false);
                  }
                }}
                className="gap-2"
              >
                {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Confirmar Reset
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}