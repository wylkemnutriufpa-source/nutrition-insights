/**
 * Admin: Experience Mode Reconciliation
 * Compares each user's current profile.experience_mode with the latest event
 * in experience_mode_audit_log. Flags inconsistencies so the admin can act.
 */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShieldAlert, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";

interface Inconsistency {
  user_id: string;
  current_mode: string;
  last_audit_mode: string | null;
  last_audit_outcome: string | null;
  last_audit_correlation_id: string | null;
  last_audit_at: string | null;
  delta_minutes: number | null;
}

  const [rows, setRows] = useState<Inconsistency[]>([]);
  const [loading, setLoading] = useState(false);
  const [showOnlyMismatch, setShowOnlyMismatch] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      // Fetch all profiles with experience_mode (cap to a reasonable amount)
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, experience_mode")
        .limit(500);
      if (pErr) throw pErr;

      const userIds = (profiles || []).map((p: any) => p.user_id).filter(Boolean);
      if (userIds.length === 0) {
        setRows([]);
        return;
      }

      // Latest audit per user — fetch recent and reduce client-side
      const { data: audits, error: aErr } = await supabase
        .from("experience_mode_audit_log" as any)
        .select("user_id, attempted_mode, outcome, correlation_id, created_at")
        .in("user_id", userIds)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (aErr) throw aErr;

      const latestByUser = new Map<string, any>();
      for (const a of (audits as any[]) || []) {
        if (!latestByUser.has(a.user_id)) latestByUser.set(a.user_id, a);
      }

      const out: Inconsistency[] = (profiles || []).map((p: any) => {
        const last = latestByUser.get(p.user_id);
        return {
          user_id: p.user_id,
          current_mode: p.experience_mode || "basic",
          last_audit_mode: last?.attempted_mode ?? null,
          last_audit_outcome: last?.outcome ?? null,
          last_audit_correlation_id: last?.correlation_id ?? null,
          last_audit_at: last?.created_at ?? null,
          delta_minutes: last?.created_at
            ? Math.round((Date.now() - new Date(last.created_at).getTime()) / 60000)
            : null,
        };
      });

      setRows(out);
    } catch (err: any) {
      toast.error("Falha ao carregar reconciliação", { description: err?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!showOnlyMismatch) return rows;
    return rows.filter((r) => {
      if (!r.last_audit_at) return false; // never had an event
      // Mismatch when latest successful or replayed event != current mode
      const isFinal = r.last_audit_outcome === "success" || r.last_audit_outcome === "offline_replayed";
      return isFinal && r.last_audit_mode !== r.current_mode;
    });
  }, [rows, showOnlyMismatch]);

  return (
    <div className="container max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <header className="flex items-center gap-3">
        <ShieldAlert className="w-6 h-6 text-amber-600" />
        <div>
          <h1 className="text-2xl font-bold">Reconciliação do Modo de Experiência</h1>
          <p className="text-sm text-muted-foreground">
            Compara o modo atual no perfil com o último evento registrado na auditoria.
          </p>
        </div>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            {showOnlyMismatch ? "Inconsistências" : "Todos os usuários"} ({filtered.length})
          </CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowOnlyMismatch((s) => !s)}
            >
              {showOnlyMismatch ? "Mostrar todos" : "Mostrar só inconsistências"}
            </Button>
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Nenhuma inconsistência detectada.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-border">
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Usuário</th>
                    <th className="py-2 pr-3 font-medium">Modo atual</th>
                    <th className="py-2 pr-3 font-medium">Último evento</th>
                    <th className="py-2 pr-3 font-medium">Resultado</th>
                    <th className="py-2 pr-3 font-medium">Há</th>
                    <th className="py-2 pr-3 font-medium">Correlation</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const mismatch =
                      r.last_audit_at &&
                      (r.last_audit_outcome === "success" ||
                        r.last_audit_outcome === "offline_replayed") &&
                      r.last_audit_mode !== r.current_mode;
                    return (
                      <tr key={r.user_id} className="border-b border-border/50 align-top">
                        <td className="py-2 pr-3 font-mono text-[10px]">{r.user_id}</td>
                        <td className="py-2 pr-3 capitalize font-medium">{r.current_mode}</td>
                        <td className="py-2 pr-3 capitalize">{r.last_audit_mode || "—"}</td>
                        <td className="py-2 pr-3">
                          {mismatch ? (
                            <Badge variant="outline" className="bg-destructive/15 text-destructive">
                              <AlertTriangle className="w-3 h-3 mr-1" /> Inconsistente
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              {r.last_audit_outcome || "—"}
                            </Badge>
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          {r.delta_minutes !== null ? `${r.delta_minutes}m` : "—"}
                        </td>
                        <td className="py-2 pr-3 font-mono text-[10px]">
                          {r.last_audit_correlation_id || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
