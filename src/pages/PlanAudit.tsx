import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Sparkles,
  ExternalLink,
  Search,
  Download,
  Calendar,
  X,
  Zap,
  ShieldCheck,
  Activity,
  User,
  Info,
  ChevronRight,
  Database,
  Terminal,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Zap,
  ShieldCheck,
  Activity,
  User,
  Info,
  ChevronRight,
  Database,
  Terminal,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import jsPDF from "jspdf";
import "jspdf-autotable";

type AuditStatus =
  | "OK_PUBLICADO"
  | "APROVADO_NAO_PUBLICADO"
  | "SO_RASCUNHO"
  | "SEM_PLANO";

interface AuditRow {
  patient_id: string;
  patient_name: string | null;
  published_count: number;
  approved_count: number;
  draft_count: number;
  total_plans: number;
  latest_plan_id: string | null;
  latest_plan_status: string | null;
  latest_validation_status: string | null;
  latest_updated_at: string | null;
  audit_status: AuditStatus;
}

const STATUS_META: Record<
  AuditStatus,
  { label: string; tone: string; icon: JSX.Element; description: string }
> = {
  OK_PUBLICADO: {
    label: "Publicado",
    tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    description: "Paciente já tem plano ativo publicado.",
  },
  APROVADO_NAO_PUBLICADO: {
    label: "Aprovado — falta publicar",
    tone: "bg-amber-500/15 text-amber-700 dark:text-amber-200 border-amber-500/30",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    description: "Plano aprovado pelo motor clínico, basta publicar.",
  },
  SO_RASCUNHO: {
    label: "Rascunho",
    tone: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    icon: <FileText className="w-3.5 h-3.5" />,
    description: "Existe rascunho — abra o editor para validar e publicar.",
  },
  SEM_PLANO: {
    label: "Sem plano",
    tone: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
    icon: <XCircle className="w-3.5 h-3.5" />,
    description: "Paciente ainda não recebeu nenhum plano alimentar.",
  },
};

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
};

const PlanAudit = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  // Filters from URL
  const search = searchParams.get("q") || "";
  const statusFilter = (searchParams.get("status") as AuditStatus | "all") || "all";
  const dateFrom = searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined;
  const dateTo = searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined;

  const setFilter = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next, { replace: true });
  };

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc(
        "get_nutritionist_patients_plan_audit"
      );
      if (error) throw error;
      setRows((data ?? []) as AuditRow[]);
    } catch (err: any) {
      console.error("[PlanAudit] load error", err);
      toast.error(err?.message || "Erro ao carregar auditoria de planos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.total += 1;
        acc[r.audit_status] += 1;
        return acc;
      },
      {
        total: 0,
        OK_PUBLICADO: 0,
        APROVADO_NAO_PUBLICADO: 0,
        SO_RASCUNHO: 0,
        SEM_PLANO: 0,
      } as Record<string, number>
    );
  }, [rows]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.audit_status !== statusFilter) return false;
      if (term && !(r.patient_name ?? "").toLowerCase().includes(term)) return false;
      
      if (dateFrom || dateTo) {
        if (!r.latest_updated_at) return false;
        const d = new Date(r.latest_updated_at);
        if (dateFrom && d < dateFrom) return false;
        if (dateTo && d > dateTo) return false;
      }
      
      return true;
    });
  }, [rows, search, statusFilter, dateFrom, dateTo]);

  const handleQuickPublish = async (row: AuditRow) => {
    if (!user || !row.latest_plan_id) return;
    setPublishingId(row.latest_plan_id);
    const toastId = toast.loading(`Publicando plano para ${row.patient_name}...`);
    try {
      const { publishMealPlan } = await import("@/lib/serverTransitions");
      const result = await publishMealPlan(row.latest_plan_id, user.id);
      if (!result.success) {
        throw new Error(result.error || "Erro ao publicar.");
      }
      toast.success(`✅ Plano publicado para ${row.patient_name ?? "paciente"}.`, { id: toastId });
      await load();
    } catch (err: any) {
      console.error("[PlanAudit] publish error", err);
      toast.error(err?.message || "Erro ao publicar o plano.", { id: toastId });
    } finally {
      setPublishingId(null);
    }
  };

  const handleBatchGenerate = async () => {
    const targets = rows.filter(r => r.audit_status === "SEM_PLANO");
    if (targets.length === 0) {
      toast.info("Nenhum paciente sem plano para processar.");
      return;
    }

    if (!confirm(`Deseja gerar e validar planos para ${targets.length} pacientes?`)) return;

    setBatchProcessing(true);
    const results = { success: 0, fail: 0 };
    
    const toastId = toast.loading(`Processando ${targets.length} pacientes...`);

    for (const target of targets) {
      try {
        const { data, error } = await supabase.functions.invoke("generate-meal-plan", {
          body: {
            patientId: target.patient_id,
            nutritionistId: user?.id,
            isPipeline: false,
          },
        });

        if (error || !data?.success) throw new Error(data?.error || "Erro na geração");
        
        results.success++;
      } catch (err) {
        console.error(`Batch generate error for ${target.patient_name}:`, err);
        results.fail++;
      }
    }

    toast.success(`Lote finalizado: ${results.success} aprovados, ${results.fail} falharam.`, { id: toastId });
    setBatchProcessing(false);
    await load();
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const now = format(new Date(), "dd/MM/yyyy HH:mm");
    
    doc.setFontSize(18);
    doc.text("Relatório de Auditoria de Planos", 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${now}`, 14, 28);

    // Summary table
    (doc as any).autoTable({
      startY: 35,
      head: [["Status", "Quantidade"]],
      body: [
        ["Total de Pacientes", summary.total],
        ["Publicados", summary.OK_PUBLICADO],
        ["Aprovados", summary.APROVADO_NAO_PUBLICADO],
        ["Rascunhos", summary.SO_RASCUNHO],
        ["Sem Plano", summary.SEM_PLANO],
      ],
    });

    // Patients table
    const tableBody = filtered.map(r => [
      r.patient_name || "Sem nome",
      STATUS_META[r.audit_status].label,
      formatDate(r.latest_updated_at),
      `${r.published_count} P / ${r.approved_count} A / ${r.draft_count} R`
    ]);

    (doc as any).autoTable({
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [["Paciente", "Status", "Último Update", "P/A/R"]],
      body: tableBody,
    });

    doc.save(`auditoria-planos-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("PDF gerado com sucesso!");
  };

  return (
    <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
      <Helmet>
        <title>Auditoria de Planos — FitJourney</title>
        <meta
          name="description"
          content="Veja em uma tela só quais pacientes têm plano publicado, aprovado, em rascunho ou sem plano."
        />
        <link rel="canonical" href="/plan-audit" />
      </Helmet>

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-display font-bold">
            Auditoria de Planos
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Visão única do estado de cada paciente. Identifique quem está sem plano,
            quem precisa publicar e abra o editor com 1 clique.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            PDF Relatório
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleBatchGenerate}
            disabled={batchProcessing || loading}
            className="gap-2"
          >
            {batchProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Gerar em Lote
          </Button>
        </div>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Pacientes</p>
          <p className="text-2xl font-bold">{summary.total}</p>
        </Card>
        {(
          [
            "OK_PUBLICADO",
            "APROVADO_NAO_PUBLICADO",
            "SO_RASCUNHO",
            "SEM_PLANO",
          ] as AuditStatus[]
        ).map((s) => {
          const meta = STATUS_META[s];
          const active = statusFilter === s;
          return (
            <Card
              key={s}
              className={`p-4 cursor-pointer transition-colors ${
                active ? "ring-2 ring-primary" : "hover:bg-muted/40"
              }`}
              onClick={() => setFilter("status", active ? undefined : s)}
            >
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {meta.icon}
                <span>{meta.label}</span>
              </div>
              <p className="text-2xl font-bold mt-1">{summary[s] ?? 0}</p>
            </Card>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setFilter("q", e.target.value)}
              placeholder="Nome ou prontuário…"
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Calendar className="w-4 h-4" />
                  {dateFrom || dateTo ? (
                    <>
                      {dateFrom ? format(dateFrom, "dd/MM") : "..."} - {dateTo ? format(dateTo, "dd/MM") : "..."}
                    </>
                  ) : (
                    "Filtrar data"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3 border-b flex items-center justify-between">
                  <span className="text-xs font-medium">Faixa de atualização</span>
                  {(dateFrom || dateTo) && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6" 
                      onClick={() => {
                        setFilter("from", undefined);
                        setFilter("to", undefined);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row">
                  <div className="p-1">
                    <p className="text-[10px] text-muted-foreground px-2 py-1">Início</p>
                    <CalendarComponent
                      mode="single"
                      selected={dateFrom}
                      onSelect={(d) => setFilter("from", d?.toISOString())}
                      locale={ptBR}
                    />
                  </div>
                  <div className="p-1 border-t sm:border-t-0 sm:border-l">
                    <p className="text-[10px] text-muted-foreground px-2 py-1">Fim</p>
                    <CalendarComponent
                      mode="single"
                      selected={dateTo}
                      onSelect={(d) => setFilter("to", d?.toISOString())}
                      locale={ptBR}
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {(statusFilter !== "all" || search || dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchParams(new URLSearchParams(), { replace: true });
                }}
              >
                Limpar filtros
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Atualizar
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading && rows.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Carregando auditoria…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Nenhum paciente encontrado para os filtros atuais.
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map((row) => {
              const meta = STATUS_META[row.audit_status];
              return (
                <div
                  key={row.patient_id}
                  className="flex flex-col md:flex-row md:items-center gap-3 p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/patients/${row.patient_id}`}
                        className="font-medium truncate hover:underline"
                      >
                        {row.patient_name ?? "Sem nome"}
                      </Link>
                      <Badge
                        variant="outline"
                        className={`text-[10px] gap-1 ${meta.tone}`}
                      >
                        {meta.icon}
                        {meta.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {meta.description} · Atualizado {formatDate(row.latest_updated_at)}
                      {row.total_plans > 0 && (
                        <>
                          {" "}
                          · {row.published_count} publicado(s) ·{" "}
                          {row.approved_count} aprovado(s) ·{" "}
                          {row.draft_count} rascunho(s)
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {row.latest_plan_id && (
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                      >
                        <Link to={`/meal-plans/${row.latest_plan_id}`}>
                          <ExternalLink className="w-3.5 h-3.5" />
                          Abrir editor
                        </Link>
                      </Button>
                    )}
                    {row.audit_status === "APROVADO_NAO_PUBLICADO" && row.latest_plan_id && (
                      <Button
                        size="sm"
                        onClick={() => handleQuickPublish(row)}
                        disabled={publishingId === row.latest_plan_id}
                        className="gap-1.5"
                      >
                        {publishingId === row.latest_plan_id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        Publicar
                      </Button>
                    )}
                    {row.audit_status === "SEM_PLANO" && (
                      <Button
                        asChild
                        size="sm"
                        variant="secondary"
                        className="gap-1.5"
                      >
                        <Link to={`/patients/${row.patient_id}`}>
                          <Sparkles className="w-3.5 h-3.5" />
                          Gerar plano
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default PlanAudit;
