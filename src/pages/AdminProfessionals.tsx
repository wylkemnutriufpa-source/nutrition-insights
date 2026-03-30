import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, UserPlus, Search, Loader2, Ban, CheckCircle2, KeyRound,
  Edit, Eye, Building2, Shield, ArrowLeft, Dumbbell, Salad, ArrowUpCircle, Activity
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

// ─── Types ───
interface Professional {
  user_id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  role_type: "nutritionist" | "personal";
  // From professional_profiles
  profile_id: string | null;
  plan_id: string | null;
  plan_name: string | null;
  status: string;
  clinic_name: string | null;
  onboarding_completed: boolean;
  patient_count: number;
  coach_bodybuilder_enabled: boolean;
  personal_trainer_enabled: boolean;
}

interface PricingPlan {
  id: string;
  name: string;
  slug: string;
}

// ─── Create/Edit Dialog ───
function ProfessionalDialog({
  open, onOpenChange, professional, plans, onSaved
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  professional: Professional | null;
  plans: PricingPlan[];
  onSaved: () => void;
}) {
  const isEditing = !!professional;
  const [form, setForm] = useState({
    full_name: "", email: "", password: "", phone: "",
    plan_id: "", clinic_name: "", status: "active", role_type: "nutritionist" as string,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (professional) {
      setForm({
        full_name: professional.full_name || "",
        email: "",
        password: "",
        phone: professional.phone || "",
        plan_id: professional.plan_id || "",
        clinic_name: professional.clinic_name || "",
        status: professional.status || "active",
        role_type: professional.role_type || "nutritionist",
      });
    } else {
      setForm({
        full_name: "", email: "", password: "", phone: "",
        plan_id: "", clinic_name: "", status: "active", role_type: "nutritionist",
      });
    }
  }, [professional, open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isEditing && professional) {
        // Update profile
        await supabase.from("profiles")
          .update({ full_name: form.full_name, phone: form.phone || null })
          .eq("user_id", professional.user_id);

        // Upsert professional_profiles
        const profPayload = {
          user_id: professional.user_id,
          plan_id: form.plan_id || null,
          clinic_name: form.clinic_name || null,
          status: form.status,
        };

        if (professional.profile_id) {
          await supabase.from("professional_profiles")
            .update(profPayload)
            .eq("id", professional.profile_id);
        } else {
          await supabase.from("professional_profiles").insert(profPayload);
        }

        toast.success("Profissional atualizado!");
      } else {
        // Create new
        if (!form.email || !form.full_name || !form.password) {
          toast.error("Nome, email e senha são obrigatórios");
          setSaving(false);
          return;
        }
        if (form.password.length < 6) {
          toast.error("Senha deve ter pelo menos 6 caracteres");
          setSaving(false);
          return;
        }

        const { data: newUserId, error } = await supabase.rpc("create_professional_account" as any, {
          _email: form.email,
          _full_name: form.full_name,
          _password: form.password,
          _role: form.role_type,
        });
        if (error) throw error;

        // Update phone if provided
        if (form.phone) {
          await supabase.from("profiles")
            .update({ phone: form.phone })
            .eq("user_id", newUserId);
        }

        // Create professional_profiles entry
        await supabase.from("professional_profiles").insert({
          user_id: newUserId,
          plan_id: form.plan_id || null,
          clinic_name: form.clinic_name || null,
          status: form.status,
        });

        toast.success(`Profissional ${form.full_name} criado com sucesso!`);
      }
      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            {isEditing ? <Edit className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            {isEditing ? "Editar Profissional" : "Cadastrar Profissional"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {!isEditing && (
              <div className="col-span-2">
                <Label className="text-xs">Tipo de profissional *</Label>
                <Select value={form.role_type} onValueChange={v => setForm(f => ({ ...f, role_type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nutritionist">
                      <span className="flex items-center gap-2"><Salad className="w-4 h-4 text-emerald-500" /> Nutricionista</span>
                    </SelectItem>
                    <SelectItem value="personal">
                      <span className="flex items-center gap-2"><Dumbbell className="w-4 h-4 text-blue-500" /> Personal Trainer</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="col-span-2">
              <Label className="text-xs">Nome completo *</Label>
              <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Dr. Maria Silva" />
            </div>
            {!isEditing && (
              <>
                <div>
                  <Label className="text-xs">Email *</Label>
                  <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="maria@clinica.com" />
                </div>
                <div>
                  <Label className="text-xs">Senha temporária *</Label>
                  <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Ex: Fit@2026!" />
                  <p className="text-xs text-muted-foreground mt-1">Senha forte obrigatória. Padrão: Fit@2026!</p>
                </div>
              </>
            )}
            <div>
              <Label className="text-xs">Telefone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(11) 99999-9999" />
            </div>
            <div>
              <Label className="text-xs">Clínica / Marca</Label>
              <Input value={form.clinic_name} onChange={e => setForm(f => ({ ...f, clinic_name: e.target.value }))} placeholder="Clínica Viver Bem" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Plano</Label>
              <Select value={form.plan_id} onValueChange={v => setForm(f => ({ ...f, plan_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem plano</SelectItem>
                  {plans.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="suspended">Suspenso</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : isEditing ? <CheckCircle2 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {isEditing ? "Salvar Alterações" : "Criar Profissional"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reset Password Dialog ───
function ResetPasswordDialog({
  open, onOpenChange, professional
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  professional: Professional | null;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleReset = async () => {
    if (!professional || !newPassword) return;
    if (newPassword.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.rpc("reset_professional_password", {
        _user_id: professional.user_id,
        _new_password: newPassword,
      });
      if (error) throw error;
      toast.success(`Senha de ${professional.full_name} redefinida!`);
      setNewPassword("");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao redefinir senha");
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <KeyRound className="w-5 h-5" /> Redefinir Senha
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Redefinindo senha de <strong>{professional?.full_name}</strong>
          </p>
          <div>
            <Label className="text-xs">Nova senha</Label>
            <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
          </div>
          <Button onClick={handleReset} disabled={saving} className="w-full gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            Redefinir Senha
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Promote Patient Dialog ───
function PromotePatientDialog({
  open, onOpenChange, onPromoted
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPromoted: () => void;
}) {
  const [email, setEmail] = useState("");
  const [targetRole, setTargetRole] = useState<string>("nutritionist");
  const [saving, setSaving] = useState(false);

  const handlePromote = async () => {
    if (!email) {
      toast.error("Informe o email do paciente");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc("promote_patient_to_professional" as any, {
        _patient_email: email,
        _target_role: targetRole,
      });
      if (error) throw error;

      const result = data as any;
      if (!result?.success) {
        const msgs: Record<string, string> = {
          user_not_found: "Nenhum usuário encontrado com esse email.",
          not_a_patient: "Esse usuário não possui o papel de paciente.",
          already_has_role: `Esse usuário já possui o papel de ${targetRole === "nutritionist" ? "nutricionista" : "personal trainer"}.`,
        };
        toast.error(msgs[result?.error] || "Erro desconhecido");
        setSaving(false);
        return;
      }

      toast.success(`${result.full_name || email} promovido a ${targetRole === "nutritionist" ? "Nutricionista" : "Personal Trainer"}!`);
      setEmail("");
      onOpenChange(false);
      onPromoted();
    } catch (err: any) {
      toast.error(err.message || "Erro ao promover");
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <ArrowUpCircle className="w-5 h-5 text-primary" /> Promover Paciente
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Promova um paciente já cadastrado para <strong>Nutricionista</strong> ou <strong>Personal Trainer</strong>. 
            O papel de paciente será mantido.
          </p>
          <div>
            <Label className="text-xs">Email do paciente *</Label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="paciente@email.com"
            />
          </div>
          <div>
            <Label className="text-xs">Promover para *</Label>
            <Select value={targetRole} onValueChange={setTargetRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nutritionist">
                  <span className="flex items-center gap-2"><Salad className="w-4 h-4 text-emerald-500" /> Nutricionista</span>
                </SelectItem>
                <SelectItem value="personal">
                  <span className="flex items-center gap-2"><Dumbbell className="w-4 h-4 text-blue-500" /> Personal Trainer</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handlePromote} disabled={saving} className="w-full gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpCircle className="w-4 h-4" />}
            Promover Paciente
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Professional Detail Card ───
function ProfessionalDetailPanel({ professional, onClose, onRefresh }: { professional: Professional; onClose: () => void; onRefresh: () => void }) {
  const [toggling, setToggling] = useState<string | null>(null);

  const toggleModule = async (field: "coach_bodybuilder_enabled" | "personal_trainer_enabled", current: boolean) => {
    setToggling(field);
    if (professional.profile_id) {
      await supabase.from("professional_profiles").update({ [field]: !current }).eq("id", professional.profile_id);
    } else {
      await supabase.from("professional_profiles").insert({ user_id: professional.user_id, [field]: !current });
    }
    toast.success(`Módulo ${!current ? "liberado" : "bloqueado"} com sucesso`);
    onRefresh();
    setToggling(null);
  };

  return (
    <Card className="glass shadow-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" /> Detalhes do Profissional
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">{professional.full_name[0]?.toUpperCase()}</span>
          </div>
          <div>
            <p className="text-lg font-semibold">{professional.full_name}</p>
            {professional.clinic_name && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" /> {professional.clinic_name}
              </p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Telefone</p>
            <p className="font-medium">{professional.phone || "—"}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Pacientes</p>
            <p className="font-medium">{professional.patient_count}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Plano</p>
            <p className="font-medium">{professional.plan_name || "Nenhum"}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Status</p>
            <Badge variant={professional.status === "active" ? "default" : professional.status === "trial" ? "secondary" : "destructive"}>
              {professional.status === "active" ? "Ativo" : professional.status === "trial" ? "Trial" : "Suspenso"}
            </Badge>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Onboarding</p>
            <p className="font-medium">{professional.onboarding_completed ? "✅ Completo" : "⏳ Pendente"}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Desde</p>
            <p className="font-medium">{new Date(professional.created_at).toLocaleDateString("pt-BR")}</p>
          </div>
        </div>

        {/* Module Access Toggles */}
        <div className="border-t border-border pt-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Módulos Liberados</p>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium">Coach Bodybuilder</span>
            </div>
            <Switch
              checked={professional.coach_bodybuilder_enabled}
              disabled={toggling === "coach_bodybuilder_enabled"}
              onCheckedChange={() => toggleModule("coach_bodybuilder_enabled", professional.coach_bodybuilder_enabled)}
            />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium">Personal Trainer</span>
            </div>
            <Switch
              checked={professional.personal_trainer_enabled}
              disabled={toggling === "personal_trainer_enabled"}
              onCheckedChange={() => toggleModule("personal_trainer_enabled", professional.personal_trainer_enabled)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ───
export default function AdminProfessionals() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPlan, setFilterPlan] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<Professional | null>(null);
  const [viewingProfessional, setViewingProfessional] = useState<Professional | null>(null);
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get all nutritionists and personal trainers
    const { data: nutRoles } = await supabase.from("user_roles").select("user_id, role").in("role", ["nutritionist", "personal"] as any);
    const nutIds = nutRoles?.map(r => r.user_id) || [];
    const roleMap = new Map<string, string>();
    (nutRoles || []).forEach(r => roleMap.set(r.user_id, r.role));

    if (nutIds.length === 0) {
      setProfessionals([]);
      setLoading(false);
      return;
    }

    // Get profiles
    const { data: profiles } = await supabase.from("profiles")
      .select("user_id, full_name, phone, avatar_url, created_at")
      .in("user_id", nutIds);

    // Get professional_profiles
    const { data: profProfiles } = await supabase.from("professional_profiles")
      .select("id, user_id, plan_id, status, clinic_name, onboarding_completed, coach_bodybuilder_enabled, personal_trainer_enabled")
      .in("user_id", nutIds);

    // Get plans
    const { data: plansData } = await supabase.from("pricing_plans")
      .select("id, name, slug")
      .order("sort_order");
    setPlans((plansData as PricingPlan[]) || []);

    const planMap = new Map((plansData || []).map(p => [p.id, p.name]));

    // Get patient counts per nutritionist
    const { data: npData } = await supabase.from("nutritionist_patients")
      .select("nutritionist_id")
      .eq("status", "active")
      .in("nutritionist_id", nutIds);

    const countMap = new Map<string, number>();
    (npData || []).forEach(np => {
      countMap.set(np.nutritionist_id, (countMap.get(np.nutritionist_id) || 0) + 1);
    });

    const profProfileMap = new Map((profProfiles || []).map(pp => [pp.user_id, pp]));

    const result: Professional[] = (profiles || []).map(p => {
      const pp = profProfileMap.get(p.user_id);
      return {
        user_id: p.user_id,
        full_name: p.full_name || "Sem nome",
        phone: p.phone,
        avatar_url: p.avatar_url,
        created_at: p.created_at,
        role_type: (roleMap.get(p.user_id) === "personal" ? "personal" : "nutritionist") as "nutritionist" | "personal",
        profile_id: pp?.id || null,
        plan_id: pp?.plan_id || null,
        plan_name: pp?.plan_id ? (planMap.get(pp.plan_id) || null) : null,
        status: pp?.status || "active",
        clinic_name: pp?.clinic_name || null,
        onboarding_completed: pp?.onboarding_completed ?? false,
        patient_count: countMap.get(p.user_id) || 0,
        coach_bodybuilder_enabled: pp?.coach_bodybuilder_enabled ?? false,
        personal_trainer_enabled: pp?.personal_trainer_enabled ?? false,
      };
    });

    setProfessionals(result);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleStatus = async (prof: Professional) => {
    const newStatus = prof.status === "active" ? "suspended" : "active";
    if (prof.profile_id) {
      await supabase.from("professional_profiles").update({ status: newStatus }).eq("id", prof.profile_id);
    } else {
      await supabase.from("professional_profiles").insert({ user_id: prof.user_id, status: newStatus });
    }
    toast.success(`${prof.full_name} ${newStatus === "active" ? "reativado" : "suspenso"}`);
    fetchData();
  };

  // Filters
  const filtered = professionals.filter(p => {
    if (search && !p.full_name.toLowerCase().includes(search.toLowerCase()) &&
        !(p.clinic_name || "").toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (filterPlan !== "all") {
      if (filterPlan === "none" && p.plan_id) return false;
      if (filterPlan !== "none" && p.plan_id !== filterPlan) return false;
    }
    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Shield className="w-7 h-7 text-primary" />
            <div>
              <h1 className="font-display text-2xl font-bold">Gestão de Profissionais</h1>
              <p className="text-muted-foreground text-sm">Cadastre, edite e gerencie os profissionais da plataforma</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => setPromoteDialogOpen(true)} className="gap-2">
            <ArrowUpCircle className="w-4 h-4" /> Promover Paciente
          </Button>
          <Button onClick={() => { setEditingProfessional(null); setDialogOpen(true); }} className="gap-2">
            <UserPlus className="w-4 h-4" /> Novo Profissional
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="glass shadow-card">
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold font-display text-primary">{professionals.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="glass shadow-card">
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold font-display text-emerald-500">{professionals.filter(p => p.status === "active").length}</p>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </CardContent>
          </Card>
          <Card className="glass shadow-card">
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold font-display text-amber-500">{professionals.filter(p => p.status === "trial").length}</p>
              <p className="text-xs text-muted-foreground">Trial</p>
            </CardContent>
          </Card>
          <Card className="glass shadow-card">
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold font-display text-destructive">{professionals.filter(p => p.status === "suspended").length}</p>
              <p className="text-xs text-muted-foreground">Suspensos</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou clínica..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="suspended">Suspensos</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPlan} onValueChange={setFilterPlan}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Plano" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os planos</SelectItem>
              <SelectItem value="none">Sem plano</SelectItem>
              {plans.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Detail panel */}
        {viewingProfessional && (
          <ProfessionalDetailPanel professional={viewingProfessional} onClose={() => setViewingProfessional(null)} />
        )}

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="glass shadow-card">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum profissional encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map(prof => (
              <div key={prof.user_id} className="flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:shadow-card transition-shadow">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                   <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    {prof.role_type === "personal" ? <Dumbbell className="w-5 h-5 text-blue-500" /> : <Salad className="w-5 h-5 text-emerald-500" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{prof.full_name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {prof.role_type === "personal" ? "Personal" : "Nutricionista"}
                      </Badge>
                      {prof.clinic_name && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{prof.clinic_name}</span>}
                      <span>{prof.patient_count} pacientes</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={prof.status === "active" ? "default" : prof.status === "trial" ? "secondary" : "destructive"} className="text-xs">
                    {prof.status === "active" ? "Ativo" : prof.status === "trial" ? "Trial" : "Suspenso"}
                  </Badge>
                  {prof.plan_name && <Badge variant="outline" className="text-xs">{prof.plan_name}</Badge>}

                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewingProfessional(prof)} title="Ver detalhes">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingProfessional(prof); setDialogOpen(true); }} title="Editar">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setResetTarget(prof); setResetDialogOpen(true); }} title="Redefinir senha">
                    <KeyRound className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => toggleStatus(prof)}
                    title={prof.status === "active" ? "Suspender" : "Reativar"}
                  >
                    {prof.status === "active" ? <Ban className="w-4 h-4 text-destructive" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ProfessionalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        professional={editingProfessional}
        plans={plans}
        onSaved={fetchData}
      />

      <ResetPasswordDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        professional={resetTarget}
      />

      <PromotePatientDialog
        open={promoteDialogOpen}
        onOpenChange={setPromoteDialogOpen}
        onPromoted={fetchData}
      />
    </DashboardLayout>
  );
}
