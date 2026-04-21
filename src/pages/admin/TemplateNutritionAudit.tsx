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
  History,
  Undo2,
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
type RuleSeverity = "critical" | "warning" | "ignore";

type RuleKey =
  | "noItems"
  | "kcalBaseMissing"
  | "proteinBaseMissing"
  | "carbsBaseMissing"
  | "fatBaseMissing"
  | "itemsBroken";

type AuditConfig = Record<RuleKey, RuleSeverity>;

const RULE_LABELS: Record<RuleKey, { label: string; description: string; defaultRecommend: RuleSeverity }> = {
  noItems: {
    label: "Template sem itens",
    description: "foods_structure vazio — modal não consegue renderizar refeição.",
    defaultRecommend: "critical",
  },
  kcalBaseMissing: {
    label: "kcal_base ausente ou zero",
    description: "Causa divisão por zero no multiplicador de porções → NaN no UI.",
    defaultRecommend: "critical",
  },
  proteinBaseMissing: {
    label: "protein_base ausente",
    description: "Macro base de proteína nulo. Pode ser tolerado se itens tiverem proteína própria.",
    defaultRecommend: "warning",
  },
  carbsBaseMissing: {
    label: "carbs_base ausente",
    description: "Macro base de carboidrato nulo. Pode ser tolerado se itens tiverem carbo próprio.",
    defaultRecommend: "warning",
  },
  fatBaseMissing: {
    label: "fat_base ausente",
    description: "Macro base de gordura nulo. Pode ser tolerado se itens tiverem gordura própria.",
    defaultRecommend: "warning",
  },
  itemsBroken: {
    label: "Itens com macros inválidos",
    description: "Algum item do template tem nome vazio ou kcal/protein/carbs/fat nulo → NaN nos cards.",
    defaultRecommend: "critical",
  },
};

const RULE_KEYS = Object.keys(RULE_LABELS) as RuleKey[];

const DEFAULT_CONFIG: AuditConfig = RULE_KEYS.reduce((acc, k) => {
  acc[k] = RULE_LABELS[k].defaultRecommend;
  return acc;
}, {} as AuditConfig);

async function fetchConfigFromDB(): Promise<AuditConfig> {
  const { data, error } = await supabase
    .from("template_audit_rules_config")
    .select("rule_key, severity");

  if (error || !data) return DEFAULT_CONFIG;

  return RULE_KEYS.reduce((acc, k) => {
    const row = data.find((r) => r.rule_key === k);
    const sev = row?.severity;
    acc[k] = sev === "critical" || sev === "warning" || sev === "ignore" ? sev : DEFAULT_CONFIG[k];
    return acc;
  }, {} as AuditConfig);
}

async function upsertRuleInDB(key: RuleKey, severity: RuleSeverity): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from("template_audit_rules_config").upsert(
    {
      rule_key: key,
      severity,
      updated_by: userData.user?.id ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "rule_key" },
  );
  if (error) throw error;
}

async function resetRulesInDB(): Promise<void> {
  // Delete all rows -> next read returns DEFAULT_CONFIG via fallback merge.
  const { error } = await supabase
    .from("template_audit_rules_config")
    .delete()
    .neq("rule_key", "__never__");
  if (error) throw error;
}

type RuleVersion = {
  id: string;
  version_number: number;
  snapshot: Record<string, RuleSeverity>;
  change_summary: string | null;
  changed_rule_key: string | null;
  previous_severity: string | null;
  new_severity: string | null;
  action: "upsert" | "delete" | "reset" | "manual_snapshot";
  created_at: string;
  created_by: string | null;
};

async function fetchVersionsFromDB(): Promise<RuleVersion[]> {
  const { data, error } = await supabase
    .from("template_audit_rules_versions")
    .select(
      "id, version_number, snapshot, change_summary, changed_rule_key, previous_severity, new_severity, action, created_at, created_by",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (error || !data) return [];
  return data as unknown as RuleVersion[];
}

async function revertToVersionInDB(versionId: string): Promise<void> {
  const { error } = await supabase.rpc("revert_template_audit_rules_to_version", {
    _version_id: versionId,
  });
  if (error) throw error;
}

type AuditedTemplate = TemplateRow & {
  level: IssueLevel;
  issues: { key: RuleKey; message: string; severity: RuleSeverity }[];
  itemsTotal: number;
  itemsBroken: number;
};

const isMissingNumber = (v: unknown): boolean =>
  v === null || v === undefined || Number.isNaN(Number(v));

const isItemBroken = (item: FoodItem): boolean => {
  if (!item || !item.name || String(item.name).trim() === "") return true;
  return (
    isMissingNumber(item.kcal) ||
    isMissingNumber(item.protein) ||
    isMissingNumber(item.carbs) ||
    isMissingNumber(item.fat)
  );
};

function auditTemplate(t: TemplateRow, config: AuditConfig): AuditedTemplate {
  const items = Array.isArray(t.foods_structure) ? t.foods_structure : [];
  const itemsTotal = items.length;
  const itemsBroken = items.filter(isItemBroken).length;

  const triggered: { key: RuleKey; message: string }[] = [];

  if (itemsTotal === 0) triggered.push({ key: "noItems", message: "Template sem itens (foods_structure vazio)" });
  if (isMissingNumber(t.kcal_base) || Number(t.kcal_base) <= 0)
    triggered.push({ key: "kcalBaseMissing", message: "kcal_base ausente ou zero (causa NaN/divisão por zero)" });
  if (isMissingNumber(t.protein_base))
    triggered.push({ key: "proteinBaseMissing", message: "protein_base ausente" });
  if (isMissingNumber(t.carbs_base))
    triggered.push({ key: "carbsBaseMissing", message: "carbs_base ausente" });
  if (isMissingNumber(t.fat_base)) triggered.push({ key: "fatBaseMissing", message: "fat_base ausente" });
  if (itemsBroken > 0)
    triggered.push({
      key: "itemsBroken",
      message: `${itemsBroken}/${itemsTotal} itens com macros inválidos (NaN no UI)`,
    });

  // Apply user-configured severity, drop ignored.
  const issues = triggered
    .map((t) => ({ ...t, severity: config[t.key] }))
    .filter((i) => i.severity !== "ignore");

  let level: IssueLevel = "ok";
  if (issues.some((i) => i.severity === "critical")) level = "critical";
  else if (issues.some((i) => i.severity === "warning")) level = "warning";

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
  const [config, setConfig] = useState<AuditConfig>(DEFAULT_CONFIG);
  const [configLoading, setConfigLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<RuleKey | null>(null);
  const [resetting, setResetting] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<RuleVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [revertingId, setRevertingId] = useState<string | null>(null);

  const refreshVersions = async () => {
    setVersionsLoading(true);
    try {
      const v = await fetchVersionsFromDB();
      setVersions(v);
    } finally {
      setVersionsLoading(false);
    }
  };

  // Initial config load + realtime subscription so all admins stay in sync.
  useEffect(() => {
    let mounted = true;
    setConfigLoading(true);
    fetchConfigFromDB()
      .then((c) => {
        if (mounted) setConfig(c);
      })
      .finally(() => {
        if (mounted) setConfigLoading(false);
      });

    const channel = supabase
      .channel("template-audit-rules-config")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "template_audit_rules_config" },
        () => {
          fetchConfigFromDB().then((c) => {
            if (mounted) setConfig(c);
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "template_audit_rules_versions" },
        () => {
          if (mounted) refreshVersions();
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Load versions when history sheet opens
  useEffect(() => {
    if (historyOpen) refreshVersions();
  }, [historyOpen]);

  const revertToVersion = async (v: RuleVersion) => {
    if (
      !window.confirm(
        `Reverter para a versão #${v.version_number}?\n\nIsso substituirá todas as regras atuais pelo snapshot desta versão. Uma nova entrada será criada no histórico para que você possa desfazer.`,
      )
    ) {
      return;
    }
    setRevertingId(v.id);
    try {
      await revertToVersionInDB(v.id);
      const fresh = await fetchConfigFromDB();
      setConfig(fresh);
      toast.success(`Configuração revertida para versão #${v.version_number}`);
    } catch (err) {
      toast.error("Falha ao reverter", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setRevertingId(null);
    }
  };


  const updateRule = async (key: RuleKey, severity: RuleSeverity) => {
    const previous = config[key];
    setConfig((prev) => ({ ...prev, [key]: severity })); // optimistic
    setSavingKey(key);
    try {
      await upsertRuleInDB(key, severity);
      toast.success("Regra atualizada para todos os admins");
    } catch (err) {
      setConfig((prev) => ({ ...prev, [key]: previous })); // rollback
      toast.error("Falha ao salvar regra", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSavingKey(null);
    }
  };

  const resetConfig = async () => {
    setResetting(true);
    try {
      await resetRulesInDB();
      setConfig(DEFAULT_CONFIG);
      toast.success("Regras restauradas para o padrão (todos os admins)");
    } catch (err) {
      toast.error("Falha ao restaurar regras", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setResetting(false);
    }
  };

  const customizedCount = useMemo(
    () => RULE_KEYS.filter((k) => config[k] !== DEFAULT_CONFIG[k]).length,
    [config],
  );

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

  const audited = useMemo(() => rows.map((r) => auditTemplate(r, config)), [rows, config]);

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
          <div className="flex items-center gap-2">
            <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings2 className="w-4 h-4 mr-2" />
                  Regras
                  {customizedCount > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                      {customizedCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Settings2 className="w-5 h-5" />
                    Regras de classificação
                  </SheetTitle>
                  <SheetDescription>
                    Defina o que conta como <strong>crítico</strong> (bloqueia release),{" "}
                    <strong>atenção</strong> (alerta) ou <strong>ignorar</strong>. Estas regras são{" "}
                    <strong>globais</strong> — aplicam-se a todos os admins e atualizam em tempo
                    real.
                  </SheetDescription>
                </SheetHeader>

                {configLoading ? (
                  <div className="mt-8 text-center text-sm text-muted-foreground">
                    Carregando regras…
                  </div>
                ) : (
                  <div className="mt-6 space-y-5">
                    {RULE_KEYS.map((key) => {
                      const meta = RULE_LABELS[key];
                      const current = config[key];
                      const isCustom = current !== meta.defaultRecommend;
                      const isSaving = savingKey === key;
                      return (
                        <div key={key} className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <Label className="text-sm font-semibold flex items-center gap-2">
                                {meta.label}
                                {isCustom && (
                                  <Badge variant="outline" className="text-[10px] h-4 px-1">
                                    custom
                                  </Badge>
                                )}
                                {isSaving && (
                                  <span className="text-[10px] text-muted-foreground">
                                    salvando…
                                  </span>
                                )}
                              </Label>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {meta.description}
                              </p>
                              <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                                Padrão recomendado:{" "}
                                <code className="text-[11px]">{meta.defaultRecommend}</code>
                              </p>
                            </div>
                          </div>
                          <Select
                            value={current}
                            disabled={isSaving || resetting}
                            onValueChange={(v) => updateRule(key, v as RuleSeverity)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="critical">Crítico (bloqueia release)</SelectItem>
                              <SelectItem value="warning">Atenção (apenas alerta)</SelectItem>
                              <SelectItem value="ignore">Ignorar (não reportar)</SelectItem>
                            </SelectContent>
                          </Select>
                          <Separator className="mt-3" />
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-6 flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetConfig}
                    disabled={resetting || configLoading}
                  >
                    <RotateCcw className={`w-4 h-4 mr-2 ${resetting ? "animate-spin" : ""}`} />
                    Restaurar padrão
                  </Button>
                  <Button size="sm" onClick={() => setSettingsOpen(false)}>
                    Fechar
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <History className="w-4 h-4 mr-2" />
                  Histórico
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Histórico de versões
                  </SheetTitle>
                  <SheetDescription>
                    Cada alteração nas regras gera uma versão. Clique em <strong>Reverter</strong>{" "}
                    para restaurar instantaneamente uma configuração anterior. A reversão também é
                    registrada como nova versão.
                  </SheetDescription>
                </SheetHeader>

                <div className="mt-4 mb-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {versionsLoading
                      ? "Carregando…"
                      : `${versions.length} versão(ões) registradas`}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshVersions}
                    disabled={versionsLoading}
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 mr-1.5 ${versionsLoading ? "animate-spin" : ""}`}
                    />
                    Atualizar
                  </Button>
                </div>

                {versionsLoading && versions.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Carregando histórico…
                  </div>
                ) : versions.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Nenhuma versão registrada ainda. Altere uma regra para começar.
                  </div>
                ) : (
                  <ol className="space-y-2 mt-2">
                    {versions.map((v, idx) => {
                      const isCurrent = idx === 0;
                      const isReverting = revertingId === v.id;
                      const date = new Date(v.created_at);
                      const ruleCount = Object.keys(v.snapshot || {}).length;
                      return (
                        <li
                          key={v.id}
                          className={`rounded-md border p-3 text-sm ${
                            isCurrent ? "border-primary/40 bg-primary/5" : "border-border"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-semibold">
                                  #{v.version_number}
                                </span>
                                {isCurrent && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] h-4 px-1 border-primary/40 text-primary"
                                  >
                                    atual
                                  </Badge>
                                )}
                                <Badge variant="secondary" className="text-[10px] h-4 px-1">
                                  {v.action}
                                </Badge>
                              </div>
                              <p className="text-sm mt-1 break-words">
                                {v.change_summary || "(sem descrição)"}
                              </p>
                              {v.changed_rule_key && (
                                <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                                  {v.changed_rule_key}
                                  {v.previous_severity && v.new_severity
                                    ? `: ${v.previous_severity} → ${v.new_severity}`
                                    : v.new_severity
                                      ? `: → ${v.new_severity}`
                                      : v.previous_severity
                                        ? `: ${v.previous_severity} → (removida)`
                                        : ""}
                                </p>
                              )}
                              <p className="text-[11px] text-muted-foreground mt-1">
                                {date.toLocaleString()} · {ruleCount} regra(s) no snapshot
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => revertToVersion(v)}
                              disabled={isCurrent || isReverting || revertingId !== null}
                              className="shrink-0"
                            >
                              <Undo2
                                className={`w-3.5 h-3.5 mr-1.5 ${
                                  isReverting ? "animate-spin" : ""
                                }`}
                              />
                              {isReverting ? "Revertendo…" : "Reverter"}
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </SheetContent>
            </Sheet>

            <Button onClick={fetchTemplates} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Reescanear
            </Button>
          </div>
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
                                  {t.issues.map((iss) => (
                                    <li key={iss.key} className="flex items-start gap-1.5">
                                      <span
                                        className={
                                          iss.severity === "critical"
                                            ? "text-destructive"
                                            : "text-amber-600"
                                        }
                                      >
                                        •
                                      </span>
                                      <span>{iss.message}</span>
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
