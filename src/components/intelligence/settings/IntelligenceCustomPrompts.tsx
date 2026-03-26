import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { MessageSquare, Plus, Pencil, Trash2, Sparkles, Clock, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const DAYS_OF_WEEK = [
  { value: "mon", label: "Seg" },
  { value: "tue", label: "Ter" },
  { value: "wed", label: "Qua" },
  { value: "thu", label: "Qui" },
  { value: "fri", label: "Sex" },
  { value: "sat", label: "Sáb" },
  { value: "sun", label: "Dom" },
];

const HOUR_OPTIONS = Array.from({ length: 16 }, (_, i) => i + 6); // 6h - 21h

interface CustomPrompt {
  id: string;
  title: string;
  body: string;
  emoji: string;
  tone: string;
  is_active: boolean;
  escalation_level: number;
  sort_order: number;
  schedule_hours: number[] | null;
  schedule_days: string[] | null;
}

const EMOJI_OPTIONS = ["💬", "💧", "💪", "🌙", "🩺", "✨", "🎯", "🔥", "❤️", "⚡", "🧠", "🌟"];

const DEFAULT_PROMPTS = [
  // Hidratação
  { title: "Lembrete de Água — Leve", body: "Ei {nome}! 💧 Já tomou água hoje? Seu corpo precisa de pelo menos 2L por dia. Bora hidratar!", emoji: "💧", tone: "gentle", escalation_level: 0, sort_order: 0, prompt_type: "hydration" },
  { title: "Lembrete de Água — Firme", body: "{nome}, você não registrou sua hidratação hoje. Lembre-se: desidratação afeta metabolismo, concentração e até humor. Tome um copo agora! 💧", emoji: "💧", tone: "firm", escalation_level: 1, sort_order: 1, prompt_type: "hydration" },
  { title: "Água — Puxão de Orelha", body: "{nome}, faz tempo que você não registra água. Isso impacta diretamente seus resultados. Não sabote seu progresso — hidrate-se AGORA! 🚰", emoji: "💧", tone: "firm", escalation_level: 2, sort_order: 2, prompt_type: "hydration" },
  // Treino
  { title: "Lembrete de Treino — Motivação", body: "Bora {nome}! 💪 Seu treino de hoje está esperando. Cada sessão te deixa mais perto do seu objetivo!", emoji: "💪", tone: "gentle", escalation_level: 0, sort_order: 3, prompt_type: "workout" },
  { title: "Treino — Nudge Firme", body: "{nome}, você não treinou nos últimos dias. Manter a consistência é mais importante que intensidade. Nem que seja 20 minutos hoje! 🏋️", emoji: "💪", tone: "firm", escalation_level: 1, sort_order: 4, prompt_type: "workout" },
  { title: "Treino — Puxão de Orelha", body: "{nome}, sua frequência de treino caiu bastante. Sem movimento, o plano alimentar perde eficácia. Vamos retomar HOJE? 🔥", emoji: "🔥", tone: "firm", escalation_level: 2, sort_order: 5, prompt_type: "workout" },
  // Adesão / Puxão de Orelha
  { title: "Adesão — Lembrete Gentil", body: "Oi {nome} 🌟 Notei que você não registrou suas refeições recentemente. Tudo bem? Registrar ajuda muito no acompanhamento!", emoji: "🌟", tone: "gentle", escalation_level: 0, sort_order: 6, prompt_type: "adherence" },
  { title: "Adesão — Puxão Moderado", body: "{nome}, faz {dias} dias sem registrar refeições. Seu nutricionista precisa desses dados para ajustar seu plano. Bora voltar? 📋", emoji: "📋", tone: "firm", escalation_level: 1, sort_order: 7, prompt_type: "adherence" },
  { title: "Adesão — Alerta Sério", body: "{nome}, sua adesão está em {adesao}%. Quando a adesão cai, os resultados param. Não desista agora — você já conquistou muito! 🎯", emoji: "🎯", tone: "firm", escalation_level: 2, sort_order: 8, prompt_type: "adherence" },
  // Fim de Semana
  { title: "Alerta Fim de Semana", body: "Oi {nome}! 🌙 Fim de semana chegando. Lembre-se: manter a dieta no final de semana é o que separa quem tem resultado de quem fica parado. Planeje suas refeições!", emoji: "🌙", tone: "gentle", escalation_level: 0, sort_order: 9, prompt_type: "weekend" },
  { title: "Domingo — Check-in", body: "{nome}, como foi seu fim de semana alimentar? Registre o que comeu — mesmo que tenha saído do plano. Honestidade é progresso! ✍️", emoji: "✍️", tone: "gentle", escalation_level: 0, sort_order: 10, prompt_type: "weekend" },
  // Motivação
  { title: "Motivação — Celebração", body: "Parabéns {nome}! 🎉 Você está mantendo uma sequência incrível de {dias} dias de adesão. Continue assim!", emoji: "🎉", tone: "gentle", escalation_level: 0, sort_order: 11, prompt_type: "motivation" },
  { title: "Motivação — Progresso", body: "{nome}, olha só: desde que começou, você já {progresso}. Cada passo conta. Estou orgulhosa do seu esforço! ❤️", emoji: "❤️", tone: "gentle", escalation_level: 0, sort_order: 12, prompt_type: "motivation" },
  { title: "Motivação — Foco no Objetivo", body: "{nome}, lembre-se do seu objetivo: {objetivo}. Hoje é mais um dia para se aproximar dele. Você consegue! ⚡", emoji: "⚡", tone: "gentle", escalation_level: 0, sort_order: 13, prompt_type: "motivation" },
  // Suplementação
  { title: "Lembrete de Suplementação", body: "{nome}, não esqueça de tomar seus suplementos hoje! Eles fazem parte do seu protocolo e potencializam seus resultados. 💊", emoji: "💊", tone: "gentle", escalation_level: 0, sort_order: 14, prompt_type: "custom" },
  // Sono
  { title: "Lembrete de Sono", body: "Oi {nome}! 😴 Está ficando tarde. Dormir bem é essencial para recuperação muscular e regulação hormonal. Tente descansar 7-8h hoje!", emoji: "😴", tone: "gentle", escalation_level: 0, sort_order: 15, prompt_type: "custom" },
];

export default function IntelligenceCustomPrompts() {
  const { user } = useAuth();
  const [prompts, setPrompts] = useState<CustomPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomPrompt | null>(null);
  const [form, setForm] = useState({ title: "", body: "", emoji: "💬", tone: "gentle", escalation_level: 0, schedule_hours: [] as number[], schedule_days: [] as string[] });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("intelligence_custom_prompts")
      .select("*")
      .eq("nutritionist_id", user.id)
      .order("sort_order", { ascending: true });

    const rows = (data ?? []) as unknown as CustomPrompt[];

    // Auto-seed default templates on first access
    if (rows.length === 0) {
      const seeds = DEFAULT_PROMPTS.map((p) => ({
        ...p,
        nutritionist_id: user.id,
      }));
      await supabase.from("intelligence_custom_prompts").insert(seeds);
      // Reload after seed
      const { data: seeded } = await supabase
        .from("intelligence_custom_prompts")
        .select("*")
        .eq("nutritionist_id", user.id)
        .order("sort_order", { ascending: true });
      setPrompts((seeded ?? []) as unknown as CustomPrompt[]);
    } else {
      setPrompts(rows);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const openNew = () => {
    setEditing(null);
    setForm({ title: "", body: "", emoji: "💬", tone: "gentle", escalation_level: 0, schedule_hours: [], schedule_days: [] });
    setDialogOpen(true);
  };

  const openEdit = (p: CustomPrompt) => {
    setEditing(p);
    setForm({ title: p.title, body: p.body, emoji: p.emoji, tone: p.tone, escalation_level: p.escalation_level, schedule_hours: p.schedule_hours ?? [], schedule_days: p.schedule_days ?? [] });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!user || !form.title.trim() || !form.body.trim()) {
      toast.error("Preencha título e mensagem");
      return;
    }
    setSaving(true);

    const payload = {
      title: form.title,
      body: form.body,
      emoji: form.emoji,
      tone: form.tone,
      escalation_level: form.escalation_level,
      schedule_hours: form.schedule_hours.length > 0 ? form.schedule_hours : null,
      schedule_days: form.schedule_days.length > 0 ? form.schedule_days : null,
    };

    if (editing) {
      await supabase
        .from("intelligence_custom_prompts")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", editing.id);
      toast.success("Mensagem atualizada!");
    } else {
      await supabase
        .from("intelligence_custom_prompts")
        .insert({
          nutritionist_id: user.id,
          ...payload,
          sort_order: prompts.length,
        });
      toast.success("Mensagem criada!");
    }

    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const toggleActive = async (p: CustomPrompt) => {
    await supabase
      .from("intelligence_custom_prompts")
      .update({ is_active: !p.is_active })
      .eq("id", p.id);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("intelligence_custom_prompts").delete().eq("id", id);
    toast.success("Mensagem removida");
    load();
  };

  const toneLabel = (t: string) =>
    t === "gentle" ? "🌸 Leve" : t === "firm" ? "💪 Firme" : "😄 Divertido";

  return (
    <div className="space-y-4">
      <Card className="border-amber-500/20 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-500" /> Mensagens & Templates
            </CardTitle>
            <Button onClick={openNew} size="sm" className="gap-1 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/30">
              <Plus className="w-4 h-4" /> Nova Mensagem
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Templates base pré-configurados + suas mensagens personalizadas. Edite, desative ou crie novas. Use <code>{"{nome}"}</code>, <code>{"{dias}"}</code>, <code>{"{adesao}"}</code>, <code>{"{objetivo}"}</code>, <code>{"{progresso}"}</code>.
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Carregando templates...</p>
          ) : prompts.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
                <Sparkles className="w-7 h-7 text-amber-500" />
              </div>
              <p className="text-sm text-muted-foreground">Nenhuma mensagem personalizada ainda.</p>
              <Button onClick={openNew} variant="outline" size="sm" className="gap-1 border-amber-500/30 text-amber-500">
                <Plus className="w-4 h-4" /> Criar primeira mensagem
              </Button>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-2">
                {prompts.map((p, i) => (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.03 }}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${p.is_active ? "border-amber-500/20 bg-amber-500/5" : "border-border/50 bg-muted/30 opacity-60"}`}
                  >
                    <span className="text-xl mt-0.5">{p.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold truncate">{p.title}</p>
                        <Badge variant="outline" className="text-[10px] h-4">
                          {toneLabel(p.tone)}
                        </Badge>
                        {p.escalation_level > 0 && (
                          <Badge variant="outline" className="text-[10px] h-4 border-orange-500/50 text-orange-500">
                            Nível {p.escalation_level}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.body}</p>
                      {(p.schedule_days?.length || p.schedule_hours?.length) ? (
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {p.schedule_days && p.schedule_days.length > 0 && (
                            <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                              <CalendarDays className="w-3 h-3" />
                              {p.schedule_days.map(d => DAYS_OF_WEEK.find(dw => dw.value === d)?.label || d).join(", ")}
                            </span>
                          )}
                          {p.schedule_hours && p.schedule_hours.length > 0 && (
                            <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                              <Clock className="w-3 h-3" />
                              {p.schedule_hours.map(h => `${h}h`).join(", ")}
                            </span>
                          )}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(p)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(p.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-amber-500/30">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Mensagem" : "Nova Mensagem"}</DialogTitle>
            <DialogDescription>Configure a mensagem que será exibida para o paciente</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-[auto_1fr] gap-3 items-start">
              <div className="space-y-1">
                <Label className="text-xs">Emoji</Label>
                <Select value={form.emoji} onValueChange={(v) => setForm((f) => ({ ...f, emoji: v }))}>
                  <SelectTrigger className="w-16"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EMOJI_OPTIONS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Título</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Ex: Lembrete de Suplementação"
                  maxLength={80}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Mensagem</Label>
              <Textarea
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Ex: {nome}, não esqueça de tomar seu suplemento hoje! 💊"
                maxLength={500}
                rows={4}
              />
              <p className="text-[10px] text-muted-foreground">
                Placeholders: <code>{"{nome}"}</code> <code>{"{dias}"}</code> <code>{"{adesao}"}</code> <code>{"{objetivo}"}</code> <code>{"{progresso}"}</code>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tom</Label>
                <Select value={form.tone} onValueChange={(v) => setForm((f) => ({ ...f, tone: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gentle">🌸 Leve</SelectItem>
                    <SelectItem value="firm">💪 Firme</SelectItem>
                    <SelectItem value="playful">😄 Divertido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nível de Escalação</Label>
                <Select value={String(form.escalation_level)} onValueChange={(v) => setForm((f) => ({ ...f, escalation_level: Number(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Normal</SelectItem>
                    <SelectItem value="1">Moderado</SelectItem>
                    <SelectItem value="2">Firme (Puxão)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Schedule: Days */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-amber-500" /> Dias da Semana
              </Label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => {
                  const checked = form.schedule_days.includes(day.value);
                  return (
                    <label key={day.value} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-pointer text-xs transition-all ${checked ? "border-amber-500/50 bg-amber-500/10 text-amber-600" : "border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/50"}`}>
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          setForm((f) => ({
                            ...f,
                            schedule_days: v
                              ? [...f.schedule_days, day.value]
                              : f.schedule_days.filter((d) => d !== day.value),
                          }));
                        }}
                        className="h-3.5 w-3.5"
                      />
                      {day.label}
                    </label>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground">Deixe vazio = todos os dias</p>
            </div>

            {/* Schedule: Hours */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" /> Horários de Disparo
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {HOUR_OPTIONS.map((h) => {
                  const checked = form.schedule_hours.includes(h);
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => {
                        setForm((f) => ({
                          ...f,
                          schedule_hours: checked
                            ? f.schedule_hours.filter((hr) => hr !== h)
                            : [...f.schedule_hours, h].sort((a, b) => a - b),
                        }));
                      }}
                      className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${checked ? "bg-amber-500/20 text-amber-600 border border-amber-500/40" : "bg-muted/30 text-muted-foreground border border-border/50 hover:bg-muted/50"}`}
                    >
                      {h}h
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground">Deixe vazio = qualquer horário válido</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving} className="gap-1 bg-gradient-to-r from-amber-600 to-yellow-500 text-amber-950">
              {saving ? "Salvando..." : editing ? "Atualizar" : "Criar Mensagem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
