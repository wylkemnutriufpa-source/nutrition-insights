/**
 * Fixed status section displayed at the top of the dashboard.
 * Surfaces the current state of the experience mode (saving, success,
 * blocked, failed, offline-queued) so the user does not need to rely
 * on toasts only.
 */
import { useExperienceMode } from "@/hooks/useExperienceMode";
import { Loader2, CheckCircle2, AlertTriangle, Lock, WifiOff, RefreshCw, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import RequestUnlockDialog from "./RequestUnlockDialog";

function CorrelationIdBadge({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard?.writeText(id);
      setCopied(true);
      toast.success("ID copiado", {
        description: id,
        duration: 2000,
      });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Não foi possível copiar o ID");
    }
  };
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip open={copied ? true : undefined}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onCopy}
            data-testid="emode-correlation-id"
            aria-label="Copiar ID de correlação"
            className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded-md border border-border bg-muted/40 hover:bg-muted text-[10px] font-mono text-muted-foreground transition-colors"
          >
            <span>ID: {id}</span>
            {copied ? (
              <Check className="w-3 h-3 text-emerald-600" aria-label="Copiado" />
            ) : (
              <Copy className="w-3 h-3" aria-label="Copiar" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" data-testid="emode-correlation-tooltip">
          {copied ? "Copiado!" : "Clique para copiar"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function ExperienceModeStatusSection() {
  const { mode, isLoading, failedMode, lastError, isOffline, pendingQueueSize, queueStats, retryLastMode } =
    useExperienceMode() as any;

  // If no change is in progress and everything is normal, hide the section
  if (!isLoading && !failedMode && !isOffline && pendingQueueSize === 0) {
    return null;
  }

  // Saving in-flight
  if (isLoading) {
    return (
      <div
        data-testid="emode-status"
        data-state="saving"
        className="rounded-xl border border-border bg-muted/40 px-4 py-3 flex items-center gap-3"
      >
        <Loader2 className="w-4 h-4 text-primary animate-spin" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Salvando seu modo de experiência…</p>
          <p className="text-xs text-muted-foreground">
            Aguarde alguns instantes. Não feche a página.
          </p>
        </div>
      </div>
    );
  }

  // Locked / blocked attempt
  if (failedMode && lastError?.code === "MODE_LOCKED") {
    const unlockText = lastError.unlock_date
      ? ` Liberação prevista para ${new Date(lastError.unlock_date).toLocaleDateString("pt-BR")}.`
      : "";
    return (
      <div
        data-testid="emode-status"
        data-state="blocked"
        data-correlation-id={lastError.correlationId || ""}
        data-unlock-date={lastError.unlock_date || ""}
        className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-start gap-3"
      >
        <Lock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            {lastError.blockTitle || "Modo bloqueado"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {lastError.blockDescription || lastError.message}
            {!lastError.blockDescription && unlockText}
          </p>
          <RequestUnlockDialog
            attemptedMode={failedMode}
            blockDescription={lastError.blockDescription || lastError.message}
            unlockDate={lastError.unlock_date ?? null}
            correlationId={lastError.correlationId}
          />
          {lastError.correlationId && <CorrelationIdBadge id={lastError.correlationId} />}
        </div>
      </div>
    );
  }

  // Offline / queued
  if (failedMode && (lastError?.code === "OFFLINE" || isOffline || pendingQueueSize > 0)) {
    return (
      <div
        data-testid="emode-status"
        data-state="offline"
        className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 flex items-start gap-3"
      >
        <WifiOff className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
            Sem conexão — alteração enfileirada
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {pendingQueueSize > 0
              ? `${pendingQueueSize} tentativa(s) pendente(s). `
              : ""}
            Reenviaremos automaticamente quando você voltar a ficar online.
          </p>
          {queueStats?.isFull && (
            <p
              data-testid="emode-queue-full"
              className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 font-medium"
            >
              Fila cheia: tentativas mais antigas serão descartadas.
            </p>
          )}
          {queueStats?.hasExpired && (
            <p
              data-testid="emode-queue-expired"
              className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 font-medium"
            >
              Algumas tentativas expiraram (mais de 24h offline).
            </p>
          )}
          {lastError?.correlationId && <CorrelationIdBadge id={lastError.correlationId} />}
        </div>
      </div>
    );
  }

  // Generic failure
  if (failedMode) {
    return (
      <div
        data-testid="emode-status"
        data-state="failed"
        className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 flex items-start gap-3"
      >
        <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-destructive">
            Falha ao atualizar o modo
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {lastError?.message || "Não foi possível salvar a alteração."}
          </p>
          {lastError?.correlationId && <CorrelationIdBadge id={lastError.correlationId} />}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={retryLastMode}
          className="shrink-0 gap-1.5"
        >
          <RefreshCw className="w-3 h-3" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  return null;
}
