import { useState, useEffect } from "react";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Badge } from "@v1/components/ui/badge";
import { Button } from "@v1/components/ui/button";
import { ScrollArea } from "@v1/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@v1/components/ui/tabs";
import { Progress } from "@v1/components/ui/progress";
import { supabase } from "@v1/integrations/supabase/client";
import { toast } from "sonner";
import {
  Shield, ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle2,
  XCircle, RefreshCw, Database, Lock, Eye, FileWarning, Activity,
  Users, Loader2,
} from "lucide-react";

// ── Access Matrix ──
const ACCESS_MATRIX = [
  { resource: "Dados clínicos do paciente", admin: "full", professional: "vinculados", employee: "delegados", patient: "próprios", public: "❌" },
  { resource: "Pipeline clínico (runs/steps)", admin: "full", professional: "❌", employee: "❌", patient: "❌", public: "❌" },
  { resource: "Benchmarks nutricionais", admin: "full", professional: "vinculados", employee: "❌", patient: "próprios", public: "❌" },
  { resource: "Métricas clínicas da clínica", admin: "full", professional: "próprios", employee: "❌", patient: "❌", public: "❌" },
  { resource: "Testimonials (base)", admin: "full", professional: "próprios", employee: "❌", patient: "próprios", public: "❌" },
  { resource: "Testimonials (view pública)", admin: "full", professional: "aprovados", employee: "aprovados", patient: "aprovados", public: "✅ (sem patient_id)" },
  { resource: "Planos alimentares", admin: "full", professional: "vinculados", employee: "delegados", patient: "próprios", public: "❌" },
  { resource: "Chat/mensagens", admin: "full", professional: "próprias", employee: "❌", patient: "próprias", public: "❌" },
  { resource: "Alertas clínicos", admin: "full", professional: "vinculados", employee: "delegados", patient: "❌", public: "❌" },
  { resource: "Ranking/pontos", admin: "full", professional: "vinculados", employee: "leitura", patient: "próprios", public: "❌" },
  { resource: "Configurações da plataforma", admin: "full", professional: "❌", employee: "❌", patient: "❌", public: "❌" },
  { resource: "Audit logs", admin: "full", professional: "❌", employee: "❌", patient: "❌", public: "❌" },
];

const BASELINE_CHECKLIST = [
  { id: "rls", label: "RLS habilitado na tabela", category: "Estrutura" },
  { id: "select", label: "SELECT policy definida e escopada", category: "Policies" },
  { id: "insert", label: "INSERT policy com user_id validado", category: "Policies" },
  { id: "update", label: "UPDATE policy com ownership check", category: "Policies" },
  { id: "delete", label: "DELETE policy restritiva", category: "Policies" },
  { id: "tenant", label: "Isolamento multi-tenant via nutritionist_patients", category: "Isolamento" },
  { id: "sensitive", label: "Colunas sensíveis revisadas (PII, tokens)", category: "Dados" },
  { id: "no_true", label: "Nenhum USING(true) / WITH CHECK(true)", category: "Policies" },
  { id: "payload", label: "Payload público sanitizado (views)", category: "Dados" },
  { id: "definer", label: "Funções SECURITY DEFINER auditadas", category: "Funções" },
];

interface AuditResult {
  score: number;
  total_tables: number;
  issues_count: number;
  tables_without_rls: { table: string; severity: string }[];
  permissive_policies: { table: string; policy: string; command: string; severity: string; reason: string }[];
  security_definer_functions: { function: string; args: string; severity: string }[];
  tables_summary: { table: string; rls_enabled: boolean; policy_count: number; select_policies: number; insert_policies: number; update_policies: number; delete_policies: number }[];
  audited_at: string;
}

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 80 ? "text-green-500" : score >= 50 ? "text-yellow-500" : "text-red-500";
  const bg = score >= 80 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`text-6xl font-black ${color}`}>{score}</div>
      <Progress value={score} className={`w-48 h-3 [&>div]:${bg}`} />
      <Badge variant={score >= 80 ? "default" : "destructive"} className="text-xs">
        {score >= 80 ? "Seguro" : score >= 50 ? "Atenção" : "Crítico"}
      </Badge>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, { variant: "default" | "destructive" | "secondary" | "outline"; label: string }> = {
    critical: { variant: "destructive", label: "Crítico" },
    high: { variant: "destructive", label: "Alto" },
    medium: { variant: "secondary", label: "Médio" },
    low: { variant: "outline", label: "Baixo" },
  };
  const m = map[severity] || map.low;
  return <Badge variant={m.variant} className="text-[10px]">{m.label}</Badge>;
}

export default function SecurityDashboard() {
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runAudit = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("run_security_audit");
      if (error) throw error;
      setAudit(data as unknown as AuditResult);
      toast.success("Auditoria concluída");
    } catch (e: any) {
      toast.error(e.message || "Erro ao executar auditoria");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { runAudit(); }, []);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Security Governance Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Framework de segurança estrutural — auditoria, matriz de acesso e baseline
            </p>
          </div>
          <Button onClick={runAudit} disabled={loading} size="sm" className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Executar Auditoria
          </Button>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="overview" className="gap-1 text-xs"><Shield className="h-3 w-3" />Score</TabsTrigger>
            <TabsTrigger value="issues" className="gap-1 text-xs"><AlertTriangle className="h-3 w-3" />Issues</TabsTrigger>
            <TabsTrigger value="matrix" className="gap-1 text-xs"><Users className="h-3 w-3" />Matriz</TabsTrigger>
            <TabsTrigger value="tables" className="gap-1 text-xs"><Database className="h-3 w-3" />Tabelas</TabsTrigger>
            <TabsTrigger value="baseline" className="gap-1 text-xs"><CheckCircle2 className="h-3 w-3" />Baseline</TabsTrigger>
          </TabsList>

          {/* ── OVERVIEW ── */}
          <TabsContent value="overview">
            {audit ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="md:col-span-1">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Security Score</CardTitle></CardHeader>
                  <CardContent className="flex justify-center py-6">
                    <ScoreGauge score={audit.score} />
                  </CardContent>
                </Card>
                <Card className="md:col-span-2">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Resumo</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-3">
                        <Database className="h-5 w-5 text-primary" />
                        <div>
                          <div className="text-2xl font-bold">{audit.total_tables}</div>
                          <div className="text-xs text-muted-foreground">Tabelas públicas</div>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-3">
                        <ShieldAlert className="h-5 w-5 text-destructive" />
                        <div>
                          <div className="text-2xl font-bold">{audit.issues_count}</div>
                          <div className="text-xs text-muted-foreground">Issues encontradas</div>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-3">
                        <XCircle className="h-5 w-5 text-destructive" />
                        <div>
                          <div className="text-2xl font-bold">{audit.tables_without_rls.length}</div>
                          <div className="text-xs text-muted-foreground">Tabelas sem RLS</div>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-3">
                        <FileWarning className="h-5 w-5 text-yellow-500" />
                        <div>
                          <div className="text-2xl font-bold">{audit.permissive_policies.length}</div>
                          <div className="text-xs text-muted-foreground">Policies permissivas</div>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg border bg-card flex items-center gap-3">
                      <Lock className="h-5 w-5 text-primary" />
                      <div>
                        <div className="text-2xl font-bold">{audit.security_definer_functions.length}</div>
                        <div className="text-xs text-muted-foreground">Funções SECURITY DEFINER</div>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Auditoria: {new Date(audit.audited_at).toLocaleString("pt-BR")}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : "Execute a auditoria para ver resultados"}
              </CardContent></Card>
            )}
          </TabsContent>

          {/* ── ISSUES ── */}
          <TabsContent value="issues">
            {audit && (
              <div className="space-y-4">
                {audit.tables_without_rls.length > 0 && (
                  <Card className="border-destructive/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                        <XCircle className="h-4 w-4" /> Tabelas sem RLS ({audit.tables_without_rls.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="max-h-48">
                        <div className="space-y-1">
                          {audit.tables_without_rls.map((t) => (
                            <div key={t.table} className="flex items-center justify-between py-1.5 px-2 rounded bg-destructive/5 text-sm">
                              <code className="text-xs">{t.table}</code>
                              <SeverityBadge severity={t.severity} />
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                {audit.permissive_policies.length > 0 && (
                  <Card className="border-yellow-500/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 text-yellow-600">
                        <AlertTriangle className="h-4 w-4" /> Policies Permissivas ({audit.permissive_policies.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="max-h-64">
                        <div className="space-y-1">
                          {audit.permissive_policies.map((p, i) => (
                            <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded bg-yellow-500/5 text-sm gap-2">
                              <div className="min-w-0">
                                <code className="text-xs font-bold">{p.table}</code>
                                <span className="text-xs text-muted-foreground ml-2">{p.policy}</span>
                                <Badge variant="outline" className="ml-2 text-[9px]">{p.command}</Badge>
                              </div>
                              <SeverityBadge severity={p.severity} />
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                {audit.permissive_policies.length === 0 && audit.tables_without_rls.length === 0 && (
                  <Card className="border-green-500/50">
                    <CardContent className="py-8 text-center">
                      <ShieldCheck className="h-10 w-10 text-green-500 mx-auto mb-2" />
                      <p className="text-sm font-medium text-green-600">Nenhuma issue crítica encontrada!</p>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Lock className="h-4 w-4" /> Funções SECURITY DEFINER ({audit.security_definer_functions.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="max-h-64">
                      <div className="space-y-1">
                        {audit.security_definer_functions.map((f, i) => (
                          <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/30 text-sm">
                            <code className="text-xs">{f.function}({f.args?.substring(0, 40)}...)</code>
                            <SeverityBadge severity={f.severity} />
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* ── ACCESS MATRIX ── */}
          <TabsContent value="matrix">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" /> Matriz de Acesso Oficial
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[500px]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-semibold">Recurso</th>
                        <th className="text-center p-2 font-semibold">Admin</th>
                        <th className="text-center p-2 font-semibold">Profissional</th>
                        <th className="text-center p-2 font-semibold">Funcionário</th>
                        <th className="text-center p-2 font-semibold">Paciente</th>
                        <th className="text-center p-2 font-semibold">Público</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ACCESS_MATRIX.map((row, i) => (
                        <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
                          <td className="p-2 font-medium">{row.resource}</td>
                          {[row.admin, row.professional, row.employee, row.patient, row.public].map((v, j) => (
                            <td key={j} className="text-center p-2">
                              <Badge
                                variant={v === "full" ? "default" : v === "❌" ? "destructive" : "secondary"}
                                className="text-[9px]"
                              >
                                {v}
                              </Badge>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TABLES ── */}
          <TabsContent value="tables">
            {audit && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Database className="h-4 w-4" /> Todas as Tabelas ({audit.tables_summary.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-[500px]">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Tabela</th>
                          <th className="text-center p-2">RLS</th>
                          <th className="text-center p-2">SELECT</th>
                          <th className="text-center p-2">INSERT</th>
                          <th className="text-center p-2">UPDATE</th>
                          <th className="text-center p-2">DELETE</th>
                          <th className="text-center p-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {audit.tables_summary
                          .sort((a, b) => (a.rls_enabled === b.rls_enabled ? a.table.localeCompare(b.table) : a.rls_enabled ? 1 : -1))
                          .map((t, i) => (
                          <tr key={i} className={`border-b border-border/30 ${!t.rls_enabled ? "bg-destructive/5" : ""}`}>
                            <td className="p-2 font-mono text-[11px]">{t.table}</td>
                            <td className="text-center p-2">
                              {t.rls_enabled
                                ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mx-auto" />
                                : <XCircle className="h-3.5 w-3.5 text-destructive mx-auto" />}
                            </td>
                            <td className="text-center p-2">{t.select_policies || <span className="text-muted-foreground">0</span>}</td>
                            <td className="text-center p-2">{t.insert_policies || <span className="text-muted-foreground">0</span>}</td>
                            <td className="text-center p-2">{t.update_policies || <span className="text-muted-foreground">0</span>}</td>
                            <td className="text-center p-2">{t.delete_policies || <span className="text-muted-foreground">0</span>}</td>
                            <td className="text-center p-2 font-bold">{t.policy_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── BASELINE CHECKLIST ── */}
          <TabsContent value="baseline">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Security Baseline Checklist
                </CardTitle>
                <p className="text-xs text-muted-foreground">Checklist obrigatório para toda nova tabela, view ou RPC</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {["Estrutura", "Policies", "Isolamento", "Dados", "Funções"].map(cat => (
                    <div key={cat}>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">{cat}</h4>
                      <div className="space-y-1.5">
                        {BASELINE_CHECKLIST.filter(c => c.category === cat).map(c => (
                          <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                            <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="text-sm">{c.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lock className="h-4 w-4" /> Fail-Closed Defaults
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { rule: "Novas tabelas nascem com RLS habilitado e sem policies (bloqueadas por padrão)", icon: Database },
                  { rule: "Novas views usam security_invoker = on (herdam RLS da tabela base)", icon: Eye },
                  { rule: "Novos papéis nascem sem acesso — permissões são concedidas explicitamente", icon: Users },
                  { rule: "Colunas sensíveis (PII, tokens, hashes) nunca expostas em SELECT policies públicas", icon: Lock },
                  { rule: "Funções SECURITY DEFINER passam por auditoria obrigatória antes de produção", icon: Shield },
                  { rule: "Nenhuma policy com USING(true) é aceita sem aprovação documentada", icon: AlertTriangle },
                ].map((r, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30">
                    <r.icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">{r.rule}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
