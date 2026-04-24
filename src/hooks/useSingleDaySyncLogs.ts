/**
 * useSingleDaySyncLogs
 * ----------------------------------------------------------------
 * Lê logs estruturados da trigger `fn_sync_single_day_plan_items`
 * (tabela `single_day_sync_logs`) e expõe o status mais recente.
 *
 * Inclui assinatura realtime para refletir falhas instantaneamente
 * no UI (badge / toast quando uma replicação falhar).
 */

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SingleDaySyncLog {
  id: string;
  meal_plan_id: string | null;
  master_item_id: string | null;
  operation: string;
  status: "ok" | "error" | string;
  affected_rows: number;
  error_message: string | null;
  error_detail: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export function useSingleDaySyncLogs(planId: string | null | undefined, options?: { toastOnError?: boolean }) {
  const [logs, setLogs] = useState<SingleDaySyncLog[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!planId) {
      setLogs([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("single_day_sync_logs" as any)
      .select("*")
      .eq("meal_plan_id", planId)
      .order("created_at", { ascending: false })
      .limit(50);
    setLoading(false);
    if (error) {
      console.warn("[useSingleDaySyncLogs] erro:", error.message);
      return;
    }
    setLogs((data || []) as unknown as SingleDaySyncLog[]);
  }, [planId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  // Realtime: novas entradas para este plano
  useEffect(() => {
    if (!planId) return;
    const channel = supabase
      .channel(`sd-sync-logs:${planId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "single_day_sync_logs",
          filter: `meal_plan_id=eq.${planId}`,
        },
        (payload) => {
          const log = payload.new as SingleDaySyncLog;
          setLogs((prev) => [log, ...prev].slice(0, 50));
          if (log.status === "error" && options?.toastOnError !== false) {
            toast.error("Falha ao replicar dia padrão", {
              description:
                log.error_message?.slice(0, 160) ?? "Erro desconhecido na sincronização.",
              duration: 6000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [planId, options?.toastOnError]);

  const lastError = useMemo(() => logs.find((l) => l.status === "error") ?? null, [logs]);
  const lastOk = useMemo(() => logs.find((l) => l.status === "ok") ?? null, [logs]);
  const hasRecentError = useMemo(() => {
    if (!lastError) return false;
    if (lastOk && new Date(lastOk.created_at) > new Date(lastError.created_at)) return false;
    return Date.now() - new Date(lastError.created_at).getTime() < 5 * 60 * 1000;
  }, [lastError, lastOk]);

  return { logs, loading, refetch, lastError, lastOk, hasRecentError };
}
