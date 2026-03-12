import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useSiteSettingsRaw, useUpdateSiteSetting, SiteSetting } from "@/hooks/useSiteSettings";
import { toast } from "sonner";
import { Save, ExternalLink, Layout, Users, DollarSign, Eye, Dumbbell } from "lucide-react";

const tabs = [
  { key: "landing_gateway", label: "Gateway (Principal)", icon: Layout, previewPath: "/" },
  { key: "landing_paciente", label: "Landing Paciente", icon: Users, previewPath: "/landing-paciente" },
  { key: "landing_personal", label: "Landing Personal", icon: Dumbbell, previewPath: "/landing-personal" },
  { key: "landing_afiliado", label: "Landing Afiliado", icon: DollarSign, previewPath: "/landing-afiliado" },
];

export default function AdminLandingPages() {
  const { data: settings, isLoading } = useSiteSettingsRaw();
  const updateMutation = useUpdateSiteSetting();
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      const vals: Record<string, string> = {};
      settings.forEach((s) => {
        vals[s.setting_key] = typeof s.setting_value === "string"
          ? s.setting_value
          : JSON.stringify(s.setting_value, null, 2);
      });
      setEditValues(vals);
    }
  }, [settings]);

  const handleSave = async (key: string, type: string) => {
    setSaving(key);
    try {
      let value: any = editValues[key];
      if (type === "json") value = JSON.parse(value);
      await updateMutation.mutateAsync({ key, value });
      toast.success("Salvo com sucesso!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(null);
    }
  };

  const grouped = settings?.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {} as Record<string, SiteSetting[]>) || {};

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Layout className="w-8 h-8 text-primary" />
          <div>
            <h1 className="font-display text-2xl font-bold">Editor de Landing Pages</h1>
            <p className="text-muted-foreground text-sm">Edite os textos, depoimentos e configurações das 3 landing pages do FitJourney</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <Tabs defaultValue="landing_gateway" className="space-y-6">
            <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger key={tab.key} value={tab.key} className="gap-2">
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {tabs.map((tab) => {
              const items = grouped[tab.key] || [];
              return (
                <TabsContent key={tab.key} value={tab.key} className="space-y-4">
                  {/* Preview button */}
                  <div className="flex gap-3">
                    <a href={tab.previewPath} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="gap-2">
                        <Eye className="w-4 h-4" />
                        Visualizar Página
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </a>
                  </div>

                  <Card className="glass shadow-card">
                    <CardHeader>
                      <CardTitle className="font-display text-lg flex items-center gap-2">
                        <tab.icon className="w-5 h-5 text-primary" />
                        {tab.label}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">Edite os textos e configurações desta landing page</p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {items.length === 0 && (
                        <p className="text-muted-foreground text-sm">Nenhuma configuração encontrada para esta página.</p>
                      )}
                      {items.map((setting) => {
                        const isJson = setting.setting_type === "json";
                        const val = editValues[setting.setting_key] || "";

                        return (
                          <div key={setting.setting_key} className="space-y-2 p-4 rounded-xl bg-muted/30 border border-border/50">
                            <div className="flex items-center justify-between">
                              <Label className="font-medium">{setting.label}</Label>
                              <Button
                                size="sm"
                                onClick={() => handleSave(setting.setting_key, setting.setting_type)}
                                disabled={saving === setting.setting_key}
                                className="gap-1.5"
                              >
                                <Save className="w-3.5 h-3.5" />
                                {saving === setting.setting_key ? "Salvando..." : "Salvar"}
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Chave: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{setting.setting_key}</code>
                            </p>

                            {isJson ? (
                              <Textarea
                                value={val}
                                onChange={(e) => setEditValues({ ...editValues, [setting.setting_key]: e.target.value })}
                                rows={Math.min(15, Math.max(4, val.split("\n").length + 1))}
                                className="font-mono text-xs"
                              />
                            ) : (
                              <Input
                                value={val}
                                onChange={(e) => setEditValues({ ...editValues, [setting.setting_key]: e.target.value })}
                              />
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
