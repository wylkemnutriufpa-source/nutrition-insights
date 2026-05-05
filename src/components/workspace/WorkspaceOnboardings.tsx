import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Link } from "react-router-dom";
import { ClipboardCheck, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props { search: string; }

export default function WorkspaceOnboardings({ search }: Props) {
  const { user } = useAuth();
  const [onboardings, setOnboardings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("onboarding_pipelines" as any)
        .select("*, profiles!onboarding_pipelines_patient_id_fkey(full_name)")
        .eq("nutritionist_id", user.id)
        .in("status", ["active", "in_progress", "pending"])
        .order("created_at", { ascending: false })
        .limit(30);
      setOnboardings(data || []);
      setLoading(false);
    };
    fetch();
  }, [user?.id]);

  if (loading) return <div className="text-sm text-muted-foreground py-8 text-center">Carregando onboardings...</div>;

  const filtered = (onboardings as any[]).filter((o) => {
    if (!search) return true;
    const name = (o.profiles as any)?.full_name || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{filtered.length} onboardings em andamento</p>
      <div className="grid gap-2">
        {filtered.map((o: any) => {
          const patient = (o.profiles as any)?.full_name || "Paciente";
          return (
            <Link
              key={o.id}
              to={`/patients/${o.patient_id}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-sky-500/10 flex items-center justify-center">
                <ClipboardCheck className="w-4 h-4 text-sky-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{patient}</p>
                <p className="text-xs text-muted-foreground">Etapa: {o.current_step || o.status}</p>
              </div>
              <Badge variant="outline" className="text-[10px]">{o.status}</Badge>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          );
        })}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum onboarding ativo</p>}
      </div>
    </div>
  );
}
