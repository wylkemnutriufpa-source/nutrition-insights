import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Building2, Users, Activity, TrendingUp, Shield, Settings, Globe, Palette } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

interface OrgMetrics {
  organization_id: string;
  total_patients: number;
  active_patients: number;
  total_professionals: number;
  avg_adherence: number;
  avg_performance_score: number;
  dropout_rate: number;
  avg_plan_efficacy: number;
  patients_at_risk_percent: number;
  portfolio_classification: string;
  top_protocol_name: string | null;
  new_patients_30d: number;
  retention_rate: number;
  engine_version: string;
  computed_at: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  brand_name: string | null;
  subscription_plan: string;
  country: string;
}

interface OrgMember {
  id: string;
  user_id: string;
  role: string;
  status: string;
  joined_at: string | null;
}

const classificationColors: Record<string, string> = {
  healthy: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  stable: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  alert: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
};

const classificationLabels: Record<string, string> = {
  healthy: "Saudável",
  stable: "Estável",
  alert: "Em Alerta",
  critical: "Crítica",
};

const planLabels: Record<string, string> = {
  starter_clinic: "Starter",
  growth_clinic: "Growth",
  premium_clinic: "Premium",
  enterprise: "Enterprise",
};

export default function ClinicalEnterprise() {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [metrics, setMetrics] = useState<OrgMetrics[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [orgsRes, metricsRes] = await Promise.all([
        supabase.from("organizations").select("id, name, slug, brand_name, subscription_plan, country"),
        supabase.from("organization_metrics_cache").select("*"),
      ]);

      if (orgsRes.data) setOrgs(orgsRes.data as Organization[]);
      if (metricsRes.data) setMetrics(metricsRes.data as unknown as OrgMetrics[]);
      if (orgsRes.data && orgsRes.data.length > 0) {
        setSelectedOrgId(orgsRes.data[0].id);
        const membersRes = await supabase
          .from("organization_members")
          .select("id, user_id, role, status, joined_at")
          .eq("organization_id", orgsRes.data[0].id);
        if (membersRes.data) setMembers(membersRes.data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function runOrgEngine() {
    toast.info("Calculando métricas da organização...");
    try {
      const { error } = await supabase.functions.invoke("compute-organization-clinical-metrics");
      if (error) throw error;
      toast.success("Métricas calculadas com sucesso!");
      loadData();
    } catch (e: any) {
      toast.error("Erro ao calcular: " + e.message);
    }
  }

  const selectedMetrics = metrics.find(m => m.organization_id === selectedOrgId);
  const selectedOrg = orgs.find(o => o.id === selectedOrgId);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Building2 className="h-7 w-7 text-primary" />
              Cockpit Enterprise
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestão multi-clínica • White-Label • Inteligência organizacional
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">ORG_ENGINE v1.0.0</Badge>
            <Button size="sm" onClick={runOrgEngine} variant="outline">
              <Activity className="h-4 w-4 mr-1" /> Recalcular
            </Button>
          </div>
        </div>

        {/* Org Selector */}
        {orgs.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {orgs.map(org => (
              <Button
                key={org.id}
                size="sm"
                variant={selectedOrgId === org.id ? "default" : "outline"}
                onClick={() => setSelectedOrgId(org.id)}
              >
                {org.brand_name || org.name}
              </Button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando dados enterprise...</div>
        ) : orgs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma Organização</h3>
              <p className="text-muted-foreground text-sm">
                Configure sua primeira clínica para ativar o modo enterprise.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="professionals">Profissionais</TabsTrigger>
              <TabsTrigger value="protocols">Protocolos</TabsTrigger>
              <TabsTrigger value="whitelabel">White-Label</TabsTrigger>
              <TabsTrigger value="settings">Configurações</TabsTrigger>
            </TabsList>

            {/* TAB: Overview */}
            <TabsContent value="overview" className="space-y-4">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground">Pacientes Ativos</div>
                    <div className="text-2xl font-bold text-foreground">{selectedMetrics?.active_patients || 0}</div>
                    <div className="text-xs text-muted-foreground">de {selectedMetrics?.total_patients || 0} total</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground">Profissionais</div>
                    <div className="text-2xl font-bold text-foreground">{selectedMetrics?.total_professionals || 0}</div>
                    <div className="text-xs text-muted-foreground">ativos na clínica</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground">Adesão Média</div>
                    <div className="text-2xl font-bold text-foreground">{selectedMetrics?.avg_adherence?.toFixed(1) || 0}%</div>
                    <div className="text-xs text-muted-foreground">global da clínica</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground">Status</div>
                    <Badge className={classificationColors[selectedMetrics?.portfolio_classification || "stable"]}>
                      {classificationLabels[selectedMetrics?.portfolio_classification || "stable"]}
                    </Badge>
                  </CardContent>
                </Card>
              </div>

              {/* Second Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground">Performance Média</div>
                    <div className="text-2xl font-bold text-foreground">{selectedMetrics?.avg_performance_score?.toFixed(1) || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground">Taxa Abandono</div>
                    <div className="text-2xl font-bold text-red-400">{selectedMetrics?.dropout_rate?.toFixed(1) || 0}%</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground">Retenção</div>
                    <div className="text-2xl font-bold text-emerald-400">{selectedMetrics?.retention_rate?.toFixed(1) || 0}%</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground">Novos (30d)</div>
                    <div className="text-2xl font-bold text-foreground">{selectedMetrics?.new_patients_30d || 0}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Subscription */}
              {selectedOrg && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Shield className="h-4 w-4" /> Plano da Organização
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="text-sm px-3 py-1">
                        {planLabels[selectedOrg.subscription_plan] || selectedOrg.subscription_plan}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        País: {selectedOrg.country} • Slug: {selectedOrg.slug}
                      </span>
                      {selectedMetrics?.top_protocol_name && (
                        <span className="text-sm text-muted-foreground">
                          Top protocolo: <strong>{selectedMetrics.top_protocol_name}</strong>
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* TAB: Professionals */}
            <TabsContent value="professionals" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" /> Equipe da Clínica
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {members.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Nenhum membro vinculado.</p>
                  ) : (
                    <div className="space-y-2">
                      {members.map(m => (
                        <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                          <div>
                            <span className="text-sm font-medium text-foreground">{m.user_id.slice(0, 8)}...</span>
                            <Badge variant="outline" className="ml-2 text-xs">{m.role}</Badge>
                          </div>
                          <Badge variant={m.status === "active" ? "default" : "secondary"} className="text-xs">
                            {m.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: Protocols */}
            <TabsContent value="protocols" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> Eficácia de Protocolos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Activity className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Ranking de protocolos será calculado após acúmulo de dados suficientes na organização.
                    </p>
                    {selectedMetrics?.top_protocol_name && (
                      <p className="mt-2 text-sm">
                        Protocolo mais eficaz: <strong className="text-primary">{selectedMetrics.top_protocol_name}</strong>
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: White-Label */}
            <TabsContent value="whitelabel" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Palette className="h-4 w-4" /> Identidade Visual
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Palette className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Configure cores, logo, fontes e copy de onboarding para sua clínica.
                    </p>
                    <div className="flex gap-4 justify-center text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">✅ Cores personalizáveis</div>
                      <div className="flex items-center gap-1">✅ Logo customizado</div>
                      <div className="flex items-center gap-1">✅ Nome do app</div>
                      <div className="flex items-center gap-1">✅ CSS customizado</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: Settings */}
            <TabsContent value="settings" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Settings className="h-4 w-4" /> Motor Clínico
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>Configure thresholds do motor determinístico por organização:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Limiar de adesão</li>
                      <li>Dias para estagnação</li>
                      <li>Excesso calórico (%)</li>
                      <li>Dias para abandono</li>
                      <li>Pesos de performance</li>
                      <li>Regras de cluster</li>
                    </ul>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Globe className="h-4 w-4" /> Regional
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>Configurações regionais da organização:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Timezone</li>
                      <li>Idioma / Locale</li>
                      <li>Sistema métrico</li>
                      <li>Moeda</li>
                      <li>Diretrizes nutricionais</li>
                      <li>Formato de data</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
