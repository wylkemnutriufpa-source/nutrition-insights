import { useEffect, useState } from "react";
import { useAuth } from "@v1/lib/auth";
import { supabase } from "@v1/integrations/supabase/client";
import { useTenant } from "@v1/lib/tenantContext";
import { withTenantFilter, getTenantIdForInsert } from "@v1/lib/tenantQueryHelpers";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Input } from "@v1/components/ui/input";
import { Label } from "@v1/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@v1/components/ui/tabs";
import { Separator } from "@v1/components/ui/separator";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Palette, Upload, Eye, Save, RotateCcw, ExternalLink, Sparkles,
  Image, Type, Droplets, Sun, Moon, Check, Globe
} from "lucide-react";

interface BrandingData {
  brand_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  custom_css: string | null;
}

const defaultBranding: BrandingData = {
  brand_name: "",
  logo_url: null,
  primary_color: "#10b981",
  secondary_color: "#1a1a2e",
  accent_color: "#f59e0b",
  custom_css: null,
};

const presetPalettes = [
  { name: "Emerald", primary: "#10b981", secondary: "#1a1a2e", accent: "#f59e0b" },
  { name: "Ocean", primary: "#3b82f6", secondary: "#0f172a", accent: "#06b6d4" },
  { name: "Rose", primary: "#f43f5e", secondary: "#1c1917", accent: "#fb923c" },
  { name: "Violet", primary: "#8b5cf6", secondary: "#18181b", accent: "#ec4899" },
  { name: "Teal", primary: "#14b8a6", secondary: "#1e293b", accent: "#fbbf24" },
  { name: "Coral", primary: "#ef4444", secondary: "#1a1a2e", accent: "#a855f7" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function Branding() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const navigate = useNavigate();
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
            brand_name: data.brand_name || "",
            logo_url: data.logo_url,
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
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const applyPalette = (palette: typeof presetPalettes[0]) => {
    setForm({ ...form, primary_color: palette.primary, secondary_color: palette.secondary, accent_color: palette.accent });
    setActivePalette(palette.name);
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
    <DashboardLayout>
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.1 } } }}
        className="space-y-6 max-w-4xl"
      >
        {/* Header */}
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Palette className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Branding & Personalização</h1>
              <p className="text-sm text-muted-foreground">Configure a identidade visual completa da sua marca</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => navigate("/v1/landing")}
          >
            <Globe className="w-4 h-4" />
            Ver Landing Page
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        </motion.div>

        <Tabs defaultValue="identity" className="space-y-6">
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="identity" className="gap-2">
              <Image className="w-4 h-4" /> Identidade
            </TabsTrigger>
            <TabsTrigger value="colors" className="gap-2">
              <Droplets className="w-4 h-4" /> Paleta de Cores
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="w-4 h-4" /> Preview
            </TabsTrigger>
          </TabsList>

          {/* Identity Tab */}
          <TabsContent value="identity">
            <motion.div variants={fadeUp} className="space-y-6">
              <Card className="glass border-border shadow-card">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Type className="w-4 h-4 text-primary" /> Logo & Nome da Marca
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8">
                    {/* Logo upload */}
                    <div className="space-y-3">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Logo</Label>
                      <label className="cursor-pointer group block">
                        <div className="w-full aspect-square max-w-[200px] rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center overflow-hidden hover:border-primary/50 transition-all duration-300 bg-muted/20 group-hover:bg-muted/40">
                          {logoPreview ? (
                            <div className="relative w-full h-full">
                              <img src={logoPreview} className="w-full h-full object-contain p-4" alt="Logo" />
                              <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <div className="text-center">
                                  <Upload className="w-6 h-6 text-primary mx-auto mb-1" />
                                  <span className="text-xs text-muted-foreground">Trocar logo</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center p-4">
                              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                                <Upload className="w-6 h-6 text-primary" />
                              </div>
                              <p className="text-sm font-medium text-foreground">Enviar logo</p>
                              <p className="text-xs text-muted-foreground mt-1">PNG, SVG ou JPG<br />Recomendado: 512×512px</p>
                            </div>
                          )}
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                      </label>
                    </div>

                    {/* Brand info */}
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <Label>Nome da Marca</Label>
                        <Input
                          value={form.brand_name}
                          onChange={e => setForm({ ...form, brand_name: e.target.value })}
                          placeholder="Ex: NutriVida Premium"
                          className="text-lg h-12"
                        />
                        <p className="text-xs text-muted-foreground">Aparece no cabeçalho, landing page e materiais do paciente</p>
                      </div>

                      <Separator />

                      {/* Quick brand preview */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Visualização rápida</Label>
                        <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-muted/20">
                          {logoPreview ? (
                            <img src={logoPreview} className="w-12 h-12 rounded-xl object-contain" alt="" />
                          ) : (
                            <div
                              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                              style={{ background: form.primary_color }}
                            >
                              {form.brand_name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                          )}
                          <div>
                            <p className="font-display font-bold text-lg" style={{ color: form.primary_color }}>
                              {form.brand_name || "Sua Marca"}
                            </p>
                            <p className="text-xs text-muted-foreground">Plataforma de nutrição inteligente</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Colors Tab */}
          <TabsContent value="colors">
            <motion.div variants={fadeUp} className="space-y-6">
              {/* Preset palettes */}
              <Card className="glass border-border shadow-card">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" /> Paletas Prontas
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Clique para aplicar uma paleta profissional</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {presetPalettes.map((palette) => (
                      <button
                        key={palette.name}
                        onClick={() => applyPalette(palette)}
                        className={`relative p-4 rounded-xl border-2 transition-all duration-300 text-left hover:scale-[1.02] ${
                          activePalette === palette.name
                            ? "border-primary shadow-md bg-primary/5"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        {activePalette === palette.name && (
                          <div className="absolute top-2 right-2">
                            <Check className="w-4 h-4 text-primary" />
                          </div>
                        )}
                        <div className="flex gap-1.5 mb-2.5">
                          <div className="w-8 h-8 rounded-lg shadow-sm" style={{ background: palette.primary }} />
                          <div className="w-8 h-8 rounded-lg shadow-sm" style={{ background: palette.secondary }} />
                          <div className="w-8 h-8 rounded-lg shadow-sm" style={{ background: palette.accent }} />
                        </div>
                        <p className="text-sm font-medium">{palette.name}</p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Custom colors */}
              <Card className="glass border-border shadow-card">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Palette className="w-4 h-4 text-primary" /> Cores Personalizadas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { key: "primary_color", label: "Cor Primária", desc: "Botões, links e destaques principais", icon: Sun },
                      { key: "secondary_color", label: "Cor de Fundo", desc: "Fundos escuros e áreas secundárias", icon: Moon },
                      { key: "accent_color", label: "Cor de Acento", desc: "Alertas, badges e elementos especiais", icon: Sparkles },
                    ].map(({ key, label, desc, icon: Icon }) => (
                      <div key={key} className="space-y-3 p-4 rounded-xl border border-border bg-muted/10">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          <Label className="text-sm font-medium">{label}</Label>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <input
                              type="color"
                              value={(form as any)[key]}
                              onChange={e => { setForm({ ...form, [key]: e.target.value }); setActivePalette(null); }}
                              className="w-14 h-14 rounded-xl border-2 border-border cursor-pointer appearance-none bg-transparent"
                              style={{ padding: 2 }}
                            />
                          </div>
                          <div className="flex-1">
                            <Input
                              value={(form as any)[key]}
                              onChange={e => { setForm({ ...form, [key]: e.target.value }); setActivePalette(null); }}
                              className="font-mono text-sm"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview">
            <motion.div variants={fadeUp} className="space-y-6">
              <Card className="glass border-border shadow-card overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" /> Preview Completo
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Veja como sua marca aparecerá na plataforma</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Navbar preview */}
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Barra de Navegação</Label>
                    <div className="rounded-xl overflow-hidden border border-border">
                      <div className="flex items-center justify-between px-6 py-3" style={{ background: form.secondary_color }}>
                        <div className="flex items-center gap-3">
                          {logoPreview ? (
                            <img src={logoPreview} className="w-8 h-8 rounded-lg object-contain" alt="" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: form.primary_color }}>
                              {form.brand_name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                          )}
                          <span className="font-display font-bold text-white text-sm">
                            {form.brand_name || "Sua Marca"}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button className="px-3 py-1.5 rounded-lg text-white/70 text-xs hover:text-white transition-colors">Dashboard</button>
                          <button className="px-3 py-1.5 rounded-lg text-white/70 text-xs hover:text-white transition-colors">Pacientes</button>
                          <button className="px-3 py-1.5 rounded-lg text-xs text-white font-medium" style={{ background: form.primary_color }}>Novo Paciente</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* UI elements preview */}
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Elementos da Interface</Label>
                    <div className="rounded-xl border border-border p-6 bg-muted/10 space-y-4">
                      <div className="flex flex-wrap gap-3">
                        <button className="px-5 py-2.5 rounded-xl text-white text-sm font-medium shadow-lg transition-transform hover:scale-105" style={{ background: form.primary_color }}>
                          Botão Primário
                        </button>
                        <button className="px-5 py-2.5 rounded-xl text-white text-sm font-medium shadow-lg transition-transform hover:scale-105" style={{ background: form.accent_color }}>
                          Botão Acento
                        </button>
                        <button className="px-5 py-2.5 rounded-xl text-sm font-medium border-2 transition-transform hover:scale-105" style={{ borderColor: form.primary_color, color: form.primary_color }}>
                          Botão Outline
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-4 rounded-xl" style={{ background: `${form.primary_color}12` }}>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full" style={{ background: form.primary_color }} />
                            <p className="text-sm font-medium" style={{ color: form.primary_color }}>Card Informativo</p>
                          </div>
                          <p className="text-xs text-muted-foreground">Exemplo de card com suas cores.</p>
                        </div>
                        <div className="p-4 rounded-xl" style={{ background: `${form.accent_color}12` }}>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full" style={{ background: form.accent_color }} />
                            <p className="text-sm font-medium" style={{ color: form.accent_color }}>Card de Destaque</p>
                          </div>
                          <p className="text-xs text-muted-foreground">Exemplo com cor de acento.</p>
                        </div>
                      </div>

                      {/* Badge previews */}
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-medium text-white" style={{ background: form.primary_color }}>Badge Primário</span>
                        <span className="px-3 py-1 rounded-full text-xs font-medium text-white" style={{ background: form.accent_color }}>Badge Acento</span>
                        <span className="px-3 py-1 rounded-full text-xs font-medium border" style={{ borderColor: form.primary_color, color: form.primary_color }}>Badge Outline</span>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Progresso do paciente</span>
                          <span>75%</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: "75%", background: `linear-gradient(90deg, ${form.primary_color}, ${form.accent_color})` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* Action buttons */}
        <motion.div variants={fadeUp} className="flex gap-3 sticky bottom-4 z-10">
          <Button onClick={handleSave} className="gradient-primary gap-2 flex-1 h-12 text-base shadow-lg" disabled={saving}>
            <Save className="w-5 h-5" /> {saving ? "Salvando..." : "Salvar Branding"}
          </Button>
          <Button variant="outline" onClick={() => { setForm(defaultBranding); setLogoPreview(null); setLogoFile(null); setActivePalette(null); }} className="gap-2 h-12">
            <RotateCcw className="w-4 h-4" /> Resetar
          </Button>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
