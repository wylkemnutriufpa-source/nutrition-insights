import { useEffect, useState, useCallback, useMemo, lazy } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import QAChecklistPage from "./QAChecklistPage";
import InvitationAudit from "../InvitationAudit";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Shield, Users, UserCheck, Zap, Star, UserPlus, Settings, Globe,
  Eye, BarChart3, DollarSign, CreditCard, Crown, Loader2,
  Search, ToggleLeft, Trash2, Ban, CheckCircle2, Plus, FileText, Download, Sparkles,
  Palette, LayoutGrid, GraduationCap, Wand2, Dumbbell, Image as ImageIcon, ClipboardCheck, ShieldCheck
} from "lucide-react";
import { toast } from "sonner";
import OnlinePatientsWidget from "@/components/dashboard/OnlinePatientsWidget";
import PatientProgressSimulation from "@/components/dashboard/PatientProgressSimulation";
import PatientRevenueSimulator from "@/components/dashboard/PatientRevenueSimulator";
import AffiliateRevenueSimulator from "@/components/dashboard/AffiliateRevenueSimulator";
import { FEATURE_REGISTRY, getFeaturesByCategory, type FeatureTier } from "@/lib/featureRegistry";
import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, User, Activity, LogIn, LogOut, RefreshCw, Trash2 as Trash2Icon, UserPlus as UserPlusIcon } from "lucide-react";
import { ProfessionalsDrillDown, PatientsDrillDown, SubscriptionsDrillDown, RevenueDrillDown } from "@/components/admin/AdminDrillDownDialogs";
import { MagicSlideButton } from "@/components/common/MagicSlideGenerator";

import { StabilityZone } from "@/components/common/StabilityZone";
import { SafeRender } from "@/components/common/SafeRender";
import { usePageState } from "@/hooks/usePageState";
import { BrainLoaderCard } from "@/components/common/BrainLoader";
import { AlertCircle } from "lucide-react";

// ─── Types ───
interface PlatformMetrics {
  totalProfessionals: number;
  totalPatients: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
}

interface ProfessionalInfo {
  user_id: string;
  full_name: string;
  email?: string;
  patientCount: number;
  status: "active" | "suspended";
  created_at?: string;
}

interface PricingPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number | null;
  max_patients: number | null;
  features: any;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
}

// ─── Audit Logs Embed ───
const AUDIT_ACTION_META: Record<string, { label: string; color: string }> = {
  login: { label: "Login", color: "text-primary" },
  logout: { label: "Logout", color: "text-muted-foreground" },
  create_patient: { label: "Paciente criado", color: "text-success" },
  toggle_patient_status: { label: "Status alterado", color: "text-warning" },
};

function AuditLogsEmbed() {
  const [auditSearch, setAuditSearch] = useState("");

  const { data: auditLogs, isLoading: auditLoading, refetch: refetchAudit } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const auditUserIds = useMemo(() => [...new Set((auditLogs || []).map(l => l.user_id))], [auditLogs]);

  const { data: auditProfileMap } = useQuery({
    queryKey: ["audit-profiles", auditUserIds],
    enabled: auditUserIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name").in("user_id", auditUserIds);
      const map: Record<string, string> = {};
      (data || []).forEach(p => { map[p.user_id] = p.full_name || "Sem nome"; });
      return map;
    },
  });

  const filteredAudit = useMemo(() => {
    if (!auditLogs) return [];
    if (!auditSearch) return auditLogs;
    const s = auditSearch.toLowerCase();
    return auditLogs.filter(log => {
      const userName = auditProfileMap?.[log.user_id] || "";
      return log.action.toLowerCase().includes(s) || log.resource_type.toLowerCase().includes(s) || userName.toLowerCase().includes(s);
    });
  }, [auditLogs, auditSearch, auditProfileMap]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: auditLogs?.length || 0, color: "text-primary" },
          { label: "Logins", value: auditLogs?.filter(l => l.action === "login").length || 0, color: "text-success" },
          { label: "Alterações", value: auditLogs?.filter(l => l.action.includes("toggle")).length || 0, color: "text-warning" },
          { label: "Criações", value: auditLogs?.filter(l => l.action.includes("create")).length || 0, color: "text-info" },
        ].map(s => (
          <Card key={s.label} className="glass-premium">
            <CardContent className="py-3 px-4 text-center">
              <p className={`text-2xl font-bold font-display ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por ação, recurso ou usuário..." value={auditSearch} onChange={e => setAuditSearch(e.target.value)} className="pl-9" />
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchAudit()} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[50vh]">
            {auditLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !filteredAudit.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhum log encontrado</p>
                <p className="text-xs mt-1">Logs serão registrados conforme ações são realizadas</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredAudit.map((log: any) => {
                  const meta = AUDIT_ACTION_META[log.action] || { label: log.action, color: "text-muted-foreground" };
                  const userName = auditProfileMap?.[log.user_id] || log.user_id?.slice(0, 8) + "...";
                  const metaEntries = log.metadata && typeof log.metadata === "object" ? Object.entries(log.metadata) : [];

                  return (
                    <div key={log.id} className="flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors text-sm">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-semibold text-xs ${meta.color}`}>{meta.label}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{log.resource_type}</Badge>
                          {log.resource_id && <span className="text-[10px] text-muted-foreground font-mono">#{log.resource_id.slice(0, 8)}</span>}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <User className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{userName}</span>
                        </div>
                        {metaEntries.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {metaEntries.slice(0, 3).map(([k, v]) => (
                              <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                                {k}: {String(v).slice(0, 25)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Clock className="w-3 h-3" />
                        {format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Platform Metrics Card ───
function MetricCard({ label, value, icon: Icon, color, prefix, onClick }: {
  label: string; value: number; icon: any; color: string; prefix?: string; onClick?: () => void;
}) {
  return (
    <Card
      className={`glass shadow-card ${onClick ? "cursor-pointer hover:shadow-glow hover:scale-[1.02] transition-all" : ""}`}
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-4 py-6">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
        <div>
          <p className="text-2xl font-bold font-display">
            {prefix}{typeof value === "number" ? value.toLocaleString("pt-BR") : value}
          </p>
          <p className="text-sm text-muted-foreground">{label}</p>
          {onClick && <p className="text-[10px] text-primary mt-0.5">Clique para detalhes →</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Professional Management ───
function ProfessionalManagement({
  professionals, onRefresh, onCreateOpen
}: {
  professionals: ProfessionalInfo[];
  onRefresh: () => void;
  onCreateOpen: () => void;
}) {
  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  const filtered = professionals.filter(p =>
    p.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleStatus = async (prof: ProfessionalInfo) => {
    setToggling(prof.user_id);
    // We'll track suspended status via a simple approach: add/remove a 'suspended' role
    // For now, we use the user_roles table
    if (prof.status === "active") {
      await supabase.from("user_roles").insert({
        user_id: prof.user_id,
        role: "suspended" as any,
      });
      toast.success(`${prof.full_name} suspenso`);
    } else {
      await supabase.from("user_roles").delete()
        .eq("user_id", prof.user_id)
        .eq("role", "suspended" as any);
      toast.success(`${prof.full_name} reativado`);
    }
    setToggling(null);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar profissional..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={onCreateOpen} className="gap-2">
          <UserPlus className="w-4 h-4" /> Novo Profissional
        </Button>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum profissional encontrado</p>
        ) : filtered.map(prof => (
          <div key={prof.user_id} className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted/80 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">{prof.full_name[0]?.toUpperCase()}</span>
              </div>
              <div>
                <p className="font-medium text-sm">{prof.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {prof.patientCount} pacientes
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={prof.status === "active" ? "default" : "destructive"} className="text-xs">
                {prof.status === "active" ? "Ativo" : "Suspenso"}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleStatus(prof)}
                disabled={toggling === prof.user_id}
                className="gap-1.5"
              >
                {toggling === prof.user_id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : prof.status === "active" ? (
                  <><Ban className="w-4 h-4" /> Suspender</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Reativar</>
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Subscription Plans ───
function SubscriptionPlans({ plans, onRefresh }: { plans: PricingPlan[]; onRefresh: () => void }) {
  const [editPlan, setEditPlan] = useState<PricingPlan | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", slug: "", description: "", price_monthly: "",
    price_yearly: "", max_patients: "", is_active: true, is_featured: false,
    features: "[]", sort_order: "0",
  });

  const openNew = () => {
    setEditPlan(null);
    setForm({
      name: "", slug: "", description: "", price_monthly: "0",
      price_yearly: "", max_patients: "", is_active: true, is_featured: false,
      features: "[]", sort_order: "0",
    });
    setDialogOpen(true);
  };

  const openEdit = (p: PricingPlan) => {
    setEditPlan(p);
    setForm({
      name: p.name, slug: p.slug, description: p.description || "",
      price_monthly: p.price_monthly.toString(),
      price_yearly: p.price_yearly?.toString() || "",
      max_patients: p.max_patients?.toString() || "",
      is_active: p.is_active, is_featured: p.is_featured,
      features: JSON.stringify(p.features, null, 2),
      sort_order: p.sort_order.toString(),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) {
      toast.error("Nome e slug são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      let features;
      try { features = JSON.parse(form.features); } catch { features = []; }

      const payload = {
        name: form.name,
        slug: form.slug,
        description: form.description || null,
        price_monthly: parseFloat(form.price_monthly) || 0,
        price_yearly: form.price_yearly ? parseFloat(form.price_yearly) : null,
        max_patients: form.max_patients ? parseInt(form.max_patients) : null,
        is_active: form.is_active,
        is_featured: form.is_featured,
        features,
        sort_order: parseInt(form.sort_order) || 0,
      };

      if (editPlan) {
        const { error } = await supabase.from("pricing_plans").update(payload).eq("id", editPlan.id);
        if (error) throw error;
        toast.success("Plano atualizado!");
      } else {
        const { error } = await supabase.from("pricing_plans").insert(payload);
        if (error) throw error;
        toast.success("Plano criado!");
      }
      setDialogOpen(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este plano?")) return;
    await supabase.from("pricing_plans").delete().eq("id", id);
    toast.success("Plano removido");
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Plano
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map(plan => (
          <Card key={plan.id} className={`glass shadow-card ${plan.is_featured ? "border-primary/50 ring-1 ring-primary/20" : ""}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-lg">{plan.name}</CardTitle>
                {plan.is_featured && <Badge className="text-xs">Destaque</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">{plan.description}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold font-display text-primary">
                  R${plan.price_monthly.toFixed(0)}
                </span>
                <span className="text-sm text-muted-foreground">/mês</span>
              </div>
              {plan.max_patients && (
                <p className="text-xs text-muted-foreground">Até {plan.max_patients} pacientes</p>
              )}
              <Badge variant={plan.is_active ? "default" : "secondary"} className="text-xs">
                {plan.is_active ? "Ativo" : "Inativo"}
              </Badge>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(plan)} className="flex-1">
                  Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(plan.id)} className="text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editPlan ? "Editar Plano" : "Novo Plano"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nome</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Slug</Label>
                <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Descrição</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Preço Mensal (R$)</Label>
                <Input type="number" value={form.price_monthly} onChange={e => setForm(f => ({ ...f, price_monthly: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Preço Anual (R$)</Label>
                <Input type="number" value={form.price_yearly} onChange={e => setForm(f => ({ ...f, price_yearly: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Máx. Pacientes</Label>
                <Input type="number" value={form.max_patients} onChange={e => setForm(f => ({ ...f, max_patients: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Ordem</Label>
                <Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                Ativo
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.is_featured} onCheckedChange={v => setForm(f => ({ ...f, is_featured: v }))} />
                Destaque
              </label>
            </div>
            <div>
              <Label className="text-xs">Features (JSON array)</Label>
              <textarea
                className="w-full h-24 p-2 text-xs font-mono rounded-lg bg-muted border border-border"
                value={form.features}
                onChange={e => setForm(f => ({ ...f, features: e.target.value }))}
              />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editPlan ? "Atualizar" : "Criar"} Plano
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Feature Flags (Platform-level with Tier Locking) ───
function PlatformFeatureFlags() {
  const { user } = useAuth();
  const [tiers, setTiers] = useState<Record<string, FeatureTier>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const MODULE_GROUPS = [
    { key: "crm", label: "CRM", features: ["patients", "protocols", "programs", "physical_assessment", "supplements", "checkin_panel"] },
    { key: "finance", label: "Financeiro", features: ["financial", "reports"] },
    { key: "ia", label: "IA & Automação", features: ["ia_plan", "automations", "recipe_generator", "ai_body_analysis", "ai_anamnesis", "weekly_report_ai", "behavioral_analysis", "nutrition_copilot", "churn_prediction", "adherence_gamification"] },
    { key: "communication", label: "Comunicação", features: ["chat", "appointments", "notifications_push", "feedbacks", "global_tips"] },
    { key: "tools", label: "Ferramentas", features: ["food_database", "recipes", "shopping_list", "diet_templates", "branding"] },
    { key: "reports", label: "Relatórios & Avançado", features: ["system_usage_gamification", "progress_simulation"] },
  ];

  useEffect(() => {
    const fetchTiers = async () => {
      const { data } = await supabase.from("platform_feature_tiers").select("feature_name, tier");
      const map: Record<string, FeatureTier> = {};
      // Set defaults from registry
      FEATURE_REGISTRY.forEach(f => { map[f.name] = f.defaultTier || "basic"; });
      // Override with DB values
      (data || []).forEach((row: any) => { map[row.feature_name] = row.tier as FeatureTier; });
      setTiers(map);
      setLoading(false);
    };
    fetchTiers();
  }, []);

  const changeTier = async (featureName: string, newTier: FeatureTier) => {
    setSaving(featureName);
    const prev = tiers[featureName];
    setTiers(t => ({ ...t, [featureName]: newTier }));

    const { error } = await supabase.from("platform_feature_tiers").upsert(
      { feature_name: featureName, tier: newTier, updated_by: user?.id },
      { onConflict: "feature_name" }
    );

    if (error) {
      setTiers(t => ({ ...t, [featureName]: prev }));
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success(`${featureName} → ${newTier === "basic" ? "Básico" : newTier === "premium" ? "Premium" : "Em Breve"}`);
    }
    setSaving(null);
  };

  const tierBadge = (tier: FeatureTier) => {
    switch (tier) {
      case "basic": return <Badge variant="secondary" className="text-xs">Básico</Badge>;
      case "premium": return <Badge className="text-xs bg-amber-500/20 text-amber-400 border-amber-500/30">⭐ Premium</Badge>;
      case "coming_soon": return <Badge variant="outline" className="text-xs text-muted-foreground">🕐 Em Breve</Badge>;
    }
  };

  const stats = {
    basic: Object.values(tiers).filter(t => t === "basic").length,
    premium: Object.values(tiers).filter(t => t === "premium").length,
    coming_soon: Object.values(tiers).filter(t => t === "coming_soon").length,
  };

  if (loading) {
    return <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="glass shadow-card">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold font-display text-primary">{stats.basic}</p>
            <p className="text-xs text-muted-foreground">Básico (todos)</p>
          </CardContent>
        </Card>
        <Card className="glass shadow-card">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold font-display text-amber-400">{stats.premium}</p>
            <p className="text-xs text-muted-foreground">Premium</p>
          </CardContent>
        </Card>
        <Card className="glass shadow-card">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold font-display text-muted-foreground">{stats.coming_soon}</p>
            <p className="text-xs text-muted-foreground">Em Breve</p>
          </CardContent>
        </Card>
      </div>

      <p className="text-sm text-muted-foreground">
        <strong>Básico:</strong> disponível para todos os planos. <strong>Premium:</strong> apenas planos premium. <strong>Em Breve:</strong> bloqueado para todos.
      </p>

      {MODULE_GROUPS.map(group => (
        <Card key={group.key} className="glass shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <ToggleLeft className="w-5 h-5 text-primary" />
              {group.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {group.features.map(fName => {
                const feat = FEATURE_REGISTRY.find(f => f.name === fName);
                if (!feat) return null;
                const Icon = feat.icon;
                const currentTier = tiers[fName] || "basic";
                return (
                  <div key={fName} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{feat.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{feat.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {tierBadge(currentTier)}
                      <Select
                        value={currentTier}
                        onValueChange={(v) => changeTier(fName, v as FeatureTier)}
                        disabled={saving === fName}
                      >
                        <SelectTrigger className="w-[120px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">Básico</SelectItem>
                          <SelectItem value="premium">⭐ Premium</SelectItem>
                          <SelectItem value="coming_soon">🕐 Em Breve</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Admin Reports / Export Panel ───
function AdminReportsPanel({ professionals }: { professionals: ProfessionalInfo[] }) {
  const [selectedProfessional, setSelectedProfessional] = useState("");
  const [selectedPatient, setSelectedPatient] = useState("");
  const [patients, setPatients] = useState<{ user_id: string; full_name: string }[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(false);

  const fetchPatients = async (nutId: string) => {
    setLoadingPatients(true);
    setSelectedPatient("");
    const { data: links } = await supabase.from("nutritionist_patients")
      .select("patient_id").eq("nutritionist_id", nutId).eq("status", "active");
    if (!links?.length) { setPatients([]); setLoadingPatients(false); return; }
    const ids = links.map(l => l.patient_id);
    const { data: profiles } = await supabase.from("profiles")
      .select("user_id, full_name").in("user_id", ids);
    setPatients(profiles || []);
    setLoadingPatients(false);
  };

  const generateReport = async () => {
    if (!selectedPatient || !selectedProfessional) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-report", {
        body: { patient_id: selectedPatient, nutritionist_id: selectedProfessional, report_type: "complete" },
      });
      if (error) throw error;
      const blob = new Blob([data.html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      if (win) win.onload = () => setTimeout(() => win.print(), 500);
      toast.success(`Relatório de ${data.patient_name} gerado!`);
    } catch (e: any) {
      toast.error("Erro: " + (e.message || "Tente novamente"));
    }
    setGenerating(false);
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <Card className="glass shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-base flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Exportar Relatório de Paciente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs">Profissional</Label>
            <Select value={selectedProfessional} onValueChange={(v) => { setSelectedProfessional(v); fetchPatients(v); }}>
              <SelectTrigger><SelectValue placeholder="Selecione um profissional" /></SelectTrigger>
              <SelectContent>
                {professionals.map(p => (
                  <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Paciente</Label>
            <Select value={selectedPatient} onValueChange={setSelectedPatient} disabled={!selectedProfessional || loadingPatients}>
              <SelectTrigger><SelectValue placeholder={loadingPatients ? "Carregando..." : "Selecione um paciente"} /></SelectTrigger>
              <SelectContent>
                {patients.map(p => (
                  <SelectItem key={p.user_id} value={p.user_id}>{p.full_name || "Sem nome"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
            <h4 className="font-medium">O relatório inclui:</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-primary" /> Resumo executivo gerado por IA</li>
              <li className="flex items-center gap-2">📐 Última avaliação física</li>
              <li className="flex items-center gap-2">📈 Evolução (peso, IMC, % gordura)</li>
              <li className="flex items-center gap-2">🍽️ Plano alimentar ativo</li>
              <li className="flex items-center gap-2">🍎 Refeições recentes com score IA</li>
              <li className="flex items-center gap-2">📊 Análises corporais</li>
            </ul>
          </div>

          <Button onClick={generateReport} className="w-full gap-2" disabled={!selectedPatient || generating}>
            {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</> : <><Download className="w-4 h-4" /> Gerar e Imprimir (PDF)</>}
          </Button>
        </CardContent>
      </Card>

      <Card className="glass shadow-card">
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          <p>💡 O relatório abre em nova aba pronto para impressão. Use <strong>Ctrl+P</strong> → <strong>Salvar como PDF</strong> para exportar.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Create Professional Dialog ───
function CreateProfessionalDialog({
  open, onOpenChange, onCreated
}: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!email || !name || !password) {
      toast.error("Preencha todos os campos");
      return;
    }
    if (password.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.rpc("create_nutritionist_account", {
        _email: email,
        _full_name: name,
        _password: password,
      });
      if (error) throw error;
      toast.success(`Profissional ${name} criado com sucesso!`);
      setEmail(""); setName(""); setPassword("");
      onOpenChange(false);
      onCreated();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar profissional");
    }
    setCreating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <UserPlus className="w-5 h-5" /> Cadastrar Profissional
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Nome completo</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Dr. João Silva" />
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="joao@clinica.com" />
          </div>
          <div>
            <Label className="text-xs">Senha inicial</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Ex: Fit@2026!" />
            <p className="text-xs text-muted-foreground mt-1">Senha forte obrigatória. Padrão sugerido: Fit@2026!</p>
          </div>
          <Button onClick={handleCreate} disabled={creating} className="w-full gap-2">
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Criar Profissional
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Admin Dashboard ───
export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<PlatformMetrics>({
    totalProfessionals: 0, totalPatients: 0, activeSubscriptions: 0, monthlyRevenue: 0,
  });
  const [professionals, setProfessionals] = useState<ProfessionalInfo[]>([]);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [promoteEmail, setPromoteEmail] = useState("");
  const [drillDown, setDrillDown] = useState<"professionals" | "patients" | "subscriptions" | "revenue" | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Fetch nutritionist roles
    const { data: nutRoles } = await supabase.from("user_roles").select("user_id").eq("role", "nutritionist");
    const nutIds = nutRoles?.map(r => r.user_id) || [];

    // Fetch patient roles
    const { data: patRoles } = await supabase.from("user_roles").select("user_id").eq("role", "patient");

    // Fetch suspended users
    const { data: suspendedRoles } = await supabase.from("user_roles").select("user_id").eq("role", "suspended" as any);
    const suspendedIds = new Set(suspendedRoles?.map(r => r.user_id) || []);

    // Fetch nutritionist profiles
    const profs: ProfessionalInfo[] = [];
    for (const nutId of nutIds) {
      const { data: profile } = await supabase.from("profiles").select("full_name, created_at").eq("user_id", nutId).maybeSingle();
      const { count } = await supabase.from("nutritionist_patients")
        .select("id", { count: "exact", head: true })
        .eq("nutritionist_id", nutId).eq("status", "active");
      profs.push({
        user_id: nutId,
        full_name: profile?.full_name || "Nutricionista",
        patientCount: count || 0,
        status: suspendedIds.has(nutId) ? "suspended" : "active",
        created_at: profile?.created_at,
      });
    }

    // Fetch plans
    const { data: plansData } = await supabase.from("pricing_plans")
      .select("*")
      .order("sort_order");

    // Fetch payments for revenue (current month)
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const { data: payments } = await supabase.from("payments")
      .select("amount")
      .eq("status", "paid")
      .gte("paid_at", monthStart.toISOString());
    const monthlyRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    setMetrics({
      totalProfessionals: nutIds.length,
      totalPatients: patRoles?.length || 0,
      activeSubscriptions: profs.filter(p => p.status === "active").length,
      monthlyRevenue,
    });
    setProfessionals(profs);
    setPlans((plansData as PricingPlan[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handlePromoteToAdmin = async () => {
    if (!promoteEmail.trim()) { toast.error("Digite um email válido"); return; }
    try {
      const { error } = await supabase.rpc("promote_to_admin", { _user_email: promoteEmail });
      if (error) throw error;
      toast.success(`${promoteEmail} promovido a admin!`);
      setPromoteEmail("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao promover");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <h1 className="font-display text-2xl font-bold">Painel Administrativo</h1>
              <p className="text-muted-foreground text-sm">Controle da plataforma SaaS</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/resources")} className="gap-1.5">
              <Settings className="w-4 h-4" /> Central de Recursos
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open("/landing", "_blank")} className="gap-1.5">
              <Eye className="w-4 h-4" /> Landing Page
            </Button>
            <MagicSlideButton className="h-9 text-sm" />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="metrics" className="w-full">
            <TabsList className="w-full justify-start bg-card border border-border overflow-x-auto">
              <TabsTrigger value="metrics"><BarChart3 className="w-3.5 h-3.5 mr-1" /> Métricas</TabsTrigger>
              <TabsTrigger value="professionals"><Users className="w-3.5 h-3.5 mr-1" /> Profissionais</TabsTrigger>
              <TabsTrigger value="plans"><CreditCard className="w-3.5 h-3.5 mr-1" /> Planos</TabsTrigger>
              <TabsTrigger value="features"><Zap className="w-3.5 h-3.5 mr-1" /> Feature Flags</TabsTrigger>
              <TabsTrigger value="reports"><FileText className="w-3.5 h-3.5 mr-1" /> Relatórios</TabsTrigger>
              <TabsTrigger value="admin"><Crown className="w-3.5 h-3.5 mr-1" /> Admin</TabsTrigger>
              <TabsTrigger value="audit"><Shield className="w-3.5 h-3.5 mr-1" /> Auditoria</TabsTrigger>
            </TabsList>

            {/* ─── Metrics ─── */}
            <TabsContent value="metrics" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <MetricCard label="Profissionais" value={metrics.totalProfessionals} icon={UserCheck} color="text-primary" onClick={() => setDrillDown("professionals")} />
                <MetricCard label="Pacientes" value={metrics.totalPatients} icon={Users} color="text-primary" onClick={() => setDrillDown("patients")} />
                <MetricCard label="Assinaturas Ativas" value={metrics.activeSubscriptions} icon={Star} color="text-accent" onClick={() => setDrillDown("subscriptions")} />
                <MetricCard label="Receita Mensal" value={metrics.monthlyRevenue} icon={DollarSign} color="text-primary" prefix="R$" onClick={() => setDrillDown("revenue")} />
                <OnlinePatientsWidget variant="card" />
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="glass shadow-card cursor-pointer hover:shadow-glow transition-shadow" onClick={() => navigate("/admin/resources")}>
                  <CardContent className="flex items-center gap-4 py-6">
                    <Settings className="w-8 h-8 text-primary" />
                    <div>
                      <p className="font-display font-semibold">Editor do Site</p>
                      <p className="text-sm text-muted-foreground">Landing page, branding</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass shadow-card cursor-pointer hover:shadow-glow transition-shadow" onClick={() => navigate("/admin/resources")}>
                  <CardContent className="flex items-center gap-4 py-6">
                    <Star className="w-8 h-8 text-amber-400" />
                    <div>
                      <p className="font-display font-semibold">Depoimentos</p>
                      <p className="text-sm text-muted-foreground">Moderar depoimentos</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass shadow-card cursor-pointer hover:shadow-glow transition-shadow" onClick={() => navigate("/admin/import-patients")}>
                  <CardContent className="flex items-center gap-4 py-6">
                    <Globe className="w-8 h-8 text-blue-400" />
                    <div>
                      <p className="font-display font-semibold">Importar Pacientes</p>
                      <p className="text-sm text-muted-foreground">CSV em massa</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass shadow-card cursor-pointer hover:shadow-glow transition-shadow" onClick={() => navigate("/admin/profissionais")}>
                  <CardContent className="flex items-center gap-4 py-6">
                    <Users className="w-8 h-8 text-primary" />
                    <div>
                      <p className="font-display font-semibold">Gestão de Planos Profissionais</p>
                      <p className="text-sm text-muted-foreground">Cadastro, planos e status</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass shadow-card cursor-pointer hover:shadow-glow transition-shadow" onClick={() => navigate("/ranking")}>
                  <CardContent className="flex items-center gap-4 py-6">
                    <Crown className="w-8 h-8 text-yellow-400" />
                    <div>
                      <p className="font-display font-semibold">Ranking Global</p>
                      <p className="text-sm text-muted-foreground">Engajamento dos pacientes</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass shadow-card cursor-pointer hover:shadow-glow transition-shadow" onClick={() => navigate("/admin/prestige")}>
                  <CardContent className="flex items-center gap-4 py-6">
                    <Sparkles className="w-8 h-8 text-purple-400" />
                    <div>
                      <p className="font-display font-semibold">Planos Prestígio</p>
                      <p className="text-sm text-muted-foreground">Gerenciar tiers de pacientes</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass shadow-card cursor-pointer hover:shadow-glow transition-shadow" onClick={() => navigate("/admin/menu-config")}>
                  <CardContent className="flex items-center gap-4 py-6">
                    <LayoutGrid className="w-8 h-8 text-emerald-400" />
                    <div>
                      <p className="font-display font-semibold">Organizar Menus</p>
                      <p className="text-sm text-muted-foreground">Editar menus, ícones e categorias</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass shadow-card cursor-pointer hover:shadow-glow transition-shadow" onClick={() => navigate("/branding")}>
                  <CardContent className="flex items-center gap-4 py-6">
                    <Palette className="w-8 h-8 text-pink-400" />
                    <div>
                      <p className="font-display font-semibold">Cores e Layout</p>
                      <p className="text-sm text-muted-foreground">Personalizar visual do sistema</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass shadow-card cursor-pointer hover:shadow-glow transition-shadow" onClick={() => navigate("/apresentacao")}>
                  <CardContent className="flex items-center gap-4 py-6">
                    <GraduationCap className="w-8 h-8 text-primary" />
                    <div>
                      <p className="font-display font-semibold">Apresentação do Sistema</p>
                      <p className="text-sm text-muted-foreground">Guia interativo para profissionais e pacientes</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass shadow-card cursor-pointer hover:shadow-glow transition-shadow border-primary/20" onClick={() => navigate("/admin/personal-workouts")}>
                  <CardContent className="flex items-center gap-4 py-6">
                    <Dumbbell className="w-8 h-8 text-orange-400" />
                    <div>
                      <p className="font-display font-semibold">Módulo Personal Trainer</p>
                      <p className="text-sm text-muted-foreground">Templates, pré-planos, treinos e periodização</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass shadow-card cursor-pointer hover:shadow-glow transition-shadow border-primary/20" onClick={() => navigate("/admin/meal-visual-library")}>
                  <CardContent className="flex items-center gap-4 py-6">
                    <ImageIcon className="w-8 h-8 text-emerald-400" />
                    <div>
                      <p className="font-display font-semibold">Biblioteca Visual de Refeições</p>
                      <p className="text-sm text-muted-foreground">Imagens, aliases e associação automática</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ─── Simulação de Progresso ─── */}
              <Card className="glass shadow-card">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Simulação de Progresso
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PatientProgressSimulation patients={[]} loading={false} />
                </CardContent>
              </Card>

              {/* ─── Simulador de Faturamento Pacientes ─── */}
              <PatientRevenueSimulator />

              {/* ─── Simulador de Faturamento Afiliados ─── */}
              <AffiliateRevenueSimulator />
            </TabsContent>

            {/* ─── Professionals ─── */}
            <TabsContent value="professionals" className="mt-4">
              <ProfessionalManagement
                professionals={professionals}
                onRefresh={fetchAll}
                onCreateOpen={() => setCreateDialogOpen(true)}
              />
            </TabsContent>

            {/* ─── Plans ─── */}
            <TabsContent value="plans" className="mt-4">
              <SubscriptionPlans plans={plans} onRefresh={fetchAll} />
            </TabsContent>

            {/* ─── Feature Flags ─── */}
            <TabsContent value="features" className="mt-4">
              <PlatformFeatureFlags />
            </TabsContent>

            {/* ─── Reports ─── */}
            <TabsContent value="reports" className="mt-4">
              <AdminReportsPanel professionals={professionals} />
            </TabsContent>

            {/* ─── Admin Tools ─── */}
            <TabsContent value="admin" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="glass shadow-card cursor-pointer hover:bg-muted/30 transition-all" onClick={() => navigate("/admin/image-fallbacks")}>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-lg flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-primary" />
                      Monitor de Fallback de Imagens
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Visualize receitas com imagens ausentes ou indisponíveis e fallbacks automáticos.
                    </p>
                    <Button variant="link" className="p-0 h-auto mt-2 text-primary">Acessar Painel →</Button>
                  </CardContent>
                </Card>

                <Card className="glass shadow-card cursor-pointer hover:bg-muted/30 transition-all" onClick={() => navigate("/admin/template-mass-reformulation")}>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-lg flex items-center gap-2">
                      <Zap className="w-5 h-5 text-primary" />
                      Reformulação em Massa
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Gere relatórios de impacto (Dry-Run) e aplique correções em templates de dieta.
                    </p>
                    <Button variant="link" className="p-0 h-auto mt-2 text-primary">Acessar Painel →</Button>
                  </CardContent>
                </Card>
                <Card className="glass shadow-card cursor-pointer hover:bg-muted/30 transition-all" onClick={() => navigate("/admin/invitation-audit")}>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-lg flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-primary" />
                      Auditoria de Convites
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Monitore em tempo real o status de convites, erros de vínculo e falhas de redirecionamento.
                    </p>
                    <Button variant="link" className="p-0 h-auto mt-2 text-primary">Acessar Auditoria →</Button>
                  </CardContent>
                </Card>

                <Card className="glass shadow-card cursor-pointer hover:bg-muted/30 transition-all" onClick={() => navigate("/admin/qa-checklist")}>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-lg flex items-center gap-2">
                      <ClipboardCheck className="w-5 h-5 text-primary" />
                      Checklist QA (Convites)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Valide manualmente o fluxo de convite → cadastro para garantir que não existam regressões.
                    </p>
                    <Button variant="link" className="p-0 h-auto mt-2 text-primary">Abrir Checklist →</Button>
                  </CardContent>
                </Card>
              </div>

              <Card className="glass shadow-card">
                <CardHeader>
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <UserPlus className="w-5 h-5" /> Promover Usuário a Admin
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="email@exemplo.com"
                      value={promoteEmail}
                      onChange={(e) => setPromoteEmail(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handlePromoteToAdmin} className="shrink-0 gap-2">
                      <UserPlus className="w-4 h-4" /> Promover
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Digite o email do usuário que deseja promover a administrador
                  </p>
                </CardContent>
              </Card>

              <Card className="glass shadow-card">
                <CardHeader>
                  <CardTitle className="font-display text-lg">Nutricionistas Ativos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {professionals.filter(p => p.status === "active").length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum nutricionista cadastrado</p>
                  ) : professionals.filter(p => p.status === "active").map(n => (
                    <div key={n.user_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">{n.full_name[0]?.toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{n.full_name}</p>
                          <p className="text-xs text-muted-foreground">{n.patientCount} pacientes ativos</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ─── Audit Logs ─── */}
            <TabsContent value="audit" className="mt-4 space-y-4">
              <Card
                className="glass shadow-card cursor-pointer hover:shadow-glow transition-shadow border-destructive/30"
                onClick={() => navigate("/admin/template-nutrition-audit")}
              >
                <CardContent className="flex items-center gap-4 py-5">
                  <Shield className="w-8 h-8 text-destructive" />
                  <div className="flex-1">
                    <p className="font-display font-semibold">Auditoria Nutricional de Templates</p>
                    <p className="text-sm text-muted-foreground">
                      Lista templates com macros faltantes que produzem NaN nos cards de refeição. Use antes do release.
                    </p>
                  </div>
                </CardContent>
              </Card>
              <AuditLogsEmbed />
            </TabsContent>
          </Tabs>
        )}
      </div>

      <CreateProfessionalDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={fetchAll}
      />

      <ProfessionalsDrillDown open={drillDown === "professionals"} onOpenChange={(v) => !v && setDrillDown(null)} />
      <PatientsDrillDown open={drillDown === "patients"} onOpenChange={(v) => !v && setDrillDown(null)} />
      <SubscriptionsDrillDown open={drillDown === "subscriptions"} onOpenChange={(v) => !v && setDrillDown(null)} />
      <RevenueDrillDown open={drillDown === "revenue"} onOpenChange={(v) => !v && setDrillDown(null)} />
    </DashboardLayout>
  );
}
