import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";

interface Props { search: string; }

export default function WorkspaceTemplates({ search }: Props) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("diet_templates")
        .select("*")
        .eq("is_active", true)
        .order("template_generation", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);
      setTemplates(data || []);
      setLoading(false);
    };
    fetch();
  }, [user?.id]);

  const filtered = (templates as any[]).filter((t) => {
    if (!search) return true;
    return (t.name || t.template_name || "").toLowerCase().includes(search.toLowerCase());
  });

  if (loading) return <div className="text-sm text-muted-foreground py-8 text-center">Carregando templates...</div>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{filtered.length} templates disponíveis</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {filtered.map((t: any) => (
          <div key={t.id} className="p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-all cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-violet-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{t.name || t.template_name || "Template"}</p>
                <p className="text-xs text-muted-foreground">{t.description || "Sem descrição"}</p>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8 col-span-2">Nenhum template encontrado</p>}
      </div>
    </div>
  );
}
