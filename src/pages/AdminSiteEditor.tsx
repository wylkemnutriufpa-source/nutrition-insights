import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSiteSettingsRaw, useUpdateSiteSetting, SiteSetting } from "@/hooks/useSiteSettings";
import { toast } from "sonner";
import { Settings, Palette, Globe, Search, Save, Type, Image, BarChart3, MessageSquare, HelpCircle, DollarSign, Share2, Megaphone } from "lucide-react";
import { Label } from "@/components/ui/label";

const categoryConfig: Record<string, { label: string; icon: any; description: string }> = {
  branding: { label: "Branding & Identidade", icon: Palette, description: "Logo, cores, nome da marca e redes sociais" },
  landing: { label: "Landing Page", icon: Globe, description: "Textos, estatísticas, depoimentos e preços" },
  seo: { label: "SEO", icon: Search, description: "Meta tags e otimização para buscadores" },
  promotions: { label: "Promoções", icon: Megaphone, description: "Alertas promocionais para inscrição em projetos" },
};

const keyIcons: Record<string, any> = {
  brand_name: Type,
  brand_tagline: Type,
  brand_logo_url: Image,
  primary_color: Palette,
  accent_color: Palette,
  hero_title: Type,
  hero_subtitle: Type,
  hero_cta_text: Type,
  hero_badge_text: Type,
  stats: BarChart3,
  pricing_plans: DollarSign,
  testimonials_landing: MessageSquare,
  faqs: HelpCircle,
  footer_text: Type,
  social_links: Share2,
  meta_title: Search,
  meta_description: Search,
};

export default function AdminSiteEditor() {
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
      if (type === "json") {
        value = JSON.parse(value);
      }
      await updateMutation.mutateAsync({ key, value });
      toast.success("Configuração salva com sucesso!");
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

  const categories = Object.keys(categoryConfig);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8 text-primary" />
          <div>
            <h1 className="font-display text-2xl font-bold">Editor do Site</h1>
            <p className="text-muted-foreground text-sm">Edite toda a plataforma: landing page, branding, logo, cores, textos e muito mais</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <Tabs defaultValue="branding" className="space-y-6">
            <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1">
              {categories.map((cat) => {
                const config = categoryConfig[cat];
                const Icon = config.icon;
                return (
                  <TabsTrigger key={cat} value={cat} className="gap-2">
                    <Icon className="w-4 h-4" />
                    {config.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {categories.map((cat) => {
              const config = categoryConfig[cat];
              const items = grouped[cat] || [];
              return (
                <TabsContent key={cat} value={cat} className="space-y-4">
                  <Card className="glass shadow-card">
                    <CardHeader>
                      <CardTitle className="font-display text-lg flex items-center gap-2">
                        <config.icon className="w-5 h-5 text-primary" />
                        {config.label}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{config.description}</p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {items.map((setting) => {
                        const Icon = keyIcons[setting.setting_key] || Type;
                        const isJson = setting.setting_type === "json";
                        const isColor = setting.setting_key.includes("color");
                        const val = editValues[setting.setting_key] || "";

                        return (
                          <div key={setting.setting_key} className="space-y-2 p-4 rounded-xl bg-muted/30 border border-border/50">
                            <div className="flex items-center justify-between">
                              <Label className="flex items-center gap-2 font-medium">
                                <Icon className="w-4 h-4 text-primary" />
                                {setting.label}
                              </Label>
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
                            <p className="text-xs text-muted-foreground">Chave: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{setting.setting_key}</code></p>
                            
                            {isColor ? (
                              <div className="flex items-center gap-3">
                                <input
                                  type="color"
                                  value={val.replace(/"/g, "")}
                                  onChange={(e) => setEditValues({ ...editValues, [setting.setting_key]: `"${e.target.value}"` })}
                                  className="w-12 h-10 rounded-md border border-input cursor-pointer"
                                />
                                <Input
                                  value={val}
                                  onChange={(e) => setEditValues({ ...editValues, [setting.setting_key]: e.target.value })}
                                  className="flex-1"
                                />
                              </div>
                            ) : isJson ? (
                              <Textarea
                                value={val}
                                onChange={(e) => setEditValues({ ...editValues, [setting.setting_key]: e.target.value })}
                                rows={Math.min(20, Math.max(4, val.split("\n").length + 1))}
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
