import { Check, AlertTriangle, Loader2 } from "lucide-react";
import type { SyncStatus } from "@/stores/mealPlanEditorV2Store";

export function EditorSyncBadge({ status }: { status: SyncStatus }) {
  if (status === "idle") return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border shadow-lg text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-200">
      {status === "saving" && (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          <span className="text-muted-foreground">Salvando alterações…</span>
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="w-3.5 h-3.5 text-primary" />
          <span className="text-muted-foreground">Sincronizado</span>
        </>
      )}
      {status === "error" && (
        <>
          <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
          <span className="text-destructive">Erro ao salvar</span>
        </>
      )}
    </div>
  );
}
