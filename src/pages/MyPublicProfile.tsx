import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Globe, Eye, Save, Loader2, Link2, Copy, ExternalLink,
  Users, MessageSquare, TrendingUp, Palette
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function MyPublicProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    slug: "",
    is_public: false,
    bio: "",
    specialties: [] as string[],
    booking_enabled: true,
  });
  const [newSpecialty, setNewSpecialty] = useState("");
  const [leads, setLeads] = useState<any[]>([]);
  const [leadsCount, setLeadsCount] = useState(0);
  const [clipboardError, setClipboardError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [settingsRes, leadsRes] = await Promise.all([
        supabase.from("public_profile_settings").select("*").eq("nutritionist_id", user.id).maybeSingle(),
        supabase.from("lead_requests").select("*").eq("nutritionist_id", user.id).order("created_at", { ascending: false }).limit(20),
      ]);

      if (settingsRes.data) {
        const d = settingsRes.data as any;
        setSettings({
          slug: d.slug || "",
          is_public: d.is_public || false,
          bio: d.bio || "",
          specialties: d.specialties || [],
          booking_enabled: d.booking_enabled ?? true,
        });
      } else {
        const slug = user.email?.split("@")[0]?.replace(/[^a-z0-9-]/g, "-") || "meu-perfil";
        setSettings(s => ({ ...s, slug }));
      }

      setLeads(leadsRes.data || []);
      setLeadsCount((leadsRes.data || []).length);
      setLoading(false);
    })();
  }, [user]);

  const handleSave = async () => {
    if (!user || !settings.slug.trim()) { toast.error("Slug é obrigatório"); return; }
    setSaving(true);

    const payload = {
      nutritionist_id: user.id,
      slug: settings.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      is_public: settings.is_public,
      bio: settings.bio.trim(),
      specialties: settings.specialties,
      booking_enabled: settings.booking_enabled,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("public_profile_settings").upsert(payload, { onConflict: "nutritionist_id" });
    setSaving(false);

    if (error) {
      if (error.code === "23505") toast.error("Este slug já está em uso. Escolha outro.");
      else toast.error("Erro ao salvar configurações.");
      return;
    }
    toast.success("Perfil público atualizado!");
  };

  const addSpecialty = () => {
    if (!newSpecialty.trim()) return;
    setSettings(s => ({ ...s, specialties: [...s.specialties, newSpecialty.trim()] }));
    setNewSpecialty("");
  };

  const removeSpecialty = (idx: number) => {
    setSettings(s => ({ ...s, specialties: s.specialties.filter((_, i) => i !== idx) }));
  };

  const publicUrl = `${window.location.origin}/p/${settings.slug}`;

  const copyLink = async (text: string, label: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        toast.success(`${label} copiado!`);
      } else {
        throw new Error("Clipboard API not available");
      }
    } catch (err) {
      console.warn("Clipboard API blocked, text is already in input for manual copy", err);
      toast.error("Permissão de cópia bloqueada", {
        description: "Selecione o texto no campo ao lado e copie manualmente."
      });
    }
  };

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-3xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-3">
              <Globe className="w-6 h-6 text-primary" /> Meu Perfil Público
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Configure sua página pública para atrair novos pacientes</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/branding")} className="gap-2">
              <Palette className="w-4 h-4" /> Customizar Cores
            </Button>
          </div>
        </div>

        {/* Official Links */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="w-4 h-4 text-primary" /> Seus Links Oficiais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-background border border-border shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Perfil Público & Agenda</p>
                <div className="flex items-center gap-2">
                  <Input value={publicUrl} readOnly className="h-9 text-xs font-mono" />
                  <Button variant="ghost" size="sm" className="h-9 px-3" onClick={() => copyLink(publicUrl, "Link do perfil")}><Copy className="w-3.5 h-3.5" /></Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">Use este link na sua bio do Instagram ou WhatsApp.</p>
              </div>

              <div className="p-4 rounded-xl bg-background border border-border shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Link Direto de Cadastro</p>
                <div className="flex items-center gap-2">
                  <Input value={`${window.location.origin}/cadastro?nutri=${user?.id}`} readOnly className="h-9 text-xs font-mono" />
                  <Button variant="ghost" size="sm" className="h-9 px-3" onClick={() => 
                    copyLink(`${window.location.origin}/cadastro?nutri=${user?.id}`, "Link de cadastro")
                  }><Copy className="w-3.5 h-3.5" /></Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">Pacientes vinculados a você automaticamente.</p>
              </div>

              <div className="p-4 rounded-xl bg-background border border-border shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Link Direto da Agenda</p>
                <div className="flex items-center gap-2">
                  <Input value={`${window.location.origin}/p/${settings.slug}/agenda`} readOnly className="h-9 text-xs font-mono" />
                  <Button variant="ghost" size="sm" className="h-9 px-3" onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/p/${settings.slug}/agenda`);
                    toast.success("Link da agenda copiado!");
                  }}><Copy className="w-3.5 h-3.5" /></Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">Link direto para seu calendário de agendamentos.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configurações do Perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Perfil Público</p>
                <p className="text-xs text-muted-foreground">Tornar seu perfil visível para visitantes</p>
              </div>
              <Switch checked={settings.is_public} onCheckedChange={v => setSettings(s => ({ ...s, is_public: v }))} />
            </div>

            <div>
              <label className="text-sm font-medium">Slug (URL)</label>
              <div className="flex gap-2 mt-1">
                <span className="text-sm text-muted-foreground py-2">/p/</span>
                <Input value={settings.slug} onChange={e => setSettings(s => ({ ...s, slug: e.target.value }))} placeholder="meu-perfil" className="flex-1" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Bio</label>
              <Textarea value={settings.bio} onChange={e => setSettings(s => ({ ...s, bio: e.target.value }))} rows={4} placeholder="Conte sobre sua experiência..." className="mt-1" maxLength={1000} />
            </div>

            <div>
              <label className="text-sm font-medium">Especialidades</label>
              <div className="flex flex-wrap gap-2 mt-1 mb-2">
                {settings.specialties.map((s, i) => (
                  <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => removeSpecialty(i)}>{s} ✕</Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={newSpecialty} onChange={e => setNewSpecialty(e.target.value)} placeholder="Ex: Emagrecimento" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addSpecialty())} />
                <Button variant="outline" onClick={addSpecialty}>Adicionar</Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Botão de Agendamento</p>
                <p className="text-xs text-muted-foreground">Permitir que visitantes solicitem consultas</p>
              </div>
              <Switch checked={settings.booking_enabled} onCheckedChange={v => setSettings(s => ({ ...s, booking_enabled: v }))} />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full gradient-primary gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Configurações
            </Button>
          </CardContent>
        </Card>

        {/* Leads */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-info" /> Leads Recebidos ({leadsCount})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum lead recebido ainda. Ative seu perfil público!</p>
            ) : (
              <div className="space-y-2">
                {leads.map(lead => (
                  <div key={lead.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{lead.name}</p>
                      <p className="text-xs text-muted-foreground">{lead.email}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{lead.source}</Badge>
                    <span className="text-[10px] text-muted-foreground">{new Date(lead.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </DashboardLayout>
  );
}
