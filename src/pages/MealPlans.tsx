import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ClipboardList, Plus, Calendar, ToggleLeft, ToggleRight, PencilLine, Clock, CheckCircle2, FileText } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";

type MealPlan = Tables<"meal_plans">;

export default function MealPlans() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPatientId = searchParams.get("patientId") || "";
  const [plans, setPlans] = useState<(MealPlan & { patient_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    patient_id: preselectedPatientId,
    start_date: new Date().toISOString().split("T")[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const [patients, setPatients] = useState<{ id: string; name: string }[]>([]);

  const fetchPlans = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("meal_plans")
      .select("*")
      .eq("nutritionist_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      const enriched = await Promise.all(
        data.map(async (p) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", p.patient_id)
            .maybeSingle();
          return { ...p, patient_name: profile?.full_name || "Paciente" };
        })
      );
      // Sort: pending approval first, then by date
      const priorityStatuses = ["under_professional_review", "draft_auto_generated"];
      enriched.sort((a, b) => {
        const aP = priorityStatuses.includes((a as any).plan_status) ? 0 : 1;
        const bP = priorityStatuses.includes((b as any).plan_status) ? 0 : 1;
        if (aP !== bP) return aP - bP;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setPlans(enriched);
    }
    setLoading(false);
  };

  const fetchPatients = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("nutritionist_patients")
      .select("patient_id")
      .eq("nutritionist_id", user.id)
      .eq("status", "active");
    if (data) {
      const pts = await Promise.all(
        data.map(async (d) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", d.patient_id)
            .maybeSingle();
          return { id: d.patient_id, name: profile?.full_name || "Paciente" };
        })
      );
      setPatients(pts);
    }
  };

  useEffect(() => { fetchPlans(); fetchPatients(); }, [user]);

  // Auto-open dialog when coming from patient profile
  useEffect(() => {
    if (preselectedPatientId) setOpen(true);
  }, [preselectedPatientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.patient_id) return;
    setSubmitting(true);

    const { error } = await supabase.from("meal_plans").insert({
      nutritionist_id: user.id,
      patient_id: form.patient_id,
      title: form.title,
      description: form.description || null,
      start_date: form.start_date,
      is_active: true,
    });

    if (error) {
      toast.error("Erro: " + error.message);
    } else {
      await supabase
        .from("meal_plans")
        .update({ is_active: false })
        .eq("nutritionist_id", user.id)
        .eq("patient_id", form.patient_id)
        .neq("title", form.title)
        .neq("start_date", form.start_date);

      toast.success("Plano criado e definido como ativo!");
      setOpen(false);
      setForm({ title: "", description: "", patient_id: "", start_date: new Date().toISOString().split("T")[0] });
      fetchPlans();
    }
    setSubmitting(false);
  };

  const toggleActive = async (id: string, patientId: string, current: boolean) => {
    if (current) {
      await supabase.from("meal_plans").update({ is_active: false }).eq("id", id);
    } else {
      await supabase.from("meal_plans").update({ is_active: false }).eq("nutritionist_id", user?.id).eq("patient_id", patientId);
      await supabase.from("meal_plans").update({ is_active: true }).eq("id", id);
    }
    fetchPlans();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="w-7 h-7 text-primary" /> Planos Alimentares
            </h1>
            <p className="text-muted-foreground text-sm">
              {plans.filter(p => p.is_active).length} ativos
              {(() => {
                const pending = plans.filter(p => ["draft_auto_generated", "under_professional_review"].includes((p as any).plan_status));
                return pending.length > 0 ? ` • ${pending.length} aguardando aprovação` : "";
              })()}
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary gap-2 shadow-glow">
                <Plus className="w-4 h-4" /> Novo Plano
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Criar Plano Alimentar</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {preselectedPatientId ? (
                  <div>
                    <Label>Paciente</Label>
                    <div className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
                      {patients.find(p => p.id === preselectedPatientId)?.name || "Paciente selecionado"}
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label>Paciente</Label>
                    <select
                      value={form.patient_id}
                      onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      required
                    >
                      <option value="">Selecione...</option>
                      {patients.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <Label>Objetivo do Plano</Label>
                  <div className="flex flex-wrap gap-2 mt-2 mb-2">
                    {[
                      { label: "🔥 Emagrecimento", title: "Plano de Emagrecimento", desc: "Plano alimentar focado em déficit calórico controlado para perda de gordura" },
                      { label: "💪 Hipertrofia", title: "Plano de Hipertrofia", desc: "Plano alimentar com superávit calórico para ganho de massa muscular" },
                      { label: "⚖️ Manutenção", title: "Plano de Manutenção", desc: "Plano alimentar para manter peso e composição corporal atuais" },
                      { label: "🩺 Clínico", title: "Plano Clínico", desc: "Plano alimentar adaptado a condições clínicas específicas" },
                      { label: "🏃 Performance", title: "Plano de Performance", desc: "Plano alimentar otimizado para desempenho esportivo" },
                      { label: "🤰 Gestação", title: "Plano Gestacional", desc: "Plano alimentar para gestantes com foco em nutrientes essenciais" },
                      { label: "🌱 Reeducação", title: "Reeducação Alimentar", desc: "Plano focado em mudança gradual de hábitos alimentares" },
                      { label: "🍽️ Low Carb", title: "Plano Low Carb", desc: "Plano com redução controlada de carboidratos" },
                    ].map((goal) => (
                      <button
                        key={goal.title}
                        type="button"
                        onClick={() => setForm({ ...form, title: goal.title, description: goal.desc })}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          form.title === goal.title
                            ? "bg-primary text-primary-foreground border-primary shadow-glow"
                            : "bg-muted/50 text-muted-foreground border-border hover:border-primary/40 hover:bg-primary/5"
                        }`}
                      >
                        {goal.label}
                      </button>
                    ))}
                  </div>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Ou digite um título personalizado..."
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div>
                  <Label>Data de início</Label>
                  <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
                </div>
                <Button type="submit" className="w-full gradient-primary" disabled={submitting}>
                  {submitting ? "Criando..." : "Criar Plano"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : plans.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <ClipboardList className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-display font-semibold text-lg mb-1">Nenhum plano ainda</h3>
            <p className="text-muted-foreground">Crie um plano alimentar para seus pacientes.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map((p) => {
              const statusConfig: Record<string, { label: string; color: string }> = {
                draft: { label: "Rascunho", color: "bg-muted text-muted-foreground" },
                draft_auto_generated: { label: "⏳ Pré-plano Gerado", color: "bg-amber-500/20 text-amber-600 dark:text-amber-400" },
                under_professional_review: { label: "⏳ Aguardando Aprovação", color: "bg-amber-500/20 text-amber-600 dark:text-amber-400" },
                approved: { label: "✅ Aprovado", color: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" },
                published_to_patient: { label: "✅ Publicado", color: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" },
                rejected: { label: "❌ Rejeitado", color: "bg-destructive/20 text-destructive" },
                archived: { label: "Arquivado", color: "bg-muted text-muted-foreground" },
              };
              const planStatus = (p as any).plan_status || "draft";
              const st = statusConfig[planStatus] || { label: planStatus, color: "bg-muted text-muted-foreground" };
              const isPending = ["draft_auto_generated", "under_professional_review"].includes(planStatus);

              return (
              <motion.div
                key={p.id}
                whileHover={{ y: -2 }}
                className={`glass rounded-xl p-5 shadow-card cursor-pointer ${isPending ? "ring-2 ring-amber-500/40" : ""}`}
                onClick={() => navigate(`/meal-plans/${p.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display font-semibold">{p.title}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">Paciente: {p.patient_name}</p>
                    {p.description && (
                      <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isPending && (
                      <Button
                        size="sm"
                        className="gradient-primary shadow-glow gap-1.5"
                        onClick={(e) => { e.stopPropagation(); navigate(`/meal-plans/${p.id}`); }}
                      >
                        <FileText className="w-3.5 h-3.5" /> Revisar
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); navigate(`/meal-plans/${p.id}`); }}
                    >
                      <PencilLine className="w-4 h-4" />
                    </Button>
                    {!isPending && (
                      <button onClick={(e) => { e.stopPropagation(); toggleActive(p.id, p.patient_id, p.is_active); }}>
                        {p.is_active ? (
                          <ToggleRight className="w-6 h-6 text-success" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {new Date(p.start_date).toLocaleDateString("pt-BR")}
                  </span>
                  <Badge className={`text-[10px] ${st.color}`}>{st.label}</Badge>
                  {planStatus === "published_to_patient" && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      p.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                    }`}>
                      {p.is_active ? "Ativo" : "Inativo"}
                    </span>
                  )}
                </div>
              </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
