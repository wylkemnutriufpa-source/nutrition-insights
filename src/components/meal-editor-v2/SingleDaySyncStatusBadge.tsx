/**
 * SingleDaySyncStatusBadge
 * ----------------------------------------------------------------
 * Mostra estado da trigger de replicação no modo single_day.
 * Verde = última op ok, Vermelho = erro recente, Cinza = idle.
 */
import { useSingleDaySyncLogs } from "@/hooks/useSingleDaySyncLogs";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  planId: string | null | undefined;
  enabled: boolean;
}

export default function SingleDaySyncStatusBadge({ planId, enabled }: Props) {
  const { lastError, lastOk, hasRecentError, refetch } = useSingleDaySyncLogs(planId, {
    toastOnError: enabled,
  });

  if (!enabled || !planId) return null;

  const isError = hasRecentError;
  const last = isError ? lastError : lastOk;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => refetch()}
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
            isError
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : last
                ? "border-green-500/30 bg-green-500/5 text-green-700 dark:text-green-400"
                : "border-border bg-muted/30 text-muted-foreground"
          }`}
        >
          {isError ? (
            <AlertTriangle className="w-3 h-3" />
          ) : last ? (
            <CheckCircle2 className="w-3 h-3" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
          {isError ? "Replicação falhou" : last ? "Sincronizado" : "Aguardando"}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs text-xs">
        {isError && lastError ? (
          <>
            <p className="font-semibold">Erro na replicação automática</p>
            <p className="opacity-80 mt-0.5">{lastError.error_message ?? "—"}</p>
            <p className="opacity-60 mt-0.5">{new Date(lastError.created_at).toLocaleString()}</p>
          </>
        ) : last ? (
          <>
            <p className="font-semibold">Última sincronização ok</p>
            <p className="opacity-80 mt-0.5">
              {last.operation} · {last.affected_rows} linha(s)
            </p>
            <p className="opacity-60 mt-0.5">{new Date(last.created_at).toLocaleString()}</p>
          </>
        ) : (
          <p>Nenhuma replicação registrada ainda.</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
