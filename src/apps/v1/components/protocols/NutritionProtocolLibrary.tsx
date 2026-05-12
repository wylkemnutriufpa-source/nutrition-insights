import { useQuery } from "@tanstack/react-query";
import { supabase } from "@v1/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Badge } from "@v1/components/ui/badge";
import { Skeleton } from "@v1/components/ui/skeleton";
import { ScrollArea } from "@v1/components/ui/scroll-area";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@v1/components/ui/dialog";
import { Separator } from "@v1/components/ui/separator";
import {
  Target, Brain, Dumbbell, Heart, Apple, Zap, Shield, Scale,
  FlaskConical, Flame, Leaf, Activity
} from "lucide-react";

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  emagrecimento_clinico: { label: "Emagrecimento Clínico", color: "bg-red-500/10 text-red-400 border-red-500/20", icon: Flame },
  recomposicao_corporal: { label: "Recomposição Corporal", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Dumbbell },
  hipertrofia: { label: "Hipertrofia", color: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: Target },
  melhora_metabolica: { label: "Melhora Metabólica", color: "bg-green-500/10 text-green-400 border-green-500/20", icon: Activity },
  comportamento_alimentar: { label: "Comportamento Alimentar", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: Brain },
  atleta_performance: { label: "Atleta Performance", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20", icon: Zap },
  anti_compulsao: { label: "Anti-Compulsão", color: "bg-pink-500/10 text-pink-400 border-pink-500/20", icon: Shield },
  estrategia_metabolica: { label: "Estratégia Metabólica", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: FlaskConical },
};

const COMPLEXITY_LABELS: Record<string, string> = {
  low: "🟢 Baixa",
  moderate: "🟡 Moderada",
  high: "🔴 Alta",
};

interface Protocol {
  id: string;
  protocol_slug: string;
  protocol_name: string;
  protocol_category: string;
  clinical_goal: string;
  metabolic_strategy_type: string;
  behavioral_complexity_level: string;
  recommended_clusters: string[];
  contraindicated_conditions: string[];
  description: string | null;
  scientific_rationale: string | null;
  is_active: boolean;
}

export default function NutritionProtocolLibrary() {
  const [selectedProtocol, setSelectedProtocol] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const { data: protocols, isLoading } = useQuery({
    queryKey: ["nutrition-protocols"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nutrition_protocols")
        .select("*")
        .eq("is_active", true)
        .order("protocol_category", { ascending: true });
      if (error) throw error;
      return data as Protocol[];
    },
  });

  const { data: details } = useQuery({
    queryKey: ["nutrition-protocol-details", selectedProtocol],
    enabled: !!selectedProtocol,
    queryFn: async () => {
      const [caloricRes, mealRes, subsRes, tagsRes] = await Promise.all([
        supabase.from("protocol_caloric_ranges").select("*").eq("protocol_id", selectedProtocol!),
        supabase.from("protocol_meal_structures").select("*").eq("protocol_id", selectedProtocol!),
        supabase.from("protocol_food_substitution_groups").select("*").eq("protocol_id", selectedProtocol!),
        supabase.from("protocol_metabolic_tags").select("*").eq("protocol_id", selectedProtocol!),
      ]);
      return {
        caloric: caloricRes.data || [],
        meal: mealRes.data?.[0] || null,
        substitutions: subsRes.data || [],
        tags: tagsRes.data || [],
      };
    },
  });

  const filtered = protocols?.filter(
    (p) => filterCategory === "all" || p.protocol_category === filterCategory
  );

  const selectedProto = protocols?.find((p) => p.id === selectedProtocol);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category filters */}
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          <Badge
            variant={filterCategory === "all" ? "default" : "outline"}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => setFilterCategory("all")}
          >
            Todos ({protocols?.length || 0})
          </Badge>
          {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
            const count = protocols?.filter((p) => p.protocol_category === key).length || 0;
            if (count === 0) return null;
            return (
              <Badge
                key={key}
                variant={filterCategory === key ? "default" : "outline"}
                className="cursor-pointer whitespace-nowrap"
                onClick={() => setFilterCategory(key)}
              >
                {cfg.label} ({count})
              </Badge>
            );
          })}
        </div>
      </ScrollArea>

      {/* Protocol cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered?.map((proto) => {
          const cat = CATEGORY_CONFIG[proto.protocol_category] || CATEGORY_CONFIG.emagrecimento_clinico;
          const Icon = cat.icon;
          return (
            <Card
              key={proto.id}
              className="cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => setSelectedProtocol(proto.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${cat.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <CardTitle className="text-sm">{proto.protocol_name}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground line-clamp-2">{proto.description}</p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className={`text-[10px] ${cat.color}`}>
                    {cat.label}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {COMPLEXITY_LABELS[proto.behavioral_complexity_level] || proto.behavioral_complexity_level}
                  </Badge>
                </div>
                {proto.recommended_clusters.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {proto.recommended_clusters.slice(0, 3).map((c) => (
                      <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selectedProtocol} onOpenChange={() => setSelectedProtocol(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedProto && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {(() => {
                    const cat = CATEGORY_CONFIG[selectedProto.protocol_category];
                    const Icon = cat?.icon || Target;
                    return <Icon className="w-5 h-5 text-primary" />;
                  })()}
                  {selectedProto.protocol_name}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Overview */}
                <div>
                  <p className="text-sm text-muted-foreground">{selectedProto.description}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge>{selectedProto.clinical_goal}</Badge>
                    <Badge variant="outline">{selectedProto.metabolic_strategy_type}</Badge>
                    <Badge variant="outline">
                      {COMPLEXITY_LABELS[selectedProto.behavioral_complexity_level]}
                    </Badge>
                  </div>
                </div>

                {selectedProto.scientific_rationale && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-semibold mb-1">🔬 Racional Científico</h4>
                      <p className="text-xs text-muted-foreground">{selectedProto.scientific_rationale}</p>
                    </div>
                  </>
                )}

                {/* Metabolic tags */}
                {details?.tags && details.tags.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-semibold mb-2">🧬 Tags Metabólicas</h4>
                      <div className="flex flex-wrap gap-1">
                        {details.tags.map((t: any) => (
                          <Badge key={t.id} variant="secondary" className="text-xs">{t.tag}</Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Caloric ranges */}
                {details?.caloric && details.caloric.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-semibold mb-2">⚡ Faixas Calóricas</h4>
                      {details.caloric.map((c: any) => (
                        <div key={c.id} className="bg-muted/30 rounded-lg p-3 text-xs space-y-1">
                          <p><span className="font-medium">Faixa:</span> {c.kcal_min} – {c.kcal_max} kcal</p>
                          <p><span className="font-medium">Estratégia de déficit:</span> {c.deficit_strategy_type}</p>
                          <p><span className="font-medium">Ciclo adaptativo:</span> {c.adaptation_cycle_days} dias</p>
                          <div className="flex gap-2">
                            {c.refeed_supported && <Badge variant="outline" className="text-[10px]">✅ Refeed</Badge>}
                            {c.diet_break_supported && <Badge variant="outline" className="text-[10px]">✅ Diet Break</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Meal structure */}
                {details?.meal && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-semibold mb-2">🍲 Estrutura de Refeições</h4>
                      <div className="bg-muted/30 rounded-lg p-3 text-xs grid grid-cols-2 gap-2">
                        <p><span className="font-medium">Refeições/dia:</span> {details.meal.meals_per_day}</p>
                        <p><span className="font-medium">Macros:</span> {details.meal.macro_distribution_pattern}</p>
                        <p><span className="font-medium">Saciedade:</span> {details.meal.satiety_strategy}</p>
                        <p><span className="font-medium">IG:</span> {details.meal.glycemic_strategy}</p>
                        <p><span className="font-medium">Densidade:</span> {details.meal.meal_density_level}</p>
                        <p><span className="font-medium">Complexidade:</span> {details.meal.preparation_complexity}</p>
                      </div>
                    </div>
                  </>
                )}

                {/* Substitution groups */}
                {details?.substitutions && details.substitutions.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-semibold mb-2">🔄 Grupos de Substituição</h4>
                      <div className="space-y-1">
                        {details.substitutions.map((s: any) => (
                          <div key={s.id} className="flex items-center justify-between bg-muted/30 rounded p-2 text-xs">
                            <span className="font-medium">{s.substitution_group}</span>
                            <span className="text-muted-foreground">{s.objective}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Clusters & Contraindications */}
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-1">✅ Clusters Recomendados</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedProto.recommended_clusters.map((c) => (
                        <Badge key={c} className="text-[10px] bg-green-500/10 text-green-400">{c}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-1">⛔ Contraindicações</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedProto.contraindicated_conditions.length > 0
                        ? selectedProto.contraindicated_conditions.map((c) => (
                            <Badge key={c} className="text-[10px] bg-red-500/10 text-red-400">{c}</Badge>
                          ))
                        : <span className="text-xs text-muted-foreground">Nenhuma</span>
                      }
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
