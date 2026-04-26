
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Save,
  Undo2,
  ChevronRight,
  ClipboardCheck,
  FileDown
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Template {
  id: string;
  name: string;
  meals: any[];
}

interface ReformulationPreview {
  templateId: string;
  name: string;
  before: any;
  after: any;
  status: "pending" | "applied" | "error";
  changes: string[];
}

export default function TemplateMassReformulation() {
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [previews, setPreviews] = useState<ReformulationPreview[]>([]);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<"load" | "preview" | "done">("load");

  const loadTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("diet_templates")
      .select("id, name, meals");
    
    if (error) {
      toast.error("Erro ao carregar templates");
      setLoading(false);
      return;
    }

    const typedTemplates = (data || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      meals: Array.isArray(t.meals) ? t.meals : []
    })) as Template[];

    setTemplates(typedTemplates);
    generatePreviews(typedTemplates);
    setStep("preview");
    setLoading(false);
  };

  const generatePreviews = (data: Template[]) => {
    const newPreviews: ReformulationPreview[] = data.map(t => {
      const { reformulatedMeals, changes } = reformulateTemplate(t.meals);
      return {
        templateId: t.id,
        name: t.name,
        before: t.meals,
        after: reformulatedMeals,
        status: "pending",
        changes
      };
    });
    setPreviews(newPreviews);
  };

  const reformulateTemplate = (meals: any[]) => {
    const changes: string[] = [];
    const reformulatedMeals = (meals || []).map(meal => {
      let newMeal = { ...meal };
      const title = (meal.title || "").toLowerCase();
      const isSolidMeal = title.includes("almoço") || title.includes("jantar");

      // 1. Transform legacy to V2 blocks
      if (Array.isArray(meal.foods) && meal.foods.length > 0 && (!meal.blocks || meal.blocks.length === 0)) {
        changes.push(`Refeição ${meal.title}: Convertida de Lista para Blocos V2.`);
        newMeal.blocks = meal.foods.map((f: any) => ({
          type: "food",
          label: f.name,
          options: [
            {
              name: f.name,
              portion: f.portion,
              kcal: f.kcal || f.calories,
              protein: f.protein,
              carbs: f.carbs,
              fat: f.fat,
              substitutions: f.substitutions || []
            }
          ]
        }));
        delete newMeal.foods;
      }

      // 2. Remove Soup from solid meal substitutions
      if (isSolidMeal && newMeal.blocks) {
        newMeal.blocks = newMeal.blocks.map((block: any) => {
          if (block.options) {
            const originalCount = block.options.length;
            block.options = block.options.filter((opt: any) => {
              const name = (opt.name || "").toLowerCase();
              return !name.includes("sopa");
            });
            if (block.options.length < originalCount) {
              changes.push(`Refeição ${meal.title}: Removida 'Sopa' como substituição.`);
            }
          }
          return block;
        });
      }

      return newMeal;
    });

    return { reformulatedMeals, changes: Array.from(new Set(changes)) };
  };

  const applyReformulation = async () => {
    setProcessing(true);
    let successCount = 0;
    
    for (let i = 0; i < previews.length; i++) {
      const preview = previews[i];
      const { error } = await supabase
        .from("diet_templates")
        .update({ meals: preview.after })
        .eq("id", preview.templateId);

      if (!error) {
        successCount++;
        setPreviews(prev => {
          const next = [...prev];
          next[i].status = "applied";
          return next;
        });
      } else {
        setPreviews(prev => {
          const next = [...prev];
          next[i].status = "error";
          return next;
        });
      }
    }

    toast.success(`${successCount} templates reformulados com sucesso!`);
    setProcessing(false);
    setStep("done");
  };

  const exportChecklist = () => {
    const headers = ["Template", "Status", "Erros", "Alterações Sugeridas"];
    const rows = previews.map(p => [
      p.name,
      p.changes.length > 0 ? (p.changes.some(c => c.includes("Crítico")) ? "CRÍTICO" : "ALERTA") : "OK",
      p.changes.length,
      p.changes.join("; ")
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `checklist_reformulacao_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reformulação em Massa</h1>
            <p className="text-muted-foreground">
              Reformule seus templates seguindo as regras de plano prático, rápido e coerente.
            </p>
          </div>
          <div className="flex gap-2">
            {step === "preview" && (
              <Button variant="outline" onClick={exportChecklist}>
                <FileDown className="w-4 h-4 mr-2" />
                Exportar Checklist
              </Button>
            )}
            {step === "load" ? (
              <Button onClick={loadTemplates} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Carregar Templates
              </Button>
            ) : step === "preview" ? (
              <Button onClick={applyReformulation} disabled={processing}>
                {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Aplicar Reformulação
              </Button>
            ) : (
              <Button onClick={() => setStep("load")}>
                <Undo2 className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            )}
          </div>
        </div>

        {step === "preview" && (
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Prévia de Alterações</CardTitle>
                <CardDescription>
                  Revise o que será alterado antes de clicar em aplicar.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-4">
                    {previews.map((p, idx) => (
                      <div key={p.templateId} className="p-4 border rounded-lg space-y-3 bg-muted/30">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold">{p.name}</h3>
                          <Badge variant={p.changes.length > 0 ? "secondary" : "outline"}>
                            {p.changes.length > 0 ? `${p.changes.length} alterações` : "Sem alterações necessárias"}
                          </Badge>
                        </div>
                        <div className="text-sm space-y-1">
                          {p.changes.map((c, i) => (
                            <div key={i} className="flex items-center gap-2 text-amber-600">
                              <AlertTriangle className="w-3 h-3" />
                              <span>{c}</span>
                            </div>
                          ))}
                          {p.changes.length === 0 && (
                            <div className="flex items-center gap-2 text-emerald-600">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Template já está nos padrões coerentes.</span>
                            </div>
                          )}
                        </div>
                        {p.status === "applied" && (
                          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase">
                            <CheckCircle2 className="w-4 h-4" />
                            Aplicado com sucesso
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}

        {step === "load" && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 border-2 border-dashed rounded-xl">
            <ClipboardCheck className="w-12 h-12 text-muted-foreground" />
            <div className="text-center">
              <p className="text-lg font-medium">Pronto para auditar e reformular?</p>
              <p className="text-sm text-muted-foreground">Clique no botão acima para carregar todos os templates do sistema.</p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
