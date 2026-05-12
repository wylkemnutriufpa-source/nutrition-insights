import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain, Shield, Zap, Radar, TrendingUp, Activity, Eye,
  ArrowRight, Crown, HeartPulse, Target, BarChart3, BellRing,
  Sparkles, Lock, CheckCircle2, Cpu, GitBranch, Layers
} from "lucide-react";
import { Link } from "react-router-dom";

interface ClinicalIntelligenceUpsellModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const enginePillars = [
  {
    icon: Cpu,
    title: "Motor Clínico Determinístico",
    desc: "Sem alucinações. Cada decisão é baseada em regras clínicas validadas, fórmulas nutricionais e evidência real — nunca IA generativa para cálculos.",
    color: "text-emerald-400",
    bg: "from-emerald-500/20 to-emerald-500/5",
  },
  {
    icon: Activity,
    title: "Pipeline de Análise Diária",
    desc: "Cada paciente é analisado automaticamente todos os dias: adesão, peso, check-ins, comportamento e risco de abandono.",
    color: "text-sky-400",
    bg: "from-sky-500/20 to-sky-500/5",
  },
  {
    icon: GitBranch,
    title: "Behavioral Adaptation Engine",
    desc: "O sistema aprende padrões comportamentais do paciente e adapta checklist, mensagens e prioridades automaticamente.",
    color: "text-violet-400",
    bg: "from-violet-500/20 to-violet-500/5",
  },
  {
    icon: Shield,
    title: "Guardrails de Segurança Clínica",
    desc: "Toda automação passa por guardrails médicos. Nenhuma ação é executada sem validação de segurança e aprovação profissional.",
    color: "text-amber-400",
    bg: "from-amber-500/20 to-amber-500/5",
  },
];

const features = [
  { icon: Radar, label: "Radar de Prioridade de Pacientes", desc: "Classificação automática em zonas Estável, Atenção e Crítica" },
  { icon: TrendingUp, label: "Detecção de Queda de Adesão", desc: "Alerta precoce quando o paciente começa a desengajar" },
  { icon: HeartPulse, label: "Score de Risco de Abandono", desc: "Predição determinística de probabilidade de dropout" },
  { icon: Target, label: "Sugestões de Intervenção Clínica", desc: "Recomendações baseadas no perfil de aprendizado do paciente" },
  { icon: BarChart3, label: "Matriz de Saúde Populacional", desc: "Visualização de todo portfólio por adesão vs progresso" },
  { icon: BellRing, label: "Alertas Clínicos Automáticos", desc: "Notificações inteligentes para eventos que precisam de ação" },
  { icon: Eye, label: "Transparência de Automação", desc: "Veja tudo que a IA decidiu, por quê, e com qual confiança" },
  { icon: Layers, label: "Snapshots Clínicos Diários", desc: "Histórico completo de estado clínico de cada paciente por dia" },
];

export function ClinicalIntelligenceUpsellModal({ open, onOpenChange }: ClinicalIntelligenceUpsellModalProps) {
  const [activeTab, setActiveTab] = useState<"engine" | "features">("engine");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 bg-zinc-950 border border-emerald-500/20 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Hero header */}
        <div className="relative px-6 pt-8 pb-6 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 via-transparent to-sky-600/5" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/8 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-sky-500/6 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/4" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/25 to-sky-500/15 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/15"
              >
                <Brain className="w-7 h-7 text-emerald-400" />
              </motion.div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">FitJourney Intelligence</h2>
                  <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 text-[10px] h-5 gap-0.5">
                    <Crown className="w-3 h-3" /> PRO
                  </Badge>
                </div>
                <p className="text-sm text-white/40">Sistema Operacional Clínico Inteligente</p>
              </div>
            </div>

            <p className="text-sm text-white/50 leading-relaxed max-w-xl">
              O FitJourney não usa IA generativa para decisões clínicas.
              Nosso motor é <span className="text-emerald-400 font-semibold">100% determinístico</span>:
              cada score, alerta e recomendação é calculado com base em regras clínicas validadas,
              fórmulas nutricionais e dados reais do paciente.
            </p>

            {/* Stats */}
            <div className="flex flex-wrap gap-3 mt-5">
              {[
                { value: "12", label: "Pilares de Análise" },
                { value: "100%", label: "Determinístico" },
                { value: "24/7", label: "Pipeline Ativo" },
                { value: "0", label: "Alucinações" },
              ].map(s => (
                <div key={s.label} className="bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-center min-w-[80px]">
                  <div className="text-sm font-bold text-emerald-400">{s.value}</div>
                  <div className="text-[10px] text-white/30">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tab selector */}
        <div className="px-6 flex gap-1 bg-zinc-900/50 mx-6 rounded-xl p-1">
          {[
            { key: "engine" as const, label: "Motor Clínico", icon: Cpu },
            { key: "features" as const, label: "Funcionalidades", icon: Sparkles },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                  : "text-white/30 hover:text-white/50"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          <AnimatePresence mode="wait">
            {activeTab === "engine" ? (
              <motion.div
                key="engine"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-3"
              >
                {enginePillars.map((pillar, i) => (
                  <motion.div
                    key={pillar.title}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${pillar.bg} flex items-center justify-center flex-shrink-0`}>
                      <pillar.icon className={`w-5 h-5 ${pillar.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-white/90">{pillar.title}</h4>
                      <p className="text-[11px] text-white/35 leading-relaxed mt-0.5">{pillar.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="features"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
              >
                {features.map((f, i) => (
                  <motion.div
                    key={f.label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/5"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <f.icon className="w-4 h-4 text-emerald-400/70" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-white/80">{f.label}</h4>
                      <p className="text-[10px] text-white/30 leading-relaxed mt-0.5">{f.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Trust bar */}
        <div className="mx-6 px-4 py-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 mb-4">
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-emerald-500/60 flex-shrink-0" />
            <p className="text-[11px] text-white/40 leading-relaxed">
              <span className="text-emerald-400/80 font-medium">Confiança clínica:</span>{" "}
              Nenhuma decisão automática é executada sem guardrails médicos.
              O profissional sempre tem a palavra final.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="px-6 pb-6">
          <Link to="/v1/pricing" onClick={() => onOpenChange(false)}>
            <Button className="w-full h-12 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold text-sm border-0 shadow-lg shadow-emerald-500/20 gap-2">
              <Crown className="w-4 h-4" />
              Ativar Inteligência Clínica
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <p className="text-center text-[10px] text-white/20 mt-3">
            Disponível nos planos Premium e Enterprise
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
