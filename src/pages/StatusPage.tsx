import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, RefreshCw, Loader2, AlertTriangle, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";

interface AuditRow {
  id: string;
  pathname: string;
  status_code: number;
  ok: boolean;
  notes: string | null;
  checked_at: string;
}

const OAUTH_PATHS = [
  "/~oauth/cadastro",
  "/~oauth/convite/HEALTHCHECK",
  "/~oauth/intake/healthcheck-token",
  "/~oauth/auth/confirm",
];

export default function StatusPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    // Pull the most recent audit run (last 24h) and reduce to latest per path.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("public_route_audits")
      .select("id, pathname, status_code, ok, notes, checked_at")
      .gte("checked_at", since)
      .order("checked_at", { ascending: false })
      .limit(500);
    if (error) {
      toast.error(`Erro ao carregar status: ${error.message}`);
      setRows([]);
    } else {
      setRows((data as AuditRow[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // Latest row per path
  const latestByPath = useMemo(() => {
    const map = new Map<string, AuditRow>();
    for (const r of rows) {
      if (!map.has(r.pathname)) map.set(r.pathname, r);
    }
    return map;
  }, [rows]);

  const oauthLatest = OAUTH_PATHS.map((p) => ({ path: p, row: latestByPath.get(p) }));
  const allOauthOk = oauthLatest.every((x) => x.row?.ok);
  const lastRun = rows[0]?.checked_at;

  const runAudit = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("audit-public-routes");
      if (error) throw error;
      toast.success(`Audit executado: ${data?.checked ?? 0} rotas, ${data?.failing ?? 0} falhando`);
      await load();
    } catch (err: any) {
      toast.error(`Falha ao executar audit: ${err?.message || err}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <Helmet>
        <title>Status do sistema · FitJourney</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="max-w-3xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-primary" />
            <h1 className="font-display text-2xl font-bold">Status das rotas públicas</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Resultado do último health-check (executado de hora em hora). Se algo falhar aqui, os links de
            convite/cadastro estão quebrados em produção.
          </p>
        </motion.div>

        {/* Hero status */}
        <Card className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {loading ? (
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            ) : allOauthOk ? (
              <CheckCircle2 className="w-8 h-8 text-success" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-destructive" />
            )}
            <div>
              <div className="font-semibold">
                {loading
                  ? "Carregando..."
                  : allOauthOk
                  ? "Todas as rotas /~oauth/ estão OK"
                  : "Existe rota /~oauth/ falhando"}
              </div>
              {lastRun && (
                <div className="text-xs text-muted-foreground">
                  Última verificação: {new Date(lastRun).toLocaleString("pt-BR")}
                </div>
              )}
            </div>
          </div>
          <Button onClick={runAudit} disabled={running} variant="outline" size="sm" className="gap-2">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Verificar agora
          </Button>
        </Card>

        {/* OAuth bypass routes */}
        <Card className="p-5">
          <h2 className="font-semibold mb-4">Rotas anti-cache (/~oauth/)</h2>
          <div className="space-y-2">
            {oauthLatest.map(({ path, row }) => (
              <RouteRow key={path} path={path} row={row} />
            ))}
          </div>
        </Card>

        {/* All other audited paths */}
        <Card className="p-5">
          <h2 className="font-semibold mb-4">Demais rotas públicas</h2>
          <div className="space-y-2">
            {Array.from(latestByPath.values())
              .filter((r) => !r.pathname.startsWith("/~oauth/"))
              .sort((a, b) => a.pathname.localeCompare(b.pathname))
              .map((row) => (
                <RouteRow key={row.pathname} path={row.pathname} row={row} />
              ))}
            {latestByPath.size === 0 && !loading && (
              <p className="text-sm text-muted-foreground">Nenhum dado nas últimas 24h.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function RouteRow({ path, row }: { path: string; row?: AuditRow }) {
  const ok = row?.ok ?? false;
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
      <div className="flex items-center gap-3 min-w-0">
        {row ? (
          ok ? (
            <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
          )
        ) : (
          <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
        )}
        <div className="min-w-0">
          <div className="font-mono text-xs truncate">{path}</div>
          {row?.notes && (
            <div className="text-[11px] text-muted-foreground truncate">{row.notes}</div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {row ? (
          <Badge variant={ok ? "secondary" : "destructive"} className="font-mono text-[10px]">
            {row.status_code}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px]">sem dados</Badge>
        )}
      </div>
    </div>
  );
}
