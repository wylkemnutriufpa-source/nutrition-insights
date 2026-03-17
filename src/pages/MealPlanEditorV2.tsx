import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, AlertTriangle, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useMealPlanEditorV2Store } from "@/stores/mealPlanEditorV2Store";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { WeeklyGrid } from "@/components/meal-editor-v2/WeeklyGrid";
import { EditorSyncBadge } from "@/components/meal-editor-v2/EditorSyncBadge";

export default function MealPlanEditorV2() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const store = useMealPlanEditorV2Store();

  // Hydrate on mount / planId change
  useEffect(() => {
    if (id && user?.id) {
      store.hydrate(id, user.id);
    }
    return () => {
      // Do NOT reset on unmount — keep cache alive for back-navigation
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  // ── Loading gate (initial state or hydrating) ─────────────────
  if (!store.hydrated || (!store.plan && store.hydrating)) {
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

  const plan = store.plan!;

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
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl font-bold">{plan.title}</h1>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  <Zap className="w-3 h-3" /> Premium V2
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Paciente: {store.patientName} • Início: {new Date(plan.start_date).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>
          {store.hydrating && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Atualizando…
            </div>
          )}
        </div>

        {/* Weekly grid — always mounted, never unmounted */}
        <WeeklyGrid />
      </div>
    </DashboardLayout>
  );
}
