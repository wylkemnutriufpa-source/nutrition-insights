import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Palette, Upload, Eye, Save, RotateCcw } from "lucide-react";

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

export default function Branding() {
  const { user } = useAuth();
  const [form, setForm] = useState<BrandingData>(defaultBranding);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("branding_settings").select("*").eq("nutritionist_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setForm({
            brand_name: data.brand_name || "",
            logo_url: data.logo_url,
            primary_color: data.primary_color || "#10b981",
            secondary_color: data.secondary_color || "#1a1a2e",
            accent_color: data.accent_color || "#f59e0b",
            custom_css: data.custom_css,
          });
          if (data.logo_url) setLogoPreview(data.logo_url);
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

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    let logoUrl = form.logo_url;
    if (logoFile) {
      const ext = logoFile.name.split(".").pop();
      const path = `branding/${user.id}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("body-images").upload(path, logoFile);
      if (upErr) { toast.error("Erro no upload do logo"); setSaving(false); return; }
      const { data: urlData } = supabase.storage.from("body-images").getPublicUrl(path);
      logoUrl = urlData.publicUrl;
    }

    const payload = { ...form, logo_url: logoUrl, nutritionist_id: user.id };

    const { data: existing } = await supabase.from("branding_settings").select("id").eq("nutritionist_id", user.id).maybeSingle();

    if (existing) {
      const { error } = await supabase.from("branding_settings").update(payload).eq("nutritionist_id", user.id);
      if (error) toast.error(error.message); else toast.success("Branding atualizado!");
    } else {
      const { error } = await supabase.from("branding_settings").insert(payload);
      if (error) toast.error(error.message); else toast.success("Branding salvo!");
    }
    setSaving(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Palette className="w-6 h-6 text-primary" /> Branding & Personalização
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Configure a identidade visual da sua marca para seus pacientes.</p>
        </div>

        {/* Logo & Brand Name */}
        <Card className="glass border-border">
          <CardHeader><CardTitle className="text-base">Identidade</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6">
              <label className="cursor-pointer">
                <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden hover:border-primary/40 transition-colors">
                  {logoPreview ? (
                    <img src={logoPreview} className="w-full h-full object-contain" alt="Logo" />
                  ) : (
                    <Upload className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              </label>
              <div className="flex-1 space-y-3">
                <div>
                  <Label>Nome da Marca</Label>
                  <Input value={form.brand_name} onChange={e => setForm({ ...form, brand_name: e.target.value })} placeholder="Ex: Nutri Saúde Integral" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Colors */}
        <Card className="glass border-border">
          <CardHeader><CardTitle className="text-base">Paleta de Cores</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {[
                { key: "primary_color", label: "Cor Primária", desc: "Botões e destaques" },
                { key: "secondary_color", label: "Cor Secundária", desc: "Fundo e textos" },
                { key: "accent_color", label: "Cor de Acento", desc: "Alertas e badges" },
              ].map(({ key, label, desc }) => (
                <div key={key} className="space-y-2">
                  <Label className="text-xs">{label}</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={(form as any)[key]}
                      onChange={e => setForm({ ...form, [key]: e.target.value })}
                      className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                    />
                    <Input
                      value={(form as any)[key]}
                      onChange={e => setForm({ ...form, [key]: e.target.value })}
                      className="font-mono text-xs"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="glass border-border">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Eye className="w-4 h-4" /> Preview</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-xl border border-border p-6" style={{ background: form.secondary_color }}>
              <div className="flex items-center gap-3 mb-4">
                {logoPreview && <img src={logoPreview} className="w-10 h-10 rounded-lg object-contain" alt="" />}
                <h3 className="font-display text-lg font-bold" style={{ color: form.primary_color }}>
                  {form.brand_name || "Sua Marca"}
                </h3>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ background: form.primary_color }}>
                  Botão Primário
                </button>
                <button className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ background: form.accent_color }}>
                  Botão Acento
                </button>
              </div>
              <div className="mt-3 p-3 rounded-lg" style={{ background: `${form.primary_color}15` }}>
                <p className="text-sm" style={{ color: `${form.primary_color}` }}>Este é um card de exemplo com suas cores personalizadas.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button onClick={handleSave} className="gradient-primary gap-2 flex-1" disabled={saving}>
            <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar Branding"}
          </Button>
          <Button variant="outline" onClick={() => { setForm(defaultBranding); setLogoPreview(null); setLogoFile(null); }} className="gap-2">
            <RotateCcw className="w-4 h-4" /> Resetar
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
