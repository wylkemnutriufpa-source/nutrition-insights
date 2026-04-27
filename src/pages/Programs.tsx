import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Plus, Rocket, Users, Calendar, Tag, Trash2, UserPlus,
  ToggleLeft, ToggleRight, Target, Sparkles
} from "lucide-react";

interface Program {
  id: string;
  title: string;
  description: string | null;
  tag: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  max_patients: number | null;
  protocol_id: string | null;
  enrolled_count?: number;
}

const TAG_COLORS: Record<string, string> = {
  challenge: "bg-destructive/10 text-destructive",
  transformation: "bg-primary/10 text-primary",
  detox: "bg-success/10 text-success",
  general: "bg-muted text-muted-foreground",
  seasonal: "bg-warning/10 text-warning",
};

const TAGS = [
  { value: "challenge", label: "🔥 Desafio" },
  { value: "transformation", label: "✨ Transformação" },
  { value: "detox", label: "🌿 Detox" },
  { value: "seasonal", label: "☀️ Sazonal" },
  { value: "general", label: "📋 Geral" },
];

export default function Programs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState<string | null>(null);
  const [patients, setPatients] = useState<{ id: string; name: string }[]>([]);
  const [protocols, setProtocols] = useState<{ id: string; title: string }[]>([]);
  const [enrollPatientId, setEnrollPatientId] = useState("");
  const [form, setForm] = useState({
    title: "", description: "", tag: "challenge",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "", max_patients: "", protocol_id: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchPrograms = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("programs")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      const enriched = await Promise.all(
        data.map(async (p: any) => {
          const { count } = await supabase
            .from("program_patients")
            .select("id", { count: "exact" })
            .eq("program_id", p.id)
            .eq("status", "active");
          return { ...p, enrolled_count: count || 0 };
        })
      );
      setPrograms(enriched);
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
        data.map(async (d: any) => {
          const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", d.patient_id).maybeSingle();
          return { id: d.patient_id, name: profile?.full_name || "Paciente" };
        })
      );
      setPatients(pts);
    }
  };

  const fetchProtocols = async () => {
    if (!user) return;
    const { data } = await supabase.from("protocols").select("id, title").eq("created_by", user.id);
    setProtocols(data || []);
  };

  useEffect(() => { fetchPrograms(); fetchPatients(); fetchProtocols(); }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from("programs").insert({
      title: form.title,
      description: form.description || null,
      tag: form.tag,
      start_date: form.start_date,
      end_date: form.end_date || null,
      max_patients: form.max_patients ? parseInt(form.max_patients) : null,
      protocol_id: form.protocol_id || null,
      created_by: user.id,
    });

    if (error) toast.error(error.message);
    else {
      toast.success("Programa criado! 🚀");
      setCreateOpen(false);
      setForm({ title: "", description: "", tag: "challenge", start_date: new Date().toISOString().split("T")[0], end_date: "", max_patients: "", protocol_id: "" });
      fetchPrograms();
    }
    setSubmitting(false);
  };

  const enrollPatient = async (programId: string) => {
    if (!enrollPatientId) return;
    const { error } = await supabase.from("program_patients").insert({
      program_id: programId,
      patient_id: enrollPatientId,
    });

    if (error) {
      if (error.code === "23505") toast.info("Paciente já está inscrito");
      else toast.error(error.message);
    } else {
      toast.success("Paciente inscrito! 🎉");
      setEnrollOpen(null);
      setEnrollPatientId("");
      fetchPrograms();
    }
  };

  const toggleProgram = async (id: string, current: boolean) => {
    await supabase.from("programs").update({ is_active: !current }).eq("id", id);
    fetchPrograms();
  };

  const deleteProgram = async (id: string) => {
    // Check if it's a Biquíni Branco program (protected)
    const prog = programs.find(p => p.id === id);
    const isBiquini = prog?.title?.toLowerCase().includes("biqu") || prog?.tag === "biquini";

    if (isBiquini) {
      const pwd = prompt("🔒 Projeto protegido!\nDigite a senha do administrador para excluir:");
      if (!pwd) return;
      if (pwd !== "Wylk3mkl3yton") {
        toast.error("Senha incorreta. Exclusão cancelada.");
        return;
      }
    } else {
      if (!confirm("Remover este programa?")) return;
    }

    await supabase.from("programs").delete().eq("id", id);
    fetchPrograms();
    toast.success("Programa removido");
  };

  // Calculate days progress
  const getDaysProgress = (start: string, end: string | null) => {
    const now = new Date();
    const startDate = new Date(start);
    if (!end) return null;
    const endDate = new Date(end);
    const total = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const elapsed = Math.max(0, (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.min(100, Math.round((elapsed / total) * 100));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Rocket className="w-7 h-7 text-primary" /> Programas
            </h1>
            <p className="text-muted-foreground text-sm">Gerencie projetos e desafios para seus pacientes</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary gap-2 shadow-glow">
                <Plus className="w-4 h-4" /> Novo Programa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display">Criar Programa</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label>Nome</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Projeto Biquíni Branco 2026" required />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descreva o programa..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tag</Label>
                    <Select value={form.tag} onValueChange={(v) => setForm({ ...form, tag: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="z-[150] bg-background border-border shadow-2xl" position="popper" sideOffset={5}>
                        {TAGS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Máx. pacientes</Label>
                    <Input type="number" value={form.max_patients} onChange={(e) => setForm({ ...form, max_patients: e.target.value })} placeholder="Ilimitado" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Início</Label>
                    <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
                  </div>
                  <div>
                    <Label>Fim (opcional)</Label>
                    <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Protocolo vinculado (opcional)</Label>
                  <Select value={form.protocol_id || "none"} onValueChange={(v) => setForm({ ...form, protocol_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {protocols.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full gradient-primary" disabled={submitting}>
                  {submitting ? "Criando..." : "Criar Programa"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : programs.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <Rocket className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-display font-semibold text-lg mb-1">Nenhum programa</h3>
            <p className="text-muted-foreground">Crie um programa como "Projeto Biquíni Branco" para engajar seus pacientes.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {programs.map((p) => {
              const daysProgress = getDaysProgress(p.start_date, p.end_date);
              const isBiquini = p.title.toLowerCase().includes("biqu") || p.title.toLowerCase().includes("bikini");
              const targetRoute = isBiquini ? `/programs/${p.id}/biquini-branco` : `/programs/${p.id}`;
              return (
                <motion.div key={p.id} whileHover={{ y: -2 }} className={`glass rounded-xl overflow-hidden shadow-card cursor-pointer ${isBiquini ? "ring-2 ring-pink-500/30" : ""}`} onClick={() => navigate(targetRoute)}>
                  {/* Header with gradient */}
                  <div className={`${isBiquini ? "bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400" : "gradient-primary"} p-4 text-primary-foreground relative`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge className={`${isBiquini ? "bg-white/20 text-white border-0" : TAG_COLORS[p.tag] || TAG_COLORS.general + " border-0"} mb-2`}>
                          {isBiquini ? "👙 Premium" : TAGS.find(t => t.value === p.tag)?.label || p.tag}
                        </Badge>
                        <h3 className="font-display font-bold text-lg">{p.title}</h3>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => toggleProgram(p.id, p.is_active)} className="p-1 rounded-lg hover:bg-white/20">
                          {p.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                        <button onClick={() => deleteProgram(p.id)} className="p-1 rounded-lg hover:bg-white/20">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    {p.description && (
                      <p className="text-sm text-muted-foreground">{p.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Users className="w-4 h-4" /> {p.enrolled_count}{p.max_patients ? `/${p.max_patients}` : ""} pacientes
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-4 h-4" /> {new Date(p.start_date).toLocaleDateString("pt-BR")}
                      </span>
                    </div>

                    {daysProgress !== null && (
                      <div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>Progresso temporal</span>
                          <span>{daysProgress}%</span>
                        </div>
                        <Progress value={daysProgress} className="h-2" />
                      </div>
                    )}

                    <Dialog open={enrollOpen === p.id} onOpenChange={(v) => setEnrollOpen(v ? p.id : null)}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full gap-1">
                          <UserPlus className="w-4 h-4" /> Inscrever Paciente
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle className="font-display">Inscrever Paciente</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Select value={enrollPatientId} onValueChange={setEnrollPatientId}>
                            <SelectTrigger><SelectValue placeholder="Selecione o paciente..." /></SelectTrigger>
                            <SelectContent>
                              {patients.map((pt) => (
                                <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button onClick={() => enrollPatient(p.id)} className="w-full gradient-primary" disabled={!enrollPatientId}>
                            Inscrever
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
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
