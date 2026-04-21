import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  ShieldAlert,
  Database,
  FileWarning,
  Settings2,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

type FoodItem = {
  name?: string | null;
  portion?: string | null;
  kcal?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
};

type TemplateRow = {
  id: string;
  name: string;
  meal_type: string | null;
  is_global: boolean | null;
  kcal_base: number | null;
  protein_base: number | null;
  carbs_base: number | null;
  fat_base: number | null;
  foods_structure: FoodItem[] | null;
  updated_at: string | null;
};

type IssueLevel = "critical" | "warning" | "ok";

type AuditedTemplate = TemplateRow & {
  level: IssueLevel;
  issues: string[];
  itemsTotal: number;
  itemsBroken: number;
};

const isMissingNumber = (v: unknown): boolean =>
  v === null || v === undefined || Number.isNaN(Number(v));

const isItemBroken = (item: FoodItem): boolean => {
  if (!item || !item.name || String(item.name).trim() === "") return true;
  // any macro missing/NaN -> broken (will produce NaN in totals)
  return (
    isMissingNumber(item.kcal) ||
    isMissingNumber(item.protein) ||
    isMissingNumber(item.carbs) ||
    isMissingNumber(item.fat)
  );
};

function auditTemplate(t: TemplateRow): AuditedTemplate {
  const issues: string[] = [];
  const items = Array.isArray(t.foods_structure) ? t.foods_structure : [];
  const itemsTotal = items.length;
  const itemsBroken = items.filter(isItemBroken).length;

  if (itemsTotal === 0) issues.push("Template sem itens (foods_structure vazio)");
  if (isMissingNumber(t.kcal_base) || Number(t.kcal_base) <= 0)
    issues.push("kcal_base ausente ou zero (causa NaN/divisão por zero)");
  if (isMissingNumber(t.protein_base)) issues.push("protein_base ausente");
  if (isMissingNumber(t.carbs_base)) issues.push("carbs_base ausente");
  if (isMissingNumber(t.fat_base)) issues.push("fat_base ausente");
  if (itemsBroken > 0)
    issues.push(`${itemsBroken}/${itemsTotal} itens com macros inválidos (NaN no UI)`);

  let level: IssueLevel = "ok";
  if (
    itemsTotal === 0 ||
    isMissingNumber(t.kcal_base) ||
    Number(t.kcal_base) <= 0 ||
    itemsBroken > 0
  ) {
    level = "critical";
  } else if (issues.length > 0) {
    level = "warning";
  }

  return { ...t, level, issues, itemsTotal, itemsBroken };
}

const levelStyles: Record<IssueLevel, { label: string; cls: string }> = {
  critical: { label: "Crítico", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  warning: { label: "Atenção", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  ok: { label: "OK", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
};

export default function TemplateNutritionAudit() {
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"critical" | "warning" | "ok" | "all">("critical");

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("nutritionist_meal_templates")
      .select(
        "id, name, meal_type, is_global, kcal_base, protein_base, carbs_base, fat_base, foods_structure, updated_at",
      )
      .order("updated_at", { ascending: false })
      .limit(1000);

    if (error) {
      toast.error("Falha ao carregar templates", { description: error.message });
      setRows([]);
    } else {
      setRows((data || []) as TemplateRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const audited = useMemo(() => rows.map(auditTemplate), [rows]);

  const counts = useMemo(
    () => ({
      critical: audited.filter((t) => t.level === "critical").length,
      warning: audited.filter((t) => t.level === "warning").length,
      ok: audited.filter((t) => t.level === "ok").length,
      all: audited.length,
    }),
    [audited],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return audited
      .filter((t) => (tab === "all" ? true : t.level === tab))
      .filter((t) => (q ? (t.name || "").toLowerCase().includes(q) : true))
      .sort((a, b) => b.itemsBroken - a.itemsBroken || a.name.localeCompare(b.name));
  }, [audited, tab, search]);

  const releaseReady = counts.critical === 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-primary" />
              Auditoria Nutricional de Templates
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Templates com macros faltantes que produzem <code className="text-xs">NaN</code> no
              modal de marmitas. Corrija os críticos antes do release.
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1 font-mono">
              TEMPLATE_NUTRITION_AUDIT v1.0.0 · BLOCKING_RELEASE: {releaseReady ? "no" : "yes"}
            </p>
          </div>
          <Button onClick={fetchTemplates} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Reescanear
          </Button>
        </div>

        {/* Release readiness banner */}
        <Card
          className={
            releaseReady
              ? "border-emerald-500/40 bg-emerald-500/5"
              : "border-destructive/40 bg-destructive/5"
          }
        >
          <CardContent className="py-4 flex items-center gap-3">
            {releaseReady ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
            )}
            <div className="text-sm">
              {releaseReady ? (
                <span>
                  Todos os templates estão íntegros. Nenhum bloqueio para release.
                </span>
              ) : (
                <span>
                  <strong>{counts.critical}</strong> template(s) crítico(s) com macros inválidos —
                  causarão <code className="text-xs">NaN</code> nos cards de refeição. Corrija antes
                  de publicar.
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Críticos" value={counts.critical} icon={AlertTriangle} tone="critical" />
          <StatCard label="Atenção" value={counts.warning} icon={FileWarning} tone="warning" />
          <StatCard label="OK" value={counts.ok} icon={CheckCircle2} tone="ok" />
          <StatCard label="Total" value={counts.all} icon={Database} tone="neutral" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Checklist de correção</CardTitle>
            <CardDescription>
              Comece pelos críticos. Cada linha lista o que falta para o template renderizar macros
              válidos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome do template..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList>
                <TabsTrigger value="critical">Críticos ({counts.critical})</TabsTrigger>
                <TabsTrigger value="warning">Atenção ({counts.warning})</TabsTrigger>
                <TabsTrigger value="ok">OK ({counts.ok})</TabsTrigger>
                <TabsTrigger value="all">Todos ({counts.all})</TabsTrigger>
              </TabsList>

              <TabsContent value={tab} className="mt-4">
                {loading ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    Carregando templates…
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    Nada a corrigir nesta categoria. ✨
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[28%]">Template</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="hidden md:table-cell">Itens</TableHead>
                          <TableHead className="hidden lg:table-cell">Base</TableHead>
                          <TableHead>Problemas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((t) => (
                          <TableRow key={t.id}>
                            <TableCell>
                              <div className="font-medium">{t.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {t.meal_type || "—"}
                                {t.is_global ? " · global" : ""}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={levelStyles[t.level].cls}>
                                {levelStyles[t.level].label}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm">
                              <span
                                className={
                                  t.itemsBroken > 0 ? "text-destructive font-medium" : ""
                                }
                              >
                                {t.itemsBroken}/{t.itemsTotal}
                              </span>
                              <div className="text-xs text-muted-foreground">quebrados/total</div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-xs font-mono">
                              {t.kcal_base ?? "—"}kcal · P{t.protein_base ?? "—"} · C
                              {t.carbs_base ?? "—"} · G{t.fat_base ?? "—"}
                            </TableCell>
                            <TableCell>
                              {t.issues.length === 0 ? (
                                <span className="text-xs text-muted-foreground">Nenhum</span>
                              ) : (
                                <ul className="text-xs space-y-1">
                                  {t.issues.map((iss, i) => (
                                    <li key={i} className="flex items-start gap-1.5">
                                      <span className="text-destructive">•</span>
                                      <span>{iss}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: "critical" | "warning" | "ok" | "neutral";
}) {
  const toneCls = {
    critical: "text-destructive",
    warning: "text-amber-600",
    ok: "text-emerald-600",
    neutral: "text-muted-foreground",
  }[tone];

  return (
    <Card>
      <CardContent className="py-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
          <div className={`text-2xl font-bold ${toneCls}`}>{value}</div>
        </div>
        <Icon className={`w-6 h-6 ${toneCls}`} />
      </CardContent>
    </Card>
  );
}
