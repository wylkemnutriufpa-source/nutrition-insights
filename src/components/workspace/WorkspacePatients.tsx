import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserPlus, ExternalLink } from "lucide-react";

interface Props { search: string; }

export default function WorkspacePatients({ search }: Props) {
  const { user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("nutritionist_patients")
        .select("patient_id, status, journey_status, profiles!nutritionist_patients_patient_id_fkey(full_name, phone)")
        .eq("nutritionist_id", user.id)
        .eq("status", "active");
      setPatients(data || []);
      setLoading(false);
    };
    fetch();
  }, [user?.id]);

  const filtered = patients.filter((p: any) => {
    if (!search) return true;
    const name = (p.profiles as any)?.full_name || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  if (loading) return <div className="text-sm text-muted-foreground py-8 text-center">Carregando pacientes...</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length} pacientes ativos</p>
        <Link to="/invite-patient">
          <Button size="sm" variant="outline" className="gap-1.5">
            <UserPlus className="w-4 h-4" /> Convidar Paciente
          </Button>
        </Link>
      </div>
      <div className="grid gap-2">
        {filtered.map((p: any) => {
          const profile = p.profiles as any;
          const name = profile?.full_name || "Sem nome";
          const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
          const status = (p as any).journey_status || "unknown";

          return (
            <Link
              key={p.patient_id}
              to={`/patient/${p.patient_id}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-all group"
            >
              <Avatar className="w-9 h-9">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{name}</p>
                <p className="text-xs text-muted-foreground">{profile?.phone || "Sem telefone"}</p>
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0">
                {status.replace(/_/g, " ")}
              </Badge>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum paciente encontrado</p>
        )}
      </div>
    </div>
  );
}
