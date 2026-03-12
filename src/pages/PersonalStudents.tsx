import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Plus, Search, UserCheck, UserX } from "lucide-react";

export default function PersonalStudents() {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("personal_trainer_students")
      .select("*")
      .eq("personal_id", user.id);
    setStudents(data || []);

    if (data && data.length > 0) {
      const ids = data.map(s => s.student_id);
      const { data: profs } = await supabase.from("profiles").select("*").in("user_id", ids);
      const map: Record<string, any> = {};
      profs?.forEach(p => { map[p.user_id] = p; });
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const addStudent = async () => {
    if (!addEmail.trim() || !user) return;
    setAdding(true);
    try {
      const { data: patientId } = await supabase.rpc("find_patient_by_email", { _email: addEmail.trim().toLowerCase() });
      if (!patientId) {
        toast.error("Paciente não encontrado com este email");
        setAdding(false);
        return;
      }
      const { error } = await supabase.from("personal_trainer_students").insert({
        personal_id: user.id,
        student_id: patientId,
      });
      if (error) {
        if (error.code === "23505") toast.error("Aluno já vinculado");
        else toast.error("Erro ao vincular aluno");
      } else {
        toast.success("Aluno vinculado com sucesso!");
        setAddEmail("");
        setAddOpen(false);
        load();
      }
    } catch { toast.error("Erro inesperado"); }
    setAdding(false);
  };

  const removeStudent = async (id: string) => {
    await supabase.from("personal_trainer_students").update({ status: "inactive" }).eq("id", id);
    toast.success("Aluno removido");
    load();
  };

  const filtered = students.filter(s => {
    if (!search) return true;
    const p = profiles[s.student_id];
    return p?.full_name?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Meus Alunos</h1>
            <p className="text-muted-foreground text-sm">{students.filter(s => s.status === "active").length} alunos ativos</p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Vincular Aluno</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Vincular Aluno</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <Input
                  placeholder="Email do paciente/aluno"
                  value={addEmail}
                  onChange={e => setAddEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addStudent()}
                />
                <Button onClick={addStudent} disabled={adding} className="w-full">
                  {adding ? "Vinculando..." : "Vincular"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar aluno..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        <div className="grid gap-3">
          {filtered.map(s => {
            const p = profiles[s.student_id];
            const initials = (p?.full_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
            return (
              <Card key={s.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{p?.full_name || "Aluno"}</p>
                    <p className="text-xs text-muted-foreground">Desde {new Date(s.created_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <Badge variant={s.status === "active" ? "default" : "secondary"}>
                    {s.status === "active" ? "Ativo" : "Inativo"}
                  </Badge>
                  {s.status === "active" && (
                    <Button variant="ghost" size="icon" onClick={() => removeStudent(s.id)}>
                      <UserX className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && !loading && (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum aluno vinculado ainda.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
