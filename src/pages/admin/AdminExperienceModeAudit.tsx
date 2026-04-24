/**
 * Admin report: Experience Mode Audit Log.
 * Lists every blocked attempt and update failure with user, reason and timestamp.
 * Filterable by outcome and date range, with CSV/PDF export of the filtered set.
 *
 * Adds:
 *  - Saved filter presets (localStorage)
 *  - Retry-threshold alert highlighting suspicious correlationIds with deep links
 *  - Mini timeline grouped by correlationId showing each attempt in order
 *  - Extended CSV columns (error_code breakdown, duration_ms, retries, attempts)
 */
import { useEffect, useMemo, useState, useCallback, Fragment } from "react";
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
import {
  Shield, RefreshCw, Search, Download, FileText,
  ChevronLeft, ChevronRight, AlertTriangle, Save, Trash2, Star,
  ChevronDown, ChevronUp, Clock,
} from "lucide-react";
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

interface FilterPreset {
  id: string;
  name: string;
  outcome: Outcome;
  from: string;
  to: string;
  search: string;
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
const PRESETS_KEY = "fj_emode_audit_presets";
const RETRY_THRESHOLD_KEY = "fj_emode_audit_retry_threshold";
const EXPANDED_CIDS_KEY = "fj_emode_audit_expanded_cids";

function loadExpandedCids(): Set<string> {
  try {
    const raw = localStorage.getItem(EXPANDED_CIDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function saveExpandedCids(set: Set<string>) {
  try {
    localStorage.setItem(EXPANDED_CIDS_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

function loadPresets(): FilterPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePresets(presets: FilterPreset[]) {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  } catch {
    /* ignore */
  }
}

function buildOutcomeBreakdown(rowsForCid: AuditRow[]) {
  const breakdown: Record<string, number> = {};
  for (const r of rowsForCid) {
    breakdown[r.outcome] = (breakdown[r.outcome] || 0) + 1;
  }
  return breakdown;
}

export default function AdminExperienceModeAudit() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [page, setPage] = useState(0);

  // Presets
  const [presets, setPresets] = useState<FilterPreset[]>(() => loadPresets());
  const [presetName, setPresetName] = useState("");

  // Retry threshold
  const [retryThreshold, setRetryThreshold] = useState<number>(() => {
    const saved = localStorage.getItem(RETRY_THRESHOLD_KEY);
    const n = saved ? parseInt(saved, 10) : 3;
    return Number.isFinite(n) && n > 0 ? n : 3;
  });
  useEffect(() => {
    localStorage.setItem(RETRY_THRESHOLD_KEY, String(retryThreshold));
  }, [retryThreshold]);

  // Timeline: which correlationIds are expanded (persisted across reloads)
  const [expandedCids, setExpandedCids] = useState<Set<string>>(() => loadExpandedCids());
  useEffect(() => {
    saveExpandedCids(expandedCids);
  }, [expandedCids]);
  const toggleCid = useCallback((cid: string) => {
    setExpandedCids((prev) => {
      const next = new Set(prev);
      if (next.has(cid)) next.delete(cid);
      else next.add(cid);
      return next;
    });
  }, []);

  // High-retry alert local search
  const [highRetrySearch, setHighRetrySearch] = useState("");

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

  // Group ALL filtered rows by correlation_id for timeline + retry detection
  const groupedByCid = useMemo(() => {
    const map = new Map<string, AuditRow[]>();
    for (const r of filtered) {
      if (!r.correlation_id) continue;
      const arr = map.get(r.correlation_id) || [];
      arr.push(r);
      map.set(r.correlation_id, arr);
    }
    // sort each group by created_at ascending (timeline order)
    for (const [, arr] of map) {
      arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
    return map;
  }, [filtered]);

  // Build retry counts per correlationId (max retries field across rows)
  const retryByCid = useMemo(() => {
    const m = new Map<string, number>();
    for (const [cid, arr] of groupedByCid) {
      let maxRetries = 0;
      for (const r of arr) {
        const meta = (r.metadata || {}) as any;
        const retries = Number(meta.retries ?? 0);
        if (Number.isFinite(retries) && retries > maxRetries) maxRetries = retries;
      }
      m.set(cid, maxRetries);
    }
    return m;
  }, [groupedByCid]);

  // High-retry alert: correlationIds with retries >= threshold
  const highRetryCids = useMemo(() => {
    const list: { cid: string; retries: number; lastOutcome: string; firstId: string }[] = [];
    for (const [cid, retries] of retryByCid) {
      if (retries >= retryThreshold) {
        const arr = groupedByCid.get(cid) || [];
        const last = arr[arr.length - 1];
        list.push({
          cid,
          retries,
          lastOutcome: last?.outcome || "—",
          firstId: arr[0]?.id || "",
        });
      }
    }
    list.sort((a, b) => b.retries - a.retries);
    return list;
  }, [retryByCid, groupedByCid, retryThreshold]);

  // Jump to a specific audit row by id (scroll into view + highlight via expandedCids)
  const jumpToRow = useCallback((cid: string, rowId: string) => {
    // ensure the page contains the row
    const idx = filtered.findIndex((r) => r.id === rowId);
    if (idx < 0) {
      toast.info("Linha não está na página atual com os filtros aplicados.");
      return;
    }
    const targetPage = Math.floor(idx / PAGE_SIZE);
    setPage(targetPage);
    setExpandedCids((prev) => new Set(prev).add(cid));
    // wait for render then scroll
    setTimeout(() => {
      const el = document.getElementById(`audit-row-${rowId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-primary", "ring-offset-2");
        setTimeout(() => el.classList.remove("ring-2", "ring-primary", "ring-offset-2"), 2500);
      }
    }, 80);
  }, [filtered]);

  // ─── Metrics ───
  const metrics = useMemo(() => {
    const retriesByCid = new Map<string, number>();
    const durationsBySuccess: number[] = [];
    let totalAttempts = 0;
    let successCount = 0;
    let failedCount = 0;
    for (const r of filtered) {
      const meta = (r.metadata || {}) as any;
      const retries = Number(meta.retries ?? 0);
      const attempts = retries + 1;
      totalAttempts += attempts;
      if (retries > 0) {
        retriesByCid.set(r.correlation_id, (retriesByCid.get(r.correlation_id) || 0) + retries);
      }
      if (r.outcome === "success") {
        successCount++;
        const d = Number(meta.duration_ms);
        if (Number.isFinite(d) && d > 0) durationsBySuccess.push(d);
      } else if (r.outcome === "failed") {
        failedCount++;
      }
    }
    const avgMs = durationsBySuccess.length
      ? durationsBySuccess.reduce((a, b) => a + b, 0) / durationsBySuccess.length
      : 0;
    const topRetries = [...retriesByCid.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    return {
      totalRows: filtered.length,
      totalAttempts,
      successCount,
      failedCount,
      avgTimeToSuccessMs: Math.round(avgMs),
      retriesCorrelationCount: retriesByCid.size,
      topRetries,
    };
  }, [filtered]);

  // ─── Presets ───
  const handleSavePreset = () => {
    const name = presetName.trim();
    if (!name) {
      toast.info("Dê um nome ao preset.");
      return;
    }
    const preset: FilterPreset = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      outcome,
      from,
      to,
      search,
    };
    const next = [...presets, preset];
    setPresets(next);
    savePresets(next);
    setPresetName("");
    toast.success(`Preset "${name}" salvo.`);
  };

  const applyPreset = (p: FilterPreset) => {
    setOutcome(p.outcome);
    setFrom(p.from);
    setTo(p.to);
    setSearch(p.search);
    setPage(0);
    toast.success(`Preset "${p.name}" aplicado.`);
  };

  const deletePreset = (id: string) => {
    const next = presets.filter((p) => p.id !== id);
    setPresets(next);
    savePresets(next);
  };

  // ─── Exports ───
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
      "attempt_count",
      "retries",
      "duration_ms",
      "meta_error_code",
      "meta_duration_breakdown",
      "meta_offline_queued",
      "meta_replayed_at",
      "meta_raw",
    ];
    const lines = filtered.map((r) => {
      const meta = (r.metadata || {}) as any;
      const retries = Number(meta.retries ?? 0);
      const attempts = retries + 1;
      const metaErrorCode = meta.error_code ?? meta.code ?? "";
      const durationBreakdown =
        meta.duration_breakdown
          ? JSON.stringify(meta.duration_breakdown)
          : meta.duration_ms !== undefined && retries > 0
          ? `total:${meta.duration_ms}|avg_per_attempt:${Math.round(Number(meta.duration_ms) / Math.max(1, attempts))}`
          : meta.duration_ms !== undefined
          ? `total:${meta.duration_ms}`
          : "";
      const offlineQueued = meta.offline_queued ?? "";
      const replayedAt = meta.replayed_at ?? "";
      let rawMeta = "";
      try {
        rawMeta = JSON.stringify(meta);
      } catch {
        rawMeta = "";
      }
      return [
        r.created_at,
        r.outcome,
        r.user_id,
        r.attempted_mode,
        r.previous_mode || "",
        (r.reason || "").replace(/"/g, '""'),
        r.error_code || "",
        r.unlock_date || "",
        r.correlation_id,
        attempts,
        retries,
        meta.duration_ms ?? "",
        metaErrorCode,
        durationBreakdown,
        offlineQueued,
        replayedAt,
        rawMeta.replace(/"/g, '""'),
      ]
        .map((v) => `"${String(v).replace(/\n/g, " ")}"`)
        .join(",");
    });
    // Header section: applied filters context (commented rows recognised by Excel/CSV viewers)
    const exportedAt = new Date().toISOString();
    const escapeCsv = (v: string) => `"${v.replace(/"/g, '""').replace(/\n/g, " ")}"`;
    const filterHeader = [
      `# FitJourney — Auditoria Modo de Experiência`,
      `# Exportado em: ${exportedAt}`,
      `# Filtros aplicados:`,
      `#   outcome=${outcome}`,
      `#   de=${from || "—"}`,
      `#   até=${to || "—"}`,
      `#   busca=${search || "—"}`,
      `#   total_registros=${filtered.length}`,
      ``,
    ].map((l) => escapeCsv(l)).join("\n");
    const csv = [filterHeader, header.join(","), ...lines].join("\n");
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

      {/* High-retry alert */}
      {highRetryCids.length > 0 && (
        <Card
          data-testid="emode-high-retry-alert"
          className="border-destructive/40 bg-destructive/5"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4" />
              {highRetryCids.length} correlationId(s) com retries ≥ {retryThreshold}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Label className="text-xs">Limite de retries</Label>
              <Input
                type="number"
                min={1}
                value={retryThreshold}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (Number.isFinite(n) && n > 0) setRetryThreshold(n);
                }}
                className="h-8 w-20"
                data-testid="emode-retry-threshold-input"
              />
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2 top-2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  type="search"
                  value={highRetrySearch}
                  onChange={(e) => setHighRetrySearch(e.target.value)}
                  placeholder="Filtrar por correlationId…"
                  className="h-8 pl-7 text-xs"
                  data-testid="emode-high-retry-search"
                  aria-label="Filtrar correlationIds com retries acima do limite"
                />
              </div>
            </div>
            {(() => {
              const q = highRetrySearch.trim().toLowerCase();
              const visible = q
                ? highRetryCids.filter((it) => it.cid.toLowerCase().includes(q))
                : highRetryCids;
              if (visible.length === 0) {
                return (
                  <p
                    className="text-xs text-muted-foreground py-2"
                    data-testid="emode-high-retry-empty"
                  >
                    Nenhum correlationId corresponde à busca.
                  </p>
                );
              }
              return (
                <ul className="space-y-1.5 max-h-48 overflow-auto">
                  {visible.slice(0, 20).map((item) => {
                    const badge = OUTCOME_BADGES[item.lastOutcome] || {
                      label: item.lastOutcome,
                      className: "bg-muted",
                    };
                    return (
                      <li
                        key={item.cid}
                        data-testid="emode-high-retry-row"
                        className="flex items-center justify-between gap-2 text-xs border border-destructive/20 rounded px-2 py-1.5 bg-background"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono truncate">{item.cid}</span>
                          <Badge variant="outline" className={badge.className}>
                            {badge.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-destructive font-semibold">
                            {item.retries} retries
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => jumpToRow(item.cid, item.firstId)}
                            className="h-7 text-[11px] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
                            data-testid="emode-jump-to-audit"
                            aria-label={`Ver na auditoria o correlationId ${item.cid}`}
                          >
                            Ver na auditoria →
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              );
            })()}
          </CardContent>
        </Card>
      )}

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

      {/* Saved filter presets */}
      <Card data-testid="emode-presets-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" /> Presets de filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Nome do preset (ex: Falhas hoje)"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="h-8 text-xs"
              data-testid="emode-preset-name-input"
            />
            <Button size="sm" variant="outline" onClick={handleSavePreset} data-testid="emode-preset-save">
              <Save className="w-4 h-4 mr-1" /> Salvar
            </Button>
          </div>
          {presets.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nenhum preset salvo. Configure os filtros acima e dê um nome para salvar.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2" data-testid="emode-presets-list">
              {presets.map((p) => (
                <div
                  key={p.id}
                  className="inline-flex items-center gap-1 border border-border rounded-md bg-muted/30 pl-2"
                >
                  <button
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="text-xs font-medium py-1.5 px-1 hover:underline"
                    data-testid="emode-preset-apply"
                  >
                    {p.name}
                  </button>
                  <span className="text-[10px] text-muted-foreground">
                    {p.outcome}
                    {p.from || p.to ? ` · ${p.from || "…"}→${p.to || "…"}` : ""}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deletePreset(p.id)}
                    className="h-7 w-7"
                    aria-label={`Excluir preset ${p.name}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metrics panel */}
      <Card data-testid="emode-metrics-panel">
        <CardHeader>
          <CardTitle className="text-base">Métricas (filtros aplicados)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Sucessos</div>
            <div className="text-xl font-bold text-emerald-600" data-testid="metrics-success">
              {metrics.successCount}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Falhas</div>
            <div className="text-xl font-bold text-destructive" data-testid="metrics-failed">
              {metrics.failedCount}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Tempo médio até sucesso
            </div>
            <div className="text-xl font-bold" data-testid="metrics-avg-success">
              {metrics.avgTimeToSuccessMs > 0
                ? `${metrics.avgTimeToSuccessMs} ms`
                : "—"}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Correlations c/ retries
            </div>
            <div className="text-xl font-bold" data-testid="metrics-retry-cids">
              {metrics.retriesCorrelationCount}
            </div>
          </div>
          {metrics.topRetries.length > 0 && (
            <div className="col-span-2 sm:col-span-4 mt-1">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                Top correlationIds por retries
              </div>
              <ul className="space-y-1" data-testid="metrics-top-retries">
                {metrics.topRetries.map(([cid, count]) => (
                  <li
                    key={cid}
                    className="flex justify-between items-center text-xs font-mono border border-border/50 rounded px-2 py-1"
                  >
                    <span className="truncate">{cid}</span>
                    <span className="text-muted-foreground ml-2 shrink-0">
                      {count} retries
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
                    <th className="py-2 pr-3 font-medium w-6"></th>
                    <th className="py-2 pr-3 font-medium">Quando</th>
                    <th className="py-2 pr-3 font-medium">Resultado</th>
                    <th className="py-2 pr-3 font-medium">Usuário</th>
                    <th className="py-2 pr-3 font-medium">Contexto</th>
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
                    const group = groupedByCid.get(r.correlation_id) || [];
                    const hasTimeline = group.length > 1;
                    const isExpanded = expandedCids.has(r.correlation_id);
                    const breakdown = hasTimeline ? buildOutcomeBreakdown(group) : null;
                    return (
                      <Fragment key={r.id}>
                        <tr
                          id={`audit-row-${r.id}`}
                          className="border-b border-border/50 align-top transition-shadow"
                        >
                          <td className="py-2 pr-1">
                            {hasTimeline && (
                              <button
                                type="button"
                                onClick={() => toggleCid(r.correlation_id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    toggleCid(r.correlation_id);
                                  }
                                }}
                                aria-label={isExpanded ? "Recolher timeline" : "Expandir timeline"}
                                aria-expanded={isExpanded}
                                aria-controls={`timeline-${r.correlation_id}`}
                                className="rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
                                data-testid="emode-timeline-toggle"
                              >
                                {isExpanded
                                  ? <ChevronUp className="w-3.5 h-3.5" />
                                  : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </td>
                          <td className="py-2 pr-3 whitespace-nowrap">
                            {new Date(r.created_at).toLocaleString("pt-BR")}
                          </td>
                          <td className="py-2 pr-3">
                            <Badge variant="outline" className={badge.className}>
                              {badge.label}
                            </Badge>
                          </td>
                          <td className="py-2 pr-3 font-mono text-[10px]">{r.user_id}</td>
                          <td className="py-2 pr-3">
                            <div className="flex flex-col gap-0.5" data-testid="emode-context-cell">
                              {(r.metadata as any)?.is_admin ? (
                                <Badge variant="outline" className="bg-primary/10 text-primary text-[9px] py-0 h-4 w-fit" data-testid="emode-badge-admin">
                                  admin
                                </Badge>
                              ) : null}
                              {(r.metadata as any)?.was_locked ? (
                                <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[9px] py-0 h-4 w-fit" data-testid="emode-badge-locked">
                                  bloqueado
                                </Badge>
                              ) : null}
                              {!(r.metadata as any)?.is_admin && !(r.metadata as any)?.was_locked ? (
                                <span className="text-muted-foreground text-[10px]">—</span>
                              ) : null}
                            </div>
                          </td>
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
                          <td className="py-2 pr-3 font-mono text-[10px]">
                            <div className="flex items-center gap-1">
                              <span>{r.correlation_id}</span>
                              {hasTimeline && (
                                <Badge variant="outline" className="text-[9px] py-0 h-4">
                                  {group.length}×
                                </Badge>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Timeline row */}
                        {hasTimeline && isExpanded && (
                          <tr key={`${r.id}-timeline`} className="border-b border-border/50 bg-muted/20">
                            <td></td>
                            <td colSpan={7} className="py-3 px-3">
                              <div
                                id={`timeline-${r.correlation_id}`}
                                data-testid="emode-timeline"
                                role="region"
                                aria-label={`Timeline do correlationId ${r.correlation_id}`}
                                className="space-y-2"
                              >
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  <span>Timeline ({group.length} eventos)</span>
                                  {breakdown && (
                                    <div className="flex gap-1 flex-wrap">
                                      {Object.entries(breakdown).map(([k, v]) => (
                                        <Badge
                                          key={k}
                                          variant="outline"
                                          className={`${OUTCOME_BADGES[k]?.className || "bg-muted"} text-[9px] py-0 h-4`}
                                        >
                                          {OUTCOME_BADGES[k]?.label || k}: {v}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <ol
                                  className="relative border-l-2 border-border ml-2 space-y-2"
                                  aria-label="Eventos do correlationId em ordem cronológica"
                                >
                                  {group.map((g, idx) => {
                                    const gBadge = OUTCOME_BADGES[g.outcome] || {
                                      label: g.outcome,
                                      className: "bg-muted",
                                    };
                                    const gMeta = (g.metadata || {}) as any;
                                    const focusStep = () => jumpToRow(g.correlation_id, g.id);
                                    return (
                                      <li
                                        key={g.id}
                                        data-testid="emode-timeline-step"
                                        tabIndex={0}
                                        role="button"
                                        aria-label={`Evento ${idx + 1} de ${group.length}: ${gBadge.label} em ${new Date(g.created_at).toLocaleString("pt-BR")}`}
                                        onClick={focusStep}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            focusStep();
                                          }
                                        }}
                                        className="ml-3 pl-3 rounded cursor-pointer hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
                                      >
                                        <span className="absolute -left-[7px] mt-1 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                                        <div className="flex items-center gap-2 text-[11px]">
                                          <span className="font-mono text-muted-foreground">
                                            #{idx + 1}
                                          </span>
                                          <span className="whitespace-nowrap">
                                            {new Date(g.created_at).toLocaleString("pt-BR")}
                                          </span>
                                          <Badge variant="outline" className={gBadge.className}>
                                            {gBadge.label}
                                          </Badge>
                                          {gMeta.duration_ms !== undefined && (
                                            <span className="text-muted-foreground">
                                              {gMeta.duration_ms}ms
                                            </span>
                                          )}
                                          {gMeta.retries !== undefined && Number(gMeta.retries) > 0 && (
                                            <span className="text-amber-600">
                                              {gMeta.retries} retries
                                            </span>
                                          )}
                                        </div>
                                        {g.reason && (
                                          <div className="text-[10px] text-muted-foreground mt-0.5">
                                            {g.reason}
                                          </div>
                                        )}
                                      </li>
                                    );
                                  })}
                                </ol>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
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
