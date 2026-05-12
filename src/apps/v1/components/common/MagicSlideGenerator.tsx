import { useState } from "react";
import { useFeatureFlag } from "@v1/lib/featureFlags";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@v1/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@v1/components/ui/dialog";
import { Button } from "@v1/components/ui/button";
import { Badge } from "@v1/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@v1/components/ui/radio-group";
import { Label } from "@v1/components/ui/label";
import { Textarea } from "@v1/components/ui/textarea";
import {
  Wand2, Sparkles, Eye, Save, Send, Copy, ChevronRight,
  Loader2, X, Crown, Brain, Heart, Zap, Target,
  Trophy, BarChart3, BookOpen, Instagram,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ── Constants ─────────────────────────────── */

const SLIDE_TYPES = [
  { value: "feature", label: "Funcionalidade do sistema", icon: Zap, emoji: "🚀" },
  { value: "clinical_benefit", label: "Benefício clínico", icon: Heart, emoji: "💚" },
  { value: "motivational", label: "Progresso / motivacional", icon: Target, emoji: "🔥" },
  { value: "gamification", label: "Gamificação / ranking", icon: Trophy, emoji: "🏆" },
  { value: "body_projection", label: "Projeção corporal", icon: Brain, emoji: "🧬" },
  { value: "clinical_result", label: "Resultado clínico real", icon: BarChart3, emoji: "📊" },
  { value: "educational", label: "Educacional nutricional", icon: BookOpen, emoji: "🧠" },
  { value: "instagram", label: "Marketing Instagram", icon: Instagram, emoji: "📱" },
];

const THEMES = [
  { value: "neon_green", label: "Futurista verde neon", color: "bg-emerald-500" },
  { value: "holographic", label: "Holográfico clínico", color: "bg-cyan-400" },
  { value: "metabolic_energy", label: "Energia metabólica", color: "bg-orange-500" },
  { value: "body_transformation", label: "Corpo em transformação", color: "bg-violet-500" },
  { value: "tech_dashboard", label: "Dashboard tecnológico", color: "bg-indigo-500" },
  { value: "journey_evolution", label: "Jornada evolutiva", color: "bg-amber-500" },
];

const TONES = [
  { value: "inspirational", label: "Inspirador" },
  { value: "scientific", label: "Científico" },
  { value: "commercial", label: "Comercial" },
  { value: "motivational", label: "Motivacional" },
  { value: "premium", label: "Premium sofisticado" },
];

const GRADIENT_MAP: Record<string, string> = {
  neon_green: "from-emerald-500 to-teal-600",
  holographic: "from-cyan-400 to-blue-600",
  metabolic_energy: "from-orange-500 to-red-600",
  body_transformation: "from-violet-500 to-purple-600",
  tech_dashboard: "from-slate-400 to-indigo-600",
  journey_evolution: "from-amber-400 to-emerald-600",
};

interface GeneratedSlide {
  title: string;
  subtitle: string;
  bullets: string[];
  cta_text: string;
  icon_suggestion: string;
  animation_suggestion: string;
  soundtrack_suggestion: string;
  emoji: string;
  gradient: string;
  slide_type: string;
  theme: string;
  tone: string;
  target_audience: string;
}

/* ── Component ──────────────────────────────── */

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function MagicSlideGenerator({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [step, setStep] = useState<"config" | "preview">("config");
  const [slideType, setSlideType] = useState("feature");
  const [theme, setTheme] = useState("neon_green");
  const [tone, setTone] = useState("inspirational");
  const [customContext, setCustomContext] = useState("");
  const [generated, setGenerated] = useState<GeneratedSlide | null>(null);

  const { enabled: llmEnabled } = useFeatureFlag("llm_global_enabled");

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!llmEnabled) throw new Error("IA LLM desativada pelo administrador");
      const { data, error } = await supabase.functions.invoke("generate-smart-slide", {
        body: { slide_type: slideType, theme, tone, custom_context: customContext || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.data as GeneratedSlide;
    },
    onSuccess: (data) => {
      setGenerated(data);
      setStep("preview");
      toast.success("Slide gerado com sucesso!");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao gerar slide"),
  });

  const saveMutation = useMutation({
    mutationFn: async (status: "draft" | "active") => {
      if (!generated) throw new Error("Nenhum slide gerado");
      const { error } = await supabase.from("smart_generated_slides").insert({
        slide_type: generated.slide_type,
        theme: generated.theme,
        tone: generated.tone,
        title: generated.title,
        subtitle: generated.subtitle,
        bullets: generated.bullets,
        cta_text: generated.cta_text,
        icon_suggestion: generated.icon_suggestion,
        animation_suggestion: generated.animation_suggestion,
        soundtrack_suggestion: generated.soundtrack_suggestion,
        visual_style: { gradient: generated.gradient, emoji: generated.emoji },
        gradient: generated.gradient,
        emoji: generated.emoji,
        target_audience: generated.target_audience,
        status,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: (_, status) => {
      toast.success(status === "active" ? "Slide publicado no Guia Vivo!" : "Rascunho salvo!");
      qc.invalidateQueries({ queryKey: ["smart-slides"] });
      resetAndClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetAndClose = () => {
    setStep("config");
    setGenerated(null);
    setCustomContext("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <AnimatePresence mode="wait">
          {step === "config" ? (
            <motion.div key="config" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 space-y-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <Wand2 className="w-5 h-5 text-primary" />
                  Magic Slide Generator
                </DialogTitle>
                <p className="text-sm text-muted-foreground">Gere slides cinematográficos automaticamente com IA</p>
              </DialogHeader>

              {/* Slide type */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Tipo de Slide</Label>
                <div className="grid grid-cols-2 gap-2">
                  {SLIDE_TYPES.map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.value}
                        onClick={() => setSlideType(t.value)}
                        className={`flex items-center gap-2 p-3 rounded-lg border text-left text-sm transition-all ${
                          slideType === t.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span>{t.emoji} {t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Theme */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Tema Visual</Label>
                <div className="grid grid-cols-3 gap-2">
                  {THEMES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setTheme(t.value)}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs transition-all ${
                        theme === t.value
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full ${t.color}`} />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tone */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Tom da Mensagem</Label>
                <RadioGroup value={tone} onValueChange={setTone} className="flex flex-wrap gap-2">
                  {TONES.map((t) => (
                    <div key={t.value} className="flex items-center">
                      <RadioGroupItem value={t.value} id={`tone-${t.value}`} className="sr-only" />
                      <Label
                        htmlFor={`tone-${t.value}`}
                        className={`px-3 py-1.5 rounded-full text-xs cursor-pointer border transition-all ${
                          tone === t.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {t.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Custom context */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Contexto adicional (opcional)</Label>
                <Textarea
                  placeholder="Ex: Foque na nova calculadora de peso ideal..."
                  value={customContext}
                  onChange={(e) => setCustomContext(e.target.value)}
                  rows={2}
                  className="text-sm"
                />
              </div>

              <Button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="w-full gap-2"
                size="lg"
              >
                {generateMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Gerando com IA...</>
                ) : (
                  <><Wand2 className="w-4 h-4" /> Gerar Slide Inteligente</>
                )}
              </Button>
            </motion.div>
          ) : (
            <motion.div key="preview" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-0">
              {/* Fullscreen preview */}
              {generated && (
                <>
                  <div className={`relative min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br ${generated.gradient} overflow-hidden`}>
                    {/* Particles overlay */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      {[...Array(6)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute w-1 h-1 rounded-full bg-white/30"
                          style={{ left: `${15 + i * 15}%`, top: `${20 + (i % 3) * 25}%` }}
                          animate={{ y: [0, -20, 0], opacity: [0.2, 0.6, 0.2] }}
                          transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}
                        />
                      ))}
                    </div>

                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }} className="text-5xl mb-4">
                      {generated.emoji}
                    </motion.span>

                    <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                      className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg max-w-md">
                      {generated.title}
                    </motion.h2>

                    <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                      className="text-white/80 text-sm md:text-base mt-2 max-w-sm">
                      {generated.subtitle}
                    </motion.p>

                    <ul className="mt-6 space-y-2 text-left max-w-sm w-full">
                      {generated.bullets?.map((b, i) => (
                        <motion.li key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.1 }}
                          className="flex items-start gap-2 text-sm text-white/90">
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-white/70 flex-shrink-0" />
                          {b}
                        </motion.li>
                      ))}
                    </ul>

                    {generated.cta_text && (
                      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="mt-6">
                        <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-semibold shadow-lg">
                          <Sparkles className="w-4 h-4" /> {generated.cta_text}
                        </span>
                      </motion.div>
                    )}

                    {/* Close */}
                    <button onClick={() => setStep("config")} className="absolute top-3 right-3 text-white/60 hover:text-white">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Meta info */}
                  <div className="p-4 bg-muted/30 border-t flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="gap-1 text-xs">🎨 {generated.theme}</Badge>
                    <Badge variant="outline" className="gap-1 text-xs">🎯 {generated.tone}</Badge>
                    <Badge variant="outline" className="gap-1 text-xs">🎬 {generated.animation_suggestion}</Badge>
                    <Badge variant="outline" className="gap-1 text-xs">🎵 {generated.soundtrack_suggestion}</Badge>
                    <Badge variant="outline" className="gap-1 text-xs">🖼 {generated.icon_suggestion}</Badge>
                  </div>

                  {/* Actions */}
                  <div className="p-4 flex flex-wrap gap-2">
                    <Button onClick={() => saveMutation.mutate("draft")} variant="outline" className="gap-1 flex-1" disabled={saveMutation.isPending}>
                      <Save className="w-4 h-4" /> Rascunho
                    </Button>
                    <Button onClick={() => saveMutation.mutate("active")} className="gap-1 flex-1" disabled={saveMutation.isPending}>
                      <Send className="w-4 h-4" /> Publicar no Guia
                    </Button>
                    <Button variant="outline" className="gap-1" onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(generated, null, 2));
                      toast.success("JSON copiado!");
                    }}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" className="gap-1" onClick={() => { setGenerated(null); setStep("config"); }}>
                      <Wand2 className="w-4 h-4" /> Novo
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

/* ── Trigger Button ─────────────────────────── */

export function MagicSlideButton({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" className={`gap-2 ${className}`}>
        <Wand2 className="w-4 h-4" />
        Gerar Slide Inteligente
      </Button>
      <MagicSlideGenerator open={open} onOpenChange={setOpen} />
    </>
  );
}
