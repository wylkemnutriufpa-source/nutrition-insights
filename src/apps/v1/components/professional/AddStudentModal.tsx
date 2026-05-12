import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@v1/components/ui/dialog";
import { Input } from "@v1/components/ui/input";
import { Label } from "@v1/components/ui/label";
import { Button } from "@v1/components/ui/button";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";

interface AddStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}

export default function AddStudentModal({ open, onOpenChange, onAdded }: AddStudentModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Informe o nome do aluno"); return; }
    if (!email.trim()) { toast.error("Informe o email do aluno"); return; }
    if (password.length < 6) { toast.error("Senha deve ter mínimo 6 caracteres"); return; }
    if (!user) return;

    setSubmitting(true);
    try {
      // Create the patient account via invite-patient edge function
      const { data, error } = await supabase.functions.invoke("invite-patient", {
        body: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          method: "password",
          password,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const patientId = data?.patient_id;
      if (!patientId) throw new Error("Erro ao criar conta do aluno");

      // Link as trainer student
      await supabase.from("patient_professional_links").insert({
        patient_id: patientId,
        professional_id: user.id,
        professional_role: "trainer",
        link_status: "active",
        created_by: user.id,
      });

      // Sync to personal_trainer_students for backward compat
      await supabase.from("personal_trainer_students").upsert({
        personal_id: user.id,
        student_id: patientId,
        status: "active",
      }, { onConflict: "personal_id,student_id" });

      toast.success("Aluno cadastrado e vinculado! 🎉");
      setName("");
      setEmail("");
      setPassword("");
      onAdded();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro: " + (err.message || "Tente novamente"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-primary/20 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Adicionar Novo Aluno
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label>Nome do aluno</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@aluno.com" />
          </div>
          <div>
            <Label>Senha inicial</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            <p className="text-xs text-muted-foreground mt-1">O aluno poderá alterar depois em Configurações.</p>
          </div>
          <Button type="submit" className="w-full gradient-primary" disabled={submitting}>
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Criando conta...</> : "Cadastrar Aluno"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
