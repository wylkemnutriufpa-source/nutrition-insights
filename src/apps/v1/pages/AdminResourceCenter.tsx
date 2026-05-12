import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/lib/tenantContext";
import { getTenantIdForInsert } from "@/lib/tenantQueryHelpers";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useSiteSettingsRaw, useUpdateSiteSetting, SiteSetting } from "@/hooks/useSiteSettings";
import { toast } from "sonner";
import {
  LayoutDashboard, Palette, Globe, Search, Save, Type, Image,
  BarChart3, MessageSquare, HelpCircle, DollarSign, Share2,
  Zap, Brain, ChefHat, Bot, Star, Check, X, Clock,
  Eye, Upload, Settings, Shield, Users, UserPlus, ExternalLink,
  Sun, Moon, Sparkles, Droplets, RotateCcw
} from "lucide-react";

// ─── Animations ───
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

// ─── Site Editor Config ───
const categoryConfig: Record<string, { label: string; icon: any; description: string }> = {
  branding: { label: "Branding & Identidade", icon: Palette, description: "Logo, cores, nome da marca e redes sociais" },
  landing: { label: "Landing Page", icon: Globe, description: "Textos, estatísticas, depoimentos e preços" },
  seo: { label: "SEO", icon: Search, description: "Meta tags e otimização para buscadores" },
};

const keyIcons: Record<string, any> = {
  brand_name: Type, brand_tagline: Type, brand_logo_url: Image,
  primary_color: Palette, accent_color: Palette,
  hero_title: Type, hero_subtitle: Type, hero_cta_text: Type, hero_badge_text: Type,
  stats: BarChart3, pricing_plans: DollarSign, testimonials_landing: MessageSquare,
  faqs: HelpCircle, footer_text: Type, social_links: Share2,
  meta_title: Search, meta_description: Search,
};

// ─── Feature Flags Config ───
const FEATURES = [
  { name: "ia_plan", label: "Análise com IA", description: "Análise de refeições e corpo com IA", icon: Brain },
  { name: "automations", label: "Automações", description: "Motor de automação inteligente", icon: Bot },
  { name: "recipe_generator", label: "Gerador de Receitas", description: "Geração de receitas com IA", icon: ChefHat },
];

// ─── Branding Palettes ───
const presetPalettes = [
  { name: "Emerald", primary: "#10b981", secondary: "#1a1a2e", accent: "#f59e0b" },
  { name: "Ocean", primary: "#3b82f6", secondary: "#0f172a", accent: "#06b6d4" },
  { name: "Rose", primary: "#f43f5e", secondary: "#1c1917", accent: "#fb923c" },
  { name: "Violet", primary: "#8b5cf6", secondary: "#18181b", accent: "#ec4899" },
  { name: "Teal", primary: "#14b8a6", secondary: "#1e293b", accent: "#fbbf24" },
  { name: "Coral", primary: "#ef4444", secondary: "#1a1a2e", accent: "#a855f7" },
];

interface NutritionistFeature {
  user_id: string;
  full_name: string;
  features: Record<string, boolean>;
}

interface Testimonial {
  id: string;
  patient_id: string;
  content: string;
  rating: number;
  status: string;
  is_anonymous: boolean;
  created_at: string;
  patient_name?: string;
}

interface BrandingData {
  brand_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  custom_css: string | null;
}

const defaultBranding: BrandingData = {
  brand_name: "", logo_url: null, primary_color: "#10b981",
  secondary_color: "#1a1a2e", accent_color: "#f59e0b", custom_css: null,
};

export default function AdminResourceCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <motion.div
        initial="hidden" animate="show"
        variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        className="space-y-6"
      >
        <motion.div variants={fadeUp} className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <LayoutDashboard className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Central de Recursos</h1>
              <p className="text-sm text-muted-foreground">Controle total da plataforma em um só lugar</p>
            </div>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => window.open("/landing", "_blank")}>
            <Eye className="w-4 h-4" /> Ver Landing Page
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        </motion.div>

        <Tabs defaultValue="site-editor" className="space-y-6">
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1 bg-card border border-border">
            <TabsTrigger value="site-editor" className="gap-2">
              <Globe className="w-3.5 h-3.5" /> Editor do Site
            </TabsTrigger>
            <TabsTrigger value="branding" className="gap-2">
              <Palette className="w-3.5 h-3.5" /> Branding
            </TabsTrigger>
            <TabsTrigger value="features" className="gap-2">
              <Zap className="w-3.5 h-3.5" /> Features
            </TabsTrigger>
            <TabsTrigger value="testimonials" className="gap-2">
              <Star className="w-3.5 h-3.5" /> Depoimentos
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-3.5 h-3.5" /> Usuários
            </TabsTrigger>
          </TabsList>

          <TabsContent value="site-editor"><SiteEditorTab /></TabsContent>
          <TabsContent value="branding"><BrandingTab /></TabsContent>
          <TabsContent value="features"><FeaturesTab /></TabsContent>
          <TabsContent value="testimonials"><TestimonialsTab /></TabsContent>
          <TabsContent value="users"><UsersTab /></TabsContent>
        </Tabs>
      </motion.div>
    </DashboardLayout>
  );
}

// ═══════════════════════════════════════════════
// TAB 1: Site Editor (Landing, SEO, etc.)
// ═══════════════════════════════════════════════
function SiteEditorTab() {
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
      toast.success("Configuração salva!");
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

  if (isLoading) return <LoadingSpinner />;

  return (
    <Tabs defaultValue="branding" className="space-y-4">
      <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1">
        {Object.keys(categoryConfig).map((cat) => {
          const config = categoryConfig[cat];
          const Icon = config.icon;
          return (
            <TabsTrigger key={cat} value={cat} className="gap-2">
              <Icon className="w-4 h-4" /> {config.label}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {Object.keys(categoryConfig).map((cat) => {
        const config = categoryConfig[cat];
        const items = grouped[cat] || [];
        return (
          <TabsContent key={cat} value={cat} className="space-y-4">
            <Card className="glass shadow-card">
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <config.icon className="w-5 h-5 text-primary" /> {config.label}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{config.description}</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {items.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma configuração nesta categoria</p>
                )}
                {items.map((setting) => {
                  const Icon = keyIcons[setting.setting_key] || Type;
                  const isJson = setting.setting_type === "json";
                  const isColor = setting.setting_key.includes("color");
                  const val = editValues[setting.setting_key] || "";

                  return (
                    <div key={setting.setting_key} className="space-y-2 p-4 rounded-xl bg-muted/30 border border-border/50">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2 font-medium">
                          <Icon className="w-4 h-4 text-primary" /> {setting.label}
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
                      {isColor ? (
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={val.replace(/"/g, "")}
                            onChange={(e) => setEditValues({ ...editValues, [setting.setting_key]: `"${e.target.value}"` })}
                            className="w-12 h-10 rounded-md border border-input cursor-pointer"
                          />
                          <Input value={val} onChange={(e) => setEditValues({ ...editValues, [setting.setting_key]: e.target.value })} className="flex-1" />
                        </div>
                      ) : isJson ? (
                        <Textarea
                          value={val}
                          onChange={(e) => setEditValues({ ...editValues, [setting.setting_key]: e.target.value })}
                          rows={Math.min(20, Math.max(4, val.split("\n").length + 1))}
                          className="font-mono text-xs"
                        />
                      ) : (
                        <Input value={val} onChange={(e) => setEditValues({ ...editValues, [setting.setting_key]: e.target.value })} />
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
  );
}

// ═══════════════════════════════════════════════
// TAB 2: Branding (Colors, Logo, Preview)
// ═══════════════════════════════════════════════
function BrandingTab() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [form, setForm] = useState<BrandingData>(defaultBranding);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [activePalette, setActivePalette] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("branding_settings").select("*").eq("nutritionist_id", user.id).maybeSingle()
      .then(async ({ data }) => {
        if (data) {
          setForm({
            brand_name: data.brand_name || "", logo_url: data.logo_url,
            primary_color: data.primary_color || "#10b981",
            secondary_color: data.secondary_color || "#1a1a2e",
            accent_color: data.accent_color || "#f59e0b",
            custom_css: data.custom_css,
          });
          if (data.logo_url) {
            if (!data.logo_url.startsWith("http")) {
              const { data: signedData } = await supabase.storage.from("body-images").createSignedUrl(data.logo_url, 3600);
              setLogoPreview(signedData?.signedUrl || "");
            } else {
              setLogoPreview(data.logo_url);
            }
          }
        }
      });
  }, [user]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setLogoFile(file); setLogoPreview(URL.createObjectURL(file)); }
  };

  const applyPalette = (p: typeof presetPalettes[0]) => {
    setForm({ ...form, primary_color: p.primary, secondary_color: p.secondary, accent_color: p.accent });
    setActivePalette(p.name);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    let logoUrl = form.logo_url;
    if (logoFile) {
      const ext = logoFile.name.split(".").pop();
      const path = `branding/${user.id}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("body-images").upload(path, logoFile);
      if (upErr) { toast.error("Erro no upload do logo"); setSaving(false); return; }
      // Store the path, not a signed URL (signed URLs expire)
      logoUrl = path;
    }
    const payload = { ...form, logo_url: logoUrl, nutritionist_id: user.id, ...getTenantIdForInsert(tenantId) };
    const { data: existing } = await supabase.from("branding_settings").select("id").eq("nutritionist_id", user.id).maybeSingle();
    if (existing) {
      const { error } = await supabase.from("branding_settings").update(payload).eq("nutritionist_id", user.id);
      if (error) toast.error(error.message); else toast.success("Branding atualizado!");
    } else {
      const { error } = await supabase.from("branding_settings").insert(payload as any);
      if (error) toast.error(error.message); else toast.success("Branding salvo!");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Logo & Name */}
      <Card className="glass shadow-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Image className="w-4 h-4 text-primary" /> Logo & Nome da Marca
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-6">
            <label className="cursor-pointer group block">
              <div className="w-full aspect-square max-w-[180px] rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center overflow-hidden hover:border-primary/50 transition-all bg-muted/20 group-hover:bg-muted/40">
                {logoPreview ? (
                  <div className="relative w-full h-full">
                    <img src={logoPreview} className="w-full h-full object-contain p-4" alt="Logo" />
                    <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Upload className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <Upload className="w-8 h-8 text-primary mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Enviar logo</p>
                  </div>
                )}
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </label>
            <div className="space-y-4">
              <div>
                <Label>Nome da Marca</Label>
                <Input value={form.brand_name} onChange={e => setForm({ ...form, brand_name: e.target.value })} placeholder="Ex: NutriVida" className="text-lg h-12" />
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-muted/20">
                {logoPreview ? (
                  <img src={logoPreview} className="w-10 h-10 rounded-xl object-contain" alt="" />
                ) : (
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: form.primary_color }}>
                    {form.brand_name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                )}
                <div>
                  <p className="font-display font-bold" style={{ color: form.primary_color }}>{form.brand_name || "Sua Marca"}</p>
                  <p className="text-xs text-muted-foreground">Visualização rápida</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Palettes */}
      <Card className="glass shadow-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Paletas de Cores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {presetPalettes.map((palette) => (
              <button
                key={palette.name}
                onClick={() => applyPalette(palette)}
                className={`relative p-4 rounded-xl border-2 transition-all text-left hover:scale-[1.02] ${
                  activePalette === palette.name ? "border-primary shadow-md bg-primary/5" : "border-border hover:border-primary/30"
                }`}
              >
                {activePalette === palette.name && <Check className="absolute top-2 right-2 w-4 h-4 text-primary" />}
                <div className="flex gap-1.5 mb-2">
                  <div className="w-7 h-7 rounded-lg" style={{ background: palette.primary }} />
                  <div className="w-7 h-7 rounded-lg" style={{ background: palette.secondary }} />
                  <div className="w-7 h-7 rounded-lg" style={{ background: palette.accent }} />
                </div>
                <p className="text-sm font-medium">{palette.name}</p>
              </button>
            ))}
          </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { key: "primary_color", label: "Cor Primária", icon: Sun },
              { key: "secondary_color", label: "Cor de Fundo", icon: Moon },
              { key: "accent_color", label: "Cor de Acento", icon: Sparkles },
            ].map(({ key, label, icon: Icon }) => (
              <div key={key} className="space-y-2 p-3 rounded-xl border border-border bg-muted/10">
                <Label className="flex items-center gap-2 text-sm"><Icon className="w-4 h-4" /> {label}</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={(form as any)[key]} onChange={e => { setForm({ ...form, [key]: e.target.value }); setActivePalette(null); }} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                  <Input value={(form as any)[key]} onChange={e => { setForm({ ...form, [key]: e.target.value }); setActivePalette(null); }} className="font-mono text-sm flex-1" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gradient-primary gap-2 shadow-glow">
          <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar Branding"}
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// TAB 3: Feature Flags
// ═══════════════════════════════════════════════
function FeaturesTab() {
  const { user } = useAuth();
  const [nutritionists, setNutritionists] = useState<NutritionistFeature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: nutRoles } = await supabase.from("user_roles").select("user_id").eq("role", "nutritionist");
      if (!nutRoles) { setLoading(false); return; }
      const result: NutritionistFeature[] = [];
      for (const r of nutRoles) {
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", r.user_id).maybeSingle();
        const { data: featureRows } = await supabase
          .from("professional_feature_usage" as any)
          .select("feature_name, status")
          .eq("nutritionist_id", r.user_id);
        const features: Record<string, boolean> = {};
        FEATURES.forEach(f => { features[f.name] = true; });
        featureRows?.forEach((fr: any) => { features[fr.feature_name] = fr.status === "enabled"; });
        result.push({ user_id: r.user_id, full_name: profile?.full_name || "Nutricionista", features });
      }
      setNutritionists(result);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const toggleFeature = async (nutId: string, featureName: string, enabled: boolean) => {
    const newStatus = enabled ? "enabled" : "disabled";
    const { error } = await (supabase.from("professional_feature_usage" as any) as any).upsert(
      { nutritionist_id: nutId, feature_name: featureName, status: newStatus },
      { onConflict: "nutritionist_id,feature_name" }
    );
    if (error) { toast.error("Erro: " + error.message); return; }
    setNutritionists(prev => prev.map(n => n.user_id === nutId ? { ...n, features: { ...n.features, [featureName]: enabled } } : n));
    toast.success(`Feature ${enabled ? "habilitada" : "desabilitada"}`);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {nutritionists.length === 0 ? (
        <Card className="glass shadow-card"><CardContent className="py-12 text-center"><p className="text-muted-foreground">Nenhum nutricionista encontrado</p></CardContent></Card>
      ) : nutritionists.map(n => (
        <Card key={n.user_id} className="glass shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">{n.full_name[0]?.toUpperCase()}</span>
              </div>
              {n.full_name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {FEATURES.map(f => (
              <div key={f.name} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <f.icon className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{f.label}</p>
                    <p className="text-xs text-muted-foreground">{f.description}</p>
                  </div>
                </div>
                <Switch checked={n.features[f.name] ?? true} onCheckedChange={(checked) => toggleFeature(n.user_id, f.name, checked)} />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════
// TAB 4: Testimonials
// ═══════════════════════════════════════════════
function TestimonialsTab() {
  const { user } = useAuth();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data } = await supabase.from("testimonials").select("*").order("created_at", { ascending: false });
      if (data) {
        const enriched: Testimonial[] = [];
        for (const t of data) {
          const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", t.patient_id).maybeSingle();
          enriched.push({ ...t, patient_name: t.is_anonymous ? "Anônimo" : profile?.full_name || "Paciente" });
        }
        setTestimonials(enriched);
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("testimonials").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(status === "approved" ? "Depoimento aprovado!" : "Depoimento rejeitado!");
      setTestimonials(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    }
  };

  const filtered = testimonials.filter(t => filter === "all" || t.status === filter);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {(["all", "pending", "approved", "rejected"] as const).map(f => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
            {f === "all" ? "Todos" : f === "pending" ? "Pendentes" : f === "approved" ? "Aprovados" : "Rejeitados"}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="glass shadow-card"><CardContent className="py-12 text-center"><Star className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" /><p className="text-muted-foreground">Nenhum depoimento encontrado</p></CardContent></Card>
      ) : filtered.map(t => (
        <Card key={t.id} className="glass shadow-card">
          <CardContent className="py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-sm">{t.patient_name}</span>
                  <div className="flex gap-0.5">{Array.from({ length: t.rating || 5 }).map((_, i) => <Star key={i} className="w-3 h-3 fill-accent text-accent" />)}</div>
                  <Badge variant="outline" className={
                    t.status === "approved" ? "bg-emerald-500/10 text-emerald-500" :
                    t.status === "rejected" ? "bg-red-500/10 text-red-500" :
                    "bg-warning/10 text-warning"
                  }>
                    {t.status === "approved" ? "Aprovado" : t.status === "rejected" ? "Rejeitado" : "Pendente"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">"{t.content}"</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(t.created_at).toLocaleDateString("pt-BR")}</p>
              </div>
              {t.status === "pending" && (
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-500" onClick={() => updateStatus(t.id, "approved")}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => updateStatus(t.id, "rejected")}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════
// TAB 5: Users & Admin Promotion
// ═══════════════════════════════════════════════
function UsersTab() {
  const { user } = useAuth();
  const [nutritionists, setNutritionists] = useState<{ user_id: string; full_name: string; patientCount: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoteEmail, setPromoteEmail] = useState("");

  // Create nutritionist form
  const [nutEmail, setNutEmail] = useState("");
  const [nutName, setNutName] = useState("");
  const [nutPassword, setNutPassword] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: nutRoles } = await supabase.from("user_roles").select("user_id").eq("role", "nutritionist");
      const nutIds = nutRoles?.map(r => r.user_id) || [];
      const result: typeof nutritionists = [];
      for (const nutId of nutIds) {
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", nutId).maybeSingle();
        const { count } = await supabase.from("nutritionist_patients").select("id", { count: "exact", head: true }).eq("nutritionist_id", nutId).eq("status", "active");
        result.push({ user_id: nutId, full_name: profile?.full_name || "Nutricionista", patientCount: count || 0 });
      }
      setNutritionists(result);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handlePromote = async () => {
    if (!promoteEmail.trim()) return;
    const { data, error } = await supabase.rpc("promote_to_admin", { _user_email: promoteEmail.trim() });
    if (error) toast.error(error.message);
    else { toast.success(`Usuário promovido a admin!`); setPromoteEmail(""); }
  };

  const handleCreateNutritionist = async () => {
    if (!nutEmail.trim() || !nutName.trim() || !nutPassword.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }
    if (nutPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    setCreating(true);
    const { data, error } = await supabase.rpc("create_nutritionist_account", {
      _email: nutEmail.trim(),
      _full_name: nutName.trim(),
      _password: nutPassword.trim(),
    });
    setCreating(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Nutricionista criado com sucesso!");
      setNutEmail("");
      setNutName("");
      setNutPassword("");
      // Refresh list
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", data).maybeSingle();
      setNutritionists(prev => [...prev, { user_id: data, full_name: profile?.full_name || nutName, patientCount: 0 }]);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Create Nutritionist */}
      <Card className="glass shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" /> Cadastrar Nutricionista
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Apenas administradores podem criar contas de nutricionistas. O profissional receberá acesso imediato.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="nutName">Nome completo</Label>
              <Input id="nutName" placeholder="Dr(a). Nome" value={nutName} onChange={(e) => setNutName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="nutEmail">Email profissional</Label>
              <Input id="nutEmail" type="email" placeholder="email@exemplo.com" value={nutEmail} onChange={(e) => setNutEmail(e.target.value)} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 items-end">
            <div>
              <Label htmlFor="nutPassword">Senha inicial</Label>
              <Input id="nutPassword" type="password" placeholder="Ex: Fit@2026!" value={nutPassword} onChange={(e) => setNutPassword(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Senha forte obrigatória. Padrão: Fit@2026!</p>
            </div>
            <Button onClick={handleCreateNutritionist} disabled={creating} className="gap-1.5">
              <UserPlus className="w-4 h-4" />
              {creating ? "Criando..." : "Criar Nutricionista"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Promote to Admin */}
      <Card className="glass shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Shield className="w-5 h-5" /> Promover a Admin
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input type="email" placeholder="email@exemplo.com" value={promoteEmail} onChange={(e) => setPromoteEmail(e.target.value)} className="flex-1" />
            <Button onClick={handlePromote} className="shrink-0 gap-1"><UserPlus className="w-4 h-4" /> Promover</Button>
          </div>
          <p className="text-xs text-muted-foreground">Digite o email do usuário que deseja promover a administrador</p>
        </CardContent>
      </Card>

      {/* Nutritionists List */}
      <Card className="glass shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg">Nutricionistas ({nutritionists.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {nutritionists.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum nutricionista cadastrado</p>
          ) : nutritionists.map(n => (
            <div key={n.user_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">{n.full_name[0]?.toUpperCase()}</span>
                </div>
                <div>
                  <p className="font-medium text-sm">{n.full_name}</p>
                  <p className="text-xs text-muted-foreground">{n.patientCount} pacientes ativos</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Loading Spinner ───
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-40">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
