import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LayoutGrid, List, Utensils, BookOpen, Sparkles, Wand2, Eye } from "lucide-react";
import { WeeklyGrid } from "./WeeklyGrid";
import { ListView } from "./ListView";
import { MealLibraryModal } from "./MealLibraryModal";
import { AutoGenerateModal } from "./AutoGenerateModal";
import { AssistedPlanModal } from "./AssistedPlanModal";
import { MealVisualLibraryModal } from "./MealVisualLibraryModal";
import { MealLibrarySidebar } from "./MealLibrarySidebar";
import DietPreviewPanel from "./DietPreviewPanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
] as const;

export default function EditorCompactToolbar({ viewMode, onViewModeChange }: Props) {
  const [visualLibOpen, setVisualLibOpen] = useState(false);
  const [mealLibModalOpen, setMealLibModalOpen] = useState(false);
  const [autoGenOpen, setAutoGenOpen] = useState(false);
  const [assistedOpen, setAssistedOpen] = useState(false);
  const [librarySidebarOpen, setLibrarySidebarOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleToolClick = (key: string) => {
    switch (key) {
      case "visual-lib": setVisualLibOpen(true); break;
      case "meal-lib": setMealLibModalOpen(true); break;
      case "templates": setLibrarySidebarOpen(true); break;
      case "assisted": setAssistedOpen(true); break;
      case "auto-gen": setAutoGenOpen(true); break;
      case "preview": setPreviewOpen(true); break;
    }
  };

  return (
    <div className="space-y-3">
      {/* Compact toolbar */}
      <div className="flex items-center gap-1.5 flex-wrap bg-card border border-border rounded-xl p-1.5">
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
