import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@v1/integrations/supabase/client";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Badge } from "@v1/components/ui/badge";
import { Input } from "@v1/components/ui/input";
import { Textarea } from "@v1/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import { Switch } from "@v1/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@v1/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@v1/components/ui/tabs";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Sparkles, Crown, Eye, EyeOff, Pencil, Star, ChevronUp, ChevronDown,
  LayoutDashboard, Users, Utensils, BarChart3, CalendarCheck, Apple, TrendingUp,
  Target, HeartPulse, AlertTriangle, FileText, Zap, MessageCircle, Trophy, Flame,
} from "lucide-react";
import CinematicGuideSlide from "@v1/components/common/CinematicGuideSlide";
import { MagicSlideButton } from "@v1/components/common/MagicSlideGenerator";
import { cn } from "@v1/lib/utils";
import { resolveFeatureRoute } from "@v1/lib/featureRouteMap";
import { useNavigate } from "react-router-dom";
import type { EnrichedSlide } from "@v1/hooks/useFeatureGuide";

const ICON_MAP: Record<string, any> = {
  LayoutDashboard, Users, Utensils, BarChart3, Sparkles,
  CalendarCheck, Apple, TrendingUp, Target, HeartPulse,
  AlertTriangle, FileText, Zap, MessageCircle, Trophy, Flame, Crown,
};

const CATEGORY_LABELS: Record<string, string> = {
  patient_journey: "🧑 Jornada do Paciente",
  professional_journey: "🩺 Jornada do Profissional",
  clinical_intelligence: "🧠 Inteligência Clínica",
  performance_results: "📊 Performance & Resultados",
  experience_engagement: "🎮 Experiência & Engajamento",
};

const PHASE_LABELS: Record<string, string> = {
  start: "🟢 Início",
  adaptation: "🟡 Adaptação",
  acceleration: "🟠 Aceleração",
  consolidation: "🔵 Consolidação",
};

const IMPACT_LABELS: Record<string, string> = {
  low: "Baixo",
  medium: "Médio",
  high: "Alto",
  transformador: "🔥 Transformador",
};

const AUDIENCE_LABELS: Record<string, string> = {
  professional: "Profissional",
  patient: "Paciente",
  both: "Ambos",
};

export default function AdminGuideEngine() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewSlide, setPreviewSlide] = useState<any | null>(null);
  const [tab, setTab] = useState("all");

  const { data: features = [], isLoading } = useQuery({
    queryKey: ["admin-feature-registry"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_registry")
        .select("*")
        .order("journey_priority", { ascending: true })
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase
        .from("feature_registry")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-feature-registry"] });
      queryClient.invalidateQueries({ queryKey: ["feature-registry"] });
      toast.success("Feature atualizada!");
    },
  });

  const toggleStatus = (f: any) => {
    const next = f.status === "active" ? "hidden" : "active";
    updateMutation.mutate({ id: f.id, updates: { status: next } });
  };

  const toggleHighlight = (f: any) => {
    updateMutation.mutate({ id: f.id, updates: { is_highlight: !f.is_highlight } });
  };

  const togglePremium = (f: any) => {
    updateMutation.mutate({ id: f.id, updates: { is_premium: !f.is_premium } });
  };

  const movePriority = (f: any, dir: number) => {
    updateMutation.mutate({ id: f.id, updates: { journey_priority: Math.max(1, f.journey_priority + dir * 10) } });
  };

  const filtered = tab === "all" ? features : features.filter(f => {
    if (tab === "professional") return f.target_audience === "professional" || f.target_audience === "both";
    if (tab === "patient") return f.target_audience === "patient" || f.target_audience === "both";
    if (tab === "hidden") return f.status === "hidden";
    if (tab === "highlight") return f.is_highlight;
    return true;
  });

  const stats = {
    total: features.length,
    active: features.filter(f => f.status === "active").length,
    beta: features.filter(f => f.status === "beta").length,
    hidden: features.filter(f => f.status === "hidden").length,
    highlights: features.filter(f => f.is_highlight).length,
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary" />
              Guide Engine — Guia Vivo
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie os slides dinâmicos do onboarding. Cada feature gera um slide automaticamente.
          </p>
          </div>
          <MagicSlideButton />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Total", value: stats.total, color: "text-foreground" },
            { label: "Ativas", value: stats.active, color: "text-accent" },
            { label: "Beta", value: stats.beta, color: "text-warning" },
            { label: "Ocultas", value: stats.hidden, color: "text-muted-foreground" },
            { label: "Destaques", value: stats.highlights, color: "text-primary" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-3 text-center">
                <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="professional">Profissional</TabsTrigger>
            <TabsTrigger value="patient">Paciente</TabsTrigger>
            <TabsTrigger value="highlight">Destaques</TabsTrigger>
            <TabsTrigger value="hidden">Ocultos</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4 space-y-3">
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Carregando features...</p>
            ) : filtered.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhuma feature encontrada.</p>
            ) : (
              filtered.map((f, i) => (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className={cn(
                    "transition-all",
                    f.status === "hidden" && "opacity-50",
                    f.is_highlight && "ring-1 ring-primary/30",
                    f.is_premium && "ring-1 ring-warning/30"
                  )}>
                    <CardContent className="p-4 flex items-center gap-4">
                      {/* Icon */}
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br",
                        f.gradient
                      )}>
                        {(() => { const I = ICON_MAP[f.icon_name] || Sparkles; return <I className="w-6 h-6 text-primary-foreground" />; })()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{f.emoji} {f.name}</span>
                          <Badge variant="outline" className="text-[10px]">{AUDIENCE_LABELS[f.target_audience]}</Badge>
                          <Badge variant="outline" className="text-[10px]">{CATEGORY_LABELS[f.category]?.slice(2) || f.category}</Badge>
                          <Badge variant="outline" className="text-[10px]">{PHASE_LABELS[f.journey_phase]}</Badge>
                          {f.is_highlight && <Badge className="bg-accent text-accent-foreground text-[10px]">✨ Destaque</Badge>}
                          {f.is_premium && <Badge className="bg-warning text-warning-foreground text-[10px]">👑 Premium</Badge>}
                          {f.status === "beta" && <Badge variant="secondary" className="text-[10px]">Beta</Badge>}
                          {f.status === "hidden" && <Badge variant="destructive" className="text-[10px]">Oculto</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{f.short_description}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                          Impacto: {IMPACT_LABELS[f.emotional_impact]} • Prioridade: {f.journey_priority} • v{f.version}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => movePriority(f, -1)} title="Subir prioridade">
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => movePriority(f, 1)} title="Descer prioridade">
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleHighlight(f)} title="Destaque">
                          <Star className={cn("w-4 h-4", f.is_highlight && "fill-primary text-primary")} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => togglePremium(f)} title="Premium">
                          <Crown className={cn("w-4 h-4", f.is_premium && "fill-warning text-warning")} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleStatus(f)} title={f.status === "hidden" ? "Mostrar" : "Ocultar"}>
                          {f.status === "hidden" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingId(f.id)} title="Editar">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => {
                          const Icon = ICON_MAP[f.icon_name] || Sparkles;
                          setPreviewSlide({
                            id: f.feature_key, title: f.name, subtitle: f.short_description,
                            bullets: f.bullets || [], icon: Icon, gradient: f.gradient, emoji: f.emoji,
                            isNew: f.is_highlight, isPremium: f.is_premium,
                            emotionalImpact: f.emotional_impact, ctaText: f.cta_text,
                          });
                        }}>
                          Preview
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <EditFeatureDialog
          feature={features.find(f => f.id === editingId) || null}
          open={!!editingId}
          onClose={() => setEditingId(null)}
          onSave={(updates) => {
            if (editingId) {
              updateMutation.mutate({ id: editingId, updates }, {
                onSuccess: () => setEditingId(null),
              });
            }
          }}
        />

        {/* Preview Dialog */}
        <Dialog open={!!previewSlide} onOpenChange={() => setPreviewSlide(null)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Preview do Slide</DialogTitle>
            </DialogHeader>
            {previewSlide && (
              <div className="py-4">
                <CinematicGuideSlide
                  slide={previewSlide}
                  index={0}
                  total={1}
                  onCtaClick={(featureKey) => {
                    const route = resolveFeatureRoute(featureKey);
                    if (route) {
                      setPreviewSlide(null);
                      navigate(route);
                    } else {
                      toast.info("Rota não mapeada para esta feature");
                    }
                  }}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

function EditFeatureDialog({ feature, open, onClose, onSave }: {
  feature: any | null;
  open: boolean;
  onClose: () => void;
  onSave: (updates: Record<string, any>) => void;
}) {
  const [form, setForm] = useState<Record<string, any>>({});

  const f = feature;
  if (!f) return null;

  const val = (key: string) => form[key] ?? f[key] ?? "";
  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setForm({}); onClose(); } }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar: {f.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nome</label>
            <Input value={val("name")} onChange={e => set("name", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Descrição Curta</label>
            <Input value={val("short_description")} onChange={e => set("short_description", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Impacto Clínico</label>
            <Textarea value={val("clinical_impact")} onChange={e => set("clinical_impact", e.target.value)} rows={2} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Bullets (um por linha)</label>
            <Textarea
              value={Array.isArray(val("bullets")) ? val("bullets").join("\n") : val("bullets")}
              onChange={e => set("bullets", e.target.value.split("\n").filter(Boolean))}
              rows={4}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Público</label>
              <Select value={val("target_audience")} onValueChange={v => set("target_audience", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Profissional</SelectItem>
                  <SelectItem value="patient">Paciente</SelectItem>
                  <SelectItem value="both">Ambos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={val("status")} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="beta">Beta</SelectItem>
                  <SelectItem value="hidden">Oculto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Categoria</label>
              <Select value={val("category")} onValueChange={v => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Fase da Jornada</label>
              <Select value={val("journey_phase")} onValueChange={v => set("journey_phase", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PHASE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Impacto Emocional</label>
              <Select value={val("emotional_impact")} onValueChange={v => set("emotional_impact", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(IMPACT_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Prioridade</label>
              <Input type="number" value={val("journey_priority")} onChange={e => set("journey_priority", parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Emoji</label>
            <Input value={val("emoji")} onChange={e => set("emoji", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">CTA Text</label>
            <Input value={val("cta_text")} onChange={e => set("cta_text", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Gradiente CSS</label>
            <Input value={val("gradient")} onChange={e => set("gradient", e.target.value)} placeholder="from-primary to-accent" />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={val("is_highlight")} onCheckedChange={v => set("is_highlight", v)} />
              <span className="text-sm">Destaque</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={val("is_premium")} onCheckedChange={v => set("is_premium", v)} />
              <span className="text-sm">Premium</span>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => { setForm({}); onClose(); }} className="flex-1">Cancelar</Button>
            <Button onClick={() => onSave(form)} className="flex-1">Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
