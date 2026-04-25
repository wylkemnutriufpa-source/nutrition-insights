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
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AuditStatus | "all">("all");
  const [publishingId, setPublishingId] = useState<string | null>(null);

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
      if (!term) return true;
      return (r.patient_name ?? "").toLowerCase().includes(term);
    });
  }, [rows, search, statusFilter]);

  const handleQuickPublish = async (row: AuditRow) => {
    if (!user || !row.latest_plan_id) return;
    setPublishingId(row.latest_plan_id);
    try {
      const { publishMealPlan } = await import("@/lib/serverTransitions");
      const result = await publishMealPlan(row.latest_plan_id, user.id);
      if (!result.success) {
        throw new Error(result.error || "Erro ao publicar.");
      }
      toast.success(`✅ Plano publicado para ${row.patient_name ?? "paciente"}.`);
      await load();
    } catch (err: any) {
      console.error("[PlanAudit] publish error", err);
      toast.error(err?.message || "Erro ao publicar o plano.");
    } finally {
      setPublishingId(null);
    }
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

      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-display font-bold">
          Auditoria de Planos
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Visão única do estado de cada paciente. Identifique quem está sem plano,
          quem precisa publicar e abra o editor com 1 clique.
        </p>
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
              onClick={() => setStatusFilter(active ? "all" : s)}
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
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar paciente…"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          {statusFilter !== "all" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStatusFilter("all")}
            >
              Limpar filtro
            </Button>
          )}
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
