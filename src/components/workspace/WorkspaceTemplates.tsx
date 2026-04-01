import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { BookOpen, Check, AlertTriangle, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props { search: string; }

export default function WorkspaceTemplates({ search }: Props) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLegacy, setShowLegacy] = useState(false);

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
    return (t.name || "").toLowerCase().includes(search.toLowerCase());
  });

  const official = filtered.filter(t => t.template_generation === "official_v2");
  const legacy = filtered.filter(t => t.template_generation !== "official_v2");

  if (loading) return <div className="text-sm text-muted-foreground py-8 text-center">Carregando templates...</div>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{filtered.length} templates disponíveis</p>

      {official.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-primary/10 text-primary border-primary/30 gap-1 text-[10px]">
              <Check className="w-3 h-3" /> Verificados
            </Badge>
            <span className="text-xs text-muted-foreground">{official.length} oficiais</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {official.map((t: any) => (
              <div key={t.id} className="p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-all cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.description || "Sem descrição"}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {legacy.length > 0 && (
        <div>
          <button
            onClick={() => setShowLegacy(!showLegacy)}
            className="flex items-center gap-2 mb-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Badge variant="outline" className="gap-1 text-muted-foreground text-[10px]">
              <AlertTriangle className="w-3 h-3" /> Legado
            </Badge>
            <span>{legacy.length} antigos</span>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showLegacy ? 'rotate-90' : ''}`} />
          </button>
          {showLegacy && (
            <div className="grid gap-2 sm:grid-cols-2 opacity-60">
              {legacy.map((t: any) => (
                <div key={t.id} className="p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.description || "Sem descrição"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum template encontrado</p>}
    </div>
  );
}
