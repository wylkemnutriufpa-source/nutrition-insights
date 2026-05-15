import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LayoutGrid, List, BookOpen, Sparkles, Wand2, Utensils, Eye, MousePointerClick, ArrowLeftRight } from "lucide-react";
import { WeeklyGrid } from "./WeeklyGrid";
import { ListView } from "./ListView";
import { MealLibraryModal } from "./MealLibraryModal";
import { AutoGenerateModal, AssistedPlanModal } from './FakeModals';
import { MealVisualLibraryModal } from "./MealVisualLibraryModal";
import { MealLibrarySidebar } from "./MealLibrarySidebar";
import DietPreviewPanel from "./DietPreviewPanel";
import MealClickToAddPanel from "./MealClickToAddPanel";
import MealTemplatePanel from "./MealTemplatePanel";
import MealSubstitutionPanel from "./MealSubstitutionPanel";

type ViewMode = "grid" | "list";

interface Props {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const SINGLE_DAY = 0;

const EDITOR_TABS = [
  { key: "montar", label: "Montar", icon: LayoutGrid },
  { key: "adicionar", label: "Adicionar", icon: MousePointerClick },
  { key: "templates", label: "Templates", icon: BookOpen },
  { key: "substituir", label: "Substituir", icon: ArrowLeftRight },
  { key: "biblioteca", label: "Biblioteca", icon: Utensils },
  { key: "ia", label: "IA", icon: Sparkles },
  { key: "preview", label: "Preview", icon: Eye },
] as const;

export default function EditorWorkspaceTabs({ viewMode, onViewModeChange }: Props) {
  const [activeTab, setActiveTab] = useState<string>("montar");
  const [visualLibOpen, setVisualLibOpen] = useState(false);
  const [mealLibModalOpen, setMealLibModalOpen] = useState(false);
  const [autoGenOpen, setAutoGenOpen] = useState(false);
  const [assistedOpen, setAssistedOpen] = useState(false);
  const [librarySidebarOpen, setLibrarySidebarOpen] = useState(false);
  const [activeDay] = useState(SINGLE_DAY);
  return (
    <div className="space-y-3">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start bg-card border border-border rounded-xl p-1 h-auto gap-0.5 overflow-x-auto">
          {EDITOR_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.key}
                value={tab.key}
                className="gap-1.5 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg px-3 py-2 shrink-0"
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Montar — Grid/List editor */}
        <TabsContent value="montar" className="mt-3">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
                <button
                  type="button"
                  onClick={() => onViewModeChange("grid")}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                    viewMode === "grid"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" /> Grade
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
                  <List className="w-3.5 h-3.5" /> Lista
                </button>
              </div>
            </div>
            {viewMode === "grid" ? <WeeklyGrid /> : <ListView />}
          </div>
        </TabsContent>

        {/* Adicionar — Click-to-add panel (Phase 2) */}
        <TabsContent value="adicionar" className="mt-3">
          <div className="glass rounded-xl p-4">
            <MealClickToAddPanel day={activeDay} />
          </div>
        </TabsContent>

        {/* Templates — Phase 3 */}
        <TabsContent value="templates" className="mt-3">
          <div className="glass rounded-xl p-4">
            <MealTemplatePanel day={activeDay} />
          </div>
        </TabsContent>

        {/* Substituir — Phase 3 */}
        <TabsContent value="substituir" className="mt-3">
          <div className="glass rounded-xl p-4">
            <MealSubstitutionPanel day={activeDay} />
          </div>
        </TabsContent>

        {/* Biblioteca — Visual meal library + food database */}
        <TabsContent value="biblioteca" className="mt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => setVisualLibOpen(true)}
              className="flex items-center gap-3 p-4 rounded-xl border-2 border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Utensils className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold">🍽️ Biblioteca Visual</p>
                <p className="text-[11px] text-muted-foreground">
                  Refeições com fotos, drag & drop por categoria
                </p>
              </div>
            </button>
            <button
              onClick={() => setMealLibModalOpen(true)}
              className="flex items-center gap-3 p-4 rounded-xl border-2 border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-bold">📚 Banco de Refeições</p>
                <p className="text-[11px] text-muted-foreground">
                  Base completa de alimentos com macros
                </p>
              </div>
            </button>
            <button
              onClick={() => setLibrarySidebarOpen(true)}
              className="flex items-center gap-3 p-4 rounded-xl border-2 border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <p className="text-sm font-bold">📋 Meus Modelos</p>
                <p className="text-[11px] text-muted-foreground">
                  Templates salvos e modelos pessoais
                </p>
              </div>
            </button>
          </div>
        </TabsContent>

        {/* IA — Generation modes */}
        <TabsContent value="ia" className="mt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => setAssistedOpen(true)}
              className="flex items-center gap-3 p-4 rounded-xl border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold">🤖 Plano Assistido</p>
                <p className="text-[11px] text-muted-foreground">
                  IA gera sugestões baseadas no paciente
                </p>
              </div>
            </button>
            <button
              onClick={() => setAutoGenOpen(true)}
              className="flex items-center gap-3 p-4 rounded-xl border-2 border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Wand2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-bold">⚡ Gerar Automático</p>
                <p className="text-[11px] text-muted-foreground">
                  Motor clínico gera o plano completo
                </p>
              </div>
            </button>
          </div>
        </TabsContent>

        {/* Preview — how diet looks */}
        <TabsContent value="preview" className="mt-3">
          <DietPreviewPanel />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <MealVisualLibraryModal open={visualLibOpen} onOpenChange={setVisualLibOpen} />
      <MealLibraryModal open={mealLibModalOpen} onOpenChange={setMealLibModalOpen} targetDay={1} targetMealType="Café da Manhã" />
      <AutoGenerateModal open={autoGenOpen} onOpenChange={setAutoGenOpen} />
      <AssistedPlanModal open={assistedOpen} onOpenChange={setAssistedOpen} />
      <MealLibrarySidebar open={librarySidebarOpen} onOpenChange={setLibrarySidebarOpen} targetDay={1} targetMealType="Café da Manhã" />
    </div>
  );
}
