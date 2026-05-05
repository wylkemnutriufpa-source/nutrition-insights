import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LayoutGrid, List, Utensils, BookOpen, Sparkles, Wand2, Eye, FileDown, Share2 } from "lucide-react";
import { WeeklyGrid } from "./WeeklyGrid";
import { ListView } from "./ListView";
import { MealLibraryModal } from "./MealLibraryModal";
import { AutoGenerateModal } from "./AutoGenerateModal";
import { AssistedPlanModal } from "./AssistedPlanModal";
import { MealVisualLibraryModal } from "./MealVisualLibraryModal";
import { MealLibrarySidebar } from "./MealLibrarySidebar";
import DietPreviewPanel from "./DietPreviewPanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMealPlanEditorV2Store } from "@/stores/mealPlanEditorV2Store";
import { generatePremiumMealPlanPDF, type PremiumMealPlanPDFData } from "@/lib/pdfExportPremium";
import SharePlanDialog from "@/components/meal-plan/SharePlanDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ViewMode = "grid" | "list";

interface Props {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const TOOLS = [
  { key: "visual-lib", label: "Biblioteca Visual", icon: Utensils, color: "text-primary" },
  { key: "meal-lib", label: "Banco de Refeições", icon: BookOpen, color: "text-orange-500" },
  { key: "templates", label: "Meus Modelos", icon: BookOpen, color: "text-indigo-500" },
  { key: "assisted", label: "Plano Assistido", icon: Sparkles, color: "text-primary" },
  { key: "auto-gen", label: "Gerar Automático", icon: Wand2, color: "text-emerald-500" },
  { key: "preview", label: "Preview da Dieta", icon: Eye, color: "text-violet-500" },
  { key: "export-pdf", label: "Exportar PDF", icon: FileDown, color: "text-amber-500" },
  { key: "share", label: "Enviar ao Paciente", icon: Share2, color: "text-emerald-500" },
] as const;

export default function EditorCompactToolbar({ viewMode, onViewModeChange }: Props) {
  const [visualLibOpen, setVisualLibOpen] = useState(false);
  const [mealLibModalOpen, setMealLibModalOpen] = useState(false);
  const [autoGenOpen, setAutoGenOpen] = useState(false);
  const [assistedOpen, setAssistedOpen] = useState(false);
  const [librarySidebarOpen, setLibrarySidebarOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareData, setShareData] = useState<PremiumMealPlanPDFData | null>(null);

  const buildPdfData = async (): Promise<PremiumMealPlanPDFData | null> => {
    const store = useMealPlanEditorV2Store.getState();
    const { items, plan } = store;
    if (!items.length) {
      toast.error("Nenhum item para compartilhar");
      return null;
    }
    let patientName = "Paciente";
    let nutritionistName = "Profissional";
    let goal = "";
    if (plan?.patient_id) {
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", plan.patient_id).maybeSingle();
      if (profile?.full_name) patientName = profile.full_name;
    }
    if (plan?.nutritionist_id) {
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", plan.nutritionist_id).maybeSingle();
      if (profile?.full_name) nutritionistName = profile.full_name;
    }
    if (plan?.patient_id) {
      try {
        const { data: a } = await supabase.from("patient_anamnesis" as any).select("goal").eq("patient_id", plan.patient_id).limit(1).maybeSingle();
        if ((a as any)?.goal) goal = String((a as any).goal);
      } catch { /* ignore */ }
    }
    return {
      planTitle: plan?.title || "Plano Alimentar",
      patientName,
      nutritionistName,
      startDate: plan?.start_date ? new Date(plan.start_date).toLocaleDateString("pt-BR") : new Date().toLocaleDateString("pt-BR"),
      endDate: plan?.end_date ? new Date(plan.end_date).toLocaleDateString("pt-BR") : undefined,
      items: items.map(i => ({
        mealType: i.meal_type || "lunch",
        title: i.title || "Refeição",
        description: i.description || undefined,
        calories_target: i.calories_target || undefined,
        protein_target: i.protein_target || undefined,
        carbs_target: i.carbs_target || undefined,
        fat_target: i.fat_target || undefined,
        day_of_week: i.day_of_week ?? undefined,
        is_primary: (i as any).is_primary,
        substitution_group_id: (i as any).substitution_group_id,
      })),
      targetCalories: plan?.total_target_calories || undefined,
      targetProtein: plan?.total_target_protein || undefined,
      targetCarbs: plan?.total_target_carbs || undefined,
      targetFat: plan?.total_target_fat || undefined,
      goal,
      notes: plan?.description || undefined,
    };
  };

  const handleShare = async () => {
    const data = await buildPdfData();
    if (!data) return;
    setShareData(data);
    setShareOpen(true);
  };

  const handleExportPDF = async () => {
    const store = useMealPlanEditorV2Store.getState();
    const { items, plan } = store;
    if (!items.length) {
      toast.error("Nenhum item para exportar");
      return;
    }

    // Get patient and nutritionist names
    let patientName = "Paciente";
    let nutritionistName = "Profissional";
    let goal = "";

    if (plan?.patient_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", plan.patient_id)
        .maybeSingle();
      if (profile?.full_name) patientName = profile.full_name;
    }

    if (plan?.nutritionist_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", plan.nutritionist_id)
        .maybeSingle();
      if (profile?.full_name) nutritionistName = profile.full_name;
    }

    // Try to get goal from patient anamnesis
    if (plan?.patient_id) {
      try {
        const { data: anamnesisData } = await supabase
          .from("patient_anamnesis" as any)
          .select("goal")
          .eq("patient_id", plan.patient_id)
          .limit(1)
          .maybeSingle();
        if ((anamnesisData as any)?.goal) goal = String((anamnesisData as any).goal);
      } catch { /* ignore */ }
    }

    generatePremiumMealPlanPDF({
      planTitle: plan?.title || "Plano Alimentar",
      patientName,
      nutritionistName,
      startDate: plan?.start_date ? new Date(plan.start_date).toLocaleDateString("pt-BR") : new Date().toLocaleDateString("pt-BR"),
      endDate: plan?.end_date ? new Date(plan.end_date).toLocaleDateString("pt-BR") : undefined,
      items: items.map(i => ({
        mealType: i.meal_type || "lunch",
        title: i.title || "Refeição",
        description: i.description || undefined,
        calories_target: i.calories_target || undefined,
        protein_target: i.protein_target || undefined,
        carbs_target: i.carbs_target || undefined,
        fat_target: i.fat_target || undefined,
        day_of_week: i.day_of_week ?? undefined,
        is_primary: (i as any).is_primary,
        substitution_group_id: (i as any).substitution_group_id,
      })),
      targetCalories: plan?.total_target_calories || undefined,
      targetProtein: plan?.total_target_protein || undefined,
      targetCarbs: plan?.total_target_carbs || undefined,
      targetFat: plan?.total_target_fat || undefined,
      goal,
      notes: plan?.description || undefined,
    });

    toast.success("PDF gerado! Use Ctrl+P para salvar.");
  };

  const handleToolClick = (key: string) => {
    switch (key) {
      case "visual-lib": setVisualLibOpen(true); break;
      case "meal-lib": setMealLibModalOpen(true); break;
      case "templates": setLibrarySidebarOpen(true); break;
      case "assisted": setAssistedOpen(true); break;
      case "auto-gen": setAutoGenOpen(true); break;
      case "preview": setPreviewOpen(true); break;
      case "export-pdf": handleExportPDF(); break;
      case "share": handleShare(); break;
    }
  };

  const { substitutionCount, setSubstitutionCount } = useMealPlanEditorV2Store();

  return (
    <div className="space-y-3">
      {/* Compact toolbar */}
      <div className="flex items-center gap-1.5 flex-wrap bg-card border border-border rounded-xl p-1.5 shadow-sm">
        {/* View mode toggle */}
        <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5 mr-1">
          <button
            type="button"
            onClick={() => onViewModeChange("grid")}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              viewMode === "grid"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("list")}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              viewMode === "list"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Substitution count control */}
        <div className="flex items-center gap-2 px-2 py-1 rounded-lg border border-border/50 bg-primary/5 mr-1">
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Subst:</span>
          <div className="flex items-center gap-1">
            {[0, 1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setSubstitutionCount(n)}
                className={`w-5 h-5 rounded-md text-[10px] font-bold transition-all ${
                  substitutionCount === n
                    ? "bg-primary text-white shadow-sm scale-110"
                    : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Tool buttons */}
        <TooltipProvider delayDuration={200}>
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Tooltip key={tool.key}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 ${tool.color} hover:bg-muted`}
                    onClick={() => handleToolClick(tool.key)}
                  >
                    <Icon className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">{tool.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>

      {/* Editor content */}
      {viewMode === "grid" ? <WeeklyGrid /> : <ListView />}

      {/* Modals */}
      <MealVisualLibraryModal open={visualLibOpen} onOpenChange={setVisualLibOpen} />
      <MealLibraryModal open={mealLibModalOpen} onOpenChange={setMealLibModalOpen} targetDay={1} targetMealType="breakfast" />
      <AutoGenerateModal open={autoGenOpen} onOpenChange={setAutoGenOpen} />
      <AssistedPlanModal open={assistedOpen} onOpenChange={setAssistedOpen} />
      <MealLibrarySidebar open={librarySidebarOpen} onOpenChange={setLibrarySidebarOpen} targetDay={1} targetMealType="breakfast" />

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Preview da Dieta
            </DialogTitle>
          </DialogHeader>
          <DietPreviewPanel />
        </DialogContent>
      </Dialog>
    </div>
  );
}
