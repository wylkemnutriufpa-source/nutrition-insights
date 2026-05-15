import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { BookOpen, Check, AlertTriangle, ChevronRight, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props { search: string; }

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Café da Manhã",
  morning_snack: "Lanche da Manhã",
  lunch: "Almoço",
  afternoon_snack: "Lanche da Tarde",
  dinner: "Jantar",
  evening_snack: "Ceia",
};

/**
 * Adapter v2: templates práticos usam `blocks` (modular) em vez de `foods` (legacy).
 * Achata os blocks para exibir no preview, usando a primeira `option` como item principal
 * e as demais como substituições.
 */
function adaptMeal(mealRaw: any): any {
  const m: any = mealRaw || {};
  if (Array.isArray(m.foods) && m.foods.length > 0) return m;
  if (!Array.isArray(m.blocks) || m.blocks.length === 0) return m;

  const foods = m.blocks.flatMap((b: any) => {
    const opts = Array.isArray(b.options) ? b.options : [];
    if (opts.length === 0) return [];
    const primary = opts[0];
    const subs = opts.slice(1).map((o: any) => o?.name).filter(Boolean);
    return [{
      name: primary?.name || b.label || "Item",
      portion: primary?.portion || b.base_quantity || "",
      substitutions: subs,
      category: b.category || b.label,
    }];
  });

  return { ...m, foods };
}

export default function WorkspaceTemplates({ search }: Props) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLegacy, setShowLegacy] = useState(false);
  const [preview, setPreview] = useState<any | null>(null);

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

  const previewMeals: any[] = Array.isArray(preview?.meals) ? preview.meals.map(adaptMeal) : [];

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
              <button
                key={t.id}
                onClick={() => setPreview(t)}
                className="text-left p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.description || "Sem descrição"}</p>
                  </div>
                </div>
              </button>
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
                <button
                  key={t.id}
                  onClick={() => setPreview(t)}
                  className="text-left p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{t.description || "Sem descrição"}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum template encontrado</p>}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl rounded-3xl">
          <div className="px-6 py-5 border-b border-border bg-muted/30">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <BookOpen className="w-6 h-6 text-primary" />
                {preview?.name}
              </DialogTitle>
              {preview?.description && (
                <p className="text-sm text-muted-foreground pt-1">{preview.description}</p>
              )}
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            {previewMeals.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Este template não possui refeições configuradas.
              </div>
            ) : (
              <div className="space-y-4">
                {previewMeals.map((meal: any, idx: number) => {
                  const label = MEAL_LABELS[meal.meal_type] || meal.meal_type || `Refeição ${idx + 1}`;
                  const foods = Array.isArray(meal.foods) ? meal.foods : [];
                  return (
                    <div key={idx} className="p-4 rounded-2xl border border-border bg-card/50 shadow-sm transition-all hover:border-primary/20">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-bold text-foreground flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          {label}
                        </p>
                        {meal.time && (
                          <Badge variant="outline" className="text-[10px] font-medium border-primary/20 text-primary">
                            {meal.time}
                          </Badge>
                        )}
                      </div>
                      {foods.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic pl-3.5">Sem itens</p>
                      ) : (
                        <ul className="space-y-2.5 pl-3.5 border-l border-primary/10 ml-0.5">
                          {foods.map((f: any, fi: number) => (
                            <li key={fi} className="text-xs leading-relaxed">
                              <div className="flex items-baseline gap-2">
                                <span className="font-bold text-foreground">{f.name}</span>
                                {f.portion && <span className="text-muted-foreground italic">— {f.portion}</span>}
                              </div>
                              {Array.isArray(f.substitutions) && f.substitutions.length > 0 && (
                                <div className="text-[10px] text-muted-foreground/80 mt-1 flex flex-wrap gap-x-2 gap-y-1">
                                  <span className="font-medium text-primary/70">Opções:</span>
                                  {f.substitutions.join(" • ")}
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
