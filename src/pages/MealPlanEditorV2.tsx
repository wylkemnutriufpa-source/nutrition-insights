import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, AlertTriangle, Zap, Save, Send, CheckCircle2, Library, Utensils, Wand2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useMealPlanEditorV2Store } from "@/stores/mealPlanEditorV2Store";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { WeeklyGrid } from "@/components/meal-editor-v2/WeeklyGrid";
import { EditorSyncBadge } from "@/components/meal-editor-v2/EditorSyncBadge";
import { MealLibrarySidebar } from "@/components/meal-editor-v2/MealLibrarySidebar";
import { MealLibraryModal } from "@/components/meal-editor-v2/MealLibraryModal";
import { AutoGenerateModal } from "@/components/meal-editor-v2/AutoGenerateModal";
import { toast } from "sonner";

export default function MealPlanEditorV2() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const store = useMealPlanEditorV2Store();
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [mealLibModalOpen, setMealLibModalOpen] = useState(false);
  const [autoGenOpen, setAutoGenOpen] = useState(false);

  // Hydrate on mount / planId change
  useEffect(() => {
    if (id && user?.id) {
      store.hydrate(id, user.id);
    }
    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  // ── Loading gate ─────────────────────────────────────────────
  const storeMatchesRoute = store.planId === id;
  if (!storeMatchesRoute || !store.hydrated || store.hydrating) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  // ── Plan not found ────────────────────────────────────────
  if (store.hydrated && !store.plan) {
    return (
      <DashboardLayout>
        <div className="text-center py-20 space-y-4">
          <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Plano não encontrado.</p>
          <Button variant="ghost" onClick={() => navigate("/meal-plans")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const plan = store.plan;
  if (!plan) return null;

  const isPublished = plan.plan_status === "published_to_patient";
  const isApproved = plan.plan_status === "approved";

  const handleSave = async () => {
    setSaving(true);
    try {
      await store._flushQueue();
      const { error } = await supabase
        .from("meal_plans")
        .update({ plan_status: "approved", updated_at: new Date().toISOString() })
        .eq("id", plan.id);
      if (error) throw error;
      store.updatePlan({ plan_status: "approved", updated_at: new Date().toISOString() } as any);
      toast.success("Plano salvo com sucesso!");
    } catch (err) {
      toast.error("Erro ao salvar o plano.");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await store._flushQueue();
      const { error } = await supabase
        .from("meal_plans")
        .update({ plan_status: "published_to_patient", is_active: true, updated_at: new Date().toISOString() })
        .eq("id", plan.id);
      if (error) throw error;
      store.updatePlan({ plan_status: "published_to_patient", is_active: true, updated_at: new Date().toISOString() } as any);
      toast.success("Plano publicado para o paciente!");
    } catch (err) {
      toast.error("Erro ao publicar o plano.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <DashboardLayout>
      <EditorSyncBadge status={store.syncStatus} />

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/meal-plans")} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-xl font-bold">{plan.title}</h1>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  <Zap className="w-3 h-3" /> Editor Premium
                </span>
                {isPublished && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Publicado
                  </span>
                )}
                {isApproved && !isPublished && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full">
                    <Save className="w-3 h-3" /> Salvo
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Paciente: {store.patientName} • Início: {new Date(plan.start_date).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {store.hydrating && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Atualizando…
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoGenOpen(true)}
              className="gap-1.5"
            >
              <Wand2 className="w-4 h-4" />
              Gerar Automático
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMealLibModalOpen(true)}
              className="gap-1.5"
            >
              <Utensils className="w-4 h-4" />
              Banco de Refeições
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLibraryOpen(true)}
              className="gap-1.5"
            >
              <Library className="w-4 h-4" />
              Meus Modelos
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={saving || store.syncStatus === "saving"}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              Salvar
            </Button>
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={publishing || store.syncStatus === "saving"}
            >
              {publishing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
              Publicar
            </Button>
          </div>
        </div>

        {/* Weekly grid — always mounted, never unmounted */}
        <WeeklyGrid />
      </div>

      {/* Header-level library sidebar (defaults to breakfast / day 1) */}
      <MealLibrarySidebar
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        targetDay={1}
        targetMealType="breakfast"
      />
      <MealLibraryModal
        open={mealLibModalOpen}
        onOpenChange={setMealLibModalOpen}
        targetDay={1}
        targetMealType="breakfast"
      />
      <AutoGenerateModal
        open={autoGenOpen}
        onOpenChange={setAutoGenOpen}
      />
    </DashboardLayout>
  );
}
