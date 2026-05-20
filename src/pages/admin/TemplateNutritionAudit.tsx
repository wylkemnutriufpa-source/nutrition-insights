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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  GitCompare,
  ArrowRight,
  Minus,
  Plus,
  Equal,
  Sparkles,
  FileDown,
  PlayCircle,
  XCircle,
  Terminal,
  Loader2,
  Pencil
} from "lucide-react";

import { toast } from "sonner";
import { seedPremiumV3Templates } from "@/lib/seedV3Templates";
import { applyOfficialV2Template, applyOfficialV3Template } from "@/lib/templateApplication";


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
  title?: string;
  tipo_refeicao: string | null;
  category?: string | null;
  is_global: boolean | null;
  kcal_base: number | null;
  protein_base: number | null;
  carbs_base: number | null;
  fat_base: number | null;
  foods_structure: FoodItem[] | null;
  plan_snapshot?: any | null;
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
  | "itemsBroken"
  | "legacyStructure"
  | "incoherentSubstitutions"
  | "soupAsSubstitution"
  | "unbalancedMeal"
  | "v2GroupingMissing";

type AuditConfig = Record<RuleKey, RuleSeverity>;

const RULE_LABELS: Record<RuleKey, { label: string; description: string; defaultRecommend: RuleSeverity }> = {
  noItems: {
    label: "Template sem itens",
    description: "Estrutura de itens vazia — modal não consegue renderizar refeição.",
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
    description: "Algum item do template tem nome vazio ou macros nulos → NaN nos cards.",
    defaultRecommend: "critical",
  },
  legacyStructure: {
    label: "Estrutura Legada (V1)",
    description: "Template usando array 'foods' em vez de 'blocks' (V2). Menos prático e flexível.",
    defaultRecommend: "warning",
  },
  incoherentSubstitutions: {
    label: "Substituições Incoerentes",
    description: "Detecta misturas indevidas (ex: sopa + proteína) ou categorias diferentes.",
    defaultRecommend: "warning",
  },
  soupAsSubstitution: {
    label: "Sopa como Substituição",
    description: "Identifica se 'Sopa' está sendo usada como substituição de refeição sólida (almoço/jantar).",
    defaultRecommend: "critical",
  },
  unbalancedMeal: {
    label: "Refeição Desequilibrada",
    description: "Refeições com macros muito fora do padrão (ex: zero proteína em almoço).",
    defaultRecommend: "warning",
  },
  v2GroupingMissing: {
    label: "Agrupamento V2 Coerente",
    description: "Identifica se a refeição ainda não está agrupada em blocos V2 (proteína, carbo, gordura).",
    defaultRecommend: "warning",
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
  // We handle nutritionist_meal_templates, diet_templates (legacy) and v3_diet_templates
  const isV3 = !!t.plan_snapshot;
  const isLegacyDiet = 'meals' in t;
  
  let itemsTotal = 0;
  let itemsBroken = 0;
  const triggered: { key: RuleKey; message: string }[] = [];

  if (isV3) {
    const snapshot = t.plan_snapshot || {};
    const profiles = Object.keys(snapshot);
    
    if (profiles.length === 0) {
      triggered.push({ key: "noItems", message: "V3: Snapshot de plano vazio (sem perfis de kcal)" });
    } else {
      // Audit across all profiles to be sure
      profiles.forEach(profileKey => {
        const profile = snapshot[profileKey];
        const days = profile?.days || [];
        
        if (days.length === 0) {
          triggered.push({ key: "noItems", message: `V3: Perfil ${profileKey} sem dias configurados` });
        } else {
          days.forEach((day: any) => {
            const meals = day.meals || [];
            meals.forEach((meal: any) => {
              const mealItems = meal.items || [];
              itemsTotal += mealItems.length;
              mealItems.forEach((item: any) => {
                if (isItemBroken({
                  name: item.name || item.title,
                  kcal: item.kcal,
                  protein: item.protein,
                  carbs: item.carbs,
                  fat: item.fat
                })) {
                  itemsBroken++;
                }
              });
            });
          });
        }
      });
    }
  } else if (isLegacyDiet) {
    const meals = Array.isArray((t as any).meals) ? (t as any).meals : [];
    itemsTotal = meals.reduce((acc: number, m: any) => acc + (Array.isArray(m.blocks) ? m.blocks.length : (Array.isArray(m.foods) ? m.foods.length : 0)), 0);
    
    meals.forEach((meal: any) => {
      const title = (meal.title || "").toLowerCase();
      const isLunch = title.includes("almoço") || title.includes("jantar") || title.includes("Almoço") || title.includes("Jantar");
      const allOptions = (meal.blocks || []).flatMap((b: any) => b.options || []);
      const legacySubs = (meal.foods || []).flatMap((f: any) => f.substitutions || []);
      
      allOptions.forEach((opt: any) => {
        if (isLunch && (opt.name || "").toLowerCase().includes("pão") && !opt.name.toLowerCase().includes("frango")) {
          triggered.push({ key: "incoherentSubstitutions", message: `Refeição '${meal.title}': Opção '${opt.name}' parece incoerente.` });
        }
      });
    });
  } else {
    const items = Array.isArray(t.foods_structure) ? t.foods_structure : [];
    itemsTotal = items.length;
    itemsBroken = items.filter(isItemBroken).length;
  }

  if (itemsTotal === 0 && triggered.length === 0) {
    triggered.push({ key: "noItems", message: "Template sem itens ou blocos configurados" });
  }
  
  const kcal = isV3 ? (t as any).kcal_profiles?.[0] : (isLegacyDiet ? (t as any).base_calories : t.kcal_base);
  if (isMissingNumber(kcal) || Number(kcal) <= 0) {
    triggered.push({ key: "kcalBaseMissing", message: "Caloria base ausente ou zero (causa NaN no UI)" });
  }

  if (itemsBroken > 0) {
    triggered.push({
      key: "itemsBroken",
      message: `${itemsBroken}/${itemsTotal} itens com macros inválidos (NaN no UI)`,
    });
  }

  const issues = triggered
    .map((t) => ({ ...t, severity: config[t.key] || "warning" }))
    .filter((i) => i.severity !== "ignore");

  let level: IssueLevel = "ok";
  if (issues.some((i) => i.severity === "critical")) level = "critical";
  else if (issues.some((i) => i.severity === "warning")) level = "warning";

  return { 
    ...t, 
    name: t.name || t.title || "Sem nome",
    level, 
    issues, 
    itemsTotal, 
    itemsBroken 
  };
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
  const [diffVersion, setDiffVersion] = useState<RuleVersion | null>(null);
  const [templateSource, setTemplateSource] = useState<"nutritionist" | "official">("official");
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);

  const runAutomatedBatchTest = async () => {
    const patientName = "Silvia Luz";
    const patientId = "6699274a-af91-48e6-8163-36ca484b3c2b";
    
    // Find a nutritionist for this tenant
    const { data: nutri } = await supabase
      .from("profiles")
      .select("user_id, tenant_id")
      .eq("tenant_id", "20081963-8db9-4a6c-8181-6a820b86e12f")
      .limit(1)
      .maybeSingle();

    if (!nutri) {
      toast.error("Nenhum nutricionista encontrado para o teste");
      return;
    }

    setIsRunningTests(true);
    setTestResults([]);
    
    // Clean old tests
    await supabase.from("template_application_tests").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    const templatesToTest = [...rows];
    const results = [];

    for (const t of templatesToTest) {
      const result: any = { 
        template_id: t.id, 
        template_name: t.name || t.title, 
        version: t.plan_snapshot ? "V3" : "V2",
        status: "testing"
      };
      
      setTestResults(prev => [result, ...prev]);

      try {
        if (t.plan_snapshot) {
          await applyOfficialV3Template(t as any, patientId, nutri.user_id, nutri.tenant_id, patientName);
        } else {
          await applyOfficialV2Template(t as any, patientId, nutri.user_id, nutri.tenant_id, patientName);
        }
        result.status = "success";
      } catch (e: any) {
        result.status = "error";
        result.error_message = e.message;
      }

      await supabase.from("template_application_tests").insert([result]);
      results.push(result);
      setTestResults(prev => [result, ...prev.filter(r => r.template_id !== t.id)]);
    }

    setIsRunningTests(false);
    toast.success("Teste automatizado concluído!");
  };

  const fetchTestResults = async () => {
    const { data } = await supabase
      .from("template_application_tests")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setTestResults(data);
  };

  useEffect(() => {
    fetchTestResults();
  }, []);


  const exportChecklist = (auditedData: AuditedTemplate[]) => {
    const headers = ["ID", "Nome", "Status", "Itens", "Erros", "Mensagens de Erro"];
    const rows = auditedData.map(t => [
      t.id,
      t.name,
      levelStyles[t.level].label,
      t.itemsTotal,
      t.issues.length,
      t.issues.map(i => i.message).join(" | ")
    ]);

    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `checklist_templates_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Checklist exportado com sucesso!");
  };

  const [isSeeding, setIsSeeding] = useState(false);
  const handleSeedPremiumTemplates = async () => {
    if (!window.confirm("Isso irá injetar os 14 templates Premium V3 no banco de dados, substituindo modelos antigos. Deseja continuar?")) return;
    setIsSeeding(true);
    try {
      const success = await seedPremiumV3Templates();
      if (success) {
        toast.success("Templates Premium injetados com sucesso!");
      } else {
        toast.error("Erro ao injetar templates.");
      }
    } catch (e) {
      toast.error("Erro ao injetar templates: " + (e as any).message);
    } finally {
      setIsSeeding(false);
    }
  };

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

  const revertToVersion = async (v: RuleVersion, skipConfirm = false) => {
    if (
      !skipConfirm &&
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
    const table = templateSource === "nutritionist" ? "nutritionist_meal_templates" : "v3_diet_templates";
    const columns = templateSource === "nutritionist" 
      ? "id, name, tipo_refeicao, is_global, kcal_base, protein_base, carbs_base, fat_base, foods_structure, updated_at"
      : "id, title, objective, kcal_profiles, plan_snapshot, updated_at";

    const { data, error } = await supabase
      .from(table as any)
      .select(columns)
      .order("updated_at", { ascending: false })
      .limit(1000);

    if (error) {
      toast.error("Falha ao carregar templates", { description: error.message });
      setRows([]);
    } else {
      setRows((data || []) as any[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
  }, [templateSource]);

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
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleSeedPremiumTemplates} 
              disabled={isSeeding}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] border-blue-400 font-bold transition-all hover:scale-105 active:scale-95"
            >
              <Sparkles className={`w-4 h-4 mr-2 ${isSeeding ? "animate-spin" : "text-yellow-300"}`} />
              ✨ Injetar Templates V3 Premium
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open("/admin/template-mass-reformulation", "_blank")}>
              <Sparkles className="w-4 h-4 mr-2" />
              Reformular em Massa
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportChecklist(audited)}>
              <FileDown className="w-4 h-4 mr-2" />
              Checklist
            </Button>
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
                            <div className="flex flex-col gap-1.5 shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDiffVersion(v)}
                                disabled={isCurrent}
                                className="shrink-0"
                                title={isCurrent ? "Esta é a versão atual" : "Ver o que mudaria"}
                              >
                                <GitCompare className="w-3.5 h-3.5 mr-1.5" />
                                Comparar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => revertToVersion(v)}
                                disabled={isCurrent || isReverting || revertingId !== null}
                                className="shrink-0 text-xs h-7"
                              >
                                <Undo2
                                  className={`w-3.5 h-3.5 mr-1.5 ${
                                    isReverting ? "animate-spin" : ""
                                  }`}
                                />
                                {isReverting ? "Revertendo…" : "Reverter direto"}
                              </Button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </SheetContent>
            </Sheet>

            <VersionDiffDialog
              version={diffVersion}
              currentConfig={config}
              onClose={() => setDiffVersion(null)}
              onConfirmRevert={async (v) => {
                setDiffVersion(null);
                await revertToVersion(v, true);
              }}
              isReverting={revertingId !== null}
            />

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

        {/* Source Selector */}
        <div className="flex items-center gap-2 p-1 bg-muted rounded-lg w-fit">
          <Button 
            variant={templateSource === "official" ? "default" : "ghost"} 
            size="sm"
            onClick={() => setTemplateSource("official")}
            className="text-xs h-8"
          >
            Templates Oficiais
          </Button>
          <Button 
            variant={templateSource === "nutritionist" ? "default" : "ghost"} 
            size="sm"
            onClick={() => setTemplateSource("nutritionist")}
            className="text-xs h-8"
          >
            Templates de Nutricionistas
          </Button>
        </div>

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
              {templateSource === "official" 
                ? "Ajustando os templates pré-prontos do sistema para garantir que todos tenham blocos V2 e substituições coerentes."
                : "Auditoria de templates criados pelos próprios usuários."}
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

            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="grid w-full grid-cols-5 h-auto">
                <TabsTrigger value="critical">Críticos ({counts.critical})</TabsTrigger>
                <TabsTrigger value="warning">Atenção ({counts.warning})</TabsTrigger>
                <TabsTrigger value="ok">OK ({counts.ok})</TabsTrigger>
                <TabsTrigger value="all">Todos ({counts.all})</TabsTrigger>
                <TabsTrigger value="tests" className="gap-2">
                  <Terminal className="w-4 h-4" /> Testes Automáticos
                </TabsTrigger>
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
                              <div className="font-medium">{t.name || (t as any).title}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                                {t.tipo_refeicao || (t as any).objective || "—"}
                                {t.is_global ? " · global" : ""}
                                <Badge variant="outline" className="text-[9px] h-3.5 px-1 py-0 border-primary/20 text-primary">
                                  {t.plan_snapshot ? "V3" : "V2"}
                                </Badge>
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
                              {t.kcal_base ?? (t as any).kcal_profiles?.[0] ?? "—"}kcal · P{t.protein_base ?? "—"} · C
                              {t.carbs_base ?? "—"} · G{t.fat_base ?? "—"}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-2">
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
                                <div className="flex items-center gap-2 mt-1">
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-7 text-[10px] px-2 text-primary hover:bg-primary/5"
                                    onClick={() => {
                                      if (t.plan_snapshot) {
                                        window.open(`/admin/diet-templates?slug=${(t as any).slug}`, '_blank');
                                      } else {
                                        toast.info("Apenas templates V3 podem ser editados no editor de matriz.");
                                      }
                                    }}
                                  >
                                    <Pencil className="w-3 h-3 mr-1" /> Editar Matriz
                                  </Button>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}

                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="tests" className="mt-4">

                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg border">
                    <div>
                      <h4 className="font-semibold flex items-center gap-2">
                        <PlayCircle className="w-4 h-4 text-primary" /> Teste de Aplicação Real
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Executa o motor de aplicação de templates para a paciente Silvia Luz.
                      </p>
                    </div>
                    <Button 
                      onClick={runAutomatedBatchTest} 
                      disabled={isRunningTests || audited.length === 0}
                      className="gap-2"
                    >
                      {isRunningTests ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                      {isRunningTests ? "Executando..." : "Testar Todos na Silvia Luz"}
                    </Button>
                  </div>

                  <div className="rounded-md border bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Template</TableHead>
                          <TableHead>Versão</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Detalhes/Erro</TableHead>
                          <TableHead className="text-right">Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {testResults.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                              Nenhum teste registrado. Clique no botão acima para iniciar a validação real.
                            </TableCell>
                          </TableRow>
                        ) : (
                          testResults.map((res, i) => (
                            <TableRow key={res.id || i}>
                              <TableCell className="font-medium">{res.template_name}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{res.version}</Badge>
                              </TableCell>
                              <TableCell>
                                {res.status === "testing" && (
                                  <Badge variant="secondary" className="gap-1 animate-pulse">
                                    <RefreshCw className="w-3 h-3 animate-spin" /> Testando
                                  </Badge>
                                )}
                                {res.status === "success" && (
                                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Passou
                                  </Badge>
                                )}
                                {res.status === "error" && (
                                  <Badge variant="destructive" className="gap-1">
                                    <XCircle className="w-3 h-3" /> Falhou
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="max-w-md truncate text-[10px] text-muted-foreground">
                                {res.error_message || "—"}
                              </TableCell>
                              <TableCell className="text-right text-[9px] text-muted-foreground">
                                {res.created_at ? new Date(res.created_at).toLocaleString('pt-BR') : "Agora"}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
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

const SEVERITY_BADGE: Record<RuleSeverity, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  warning: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  ignore: "bg-muted text-muted-foreground border-border",
};

const SEVERITY_LABEL: Record<RuleSeverity, string> = {
  critical: "Crítico",
  warning: "Atenção",
  ignore: "Ignorar",
};

type DiffRow = {
  key: RuleKey;
  current: RuleSeverity;
  target: RuleSeverity;
  changeKind: "same" | "softer" | "stricter" | "added" | "removed";
};

function classifyChange(current: RuleSeverity, target: RuleSeverity): DiffRow["changeKind"] {
  if (current === target) return "same";
  const rank: Record<RuleSeverity, number> = { ignore: 0, warning: 1, critical: 2 };
  if (target === "ignore" && current !== "ignore") return "removed";
  if (current === "ignore" && target !== "ignore") return "added";
  return rank[target] > rank[current] ? "stricter" : "softer";
}

function VersionDiffDialog({
  version,
  currentConfig,
  onClose,
  onConfirmRevert,
  isReverting,
}: {
  version: RuleVersion | null;
  currentConfig: AuditConfig;
  onClose: () => void;
  onConfirmRevert: (v: RuleVersion) => void | Promise<void>;
  isReverting: boolean;
}) {
  const open = version !== null;

  const rows: DiffRow[] = useMemo(() => {
    if (!version) return [];
    return RULE_KEYS.map((key) => {
      const current = currentConfig[key];
      const snap = version.snapshot?.[key];
      const target: RuleSeverity =
        snap === "critical" || snap === "warning" || snap === "ignore"
          ? snap
          : DEFAULT_CONFIG[key];
      return {
        key,
        current,
        target,
        changeKind: classifyChange(current, target),
      };
    });
  }, [version, currentConfig]);

  const changedRows = rows.filter((r) => r.changeKind !== "same");
  const summary = useMemo(() => {
    const acc = { stricter: 0, softer: 0, added: 0, removed: 0 };
    changedRows.forEach((r) => {
      if (r.changeKind in acc) acc[r.changeKind as keyof typeof acc] += 1;
    });
    return acc;
  }, [changedRows]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="w-5 h-5" />
            Comparação com versão #{version?.version_number}
          </DialogTitle>
          <DialogDescription>
            Veja exatamente o que mudaria <strong>antes</strong> de reverter. À esquerda a
            configuração atual, à direita o snapshot histórico que será aplicado.
          </DialogDescription>
        </DialogHeader>

        {version && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline" className="font-mono">
                {new Date(version.created_at).toLocaleString()}
              </Badge>
              <Badge variant="secondary">{version.action}</Badge>
              {changedRows.length === 0 ? (
                <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                  Sem diferenças — idêntica à atual
                </Badge>
              ) : (
                <>
                  <span className="text-muted-foreground">{changedRows.length} regra(s) afetada(s):</span>
                  {summary.stricter > 0 && (
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                      <Plus className="w-3 h-3 mr-1" />
                      {summary.stricter} mais rígida(s)
                    </Badge>
                  )}
                  {summary.softer > 0 && (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                      <Minus className="w-3 h-3 mr-1" />
                      {summary.softer} mais branda(s)
                    </Badge>
                  )}
                  {summary.added > 0 && (
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                      +{summary.added} reativada(s)
                    </Badge>
                  )}
                  {summary.removed > 0 && (
                    <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
                      {summary.removed} silenciada(s)
                    </Badge>
                  )}
                </>
              )}
            </div>

            <div className="rounded-md border divide-y">
              <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted/30">
                <span>Regra</span>
                <span className="text-center">Atual</span>
                <span className="text-center">→ Versão #{version.version_number}</span>
                <span className="text-right">Impacto</span>
              </div>
              {rows.map((r) => {
                const meta = RULE_LABELS[r.key];
                const changed = r.changeKind !== "same";
                return (
                  <div
                    key={r.key}
                    className={`grid grid-cols-[1fr_auto_1fr_auto] gap-2 px-3 py-2.5 items-center text-sm ${
                      changed ? "bg-amber-500/5" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{meta.label}</div>
                      <div className="text-[11px] text-muted-foreground font-mono truncate">
                        {r.key}
                      </div>
                    </div>
                    <Badge variant="outline" className={`${SEVERITY_BADGE[r.current]} text-xs`}>
                      {SEVERITY_LABEL[r.current]}
                    </Badge>
                    <div className="flex items-center gap-1.5">
                      <ArrowRight
                        className={`w-3.5 h-3.5 ${
                          changed ? "text-foreground" : "text-muted-foreground/40"
                        }`}
                      />
                      <Badge variant="outline" className={`${SEVERITY_BADGE[r.target]} text-xs`}>
                        {SEVERITY_LABEL[r.target]}
                      </Badge>
                    </div>
                    <div className="text-xs text-right">
                      {r.changeKind === "same" && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Equal className="w-3 h-3" /> igual
                        </span>
                      )}
                      {r.changeKind === "stricter" && (
                        <span className="inline-flex items-center gap-1 text-destructive font-medium">
                          <Plus className="w-3 h-3" /> mais rígida
                        </span>
                      )}
                      {r.changeKind === "softer" && (
                        <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                          <Minus className="w-3 h-3" /> mais branda
                        </span>
                      )}
                      {r.changeKind === "added" && (
                        <span className="inline-flex items-center gap-1 text-destructive font-medium">
                          reativada
                        </span>
                      )}
                      {r.changeKind === "removed" && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          silenciada
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {summary.stricter + summary.added > 0 && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                <strong>Atenção:</strong> esta reversão tornará {summary.stricter + summary.added}{" "}
                regra(s) mais rígida(s) — templates que estavam OK podem aparecer como críticos e
                bloquear o release.
              </div>
            )}
            {summary.softer + summary.removed > 0 && summary.stricter + summary.added === 0 && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-500">
                Esta reversão é mais permissiva: alguns alertas atuais podem deixar de ser
                reportados.
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isReverting}>
            Cancelar
          </Button>
          <Button
            variant={changedRows.length === 0 ? "outline" : "default"}
            onClick={() => version && onConfirmRevert(version)}
            disabled={isReverting || changedRows.length === 0}
          >
            <Undo2 className={`w-4 h-4 mr-2 ${isReverting ? "animate-spin" : ""}`} />
            {isReverting
              ? "Revertendo…"
              : changedRows.length === 0
                ? "Nada a reverter"
                : `Aplicar reversão (${changedRows.length} mudança${changedRows.length > 1 ? "s" : ""})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
