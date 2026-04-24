import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Trash2,
  Utensils,
  Search,
  Flame,
  Beef,
  Wheat,
  Droplets,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Check,
  X,
  PlusCircle,
  History,
  Info,
} from "lucide-react";
import { useMealPlanEditorV2Store, type MealPlanItem } from "@/stores/mealPlanEditorV2Store";
import { toast } from "sonner";
import { FOOD_DATABASE } from "@/components/meals/FoodAutocomplete";
import { MEAL_TEMPLATES } from "./MealTemplatePanel";
import { fmtMacro } from "@/lib/formatMacros";

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
  const { items, updateItem, planId, addItem } = useMealPlanEditorV2Store();
  const item = items.find((i) => i.id === itemId);

  const [activeTab, setActiveTab] = useState<"isolated" | "ready">("isolated");
  const [search, setSearch] = useState("");
  const [description, setDescription] = useState(item?.description || "");
  const [notes, setNotes] = useState((item as any)?.notes || "");

  // Sync state when item changes or modal opens
  useEffect(() => {
    if (item && open) {
      setDescription(item.description || "");
      setNotes((item as any).notes || "");
    }
  }, [item, open]);

  if (!item) return null;

  const handleSave = () => {
    updateItem(itemId, {
      description,
      notes,
    } as any);
    toast.success("Refeição atualizada com sucesso");
    onOpenChange(false);
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
    calories: item.calories_target || 0,
    protein: Number(item.protein_target) || 0,
    carbs: Number(item.carbs_target) || 0,
    fat: Number(item.fat_target) || 0,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="px-6 py-4 bg-gradient-to-r from-primary/10 via-background to-background border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold font-display tracking-tight">
                Editar {item.title}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Ajuste os alimentos, substituições e observações clínicas
              </p>
            </div>
            <div className="flex items-center gap-4 bg-secondary/50 px-4 py-2 rounded-2xl border border-primary/10">
              <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Kcal</span>
                <span className="text-sm font-black text-orange-500">{totals.calories}</span>
              </div>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Prot</span>
                <span className="text-sm font-black text-red-500">{totals.protein}g</span>
              </div>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Carb</span>
                <span className="text-sm font-black text-amber-500">{totals.carbs}g</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Content Selection */}
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
              {activeTab === "isolated" ? (
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
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {MEAL_TEMPLATES.filter(t => 
                    t.mealTypes.includes(item.meal_type as any) &&
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

          {/* Right Panel: Composition & Notes */}
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
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[9px] text-muted-foreground bg-background/80 px-2 py-1 rounded-md border">Edição Livre Ativa</span>
                    </div>
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

                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex gap-3">
                  <Info className="w-5 h-5 text-primary shrink-0" />
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-primary uppercase tracking-wider">Dica Clínica</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Você pode adicionar múltiplas substituições clicando no botão "+ Substituição" após salvar esta base.
                    </p>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="p-6 border-t bg-muted/5 flex gap-3">
              <Button variant="outline" className="flex-1 h-12 rounded-2xl font-bold" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button className="flex-[2] h-12 rounded-2xl font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20" onClick={handleSave}>
                Salvar Alterações
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

import { cn } from "@/lib/utils";
