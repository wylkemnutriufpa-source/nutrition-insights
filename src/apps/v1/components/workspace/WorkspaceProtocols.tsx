import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props { search: string; }

export default function WorkspaceProtocols({ search }: Props) {
  const { user } = useAuth();
  const [protocols, setProtocols] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("nutrition_protocols" as any)
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setProtocols(data || []);
      setLoading(false);
    };
    fetch();
  }, [user?.id]);

  const filtered = protocols.filter((p: any) => {
    if (!search) return true;
    return (p.name || "").toLowerCase().includes(search.toLowerCase());
  });

  if (loading) return <div className="text-sm text-muted-foreground py-8 text-center">Carregando protocolos...</div>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{filtered.length} protocolos</p>
      <div className="grid gap-2">
        {filtered.map((p: any) => (
          <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-all cursor-pointer">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{p.name || "Protocolo"}</p>
              <p className="text-xs text-muted-foreground">{p.description || ""}</p>
            </div>
            <Badge variant="outline" className="text-[10px]">{p.is_active ? "Ativo" : "Inativo"}</Badge>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum protocolo encontrado</p>}
      </div>
    </div>
  );
}
