import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ClipboardList, Plus, Calendar, ToggleLeft, ToggleRight } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type MealPlan = Tables<"meal_plans">;

export default function MealPlans() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<(MealPlan & { patient_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    patient_id: "",
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
            .single();
          return { ...p, patient_name: profile?.full_name || "Paciente" };
        })
      );
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
            .single();
          return { id: d.patient_id, name: profile?.full_name || "Paciente" };
        })
      );
      setPatients(pts);
    }
  };

  useEffect(() => { fetchPlans(); fetchPatients(); }, [user]);

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
    });
    if (error) {
      toast.error("Erro: " + error.message);
    } else {
      toast.success("Plano criado!");
      setOpen(false);
      setForm({ title: "", description: "", patient_id: "", start_date: new Date().toISOString().split("T")[0] });
      fetchPlans();
    }
    setSubmitting(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("meal_plans").update({ is_active: !current }).eq("id", id);
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
            <p className="text-muted-foreground text-sm">{plans.filter(p => p.is_active).length} planos ativos</p>
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
                <div>
                  <Label>Título</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Plano de emagrecimento" required />
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
            {plans.map((p) => (
              <motion.div
                key={p.id}
                whileHover={{ y: -2 }}
                className="glass rounded-xl p-5 shadow-card"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display font-semibold">{p.title}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">Paciente: {p.patient_name}</p>
                    {p.description && (
                      <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                    )}
                  </div>
                  <button onClick={() => toggleActive(p.id, p.is_active)}>
                    {p.is_active ? (
                      <ToggleRight className="w-6 h-6 text-success" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(p.start_date).toLocaleDateString("pt-BR")}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full ${
                    p.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                  }`}>
                    {p.is_active ? "Ativo" : "Inativo"}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
