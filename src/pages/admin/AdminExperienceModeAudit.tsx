/**
 * Admin report: Experience Mode Audit Log.
 * Lists every blocked attempt and update failure with user, reason and timestamp.
 * Filterable by outcome and date range, with CSV/PDF export of the filtered set.
 */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, RefreshCw, Search, Download, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

type Outcome = "all" | "success" | "blocked" | "failed" | "offline_queued" | "offline_replayed" | "queue_overflow" | "queue_expired";

interface AuditRow {
  id: string;
  user_id: string;
  correlation_id: string;
  attempted_mode: string;
  previous_mode: string | null;
  outcome: string;
  reason: string | null;
  error_code: string | null;
  unlock_date: string | null;
  metadata: any;
  created_at: string;
}

const OUTCOME_BADGES: Record<string, { label: string; className: string }> = {
  success: { label: "Sucesso", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  blocked: { label: "Bloqueado", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  failed: { label: "Falhou", className: "bg-destructive/15 text-destructive" },
  offline_queued: { label: "Enfileirado offline", className: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
  offline_replayed: { label: "Reenviado", className: "bg-purple-500/15 text-purple-700 dark:text-purple-400" },
  queue_overflow: { label: "Fila cheia", className: "bg-orange-500/15 text-orange-700 dark:text-orange-400" },
  queue_expired: { label: "Expirou", className: "bg-slate-500/15 text-slate-700 dark:text-slate-400" },
};

const PAGE_SIZE = 50;

export default function AdminExperienceModeAudit() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [page, setPage] = useState(0);

  const load = async () => {
    setLoading(true);
    let query = supabase
      .from("experience_mode_audit_log" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(2000);

    if (outcome !== "all") query = query.eq("outcome", outcome);
    if (from) query = query.gte("created_at", new Date(from).toISOString());
    if (to) query = query.lte("created_at", new Date(to + "T23:59:59").toISOString());

    const { data, error } = await query;
    if (error) {
      toast.error("Falha ao carregar auditoria", { description: error.message });
      setRows([]);
    } else {
      setRows((data as any) || []);
      setPage(0);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [outcome, from, to]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.correlation_id?.toLowerCase().includes(q) ||
        r.user_id?.toLowerCase().includes(q) ||
        r.reason?.toLowerCase().includes(q) ||
        r.error_code?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast.info("Nada para exportar com os filtros atuais.");
      return;
    }
    const header = [
      "created_at",
      "outcome",
      "user_id",
      "attempted_mode",
      "previous_mode",
      "reason",
      "error_code",
      "unlock_date",
      "correlation_id",
    ];
    const lines = filtered.map((r) =>
      [
        r.created_at,
        r.outcome,
        r.user_id,
        r.attempted_mode,
        r.previous_mode || "",
        (r.reason || "").replace(/"/g, '""'),
        r.error_code || "",
        r.unlock_date || "",
        r.correlation_id,
      ]
        .map((v) => `"${String(v).replace(/\n/g, " ")}"`)
        .join(",")
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `experience_mode_audit_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exportado ${filtered.length} registros (CSV).`);
  };

  const exportPdf = () => {
    if (filtered.length === 0) {
      toast.info("Nada para exportar com os filtros atuais.");
      return;
    }
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Auditoria do Modo de Experiência", 14, 14);
    doc.setFontSize(9);
    const filterLine = `Filtros — outcome: ${outcome} | de: ${from || "—"} | até: ${to || "—"} | busca: ${search || "—"} | total: ${filtered.length}`;
    doc.text(filterLine, 14, 20);
    autoTable(doc, {
      startY: 24,
      head: [["Data", "Outcome", "Usuário", "Tentou", "Anterior", "Motivo", "Code", "Correlation"]],
      body: filtered.map((r) => [
        new Date(r.created_at).toLocaleString("pt-BR"),
        r.outcome,
        r.user_id,
        r.attempted_mode,
        r.previous_mode || "—",
        (r.reason || "—").slice(0, 80),
        r.error_code || "—",
        r.correlation_id,
      ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [80, 80, 80] },
    });
    doc.save(`experience_mode_audit_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success(`Exportado ${filtered.length} registros (PDF).`);
  };

  return (
    <div className="container max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <header className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Auditoria de Modos de Experiência</h1>
          <p className="text-sm text-muted-foreground">
            Tentativas bloqueadas e falhas de atualização do modo (Básico/Profissional/Avançado).
          </p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Resultado</Label>
            <Select value={outcome} onValueChange={(v) => setOutcome(v as Outcome)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="blocked">Bloqueado</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
                <SelectItem value="offline_queued">Offline (enfileirado)</SelectItem>
                <SelectItem value="offline_replayed">Reenviado</SelectItem>
                <SelectItem value="queue_overflow">Fila cheia</SelectItem>
                <SelectItem value="queue_expired">Expirou</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">De</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Até</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1 lg:col-span-2">
            <Label className="text-xs">Busca (correlation_id, user_id, motivo)</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                placeholder="emc-… ou uuid…"
                className="pl-8"
              />
            </div>
          </div>
          <div className="lg:col-span-5 flex justify-between items-center gap-2 flex-wrap">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={exportCsv} disabled={loading || filtered.length === 0}>
                <Download className="w-4 h-4 mr-2" /> Exportar CSV
              </Button>
              <Button size="sm" variant="outline" onClick={exportPdf} disabled={loading || filtered.length === 0}>
                <FileText className="w-4 h-4 mr-2" /> Exportar PDF
              </Button>
            </div>
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Resultados ({filtered.length}) — página {page + 1} de {totalPages}
          </CardTitle>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="outline"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              aria-label="Próxima página"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pageRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhum registro encontrado para os filtros atuais.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-border">
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Quando</th>
                    <th className="py-2 pr-3 font-medium">Resultado</th>
                    <th className="py-2 pr-3 font-medium">Usuário</th>
                    <th className="py-2 pr-3 font-medium">Tentou</th>
                    <th className="py-2 pr-3 font-medium">Motivo</th>
                    <th className="py-2 pr-3 font-medium">Correlation</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => {
                    const badge = OUTCOME_BADGES[r.outcome] || {
                      label: r.outcome,
                      className: "bg-muted",
                    };
                    return (
                      <tr key={r.id} className="border-b border-border/50 align-top">
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {new Date(r.created_at).toLocaleString("pt-BR")}
                        </td>
                        <td className="py-2 pr-3">
                          <Badge variant="outline" className={badge.className}>
                            {badge.label}
                          </Badge>
                        </td>
                        <td className="py-2 pr-3 font-mono text-[10px]">{r.user_id}</td>
                        <td className="py-2 pr-3 capitalize">
                          {r.attempted_mode}
                          {r.previous_mode && (
                            <span className="text-muted-foreground"> ← {r.previous_mode}</span>
                          )}
                        </td>
                        <td className="py-2 pr-3 max-w-xs">
                          <div>{r.reason || "—"}</div>
                          {r.error_code && (
                            <div className="text-[10px] text-muted-foreground">
                              code: {r.error_code}
                            </div>
                          )}
                          {r.unlock_date && (
                            <div className="text-[10px] text-muted-foreground">
                              desbloqueio: {new Date(r.unlock_date).toLocaleDateString("pt-BR")}
                            </div>
                          )}
                        </td>
                        <td className="py-2 pr-3 font-mono text-[10px]">{r.correlation_id}</td>
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
