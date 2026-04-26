
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
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
  FileDown,
  Filter,
  Search,
  CheckSquare,
  Square
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

interface Template {
  id: string;
  name: string;
  meals: any[];
  base_calories?: number;
}

interface ReformulationPreview {
  templateId: string;
  name: string;
  before: any;
  after: any;
  status: "pending" | "applied" | "error" | "processing";
  changes: string[];
  level: "critical" | "warning" | "ok";
  selected: boolean;
}

export default function TemplateMassReformulation() {
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [previews, setPreviews] = useState<ReformulationPreview[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState<"load" | "preview" | "done">("load");
  const [filter, setFilter] = useState<"all" | "critical" | "warning" | "ok">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("diet_templates")
      .select("id, name, meals, base_calories");
    
    if (error) {
      toast.error("Erro ao carregar templates");
      setLoading(false);
      return;
    }

    const typedTemplates = (data || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      meals: Array.isArray(t.meals) ? t.meals : [],
      base_calories: t.base_calories
    })) as Template[];

    setTemplates(typedTemplates);
    generatePreviews(typedTemplates);
    setStep("preview");
    setLoading(false);
  };

  const generatePreviews = (data: Template[]) => {
    const newPreviews: ReformulationPreview[] = data.map(t => {
      const { reformulatedMeals, changes } = reformulateTemplate(t.meals);
      
      let level: "critical" | "warning" | "ok" = "ok";
      if (changes.some(c => c.includes("NaN") || c.includes("inválido") || c.includes("ausente"))) level = "critical";
      else if (changes.length > 0) level = "warning";

      return {
        templateId: t.id,
        name: t.name,
        before: t.meals,
        after: reformulatedMeals,
        status: "pending",
        changes,
        level,
        selected: level !== "ok"
      };
    });
    setPreviews(newPreviews);
  };

  const deepRemoveKey = (obj: any, keyToRemove: string) => {
    if (Array.isArray(obj)) {
      obj.forEach(item => deepRemoveKey(item, keyToRemove));
    } else if (obj && typeof obj === 'object') {
      delete obj[keyToRemove];
      Object.values(obj).forEach(value => deepRemoveKey(value, keyToRemove));
    }
  };

  const reformulateTemplate = (meals: any[]) => {
    const changes: string[] = [];
    const reformulatedMeals = (meals || []).map(meal => {
      let newMeal = JSON.parse(JSON.stringify(meal)); // deep clone
      
      // Safety: Recursively remove any template_id or other poisoning keys
      deepRemoveKey(newMeal, "template_id");
      delete newMeal.id; 

      let newMeal = JSON.parse(JSON.stringify(meal)); // deep clone
      
      // Safety: Remove any recursive template_id or IDs that shouldn't be here
      delete newMeal.template_id;
      delete newMeal.id; 
      
      const title = (meal.title || "").toLowerCase();
      const isSolidMeal = title.includes("almoço") || title.includes("jantar") || title.includes("lunch") || title.includes("dinner");

      // 1. Transform legacy to V2 blocks
      if (Array.isArray(newMeal.foods) && newMeal.foods.length > 0 && (!newMeal.blocks || newMeal.blocks.length === 0)) {
        changes.push(`Refeição ${meal.title}: Convertida de Lista para Blocos V2.`);
        newMeal.blocks = newMeal.foods.map((f: any) => {
          const name = (f.name || "").toLowerCase();
          let blockLabel = f.name;
          
          if (name.includes("frango") || name.includes("carne") || name.includes("peixe") || name.includes("ovo") || name.includes("whey")) {
            blockLabel = "Proteína Principal";
          } else if (name.includes("arroz") || name.includes("batata") || name.includes("mandioca") || name.includes("macarrão")) {
            blockLabel = "Acompanhamento (Carbo)";
          } else if (name.includes("salada") || name.includes("legumes") || name.includes("alface")) {
            blockLabel = "Vegetais/Salada";
          }

          return {
            type: "food",
            label: blockLabel,
            options: [
              {
                name: f.name,
                portion: f.portion,
                kcal: f.kcal || f.calories || 0,
                protein: f.protein || 0,
                carbs: f.carbs || 0,
                fat: f.fat || 0,
                substitutions: f.substitutions || []
              }
            ]
          };
        });
        delete newMeal.foods;
      }

      // 2. Coherent Substitutions & Cleanup
      if (newMeal.blocks) {
        newMeal.blocks = newMeal.blocks.map((block: any) => {
          const blockType = (block.label || "").toLowerCase();
          const isProteinBlock = blockType.includes("proteína") || blockType.includes("protein");
          const isCarbBlock = blockType.includes("carb") || blockType.includes("acompanhamento");

          if (block.options) {
            const originalCount = block.options.length;
            
            // Filter out soup from solid meals
            block.options = block.options.filter((opt: any) => {
              const name = (opt.name || "").toLowerCase();
              if (isSolidMeal && name.includes("sopa")) return false;
              return true;
            });

            if (block.options.length < originalCount) {
              changes.push(`Refeição ${meal.title}: Removida 'Sopa' de refeição sólida.`);
            }

            // Equivalent Substitution Check & Cleanup
            block.options = block.options.map((opt: any) => {
              const cleaned = { ...opt };
              delete cleaned.template_id;
              
              const optName = (cleaned.name || "").toLowerCase();
              
              // Verify if option matches block category (Equivalent Substitutions)
              if (isProteinBlock && !optName.includes("frango") && !optName.includes("carne") && !optName.includes("ovo") && !optName.includes("peixe") && !optName.includes("whey") && !optName.includes("tofu")) {
                 changes.push(`Atenção [${meal.title}]: Bloco de Proteína contém '${cleaned.name}', verifique equivalência.`);
              }
              
              if (isCarbBlock && (optName.includes("pão") || optName.includes("tapioca")) && isSolidMeal) {
                 changes.push(`Refeição ${meal.title}: Substituição de Almoço contém item de Café da Manhã (${cleaned.name}).`);
              }

              // Ensure images are preserved or defaulted
              if (!cleaned.visual_library_item_id && !cleaned.image_url) {
                if (optName.includes("marmita")) {
                   changes.push(`Refeição ${meal.title}: Marmita detectada sem ID visual.`);
                }
              }
              
              return cleaned;
            });
          }
          return block;
        });
      }

      return newMeal;
    });

    return { reformulatedMeals, changes: Array.from(new Set(changes)) };
  };

  const applyReformulation = async () => {
    const selectedPreviews = previews.filter(p => p.selected && p.status === "pending");
    if (selectedPreviews.length === 0) {
      toast.info("Selecione ao menos um template pendente para aplicar.");
      return;
    }

    setProcessing(true);
    setProgress(0);
    let successCount = 0;
    const CONCURRENCY_LIMIT = 5;
    const total = selectedPreviews.length;
    
    // Batch processing with concurrency limit
    const processBatch = async (batch: ReformulationPreview[]) => {
      await Promise.all(batch.map(async (preview) => {
        setPreviews(prev => prev.map(p => p.templateId === preview.templateId ? { ...p, status: "processing" } : p));
        
        const { error } = await supabase
          .from("diet_templates")
          .update({ meals: preview.after })
          .eq("id", preview.templateId);

        if (!error) {
          successCount++;
          setPreviews(prev => prev.map(p => p.templateId === preview.templateId ? { ...p, status: "applied" } : p));
        } else {
          console.error(`Error updating template ${preview.templateId}:`, error);
          setPreviews(prev => prev.map(p => p.templateId === preview.templateId ? { ...p, status: "error" } : p));
        }
        
        setProgress(prev => prev + (100 / total));
      }));
    };

    for (let i = 0; i < selectedPreviews.length; i += CONCURRENCY_LIMIT) {
      const batch = selectedPreviews.slice(i, i + CONCURRENCY_LIMIT);
      await processBatch(batch);
    }

    setProgress(100);
    toast.success(`${successCount} templates reformulados com sucesso!`);
    setProcessing(false);
    setStep("done");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(18);
    doc.text("Relatório de Reformulação de Templates", pageWidth / 2, y, { align: "center" });
    y += 10;
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, pageWidth / 2, y, { align: "center" });
    y += 15;

    const selectedForExport = previews.filter(p => p.changes.length > 0);

    selectedForExport.forEach((p, index) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(`${index + 1}. ${p.name}`, 15, y);
      y += 7;

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Status: ${p.level.toUpperCase()}`, 15, y);
      y += 7;

      doc.setTextColor(200, 0, 0);
      doc.text("Regras Quebradas / Alterações:", 15, y);
      y += 5;
      
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);
      p.changes.forEach(change => {
        const lines = doc.splitTextToSize(`• ${change}`, pageWidth - 30);
        doc.text(lines, 20, y);
        y += (lines.length * 5);
      });
      
      y += 5;
      doc.setDrawColor(200, 200, 200);
      doc.line(15, y, pageWidth - 15, y);
      y += 10;
    });

    doc.save(`relatorio_reformulacao_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportChecklist = () => {
    const headers = ["Template", "Status", "Erros", "Alterações Sugeridas"];
    const rows = previews.map(p => [
      p.name,
      p.level.toUpperCase(),
      p.changes.length,
      p.changes.join("; ")
    ]);

    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `checklist_reformulacao_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const filteredPreviews = useMemo(() => {
    return previews.filter(p => {
      const matchesFilter = filter === "all" || p.level === filter;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [previews, filter, searchQuery]);

  const toggleSelectAll = () => {
    const allSelected = filteredPreviews.every(p => p.selected);
    setPreviews(prev => prev.map(p => {
      if (filteredPreviews.some(fp => fp.templateId === p.templateId)) {
        return { ...p, selected: !allSelected };
      }
      return p;
    }));
  };

  const toggleSelect = (id: string) => {
    setPreviews(prev => prev.map(p => p.templateId === id ? { ...p, selected: !p.selected } : p));
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
              <>
                <Button variant="outline" onClick={exportChecklist}>
                  <FileDown className="w-4 h-4 mr-2" />
                  CSV
                </Button>
                <Button variant="outline" onClick={exportPDF}>
                  <FileDown className="w-4 h-4 mr-2" />
                  PDF
                </Button>
              </>
            )}
            {step === "load" ? (
              <Button onClick={loadTemplates} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Carregar Templates
              </Button>
            ) : step === "preview" ? (
              <Button onClick={applyReformulation} disabled={processing}>
                {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Aplicar Reformulação ({previews.filter(p => p.selected && p.status === "pending").length})
              </Button>
            ) : (
              <Button onClick={() => setStep("load")}>
                <Undo2 className="w-4 h-4 mr-2" />
                Reiniciar
              </Button>
            )}
          </div>
        </div>

        {processing && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Processando templates...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </CardContent>
          </Card>
        )}

        {step === "preview" && (
          <div className="grid gap-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Lista de Templates</CardTitle>
                    <CardDescription>
                      {filteredPreviews.length} templates encontrados com os filtros atuais.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative w-64">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar template..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="flex border rounded-md p-1 bg-muted/50">
                      {(["all", "critical", "warning", "ok"] as const).map((f) => (
                        <Button
                          key={f}
                          variant={filter === f ? "secondary" : "ghost"}
                          size="sm"
                          className="px-3 h-8 text-xs capitalize"
                          onClick={() => setFilter(f)}
                        >
                          {f === "all" ? "Todos" : f}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-4 p-2 bg-muted/30 rounded-lg">
                  <Button variant="ghost" size="sm" onClick={toggleSelectAll} className="h-8">
                    {filteredPreviews.every(p => p.selected) ? <CheckSquare className="w-4 h-4 mr-2" /> : <Square className="w-4 h-4 mr-2" />}
                    Selecionar Todos Filtrados
                  </Button>
                  <Separator orientation="vertical" className="h-4" />
                  <span className="text-xs text-muted-foreground">
                    {previews.filter(p => p.selected).length} selecionados no total
                  </span>
                </div>

                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-4">
                    {filteredPreviews.map((p) => (
                      <div 
                        key={p.templateId} 
                        className={cn(
                          "p-4 border rounded-lg space-y-3 transition-colors",
                          p.selected ? "bg-primary/5 border-primary/20" : "bg-muted/10",
                          p.status === "applied" && "border-emerald-500/50 bg-emerald-500/5"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <button onClick={() => toggleSelect(p.templateId)}>
                              {p.selected ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5 text-muted-foreground" />}
                            </button>
                            <div>
                              <h3 className="font-bold">{p.name}</h3>
                              <div className="flex gap-2 mt-1">
                                <Badge variant={p.level === "critical" ? "destructive" : p.level === "warning" ? "secondary" : "outline"}>
                                  {p.level.toUpperCase()}
                                </Badge>
                                {p.status === "applied" && (
                                  <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                                    Aplicado
                                  </Badge>
                                )}
                                {p.status === "processing" && (
                                  <Badge variant="outline" className="animate-pulse">
                                    Processando...
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <Badge variant="secondary">
                            {p.changes.length} alterações
                          </Badge>
                        </div>
                        <div className="text-sm space-y-1 pl-8">
                          {p.changes.map((c, i) => (
                            <div key={i} className="flex items-center gap-2 text-amber-600">
                              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
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
