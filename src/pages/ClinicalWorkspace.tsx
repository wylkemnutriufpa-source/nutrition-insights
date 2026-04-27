import { useState, useEffect, lazy, Suspense } from "react";
import { useExperienceUI } from "@/hooks/useExperienceUI";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Users, UtensilsCrossed, BookOpen, ChefHat, Zap, AlertTriangle, ClipboardCheck, Plus, ArrowLeft, Search, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import SubscriptionGuard from "@/components/common/SubscriptionGuard";

// Lazy loaded workspace modules
const PatientsList = lazy(() => import("@/components/workspace/WorkspacePatients"));
const MealPlanModule = lazy(() => import("@/components/workspace/WorkspaceMealPlans"));
const TemplatesModule = lazy(() => import("@/components/workspace/WorkspaceTemplates"));
const RecipesModule = lazy(() => import("@/components/workspace/WorkspaceRecipes"));
const ProtocolModule = lazy(() => import("@/components/workspace/WorkspaceProtocols"));
const AlertsModule = lazy(() => import("@/components/workspace/WorkspaceAlerts"));
const OnboardingsModule = lazy(() => import("@/components/workspace/WorkspaceOnboardings"));

const TABS = [
  { key: "patients", label: "Pacientes", icon: Users, minMode: "basic" as const },
  { key: "meal-plans", label: "Planos", icon: UtensilsCrossed, minMode: "basic" as const },
  { key: "templates", label: "Templates", icon: BookOpen, minMode: "pro" as const },
  { key: "recipes", label: "Receitas", icon: ChefHat, minMode: "basic" as const },
  { key: "protocols", label: "Protocolos", icon: Zap, minMode: "pro" as const },
  { key: "alerts", label: "Alertas", icon: AlertTriangle, minMode: "pro" as const },
  { key: "onboardings", label: "Onboardings", icon: ClipboardCheck, minMode: "advanced" as const },
];

function ModuleLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <motion.div
          className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <p className="text-sm text-muted-foreground">Carregando módulo...</p>
      </div>
    </div>
  );
}

export default function ClinicalWorkspace() {
  const expUI = useExperienceUI();
  const visibleTabs = TABS.filter(t => expUI.minMode(t.minMode));
  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.key || "patients");
  const [search, setSearch] = useState("");

  // Reset active tab when mode changes and current tab is no longer visible
  useEffect(() => {
    const isCurrentTabVisible = visibleTabs.some(t => t.key === activeTab);
    if (!isCurrentTabVisible && visibleTabs.length > 0) {
      setActiveTab(visibleTabs[0].key);
    }
  }, [expUI.mode, visibleTabs, activeTab]);

  return (
    <SubscriptionGuard featureName="Workspace Clínico">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-display font-bold">Workspace Clínico</h1>
              <p className="text-xs text-muted-foreground">Central unificada de trabalho clínico</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar paciente, template..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64 h-9 text-sm"
              />
            </div>
            <Link to="/invite-patient">
              <Button size="sm" variant="outline" className="gap-1.5 border-amber-500/30 text-amber-600 hover:bg-amber-500/5">
                <UserPlus className="w-4 h-4" /> Convidar
              </Button>
            </Link>
            <Button size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" /> Criar Plano
            </Button>
          </div>
        </div>

        {/* Tab system */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto bg-card border border-border rounded-xl p-1 h-auto flex-wrap">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className="gap-1.5 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg px-3 py-2"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <div className="mt-4">
            <Suspense fallback={<ModuleLoader />}>
              <TabsContent value="patients" className="mt-0">
                <PatientsList search={search} />
              </TabsContent>
              <TabsContent value="meal-plans" className="mt-0">
                <MealPlanModule search={search} />
              </TabsContent>
              <TabsContent value="templates" className="mt-0">
                <TemplatesModule search={search} />
              </TabsContent>
              <TabsContent value="recipes" className="mt-0">
                <RecipesModule search={search} />
              </TabsContent>
              <TabsContent value="protocols" className="mt-0">
                <ProtocolModule search={search} />
              </TabsContent>
              <TabsContent value="alerts" className="mt-0">
                <AlertsModule search={search} />
              </TabsContent>
              <TabsContent value="onboardings" className="mt-0">
                <OnboardingsModule search={search} />
              </TabsContent>
            </Suspense>
          </div>
        </Tabs>
      </div>
    </SubscriptionGuard>
  );
}
