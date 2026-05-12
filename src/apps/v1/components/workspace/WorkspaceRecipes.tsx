import { useEffect, useState } from "react";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { ChefHat } from "lucide-react";

interface Props { search: string; }

export default function WorkspaceRecipes({ search }: Props) {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("recipes" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      setRecipes(data || []);
      setLoading(false);
    };
    fetch();
  }, [user?.id]);

  const filtered = (recipes as any[]).filter((r) => {
    if (!search) return true;
    return (r.name || r.title || "").toLowerCase().includes(search.toLowerCase());
  });

  if (loading) return <div className="text-sm text-muted-foreground py-8 text-center">Carregando receitas...</div>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{filtered.length} receitas</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((r: any) => (
          <div key={r.id} className="p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-all cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <ChefHat className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.name || r.title || "Receita"}</p>
                <p className="text-xs text-muted-foreground">{r.calories ? `${r.calories} kcal` : ""}</p>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8 col-span-3">Nenhuma receita encontrada</p>}
      </div>
    </div>
  );
}
