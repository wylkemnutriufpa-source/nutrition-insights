import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { MessageSquare, Plus, Pencil, Trash2, GripVertical, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface CustomPrompt {
  id: string;
  title: string;
  body: string;
  emoji: string;
  tone: string;
  is_active: boolean;
  escalation_level: number;
  sort_order: number;
}

const EMOJI_OPTIONS = ["💬", "💧", "💪", "🌙", "🩺", "✨", "🎯", "🔥", "❤️", "⚡", "🧠", "🌟"];

export default function IntelligenceCustomPrompts() {
  const { user } = useAuth();
  const [prompts, setPrompts] = useState<CustomPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomPrompt | null>(null);
  const [form, setForm] = useState({ title: "", body: "", emoji: "💬", tone: "gentle", escalation_level: 0 });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("intelligence_custom_prompts")
      .select("*")
      .eq("nutritionist_id", user.id)
      .order("sort_order", { ascending: true });
    setPrompts((data ?? []) as unknown as CustomPrompt[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const openNew = () => {
    setEditing(null);
    setForm({ title: "", body: "", emoji: "💬", tone: "gentle", escalation_level: 0 });
    setDialogOpen(true);
  };

  const openEdit = (p: CustomPrompt) => {
    setEditing(p);
    setForm({ title: p.title, body: p.body, emoji: p.emoji, tone: p.tone, escalation_level: p.escalation_level });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!user || !form.title.trim() || !form.body.trim()) {
      toast.error("Preencha título e mensagem");
      return;
    }
    setSaving(true);

    if (editing) {
      await supabase
        .from("intelligence_custom_prompts")
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq("id", editing.id);
      toast.success("Mensagem atualizada!");
    } else {
      await supabase
        .from("intelligence_custom_prompts")
        .insert({
          nutritionist_id: user.id,
          ...form,
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

  return (
    <div className="space-y-4">
      <Card className="border-amber-500/20 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-500" /> Mensagens Personalizadas
            </CardTitle>
            <Button onClick={openNew} size="sm" className="gap-1 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/30">
              <Plus className="w-4 h-4" /> Nova Mensagem
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Crie mensagens e lembretes personalizados que serão exibidos no orb do paciente. Use <code>{"{nome}"}</code> para inserir o nome do paciente.
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
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
                    transition={{ delay: i * 0.05 }}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${p.is_active ? "border-amber-500/20 bg-amber-500/5" : "border-border/50 bg-muted/30 opacity-60"}`}
                  >
                    <span className="text-xl mt-0.5">{p.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">{p.title}</p>
                        <Badge variant="outline" className="text-[10px] h-4">
                          {p.tone === "gentle" ? "🌸 Leve" : p.tone === "firm" ? "💪 Firme" : "😄 Divertido"}
                        </Badge>
                        {p.escalation_level > 0 && (
                          <Badge variant="outline" className="text-[10px] h-4 border-warning/50 text-warning">
                            Nível {p.escalation_level}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.body}</p>
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
              <p className="text-[10px] text-muted-foreground">Use <code>{"{nome}"}</code> para o nome do paciente</p>
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
                    <SelectItem value="1">Leve</SelectItem>
                    <SelectItem value="2">Firme</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
