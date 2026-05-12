import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { withTenantFilter, getTenantIdForInsert } from "@/lib/tenantQueryHelpers";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Megaphone, Send, Calendar, Users, Bell, MessageSquare,
  CheckCircle2, XCircle, Clock, Eye, Plus, Filter,
  TrendingUp, BarChart3, Target, Zap
} from "lucide-react";
import { format } from "date-fns";

const CAMPAIGN_TYPES = [
  { value: "operational", label: "Operacional", icon: Zap, color: "text-blue-500" },
  { value: "promotional", label: "Promocional", icon: TrendingUp, color: "text-emerald-500" },
  { value: "educational", label: "Educacional", icon: Target, color: "text-purple-500" },
  { value: "clinical", label: "Clínica", icon: Bell, color: "text-amber-500" },
];

const CHANNELS = [
  { id: "notification", label: "Notificação Interna", icon: Bell },
  { id: "push", label: "Push Notification", icon: Send },
];

export default function CampaignCenter() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    campaign_name: "", campaign_type: "operational", audience_type: "patients",
    title: "", message_body: "", call_to_action_label: "", call_to_action_url: "",
    channels: ["notification"] as string[],
    scheduling_type: "immediate", scheduled_at: "",
  });
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [preview, setPreview] = useState<any>(null);

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns", tenantId],
    queryFn: async () => {
      const q = (supabase as any).from("campaigns").select("*").order("created_at", { ascending: false });
      const { data } = await withTenantFilter(q, tenantId);
      return data || [];
    },
  });

  const toggleChannel = (ch: string) => {
    setForm(f => ({
      ...f,
      channels: f.channels.includes(ch) ? f.channels.filter(c => c !== ch) : [...f.channels, ch]
    }));
  };

  const [previewLoading, setPreviewLoading] = useState(false);
  const [launching, setLaunching] = useState(false);

  const runPreview = async () => {
    if (!user) return;
    setPreviewLoading(true);
    try {
      // First save as draft to get campaign_id
      const { data: draft, error } = await (supabase as any).from("campaigns").insert({
        campaign_name: form.campaign_name,
        campaign_type: form.campaign_type,
        audience_type: form.audience_type,
        title: form.title,
        message_body: form.message_body,
        call_to_action_label: form.call_to_action_label || null,
        call_to_action_url: form.call_to_action_url || null,
        delivery_channels_json: form.channels,
        filters_json: filters,
        scheduling_type: form.scheduling_type,
        scheduled_at: form.scheduled_at || null,
        status: "draft",
        created_by: user.id,
        ...getTenantIdForInsert(tenantId),
      }).select().single();
      if (error) throw error;

      const { data: previewData, error: prevErr } = await supabase.functions.invoke("execute-campaign", {
        body: { campaign_id: draft.id, mode: "preview" },
      });
      if (prevErr) throw prevErr;

      setPreview({
        campaignId: draft.id,
        total: previewData.total_recipients || 0,
        byChannel: previewData.by_channel || [],
      });
      setStep(5);
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    } catch (err: any) {
      toast.error("Erro no preview: " + (err.message || ""));
    } finally {
      setPreviewLoading(false);
    }
  };

  const saveCampaign = async (status: string) => {
    if (!user) return;
    setLaunching(true);
    try {
      const campaignId = preview?.campaignId;
      if (status === "running" && campaignId) {
        // Launch real campaign via edge function
        const { data, error } = await supabase.functions.invoke("execute-campaign", {
          body: { campaign_id: campaignId, mode: "execute" },
        });
        if (error) throw error;
        toast.success(`🚀 Campanha enviada para ${data.delivered || 0} destinatários!`);
      } else if (campaignId) {
        // Already saved as draft during preview
        toast.success("💾 Campanha salva como rascunho");
      } else {
        // No preview was done, save directly
        await (supabase as any).from("campaigns").insert({
          campaign_name: form.campaign_name,
          campaign_type: form.campaign_type,
          audience_type: form.audience_type,
          title: form.title,
          message_body: form.message_body,
          call_to_action_label: form.call_to_action_label || null,
          call_to_action_url: form.call_to_action_url || null,
          delivery_channels_json: form.channels,
          filters_json: filters,
          scheduling_type: form.scheduling_type,
          scheduled_at: form.scheduled_at || null,
          status,
          created_by: user.id,
          ...getTenantIdForInsert(tenantId),
        });
        toast.success(status === "running" ? "🚀 Campanha enviada!" : "💾 Rascunho salvo");
      }
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setShowCreate(false);
      setStep(1);
      setPreview(null);
    } catch (err: any) {
      toast.error("Erro: " + (err.message || "Erro ao salvar campanha"));
    } finally {
      setLaunching(false);
    }
  };

  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    ready: "bg-blue-500/10 text-blue-600",
    running: "bg-amber-500/10 text-amber-600",
    completed: "bg-emerald-500/10 text-emerald-600",
    canceled: "bg-red-500/10 text-red-600",
    failed: "bg-red-500/10 text-red-600",
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-primary flex items-center justify-center">
              <Megaphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Central de Campanhas</h1>
              <p className="text-sm text-muted-foreground">Comunicação segmentada e inteligente</p>
            </div>
          </div>
          <Button onClick={() => { setShowCreate(true); setStep(1); }} className="gap-2"><Plus className="w-4 h-4" /> Nova Campanha</Button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total", value: campaigns.length, icon: Megaphone, color: "text-primary" },
            { label: "Ativas", value: campaigns.filter((c: any) => c.status === "running").length, icon: Send, color: "text-amber-500" },
            { label: "Concluídas", value: campaigns.filter((c: any) => c.status === "completed").length, icon: CheckCircle2, color: "text-emerald-500" },
            { label: "Rascunhos", value: campaigns.filter((c: any) => c.status === "draft").length, icon: Clock, color: "text-muted-foreground" },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Campaigns List */}
        <Card>
          <CardHeader><CardTitle>Campanhas</CardTitle></CardHeader>
          <CardContent>
            {campaigns.length === 0 ? (
              <div className="text-center py-8">
                <Megaphone className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Nenhuma campanha criada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {campaigns.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Megaphone className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{c.campaign_name || c.title}</p>
                        <p className="text-xs text-muted-foreground">{c.campaign_type} · {c.audience_type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusColors[c.status] || ""}>{c.status}</Badge>
                      <span className="text-xs text-muted-foreground">{c.created_at ? format(new Date(c.created_at), "dd/MM") : ""}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Campaign Wizard */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Megaphone className="w-5 h-5 text-primary" /> Nova Campanha</DialogTitle>
            </DialogHeader>

            <div className="flex gap-1 mb-4">
              {[1, 2, 3, 4, 5, 6].map(s => (
                <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${step >= s ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>

            {step === 1 && (
              <div className="space-y-4">
                <h3 className="font-semibold">1. Objetivo</h3>
                <div className="grid grid-cols-2 gap-3">
                  {CAMPAIGN_TYPES.map(ct => (
                    <button key={ct.value} onClick={() => { setForm(f => ({ ...f, campaign_type: ct.value })); }}
                      className={`p-4 rounded-xl border text-left transition-all ${form.campaign_type === ct.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                      <ct.icon className={`w-6 h-6 ${ct.color} mb-2`} />
                      <p className="font-medium text-sm">{ct.label}</p>
                    </button>
                  ))}
                </div>
                <Input placeholder="Nome da campanha" value={form.campaign_name} onChange={e => setForm(f => ({ ...f, campaign_name: e.target.value }))} />
                <Button className="w-full" onClick={() => setStep(2)} disabled={!form.campaign_name}>Próximo →</Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h3 className="font-semibold">2. Público-alvo</h3>
                <Select value={form.audience_type} onValueChange={v => setForm(f => ({ ...f, audience_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="patients">Pacientes</SelectItem>
                    <SelectItem value="professionals">Profissionais</SelectItem>
                    <SelectItem value="mixed">Todos</SelectItem>
                  </SelectContent>
                </Select>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Filtros</p>
                  <Select onValueChange={v => setFilters(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativos</SelectItem>
                      <SelectItem value="inactive">Inativos</SelectItem>
                      <SelectItem value="all">Todos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={() => setStep(3)}>Próximo →</Button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h3 className="font-semibold">3. Mensagem</h3>
                <Input placeholder="Título da campanha" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                <Textarea placeholder="Corpo da mensagem..." value={form.message_body} onChange={e => setForm(f => ({ ...f, message_body: e.target.value }))} rows={4} />
                <Input placeholder="Texto do botão (opcional)" value={form.call_to_action_label} onChange={e => setForm(f => ({ ...f, call_to_action_label: e.target.value }))} />
                <Button className="w-full" onClick={() => setStep(4)} disabled={!form.title || !form.message_body}>Próximo →</Button>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <h3 className="font-semibold">4. Canais</h3>
                <div className="space-y-2">
                  {CHANNELS.map(ch => (
                    <label key={ch.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${form.channels.includes(ch.id) ? "border-primary bg-primary/5" : "border-border"}`}>
                      <Checkbox checked={form.channels.includes(ch.id)} onCheckedChange={() => toggleChannel(ch.id)} />
                      <ch.icon className="w-4 h-4" />
                      <span className="text-sm">{ch.label}</span>
                    </label>
                  ))}
                </div>
                <Select value={form.scheduling_type} onValueChange={v => setForm(f => ({ ...f, scheduling_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Enviar agora</SelectItem>
                    <SelectItem value="scheduled">Agendar</SelectItem>
                  </SelectContent>
                </Select>
                {form.scheduling_type === "scheduled" && (
                  <Input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} />
                )}
                <Button className="w-full" onClick={runPreview} disabled={previewLoading}>{previewLoading ? "Calculando..." : <><Eye className="w-4 h-4 mr-2" /> Preview</>}</Button>
              </div>
            )}

            {step === 5 && preview && (
              <div className="space-y-4">
                <h3 className="font-semibold">5. Preview de Impacto</h3>
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-4">
                    <p className="text-3xl font-bold text-primary">{preview.total}</p>
                    <p className="text-sm text-muted-foreground">destinatários estimados</p>
                    <div className="mt-3 space-y-1">
                      {preview.byChannel.map((ch: any) => (
                        <div key={ch.channel} className="flex justify-between text-sm">
                          <span>{ch.channel}</span>
                          <span className="font-medium">{ch.count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => saveCampaign("draft")}>Salvar Rascunho</Button>
                  <Button className="flex-1" onClick={() => saveCampaign("running")}><Send className="w-4 h-4 mr-2" /> Enviar</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
