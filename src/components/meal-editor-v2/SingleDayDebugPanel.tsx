/**
 * SingleDayDebugPanel
 * ----------------------------------------------------------------
 * Painel de auditoria visível no editor (apenas modo single_day).
 * Exibe:
 *   - status: sincronizado / divergente
 *   - última replicação (op + tempo)
 *   - origem do dado (master day 0)
 *   - botão de validar consistência via RPC
 *   - botão de reparo (reconstrói réplicas a partir do master)
 */

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  RefreshCw,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSingleDaySyncLogs } from "@/hooks/useSingleDaySyncLogs";
import {
  repairSingleDayPlan,
  validateSingleDayConsistencyRpc,
  type ValidationReport,
} from "@/lib/singleDayRepair";
import { toast } from "sonner";

interface Props {
  planId: string | null | undefined;
  enabled: boolean;
}

export default function SingleDayDebugPanel({ planId, enabled }: Props) {
  const { lastError, lastOk, hasRecentError, logs, refetch } = useSingleDaySyncLogs(
    planId,
    { toastOnError: false }
  );
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [validating, setValidating] = useState(false);
  const [repairing, setRepairing] = useState(false);

  const validate = async () => {
    if (!planId) return;
    setValidating(true);
    const r = await validateSingleDayConsistencyRpc(planId);
    setValidating(false);
    setReport(r);
  };

  // Auto-validar ao montar e quando novos logs aparecerem
  useEffect(() => {
    if (enabled && planId) void validate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId, enabled, logs.length]);

  const handleRepair = async () => {
    if (!planId) return;
    setRepairing(true);
    const res = await repairSingleDayPlan(planId);
    setRepairing(false);
    if (res.ok) {
      toast.success("Plano reparado", {
        description: `${res.inserted} réplicas reconstruídas a partir do dia 0.`,
      });
      await validate();
      await refetch();
    } else {
      toast.error("Falha ao reparar", { description: res.reason });
    }
  };

  const status = useMemo(() => {
    if (!report) return "idle" as const;
    if (!report.valid) return "divergent" as const;
    if (hasRecentError) return "warn" as const;
    return "synced" as const;
  }, [report, hasRecentError]);

  if (!enabled || !planId) return null;

  return (
    <div className="rounded-lg border border-border bg-card/50 p-3 text-xs space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="font-semibold">Auditoria Dia Padrão</span>
          {status === "synced" && (
            <Badge variant="outline" className="border-green-500/40 text-green-700 dark:text-green-400 gap-1">
              <CheckCircle2 className="w-3 h-3" /> Sincronizado
            </Badge>
          )}
          {status === "divergent" && (
            <Badge variant="destructive" className="gap-1">
              <ShieldAlert className="w-3 h-3" /> Divergente
            </Badge>
          )}
          {status === "warn" && (
            <Badge variant="outline" className="border-amber-500/40 text-amber-600 gap-1">
              <AlertTriangle className="w-3 h-3" /> Erro recente
            </Badge>
          )}
          {status === "idle" && (
            <Badge variant="outline" className="text-muted-foreground gap-1">
              <RefreshCw className="w-3 h-3" /> Verificando…
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => void validate()}
            disabled={validating}
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${validating ? "animate-spin" : ""}`} />
            Validar
          </Button>
          {status === "divergent" && (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="h-7 px-2 text-xs"
              onClick={() => void handleRepair()}
              disabled={repairing}
            >
              <Wrench className={`w-3 h-3 mr-1 ${repairing ? "animate-spin" : ""}`} />
              Reparar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
        <div>
          <span className="opacity-60">Origem:</span> Master (dia 0)
        </div>
        <div>
          <span className="opacity-60">Última replicação:</span>{" "}
          {lastOk
            ? `${lastOk.operation} · ${lastOk.affected_rows} linhas · ${new Date(
                lastOk.created_at
              ).toLocaleTimeString()}`
            : "—"}
        </div>
        {report && (
          <>
            <div>
              <span className="opacity-60">Master items:</span> {report.master_items ?? 0}
            </div>
            <div>
              <span className="opacity-60">Réplicas:</span>{" "}
              {report.replica_items ?? 0} / {report.expected_replicas ?? 0}
            </div>
          </>
        )}
      </div>

      {status === "divergent" && report?.inconsistencies && report.inconsistencies.length > 0 && (
        <div className="rounded border border-destructive/30 bg-destructive/5 p-2 max-h-32 overflow-auto space-y-1">
          {report.inconsistencies.slice(0, 6).map((inc, i) => (
            <div key={i} className="text-destructive">
              <span className="font-medium">{inc.issue}</span> · {inc.meal_type} ·{" "}
              <span className="opacity-80">{inc.title}</span>
              {inc.day_of_week ? ` · dia ${inc.day_of_week}` : ""}
            </div>
          ))}
          {report.inconsistencies.length > 6 && (
            <div className="text-destructive/70">
              +{report.inconsistencies.length - 6} outras inconsistências…
            </div>
          )}
        </div>
      )}

      {hasRecentError && lastError && (
        <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2 text-amber-700 dark:text-amber-400">
          <strong>Último erro de trigger:</strong> {lastError.error_message ?? "—"}
        </div>
      )}
    </div>
  );
}
