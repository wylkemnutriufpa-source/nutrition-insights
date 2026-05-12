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
  Lock, Shield, Brain, Cpu, CheckCircle2, Edit3, Save, X,
  Sparkles, Target, BarChart3, ClipboardCheck, Zap, FileText,
  Users, Heart, Crown, ArrowRight, AlertTriangle
} from "lucide-react";

interface ProtocolStep {
  id: string;
  order: number;
  icon: string;
  title: string;
  description: string;
  details: string[];
  category: "onboarding" | "calculation" | "generation" | "review" | "lifecycle" | "audit";
}

const DEFAULT_PROTOCOL_STEPS: ProtocolStep[] = [
  {
    id: "step_1",
    order: 1,
    icon: "👤",
    title: "Criação do Paciente",
    description: "Paciente é criado manualmente pelo profissional ou via agenda pública.",
    details: [
      "Cadastro com nome, e-mail e senha",
      "Vínculo automático com o nutricionista",
      "Trigger automático cria pipeline de onboarding",
      "Status inicial: pending_anamnesis"
    ],
    category: "onboarding"
  },
  {
    id: "step_2",
    order: 2,
    icon: "📋",
    title: "Onboarding Guiado Obrigatório",
    description: "Paciente completa anamnese estruturada com dados clínicos essenciais.",
    details: [
      "Peso e altura validados",
      "Objetivo definido (perda, ganho, manutenção)",
      "Rotina e nível de atividade física",
      "Preferências alimentares e restrições",
      "Condições clínicas (diabetes, hipertensão, etc.)",
      "Dados persistidos em patient_anamnesis"
    ],
    category: "onboarding"
  },
  {
    id: "step_3",
    order: 3,
    icon: "🧮",
    title: "Cálculos Determinísticos",
    description: "Motor calcula TMB, GET/TDEE e metas calóricas sem IA generativa.",
    details: [
      "Fórmula Mifflin-St Jeor para TMB",
      "Fator de atividade para TDEE",
      "Ajuste calórico por objetivo (-20% deficit, +15% superávit)",
      "Distribuição de macros por estratégia (high_protein, balanced, etc.)",
      "Tudo registrado em generation_metadata"
    ],
    category: "calculation"
  },
  {
    id: "step_4",
    order: 4,
    icon: "🎯",
    title: "Seleção de Template por Scoring",
    description: "Motor de scoring seleciona o melhor template do banco de dados.",
    details: [
      "Score por match de objetivo (30pts)",
      "Score por restrições alimentares (20pts)",
      "Score por proximidade calórica (25pts)",
      "Score por condições clínicas (15pts)",
      "Score por preferências (10pts)",
      "Templates alternativos ranqueados"
    ],
    category: "generation"
  },
  {
    id: "step_5",
    order: 5,
    icon: "📊",
    title: "Geração do Pré-Plano",
    description: "Plano alimentar gerado automaticamente com status draft_auto_generated.",
    details: [
      "Itens do plano criados a partir do template",
      "Macros ajustados para meta calórica do paciente",
      "generation_metadata com schema fixo e completo",
      "template_id, template_slug e template_version registrados",
      "generation_source definido (anamnesis, physical_assessment, mixed)",
      "Plano com validade de 30 dias"
    ],
    category: "generation"
  },
  {
    id: "step_6",
    order: 6,
    icon: "👨‍⚕️",
    title: "Revisão Profissional",
    description: "Nutricionista revisa o plano com explicabilidade completa.",
    details: [
      "Painel mostra objetivo, TMB, TDEE, macros calculados",
      "Template selecionado e motivo da escolha",
      "Score breakdown visível",
      "Alternativas disponíveis para troca",
      "Profissional pode aprovar, editar ou solicitar revisão",
      "Status muda para under_professional_review → approved"
    ],
    category: "review"
  },
  {
    id: "step_7",
    order: 7,
    icon: "✅",
    title: "Publicação para o Paciente",
    description: "Após aprovação, plano é publicado e visível ao paciente.",
    details: [
      "Status muda para published_to_patient",
      "Paciente só vê planos publicados (RLS enforced)",
      "Notificação automática ao paciente",
      "Evento registrado na patient_timeline",
      "Plano anterior pode ser arquivado automaticamente"
    ],
    category: "lifecycle"
  },
  {
    id: "step_8",
    order: 8,
    icon: "🔒",
    title: "Auditoria e Rastreabilidade",
    description: "Toda ação é registrada com metadata completa para auditoria clínica.",
    details: [
      "engine_version e protocol_version salvos",
      "Fórmula e valores de TMB/TDEE",
      "Score total e breakdown do template",
      "Fontes de dados (anamnese, avaliação física)",
      "Timestamp e user_id do responsável",
      "Evento na patient_timeline com metadata",
      "Zero dependência de IA generativa"
    ],
    category: "audit"
  }
];

const CATEGORY_COLORS: Record<string, string> = {
  onboarding: "bg-emerald-500/10 text-emerald-500",
  calculation: "bg-blue-500/10 text-blue-500",
  generation: "bg-violet-500/10 text-violet-500",
  review: "bg-amber-500/10 text-amber-500",
  lifecycle: "bg-cyan-500/10 text-cyan-500",
  audit: "bg-rose-500/10 text-rose-500",
};

const CATEGORY_LABELS: Record<string, string> = {
  onboarding: "Onboarding",
  calculation: "Cálculo",
  generation: "Geração",
  review: "Revisão",
  lifecycle: "Lifecycle",
  audit: "Auditoria",
};

export default function ProtocolMasterDocumentation() {
  const { user, roles } = useAuth();
  const isAdmin = roles?.includes("admin");
  const [steps, setSteps] = useState<ProtocolStep[]>(DEFAULT_PROTOCOL_STEPS);
  const [editingStep, setEditingStep] = useState<ProtocolStep | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load from site_settings
  useEffect(() => {
    (supabase as any).from("site_settings").select("*").eq("setting_key", "protocol_master_steps").maybeSingle()
      .then(({ data }: any) => {
        if (data?.setting_value && Array.isArray(data.setting_value)) {
          setSteps(data.setting_value);
        }
      });
  }, []);

  const saveSteps = async (newSteps: ProtocolStep[]) => {
    setSaving(true);
    const { error } = await (supabase as any).from("site_settings").upsert({
      setting_key: "protocol_master_steps",
      setting_value: newSteps,
      setting_type: "json",
      category: "protocol",
      label: "Protocolo FitJourney Master - Steps",
      updated_at: new Date().toISOString(),
    }, { onConflict: "setting_key" });
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      setSteps(newSteps);
      toast.success("Protocolo salvo com sucesso! 🔒");
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-cyan-500/10 border border-emerald-500/20 p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full" />
        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-display text-2xl font-bold">Protocolo FitJourney Master</h2>
                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                  <Lock className="w-3 h-3 mr-1" /> Admin Only
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                Motor clínico determinístico • 100% baseado em dados reais • Zero IA generativa
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-500">
            v1.0.0
          </Badge>
        </div>

        {/* Key Metrics */}
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {[
            { icon: Cpu, label: "Determinístico", value: "100%", color: "text-emerald-400" },
            { icon: Shield, label: "Auditável", value: "Sim", color: "text-blue-400" },
            { icon: Zap, label: "Geração", value: "< 2s", color: "text-amber-400" },
            { icon: Brain, label: "IA Obrigatória", value: "Nenhuma", color: "text-rose-400" },
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
          <ClipboardCheck className="w-5 h-5 text-primary" />
          Fluxo do Protocolo — Passo a Passo
        </h3>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-7 top-0 bottom-0 w-px bg-gradient-to-b from-emerald-500/40 via-teal-500/20 to-transparent" />

          {steps.map((step, idx) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="relative pl-16 pb-6 group"
            >
              {/* Step number bubble */}
              <div className="absolute left-2 top-0 w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-emerald-500/20 z-10">
                {step.order}
              </div>

              <Card className="glass shadow-card hover:border-primary/20 transition-all">
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
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
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

      {/* Technical Guarantees */}
      <Card className="glass shadow-card border-amber-500/20">
        <CardContent className="p-6">
          <h3 className="font-display font-semibold text-lg flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Garantias Técnicas do Protocolo
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: "🔒", text: "Paciente NUNCA vê planos em rascunho (RLS enforced)" },
              { icon: "🧮", text: "Cálculos 100% reproduzíveis (Mifflin-St Jeor)" },
              { icon: "📊", text: "generation_metadata com schema fixo e auditável" },
              { icon: "🔄", text: "Rollback automático em caso de falha na geração" },
              { icon: "🚫", text: "Zero dependência de IA generativa ou chaves externas" },
              { icon: "⚡", text: "Trigger de validação impede transições de estado inválidas" },
              { icon: "📝", text: "Timeline do paciente registra cada geração com metadata" },
              { icon: "🛡️", text: "Profissional tem explicabilidade total da sugestão" },
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
            <FileText className="w-5 h-5 text-primary" />
            Schema do generation_metadata (Fixo)
          </h3>
          <pre className="bg-muted/30 rounded-xl p-4 text-xs overflow-x-auto font-mono text-muted-foreground leading-relaxed">
{`{
  "engine_version": "2.1.0",
  "protocol_version": "fitjourney_master_v1",
  "bmr_formula": "mifflin_st_jeor",
  "bmr_value": 1520,
  "tdee_factor": 1.55,
  "tdee_value": 2356,
  "goal": "lose_weight",
  "goal_strategy": "calorie_deficit",
  "calorie_target": 1850,
  "macro_strategy": "high_protein_cut",
  "macros": {
    "protein_g": 130,
    "carbs_g": 180,
    "fat_g": 55
  },
  "template_selected": {
    "id": "uuid",
    "slug": "low_carb_1600",
    "version": 3
  },
  "template_score": 87,
  "score_breakdown": {
    "goal_match": 30,
    "restriction_match": 20,
    "calorie_match": 15,
    "clinical_match": 12,
    "preference_match": 10
  },
  "alternatives": [
    { "slug": "flexivel_1800", "score": 75 },
    { "slug": "pratico_1600", "score": 71 }
  ],
  "data_sources": ["anamnesis", "physical_assessment"],
  "generated_at": "2025-03-13T16:30:00Z"
}`}
          </pre>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-primary" /> Editar Passo do Protocolo
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
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  <X className="w-4 h-4 mr-1" /> Cancelar
                </Button>
                <Button onClick={handleEditSave} disabled={saving} className="gradient-primary">
                  <Save className="w-4 h-4 mr-1" /> {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
