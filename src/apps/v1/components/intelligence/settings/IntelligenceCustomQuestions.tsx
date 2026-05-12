import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Textarea } from "@v1/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import { Switch } from "@v1/components/ui/switch";
import { Label } from "@v1/components/ui/label";
import { Badge } from "@v1/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@v1/components/ui/dialog";
import { HelpCircle, Plus, Pencil, Trash2, Sparkles } from "lucide-react";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface CustomQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: any;
  is_active: boolean;
  delivery_mode: string;
  sort_order: number;
}

const DEFAULT_QUESTIONS = [
  // Comportamental
  { question_text: "Como você está se sentindo hoje em relação à sua dieta?", question_type: "quick_reply", options: ["Ótimo 😊", "Mais ou menos 😐", "Difícil 😔", "Quero desistir 😢"], delivery_mode: "prompt", sort_order: 0 },
  { question_text: "De 1 a 10, qual seu nível de fome neste momento?", question_type: "scale", options: null, delivery_mode: "prompt", sort_order: 1 },
  { question_text: "Você conseguiu seguir o plano alimentar hoje?", question_type: "quick_reply", options: ["Sim, 100% ✅", "Quase tudo 🟡", "Metade 🟠", "Não consegui ❌"], delivery_mode: "prompt", sort_order: 2 },
  { question_text: "Quantos copos de água você tomou até agora?", question_type: "quick_reply", options: ["0-2 copos", "3-5 copos", "6-8 copos", "8+ copos 💧"], delivery_mode: "prompt", sort_order: 3 },
  // Treino
  { question_text: "Você treinou hoje?", question_type: "quick_reply", options: ["Sim! 💪", "Vou treinar mais tarde", "Hoje é descanso", "Não consegui"], delivery_mode: "prompt", sort_order: 4 },
  { question_text: "Como foi a qualidade do seu sono ontem?", question_type: "scale", options: null, delivery_mode: "prompt", sort_order: 5 },
  // Emocional
  { question_text: "Teve alguma compulsão ou desejo intenso hoje?", question_type: "quick_reply", options: ["Não tive 😌", "Tive mas resisti 💪", "Cedi um pouco 😅", "Cedi totalmente 😓"], delivery_mode: "prompt", sort_order: 6 },
  { question_text: "Qual a maior dificuldade que você está enfrentando agora no plano?", question_type: "free_text", options: null, delivery_mode: "prompt", sort_order: 7 },
  // Check-in semanal
  { question_text: "Como foi sua semana de alimentação no geral?", question_type: "quick_reply", options: ["Excelente 🌟", "Boa 👍", "Regular 😐", "Ruim 👎"], delivery_mode: "prompt", sort_order: 8 },
  { question_text: "Tem algo que você gostaria de ajustar no seu plano alimentar?", question_type: "free_text", options: null, delivery_mode: "prompt", sort_order: 9 },
  // Suplementação
  { question_text: "Você tomou seus suplementos hoje?", question_type: "quick_reply", options: ["Sim, todos ✅", "Alguns", "Esqueci ❌"], delivery_mode: "prompt", sort_order: 10 },
  // Energia / Bem-estar
  { question_text: "De 1 a 10, como está seu nível de energia hoje?", question_type: "scale", options: null, delivery_mode: "prompt", sort_order: 11 },
  { question_text: "Está sentindo algum sintoma diferente? (inchaço, dor, cansaço excessivo)", question_type: "free_text", options: null, delivery_mode: "prompt", sort_order: 12 },
];

export default function IntelligenceCustomQuestions() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<CustomQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomQuestion | null>(null);
  const [form, setForm] = useState({
    question_text: "",
    question_type: "quick_reply",
    options_text: "",
    delivery_mode: "prompt",
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("intelligence_custom_questions")
      .select("*")
      .eq("nutritionist_id", user.id)
      .order("sort_order", { ascending: true });

    const rows = (data ?? []) as unknown as CustomQuestion[];

    // Auto-seed default questions on first access
    if (rows.length === 0) {
      const seeds = DEFAULT_QUESTIONS.map((q) => ({
        ...q,
        nutritionist_id: user.id,
      }));
      await supabase.from("intelligence_custom_questions").insert(seeds);
      const { data: seeded } = await supabase
        .from("intelligence_custom_questions")
        .select("*")
        .eq("nutritionist_id", user.id)
        .order("sort_order", { ascending: true });
      setQuestions((seeded ?? []) as unknown as CustomQuestion[]);
    } else {
      setQuestions(rows);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const openNew = () => {
    setEditing(null);
    setForm({ question_text: "", question_type: "quick_reply", options_text: "", delivery_mode: "prompt" });
    setDialogOpen(true);
  };

  const openEdit = (q: CustomQuestion) => {
    setEditing(q);
    const optArr = Array.isArray(q.options) ? q.options : [];
    setForm({
      question_text: q.question_text,
      question_type: q.question_type,
      options_text: optArr.join("\n"),
      delivery_mode: q.delivery_mode,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!user || !form.question_text.trim()) {
      toast.error("Preencha a pergunta");
      return;
    }
    setSaving(true);
    const options = form.options_text.split("\n").map((s) => s.trim()).filter(Boolean);
    const payload = {
      question_text: form.question_text,
      question_type: form.question_type,
      options: options.length > 0 ? options : null,
      delivery_mode: form.delivery_mode,
    };

    if (editing) {
      await supabase
        .from("intelligence_custom_questions")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", editing.id);
      toast.success("Pergunta atualizada!");
    } else {
      await supabase
        .from("intelligence_custom_questions")
        .insert({
          nutritionist_id: user.id,
          ...payload,
          sort_order: questions.length,
        });
      toast.success("Pergunta criada!");
    }

    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const toggleActive = async (q: CustomQuestion) => {
    await supabase
      .from("intelligence_custom_questions")
      .update({ is_active: !q.is_active })
      .eq("id", q.id);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("intelligence_custom_questions").delete().eq("id", id);
    toast.success("Pergunta removida");
    load();
  };

  const typeLabel = (t: string) =>
    t === "quick_reply" ? "Resposta Rápida" : t === "scale" ? "Escala 1-10" : "Texto Livre";

  return (
    <div className="space-y-4">
      <Card className="border-amber-500/20 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-500" /> Perguntas para o Paciente
            </CardTitle>
            <Button onClick={openNew} size="sm" className="gap-1 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/30">
              <Plus className="w-4 h-4" /> Nova Pergunta
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Perguntas pré-configuradas + personalizadas. A IFJ usa essas perguntas para coletar dados comportamentais do paciente via Orb Neural.
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Carregando perguntas...</p>
          ) : questions.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
                <Sparkles className="w-7 h-7 text-amber-500" />
              </div>
              <p className="text-sm text-muted-foreground">Nenhuma pergunta personalizada ainda.</p>
              <Button onClick={openNew} variant="outline" size="sm" className="gap-1 border-amber-500/30 text-amber-500">
                <Plus className="w-4 h-4" /> Criar primeira pergunta
              </Button>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-2">
                {questions.map((q, i) => (
                  <motion.div
                    key={q.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.03 }}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${q.is_active ? "border-amber-500/20 bg-amber-500/5" : "border-border/50 bg-muted/30 opacity-60"}`}
                  >
                    <HelpCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{q.question_text}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px] h-4">
                          {typeLabel(q.question_type)}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] h-4">
                          {q.delivery_mode === "prompt" ? "Via Orb" : "No Wizard"}
                        </Badge>
                        {Array.isArray(q.options) && q.options.length > 0 && (
                          <span className="text-[10px] text-muted-foreground">{q.options.length} opções</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Switch checked={q.is_active} onCheckedChange={() => toggleActive(q)} />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(q)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(q.id)}>
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
            <DialogTitle>{editing ? "Editar Pergunta" : "Nova Pergunta"}</DialogTitle>
            <DialogDescription>Configure a pergunta que será enviada ao paciente</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Pergunta</Label>
              <Textarea
                value={form.question_text}
                onChange={(e) => setForm((f) => ({ ...f, question_text: e.target.value }))}
                placeholder="Ex: Como você está se sentindo hoje em relação à dieta?"
                maxLength={300}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tipo de Resposta</Label>
                <Select value={form.question_type} onValueChange={(v) => setForm((f) => ({ ...f, question_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quick_reply">Resposta Rápida (botões)</SelectItem>
                    <SelectItem value="scale">Escala (1-10)</SelectItem>
                    <SelectItem value="free_text">Texto Livre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Entrega</Label>
                <Select value={form.delivery_mode} onValueChange={(v) => setForm((f) => ({ ...f, delivery_mode: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prompt">Via Orb (flutuante)</SelectItem>
                    <SelectItem value="wizard">No Wizard (onboarding)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.question_type === "quick_reply" && (
              <div className="space-y-1">
                <Label className="text-xs">Opções de Resposta (uma por linha)</Label>
                <Textarea
                  value={form.options_text}
                  onChange={(e) => setForm((f) => ({ ...f, options_text: e.target.value }))}
                  placeholder={"Ótimo 😊\nMais ou menos 😐\nDifícil 😔"}
                  rows={4}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving} className="gap-1 bg-gradient-to-r from-amber-600 to-yellow-500 text-amber-950">
              {saving ? "Salvando..." : editing ? "Atualizar" : "Criar Pergunta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
