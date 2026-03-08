import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Plus, Mail, UserCheck, UserX } from "lucide-react";

interface PatientInfo {
  id: string;
  patient_id: string;
  status: string;
  notes: string | null;
  created_at: string;
  profile?: { full_name: string; avatar_url: string | null } | null;
}

export default function Patients() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<PatientInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientPassword, setPatientPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchPatients = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("nutritionist_patients")
      .select("*")
      .eq("nutritionist_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      const enriched = await Promise.all(
        data.map(async (p) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("user_id", p.patient_id)
            .single();
          return { ...p, profile };
        })
      );
      setPatients(enriched);
    }
    setLoading(false);
  };

  useEffect(() => { fetchPatients(); }, [user]);

  const addPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!patientName.trim()) { toast.error("Informe o nome do paciente"); return; }
    if (patientPassword.length < 6) { toast.error("Senha deve ter mínimo 6 caracteres"); return; }
    setSubmitting(true);

    try {
      // Create patient account via secure DB function
      const { data: patientId, error: createError } = await supabase
        .rpc("create_patient_account", {
          _email: email.trim().toLowerCase(),
          _full_name: patientName.trim(),
          _password: patientPassword,
        });

      if (createError) throw createError;
      if (!patientId) throw new Error("Erro ao criar conta do paciente");

      // Link nutritionist to patient
      const { error: linkError } = await supabase.from("nutritionist_patients").insert({
        nutritionist_id: user.id,
        patient_id: patientId,
      });

      if (linkError) {
        if (linkError.code === "23505") {
          toast.info("Paciente já está na sua lista.");
        } else {
          throw linkError;
        }
      } else {
        toast.success("Paciente cadastrado e vinculado! 🎉");
      }

      setOpen(false);
      setEmail("");
      setPatientName("");
      setPatientPassword("");
      fetchPatients();
    } catch (err: any) {
      toast.error("Erro: " + (err.message || "Tente novamente"));
    }
    setSubmitting(false);
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    const { error } = await supabase
      .from("nutritionist_patients")
      .update({ status: newStatus })
      .eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      toast.success(`Paciente ${newStatus === "active" ? "ativado" : "desativado"}`);
      fetchPatients();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Users className="w-7 h-7 text-primary" /> Pacientes
            </h1>
            <p className="text-muted-foreground text-sm">{patients.filter(p => p.status === "active").length} pacientes ativos</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary gap-2 shadow-glow">
                <Plus className="w-4 h-4" /> Adicionar Paciente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Adicionar Paciente</DialogTitle>
              </DialogHeader>
              <form onSubmit={addPatient} className="space-y-4">
                <div>
                  <Label>Nome do paciente</Label>
                  <Input
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Nome completo"
                    required
                  />
                </div>
                <div>
                  <Label>Email do paciente</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="paciente@email.com"
                    required
                  />
                </div>
                <div>
                  <Label>Senha inicial</Label>
                  <Input
                    type="password"
                    value={patientPassword}
                    onChange={(e) => setPatientPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    O paciente poderá alterar a senha depois em Configurações.
                  </p>
                </div>
                <Button type="submit" className="w-full gradient-primary" disabled={submitting}>
                  {submitting ? "Criando conta..." : "Cadastrar Paciente"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : patients.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-display font-semibold text-lg mb-1">Nenhum paciente</h3>
            <p className="text-muted-foreground">Adicione seu primeiro paciente para começar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patients.map((p) => (
              <motion.div
                key={p.id}
                whileHover={{ y: -2 }}
                className="glass rounded-xl p-5 shadow-card"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-bold text-primary">
                      {(p.profile?.full_name || "P")[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-semibold">{p.profile?.full_name || "Paciente"}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      p.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                    }`}>
                      {p.status === "active" ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <button
                    onClick={() => toggleStatus(p.id, p.status)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {p.status === "active" ? <UserX className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
