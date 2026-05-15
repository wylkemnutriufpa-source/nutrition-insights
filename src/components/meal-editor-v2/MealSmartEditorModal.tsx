import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Trash2,
  Search,
  Flame,
  Sparkles,
  PlusCircle,
  History,
  Info,
  AlertCircle,
  SlidersHorizontal,
  X,
  ClipboardCheck,
  AlertTriangle,
  ImageIcon,
  Camera
} from "lucide-react";
import { useMealPlanEditorV2Store } from "@/stores/mealPlanEditorV2Store";
import { toast } from "sonner";
import { FOOD_DATABASE } from "@/components/meals/FoodAutocomplete";
import { MEAL_TEMPLATES } from "./MealTemplatePanel";
import { cn } from "@/lib/utils";
import { normalizeSubstitutions, formatFinalDescription } from "./mealEditorHelpers";
import { MealPhotoUpload } from "./MealPhotoUpload";

interface MealSmartEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
}

export function MealSmartEditorModal({
  open,
  onOpenChange,
  itemId,
}: MealSmartEditorModalProps) {
  const { items, updateItem, substitutionCount, patientName } = useMealPlanEditorV2Store();
  const item = items.find((i) => i.id === itemId);
  const inputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"isolated" | "ready" | "draft">("isolated");
  const [search, setSearch] = useState("");
  const [description, setDescription] = useState(item?.description || "");
  const [notes, setNotes] = useState((item as any)?.notes || "");
  const [substitutions, setSubstitutions] = useState<string[]>([]);
  const [portionFactor, setPortionFactor] = useState(1.0);
  const [showConsistencyReport, setShowConsistencyReport] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Snapshot original values for dirty check
  const originalValues = useRef({
    description: item?.description || "",
    notes: (item as any)?.notes || "",
    portionFactor: 1.0,
    substitutions: [] as string[]
  });

  const currentMeta = React.useMemo(() => (item as any)?.edit_metadata || (item as any)?.metadata || {}, [item]);
  
  const kcalBase = currentMeta.kcal_base ?? item?.meta_calorias ?? 0;
  const protBase = currentMeta.protein_base ?? Number(item?.meta_proteinas) ?? 0;
  const carbBase = currentMeta.carbs_base ?? Number(item?.meta_carboidratos) ?? 0;
  const fatBase = currentMeta.fat_base ?? Number(item?.meta_gorduras) ?? 0;

  const adjustedMacros = React.useMemo(() => ({
    calories: Math.round(kcalBase * portionFactor),
    protein: Math.round(protBase * portionFactor * 10) / 10,
    carbs: Math.round(carbBase * portionFactor * 10) / 10,
    fat: Math.round(fatBase * portionFactor * 10) / 10,
  }), [kcalBase, protBase, carbBase, fatBase, portionFactor]);

  const isWannubia = patientName?.toLowerCase().includes("wannubia");

  const isBlockedForWannubia = useCallback((sub: string) => {
    if (!isWannubia) return false;
    const forbiddenKeywords = ["ultraprocessado", "fritura", "doce", "açúcar", "refrigerante"];
    return forbiddenKeywords.some(keyword => sub.toLowerCase().includes(keyword));
  }, [isWannubia]);

  const hasBlockedSubs = useMemo(() => {
    return substitutions.some(sub => isBlockedForWannubia(sub));
  }, [substitutions, isBlockedForWannubia]);

  const reconcileDescription = useCallback((text: string, newFactor: number, oldFactor: number) => {
    if (!text) return "";
    const scale = newFactor / oldFactor;
    return text.replace(/(\d+(?:[.,]\d+)?)\s*g/g, (match, grams) => {
      const g = parseFloat(grams.replace(',', '.'));
      if (isNaN(g)) return match;
      return `${Math.round(g * scale)}g`;
    });
  }, []);

  const handlePortionChange = (newVal: number) => {
    const factor = Math.max(0.1, Math.round(newVal * 10) / 10);
    const scale = factor / portionFactor;
    
    setDescription(prev => reconcileDescription(prev, factor, portionFactor));
    setSubstitutions(prev => prev.map(sub => reconcileDescription(sub, factor, portionFactor)));
    setPortionFactor(factor);
  };

  useEffect(() => {
    if (item && open) {
      const meta = (item as any).edit_metadata || (item as any).metadata || {};
      const currentPortion = meta.portion_factor || 1.0;
      
      setDescription(item.description || "");
      setNotes((item as any).notes || "");
      setPortionFactor(currentPortion);
      
      // Store original values for dirty check
      originalValues.current = {
        description: item.description || "",
        notes: (item as any).notes || "",
        portionFactor: currentPortion,
        substitutions: []
      };
      
      if (meta.is_fixed) {
        const missing = [];
        if (meta.kcal_base === undefined || meta.kcal_base === null) missing.push("kcal_base");
        if (meta.protein_base === undefined || meta.protein_base === null) missing.push("protein_base");
        if (meta.carbs_base === undefined || meta.carbs_base === null) missing.push("carbs_base");
        if (meta.fat_base === undefined || meta.fat_base === null) missing.push("fat_base");

        if (missing.length > 0) {
          toast.error("Dados Base Incompletos", {
            description: `Campos ausentes no edit_metadata: ${missing.join(", ")}. O ajuste de porção não funcionará corretamente.`,
            action: {
              label: "Corrigir Agora",
              onClick: () => inputRef.current?.focus()
            },
            duration: 8000
          });
        }
      }

      const hasValidJson = Array.isArray(meta.substitutions_json) && 
                          meta.substitutions_json.every((s: any) => typeof s === "string");
                          
      if (hasValidJson) {
        setSubstitutions(meta.substitutions_json);
        originalValues.current.substitutions = meta.substitutions_json;
      } else {
        const desc = item.description || "";
        const parts = desc.split(/\n\n🔄 Substituições:\n/);
        const subsPart = parts[1] || "";
        const subLines = subsPart.split("\n")
          .filter(l => l.trim().length > 0)
          .map(l => l.trim());
        const initialSubs = subLines.slice(0, substitutionCount);
        setSubstitutions(initialSubs);
        originalValues.current.substitutions = initialSubs;
      }
    }
  }, [item?.id, open, substitutionCount]);

  // Real-time synchronization with global draft (skip persistence)
  useEffect(() => {
    if (!item || !open) return;

    const dirty = description !== originalValues.current.description ||
                  notes !== originalValues.current.notes ||
                  portionFactor !== originalValues.current.portionFactor ||
                  JSON.stringify(substitutions) !== JSON.stringify(originalValues.current.substitutions);
    
    setIsDirty(dirty);

    // Sync to store immediately but skip persistence
    const cleanedSubs = normalizeSubstitutions(substitutions, substitutionCount);
    const finalDescription = formatFinalDescription(description, cleanedSubs);

    updateItem(itemId, {
      description: finalDescription,
      meta_calorias: adjustedMacros.calories,
      meta_proteinas: adjustedMacros.protein,
      meta_carboidratos: adjustedMacros.carbs,
      meta_gorduras: adjustedMacros.fat,
      edit_metadata: {
        ...currentMeta,
        notes,
        substitutions_json: cleanedSubs,
        portion_factor: portionFactor,
      }
    } as any, true); // true = skipPersist

  }, [description, notes, substitutions, portionFactor, open, itemId]);

  if (!item) return null;

  const handleSave = async () => {
    if (hasBlockedSubs) {
      toast.error("Combinação proibida detectada", {
        description: "Esta paciente possui restrições severas. Remova itens como ultraprocessados ou frituras das substituições."
      });
      return;
    }

    if (currentMeta?.is_fixed) {
      const missing = [];
      if (currentMeta.kcal_base === undefined || currentMeta.kcal_base === null) missing.push("kcal_base");
      if (currentMeta.protein_base === undefined || currentMeta.protein_base === null) missing.push("protein_base");
      if (currentMeta.carbs_base === undefined || currentMeta.carbs_base === null) missing.push("carbs_base");
      if (currentMeta.fat_base === undefined || currentMeta.fat_base === null) missing.push("fat_base");

      if (missing.length > 0) {
        toast.error("Salvamento Bloqueado", {
          description: `Esta marmita fixa está com dados base incompletos (${missing.join(", ")}). Preencha os campos antes de salvar.`,
          action: {
            label: "Corrigir Agora",
            onClick: () => inputRef.current?.focus()
          }
        });
        return;
      }
    }

    if (adjustedMacros.calories < 0) {
      toast.error("Erro: Calorias não podem ser negativas.");
      return;
    }

    const cleanedSubs = Array.from(new Set(
      substitutions
        .map(s => String(s).trim().replace(/\s+/g, ' '))
        .filter(s => s.length > 0)
    )).slice(0, substitutionCount);
    const finalDescription = formatFinalDescription(description, cleanedSubs);
    
    try {
      const toastId = "meal-save-toast";
      // Final persist call (no skipPersist)
      updateItem(itemId, {
        description: finalDescription,
        meta_calorias: adjustedMacros.calories,
        meta_proteinas: adjustedMacros.protein,
        meta_carboidratos: adjustedMacros.carbs,
        meta_gorduras: adjustedMacros.fat,
        edit_metadata: {
          ...currentMeta,
          notes,
          substitutions_json: cleanedSubs,
          portion_factor: portionFactor,
          kcal_base: kcalBase,
          protein_base: protBase,
          carbs_base: carbBase,
          fat_base: fatBase
        }
      } as any);
      toast.success("Refeição persistida com sucesso", { id: toastId });
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao salvar alterações. Tente novamente.", { id: "meal-save-toast" });
    }
  };

  const handleAddIsolated = (food: any) => {
    const currentLines = description ? description.split("\n") : [];
    const newLine = `• ${food.name} — ${food.portion}`;
    const newDesc = [...currentLines, newLine].join("\n");
    setDescription(newDesc);
    toast.success(`${food.name} adicionado`);
  };

  const handleAddTemplate = (template: any) => {
    const templateDesc = template.foods.map((f: any) => `• ${f.name} — ${f.portion}`).join("\n");
    const currentLines = description ? description.split("\n") : [];
    const newDesc = [...currentLines, templateDesc].join("\n");
    setDescription(newDesc);
    toast.success(`Template ${template.title} aplicado`);
  };

  const totals = {
    calories: adjustedMacros.calories,
    protein: adjustedMacros.protein,
    carbs: adjustedMacros.carbs,
    fat: adjustedMacros.fat,
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen === open) return;

    if (!newOpen) {
      setDescription(item?.description || "");
      setNotes((item as any)?.notes || "");
      
      const meta = (item as any).edit_metadata || (item as any).metadata || {};
      const hasValidJson = Array.isArray(meta.substitutions_json) && 
                          meta.substitutions_json.every((s: any) => typeof s === "string");
      
      if (hasValidJson) {
        setSubstitutions(meta.substitutions_json);
      } else {
        const desc = item?.description || "";
        const parts = desc.split(/\n\n🔄 Substituições:\n/);
        const subsPart = parts[1] || "";
        const subLines = subsPart.split("\n")
          .filter(l => l.trim().length > 0)
          .map(l => l.trim());
        setSubstitutions(subLines.slice(0, substitutionCount));
      }
      setPortionFactor(meta.portion_factor || 1.0);
      setActiveTab("isolated");
      setSearch("");
    }
    onOpenChange(newOpen);
  };

  const getNormalizedSubs = () => {
    return normalizeSubstitutions(substitutions);
  };

  const isOverLimit = Array.from(new Set(
    substitutions
      .map(s => String(s).trim().replace(/\s+/g, ' '))
      .filter(s => s.length > 0)
  )).length > substitutionCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden border-none shadow-2xl"
      >
        <DialogHeader className="px-4 py-3 sm:px-6 sm:py-6 pr-12 sm:pr-14 bg-gradient-to-br from-primary/20 via-background to-background border-b relative">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div className="flex items-start gap-6 flex-1 min-w-0">
              {item.image_url ? (
                <div className="relative w-32 h-32 rounded-2xl overflow-hidden shrink-0 group/img border-2 border-primary/20 shadow-xl">
                  <img src={item.image_url} alt={item.title} className="w-full h-full object-cover transition-transform group-hover/img:scale-110 duration-500" />
                  <button 
                    onClick={() => updateItem(itemId, { image_url: null } as any)}
                    className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                    title="Remover Imagem"
                  >
                    <Trash2 className="w-6 h-6 text-white" />
                  </button>
                </div>
              ) : (
                <div className="w-32 h-32 rounded-2xl bg-secondary/50 flex flex-col items-center justify-center shrink-0 border-2 border-dashed border-primary/30 group hover:border-primary/60 transition-colors">
                  <MealPhotoUpload 
                    onUploaded={(url) => updateItem(itemId, { image_url: url } as any)} 
                    onRemoved={() => {}}
                  />
                  {!item.image_url && <span className="text-[10px] font-bold text-muted-foreground mt-2 uppercase tracking-tighter">Adicionar Foto</span>}
                </div>
              )}
              <div className="min-w-0 flex-1 pt-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-black uppercase text-[10px] tracking-widest px-3 py-1">
                    {item.tipo_refeicao}
                  </Badge>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">Sovereign Editor V3</span>
                </div>
                <DialogTitle className="text-2xl sm:text-3xl font-black font-display tracking-tight leading-none mb-2">
                  {item.title}
                </DialogTitle>
                <div className="flex items-center gap-4">
                  <p className="text-xs text-muted-foreground font-medium max-w-md">
                    Gestão clínica avançada: ajuste alimentos, proporções e equivalentes com precisão cirúrgica.
                  </p>
                </div>
              </div>
            </div>
            <div 
              data-testid="modal-macro-summary"
              className="flex items-center gap-4 sm:gap-6 bg-white/50 backdrop-blur-xl px-6 py-4 rounded-3xl border-2 border-primary/10 shrink-0 shadow-2xl shadow-primary/5 self-end sm:self-start"
            >
              <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1">Kcal</span>
                <span className="text-2xl font-black text-orange-500 tabular-nums">{totals.calories}</span>
              </div>
              <div className="h-10 w-px bg-border/50" />
              <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1">Prot</span>
                <span className="text-2xl font-black text-red-500 tabular-nums">{totals.protein}<span className="text-xs ml-0.5 opacity-50">g</span></span>
              </div>
              <div className="h-10 w-px bg-border/50" />
              <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1">Carb</span>
                <span className="text-2xl font-black text-amber-500 tabular-nums">{totals.carbs}<span className="text-xs ml-0.5 opacity-50">g</span></span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-1/2 border-r flex flex-col bg-muted/5">
            <div className="p-4 border-b bg-background">
              <div className="flex p-1 bg-secondary rounded-xl gap-1">
                <Button
                  variant={activeTab === "isolated" ? "default" : "ghost"}
                  className="flex-1 h-9 rounded-lg text-xs font-bold gap-2"
                  onClick={() => setActiveTab("isolated")}
                >
                  <PlusCircle className="w-4 h-4" /> Alimento
                </Button>
                <Button
                  variant={activeTab === "ready" ? "default" : "ghost"}
                  className="flex-1 h-9 rounded-lg text-xs font-bold gap-2"
                  onClick={() => setActiveTab("ready")}
                >
                  <Sparkles className="w-4 h-4" /> Refeição Pronta
                </Button>
              </div>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar na base FitJourney..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-10 bg-secondary/30 border-none focus-visible:ring-1 ring-primary/20 rounded-xl text-sm"
                />
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              {activeTab === "isolated" && !patientName?.toLowerCase().includes("wannubia") ? (
                <div className="grid grid-cols-1 gap-2">
                  {FOOD_DATABASE.filter(f => 
                    f.name.toLowerCase().includes(search.toLowerCase())
                  ).slice(0, 20).map((food, i) => (
                    <button
                      key={i}
                      onClick={() => handleAddIsolated(food)}
                      className="flex items-center justify-between p-3 rounded-xl border bg-background hover:border-primary/50 hover:shadow-sm transition-all group"
                    >
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-bold group-hover:text-primary transition-colors">{food.name}</span>
                        <span className="text-[10px] text-muted-foreground">{food.portion}</span>
                      </div>
                      <div className="flex items-center gap-3">
                         <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                           <Flame className="w-3 h-3 text-orange-400" /> {food.calories}
                         </div>
                         <Plus className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))}
                  {FOOD_DATABASE.filter(f => 
                    f.name.toLowerCase().includes(search.toLowerCase())
                  ).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-xs">
                      Nenhum alimento encontrado na base.
                    </div>
                  )}
                </div>
              ) : activeTab === "isolated" && patientName?.toLowerCase().includes("wannubia") ? (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 px-4">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-amber-600" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground">Apenas Marmitas Permitidas</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Para esta paciente, utilize a aba <strong>Refeição Pronta</strong> para garantir a compatibilidade com o cardápio de marmitas.
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="rounded-xl h-8 text-[10px] border-amber-200 text-amber-700 hover:bg-amber-50"
                    onClick={() => setActiveTab("ready")}
                  >
                    Ir para Refeições Prontas
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {MEAL_TEMPLATES.filter(t => 
                    t.mealTypes.includes(item.tipo_refeicao as any) &&
                    t.title.toLowerCase().includes(search.toLowerCase())
                  ).map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleAddTemplate(template)}
                      className="flex flex-col p-4 rounded-2xl border bg-background hover:border-primary/50 hover:shadow-md transition-all group text-left"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{template.emoji}</span>
                          <span className="text-sm font-black group-hover:text-primary transition-colors">{template.title}</span>
                        </div>
                        <Plus className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-2 mb-2">{template.description}</p>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="text-[9px] bg-primary/5 text-primary border-primary/10">
                          {template.totalCalories} kcal
                        </Badge>
                        <Badge variant="secondary" className="text-[9px] bg-red-50 text-red-600 border-red-100">
                          {template.totalProtein}g P
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="w-1/2 flex flex-col bg-background">
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Composição da Refeição</h3>
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 text-destructive" onClick={() => setDescription("")}>
                      <Trash2 className="w-3 h-3" /> Limpar Tudo
                    </Button>
                  </div>
                  <div className="rounded-2xl border bg-secondary/10 p-4 min-h-[150px] relative group">
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Os alimentos selecionados aparecerão aqui..."
                      className="min-h-[150px] bg-transparent border-none focus-visible:ring-0 text-sm font-medium leading-relaxed p-0 resize-none"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <History className="w-4 h-4" /> Observações Clínicas
                  </h3>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Não usar açúcar, preferir integral, orientações específicas..."
                    className="min-h-[100px] bg-secondary/20 border-none focus-visible:ring-1 ring-primary/20 rounded-2xl text-sm p-4"
                  />
                </div>

                <div className="space-y-4 p-5 rounded-3xl border-2 bg-primary/5 border-primary/10 shadow-inner">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4" /> Ajuste de Porção Proporcional
                    </h3>
                    <div className="flex items-center gap-3 px-4 py-1.5 bg-white rounded-full border border-primary/20 shadow-sm">
                      <span className="text-[11px] font-black text-orange-600">{adjustedMacros.calories} <span className="opacity-50 font-bold uppercase text-[9px]">kcal</span></span>
                      <Separator orientation="vertical" className="h-3 mx-1" />
                      <span className="text-[11px] font-black text-red-600">{adjustedMacros.protein}g <span className="opacity-50 font-bold uppercase text-[9px]">Prot</span></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="w-1/3 space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Volume da Refeição</Label>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          step="0.1"
                          min="0.1"
                          className="h-12 bg-white border-2 border-primary/10 rounded-2xl text-center font-black text-lg focus-visible:ring-primary/20"
                          value={portionFactor}
                          onChange={(e) => handlePortionChange(parseFloat(e.target.value) || 1.0)}
                        />
                        <span className="text-xl font-black text-muted-foreground opacity-30">×</span>
                      </div>
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-3 pt-6">
                      <Button 
                        variant="outline" 
                        size="lg" 
                        className="h-12 rounded-2xl border-2 font-black text-xs uppercase tracking-widest hover:bg-destructive/5 hover:text-destructive hover:border-destructive/20 transition-all active:scale-95"
                        onClick={() => handlePortionChange(portionFactor - 0.1)}
                      >
                        - 10% Menor
                      </Button>
                      <Button 
                        variant="outline" 
                        size="lg" 
                        className="h-12 rounded-2xl border-2 font-black text-xs uppercase tracking-widest hover:bg-emerald-500/5 hover:text-emerald-600 hover:border-emerald-500/20 transition-all active:scale-95"
                        onClick={() => handlePortionChange(portionFactor + 0.1)}
                      >
                        + 10% Maior
                      </Button>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 font-medium italic bg-white/40 p-2 rounded-xl border border-primary/5 text-center">
                    Utilize os controles para escalar gramagens e macros simultaneamente sem perder a proporção nutricional.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      🔄 Substituições ({substitutions.length}/{substitutionCount})
                    </h3>
                    {substitutions.length < substitutionCount && !isOverLimit && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-[10px] gap-1 text-primary" 
                        onClick={() => setSubstitutions([...substitutions, "• Nova substituição"])}
                      >
                        <Plus className="w-3 h-3" /> Adicionar
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {substitutions.map((sub, idx) => {
                      const isBlocked = isBlockedForWannubia(sub);
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex gap-2 group/sub">
                            <Input
                              value={sub}
                              ref={idx === 0 ? inputRef : null}
                              onChange={(e) => {
                                const val = String(e.target.value).replace(/\s+/g, ' ');
                                const next = [...substitutions];
                                next[idx] = val;
                                setSubstitutions(next);
                              }}
                              className={cn(
                                "h-9 bg-secondary/10 border-none focus-visible:ring-1 ring-primary/20 rounded-xl text-xs transition-all",
                                isBlocked && "bg-destructive/10 ring-destructive/50 text-destructive border-destructive/30"
                              )}
                              placeholder="Ex: • Pão integral → Tapioca (40g)"
                            />
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 rounded-xl opacity-0 group-hover/sub:opacity-100 transition-opacity text-destructive hover:bg-destructive/10"
                              onClick={() => setSubstitutions(substitutions.filter((_, i) => i !== idx))}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          {isBlocked && (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-destructive/5 text-[9px] text-destructive font-bold rounded-lg animate-in fade-in slide-in-from-top-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Combinação inválida para Wannubia. Remova itens proibidos.</span>
                              <Button 
                                variant="link" 
                                className="h-auto p-0 text-[9px] ml-auto text-destructive underline"
                                onClick={() => inputRef.current?.focus()}
                              >
                                Corrigir agora
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {substitutions.length === 0 && (
                      <p className="text-[10px] text-muted-foreground italic bg-secondary/5 p-3 rounded-xl border border-dashed text-center">
                        Nenhuma substituição adicionada.
                      </p>
                    )}
                  </div>
                </div>

                <div className={cn(
                  "p-4 rounded-2xl border space-y-3 transition-colors",
                  isOverLimit ? "bg-destructive/5 border-destructive/20" : "bg-primary/5 border-primary/10"
                )}>
                  <div className="flex gap-3">
                    {isOverLimit ? (
                      <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
                    ) : (
                      <Info className="w-5 h-5 text-primary shrink-0" />
                    )}
                    <div className="space-y-1">
                      <p className={cn(
                        "text-[11px] font-bold uppercase tracking-wider",
                        isOverLimit ? "text-destructive" : "text-primary"
                      )}>
                        {isOverLimit ? "Limite Excedido" : "Prévia do Plano"}
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        {isOverLimit 
                          ? `Você atingiu o limite de ${substitutionCount} substituições únicas. Apenas as ${substitutionCount} primeiras serão salvas.`
                          : "Veja como as substituições serão organizadas e formatadas após salvar:"}
                      </p>
                    </div>
                  </div>
                  
                  {getNormalizedSubs().length > 0 && (
                    <div className="space-y-3">
                      <div className="bg-background/50 rounded-xl p-3 border border-primary/5 font-mono text-[9px] text-primary/80 overflow-hidden">
                        <p className="font-bold mb-1 opacity-50 uppercase tracking-tighter">Visualização da Descrição:</p>
                        <div className="whitespace-pre-wrap">
                          {"🔄 Substituições:\n" + getNormalizedSubs().join("\n")}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>

            <div className="p-6 border-t bg-muted/5 flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 h-12 rounded-2xl font-bold" 
                onClick={() => handleOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button 
                className={cn(
                  "flex-[2] h-12 rounded-2xl font-bold transition-all shadow-lg",
                  isDirty 
                    ? "bg-primary hover:bg-primary/90 shadow-primary/20" 
                    : "bg-muted text-muted-foreground shadow-none cursor-not-allowed opacity-70"
                )}
                onClick={handleSave}
                disabled={!isDirty && !hasBlockedSubs}
              >
                {isDirty ? "Confirmar e Salvar" : "Sem Alterações"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const Separator = ({ orientation = "horizontal", className }: { orientation?: "horizontal" | "vertical", className?: string }) => (
  <div className={cn(
    "bg-border",
    orientation === "horizontal" ? "h-[1px] w-full" : "w-[1px] h-full",
    className
  )} />
);

const Badge = ({ children, variant = "default", className }: { children: React.ReactNode, variant?: "default" | "secondary" | "outline", className?: string }) => (
  <span className={cn(
    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors",
    variant === "default" && "bg-primary text-primary-foreground",
    variant === "secondary" && "bg-secondary text-secondary-foreground",
    variant === "outline" && "border text-foreground",
    className
  )}>
    {children}
  </span>
);
