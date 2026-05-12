import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Lock, Shield, CheckCircle2, Edit3, Save, X,
  Sparkles, Target, ClipboardCheck, Zap, FileText,
  Heart, AlertTriangle, Flame
} from "lucide-react";

interface ProtocolStep {
  id: string;
  order: number;
  icon: string;
  title: string;
  description: string;
  details: string[];
  category: "phase1" | "phase2" | "phase3" | "phase4" | "enforcement" | "audit";
}

const DEFAULT_BB_STEPS: ProtocolStep[] = [
  {
    id: "bb_1",
    order: 1,
    icon: "🔄",
    title: "Fase 1: Reset Metabólico",
    description: "Normalizar padrões alimentares, regular fome e estabilizar energia. Sem déficit calórico.",
    details: [
      "Duração: Semanas 1–2 (14 dias)",
      "Sem déficit calórico — foco em reeducação",
      "Hidratação mínima: 2.5L/dia",
      "Eliminação de ultraprocessados e açúcar",
      "3 refeições + 2 lanches obrigatórios",
      "Proteína em todas as refeições: 1.5g/kg/dia",
      "Fibra mínima: 25g/dia",
      "Caminhada diária de 30 minutos",
      "Template base: dietas anti-inflamatórias e equilibradas"
    ],
    category: "phase1"
  },
  {
    id: "bb_2",
    order: 2,
    icon: "📉",
    title: "Fase 2: Déficit Estratégico",
    description: "Iniciar déficit calórico controlado com preservação de massa magra e intensificação de treino.",
    details: [
      "Duração: Semanas 3–5 (21 dias)",
      "Déficit calórico: 300–500kcal abaixo do TDEE",
      "Proteína elevada: 1.8–2.2g/kg/dia",
      "Carboidratos priorizados pré e pós-treino",
      "Treino de resistência 4x/semana obrigatório",
      "Zero álcool durante toda a fase",
      "Máximo 1 refeição livre/semana (controlada)",
      "Registro de peso matinal diário",
      "Template: low carb / high protein com ajuste de déficit"
    ],
    category: "phase2"
  },
  {
    id: "bb_3",
    order: 3,
    icon: "✨",
    title: "Fase 3: Definição Corporal",
    description: "Intensificação máxima com estratégias anti-inchaço, timing nutricional e 100% de adesão.",
    details: [
      "Duração: Semanas 6–9 (28 dias)",
      "Proteína máxima: 2.0–2.2g/kg/dia",
      "Carboidratos concentrados apenas pré/pós-treino",
      "Estratégia anti-inchaço: chás digestivos + fibras solúveis",
      "Hidratação reforçada: 3L+/dia",
      "Treino de definição 5x/semana",
      "100% de adesão ao checklist exigido",
      "Zero álcool e zero refeições livres sem planejamento",
      "Redução máxima de sódio",
      "Template: cutting agressivo com variação semanal"
    ],
    category: "phase3"
  },
  {
    id: "bb_4",
    order: 4,
    icon: "🏆",
    title: "Fase 4: Manutenção Inteligente",
    description: "Consolidar resultados, prevenir rebound e transformar a evolução em rotina sustentável.",
    details: [
      "Duração: Semanas 10–12 (21 dias)",
      "Proteína de manutenção: 1.6–1.8g/kg/dia",
      "Reintrodução gradual de carboidratos",
      "Refeição livre controlada 1–2x/semana",
      "Monitoramento semanal de peso (meta: ±1kg)",
      "Treino de manutenção 3–4x/semana",
      "Foco em sustentabilidade e hábitos de longo prazo",
      "Requer renovação ou plano semestral para continuar",
      "Template: manutenção flexível com monitoramento"
    ],
    category: "phase4"
  },
  {
    id: "bb_5",
    order: 5,
    icon: "🚫",
    title: "Bloqueios Mandatórios",
    description: "Sistema de enforcement que impede avanço sem dados atualizados.",
    details: [
      "Bloqueio de peso: dia 16 sem atualização → protocolo bloqueado",
      "Aviso prévio de peso: dia 14 (alerta ao paciente)",
      "Bloqueio de fotos: dia 31 sem fotos → protocolo bloqueado",
      "Aviso prévio de fotos: dia 29 (alerta ao paciente)",
      "ProtocolBlockedModal impede uso do app até regularização",
      "Transição de fase requer adesão mínima configurável",
      "Dados desatualizados impedem geração de novo plano",
      "Edge Function biquini-automation processa verificações"
    ],
    category: "enforcement"
  },
  {
    id: "bb_6",
    order: 6,
    icon: "🔒",
    title: "Auditoria e Geração por Fase",
    description: "Motor determinístico adapta templates existentes com ajustes automáticos por fase do BB.",
    details: [
      "Templates base selecionados por scoring (igual ao Master)",
      "Ajuste automático de déficit calórico por fase",
      "Ajuste de macros: proteína escalonada por fase",
      "generation_metadata inclui fase BB e parâmetros",
      "protocol_version: biquini_branco_v1",
      "Cada transição de fase registrada na patient_timeline",
      "Fotos de progresso vinculadas ao enrollment",
      "Zero IA generativa — 100% determinístico"
    ],
    category: "audit"
  }
];

const CATEGORY_COLORS: Record<string, string> = {
  phase1: "bg-sky-500/10 text-sky-500",
  phase2: "bg-orange-500/10 text-orange-500",
  phase3: "bg-purple-500/10 text-purple-500",
  phase4: "bg-emerald-500/10 text-emerald-500",
  enforcement: "bg-red-500/10 text-red-500",
  audit: "bg-rose-500/10 text-rose-500",
};

const CATEGORY_LABELS: Record<string, string> = {
  phase1: "Fase 1",
  phase2: "Fase 2",
  phase3: "Fase 3",
  phase4: "Fase 4",
  enforcement: "Enforcement",
  audit: "Auditoria",
};

export default function ProtocolBBDocumentation() {
  const { roles } = useAuth();
  const isAdmin = roles?.includes("admin");
  const [steps, setSteps] = useState<ProtocolStep[]>(DEFAULT_BB_STEPS);
  const [editingStep, setEditingStep] = useState<ProtocolStep | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (supabase as any).from("site_settings").select("*").eq("setting_key", "protocol_bb_steps").maybeSingle()
      .then(({ data }: any) => {
        if (data?.setting_value && Array.isArray(data.setting_value)) {
          setSteps(data.setting_value);
        }
      });
  }, []);

  const saveSteps = async (newSteps: ProtocolStep[]) => {
    setSaving(true);
    const { error } = await (supabase as any).from("site_settings").upsert({
      setting_key: "protocol_bb_steps",
      setting_value: newSteps,
      setting_type: "json",
      category: "protocol",
      label: "Protocolo Biquíni Branco - Steps",
      updated_at: new Date().toISOString(),
    }, { onConflict: "setting_key" });
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      setSteps(newSteps);
      toast.success("Protocolo BB salvo com sucesso! 👙");
    }
  };

  const handleEditSave = () => {
    if (!editingStep) return;
    const newSteps = steps.map(s => s.id === editingStep.id ? editingStep : s);
    saveSteps(newSteps);
    setEditDialogOpen(false);
    setEditingStep(null);
  };

  if (!isAdmin) {
    return (
      <Card className="glass shadow-card">
        <CardContent className="py-16 text-center">
          <Lock className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="font-display text-xl font-bold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">Este conteúdo é exclusivo para administradores.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-500/10 via-rose-500/5 to-fuchsia-500/10 border border-pink-500/20 p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/5 blur-[100px] rounded-full" />
        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
              <span className="text-2xl">👙</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-display text-2xl font-bold">Protocolo Biquíni Branco</h2>
                <Badge className="bg-pink-500/10 text-pink-500 border-pink-500/20">
                  <Lock className="w-3 h-3 mr-1" /> Admin Only
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                4 fases clínicas • Déficit progressivo • Bloqueios mandatórios • Templates híbridos
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs border-pink-500/30 text-pink-500">
            v1.0.0
          </Badge>
        </div>

        {/* Key Metrics */}
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {[
            { icon: Target, label: "Fases", value: "4", color: "text-pink-400" },
            { icon: Shield, label: "Bloqueios", value: "Mandatórios", color: "text-red-400" },
            { icon: Flame, label: "Déficit Máx", value: "500kcal", color: "text-orange-400" },
            { icon: Zap, label: "Motor", value: "Determinístico", color: "text-emerald-400" },
          ].map((m, i) => (
            <div key={i} className="rounded-xl bg-background/50 backdrop-blur p-3 text-center">
              <m.icon className={`w-5 h-5 mx-auto mb-1 ${m.color}`} />
              <p className="font-display font-bold text-lg">{m.value}</p>
              <p className="text-xs text-muted-foreground">{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Protocol Steps */}
      <div className="space-y-4">
        <h3 className="font-display font-semibold text-lg flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-pink-500" />
          Fluxo do Protocolo BB — Fases e Enforcement
        </h3>

        <div className="relative">
          <div className="absolute left-7 top-0 bottom-0 w-px bg-gradient-to-b from-pink-500/40 via-rose-500/20 to-transparent" />

          {steps.map((step, idx) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="relative pl-16 pb-6 group"
            >
              <div className="absolute left-2 top-0 w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-pink-500/20 z-10">
                {step.order}
              </div>

              <Card className="glass shadow-card hover:border-pink-500/20 transition-all">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{step.icon}</span>
                      <div>
                        <h4 className="font-display font-semibold">{step.title}</h4>
                        <Badge variant="secondary" className={`text-[10px] mt-1 ${CATEGORY_COLORS[step.category] || ""}`}>
                          {CATEGORY_LABELS[step.category] || step.category}
                        </Badge>
                      </div>
                    </div>
                    {isAdmin && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => { setEditingStep({ ...step }); setEditDialogOpen(true); }}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground mb-3">{step.description}</p>

                  <div className="space-y-1.5">
                    {step.details.map((detail, dIdx) => (
                      <div key={dIdx} className="flex items-start gap-2 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-pink-500 flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{detail}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Phase Adjustment Rules */}
      <Card className="glass shadow-card border-pink-500/20">
        <CardContent className="p-6">
          <h3 className="font-display font-semibold text-lg flex items-center gap-2 mb-4">
            <Flame className="w-5 h-5 text-orange-500" />
            Regras de Ajuste por Fase (Templates Híbridos)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: "🔄", text: "Fase 1: Sem déficit — templates equilibrados e anti-inflamatórios" },
              { icon: "📉", text: "Fase 2: Déficit 300–500kcal — priorizar low carb e high protein" },
              { icon: "✨", text: "Fase 3: Déficit máximo — cutting agressivo com timing de carbos" },
              { icon: "🏆", text: "Fase 4: Retorno à manutenção — flexibilizar macros gradualmente" },
              { icon: "🧮", text: "Scoring do Master é base — ajuste de calorias é sobreposto por fase" },
              { icon: "🎯", text: "Macros recalculados: proteína escala de 1.5 → 2.2 → 1.8 g/kg" },
              { icon: "⚡", text: "Bloqueio automático impede geração sem dados atualizados" },
              { icon: "📊", text: "generation_metadata inclui bb_phase e deficit_applied" },
            ].map((g, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="text-lg">{g.icon}</span>
                <span className="text-muted-foreground">{g.text}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Metadata Schema */}
      <Card className="glass shadow-card">
        <CardContent className="p-6">
          <h3 className="font-display font-semibold text-lg flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-pink-500" />
            Schema do generation_metadata (BB)
          </h3>
          <pre className="bg-muted/30 rounded-xl p-4 text-xs overflow-x-auto font-mono text-muted-foreground leading-relaxed">
{`{
  "engine_version": "2.1.0",
  "protocol_version": "biquini_branco_v1",
  "bb_phase": 2,
  "bb_phase_name": "Déficit Estratégico",
  "bb_deficit_applied": 400,
  "bb_protein_target_gkg": 2.0,
  "bmr_formula": "mifflin_st_jeor",
  "bmr_value": 1420,
  "tdee_factor": 1.55,
  "tdee_value": 2201,
  "calorie_target": 1801,
  "macro_strategy": "bb_high_protein_cut",
  "macros": {
    "protein_g": 140,
    "carbs_g": 150,
    "fat_g": 50
  },
  "template_selected": {
    "id": "uuid",
    "slug": "low_carb_1800",
    "version": 3
  },
  "template_score": 82,
  "phase_adjustments": {
    "deficit_override": -400,
    "protein_multiplier": 2.0,
    "carb_timing": "pre_post_training",
    "restrictions_applied": ["no_alcohol", "no_refined_carbs_night"]
  },
  "data_sources": ["anamnesis", "enrollment_data"],
  "generated_at": "2025-03-15T10:00:00Z"
}`}
          </pre>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-pink-500" /> Editar Passo do Protocolo BB
            </DialogTitle>
          </DialogHeader>
          {editingStep && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Ícone</label>
                <Input
                  value={editingStep.icon}
                  onChange={e => setEditingStep({ ...editingStep, icon: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Título</label>
                <Input
                  value={editingStep.title}
                  onChange={e => setEditingStep({ ...editingStep, title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <Textarea
                  value={editingStep.description}
                  onChange={e => setEditingStep({ ...editingStep, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Detalhes (um por linha)</label>
                <Textarea
                  value={editingStep.details.join("\n")}
                  onChange={e => setEditingStep({ ...editingStep, details: e.target.value.split("\n").filter(Boolean) })}
                  rows={6}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setEditDialogOpen(false)}>
                  <X className="w-4 h-4 mr-1" /> Cancelar
                </Button>
                <Button onClick={handleEditSave} className="bg-gradient-to-r from-pink-500 to-rose-500 text-white">
                  <Save className="w-4 h-4 mr-1" /> Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
