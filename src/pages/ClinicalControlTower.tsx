import { motion } from "framer-motion";
import { Brain, Activity, Radar, Target, BarChart3, Shield, Zap } from "lucide-react";
import { useExperienceUI } from "@/hooks/useExperienceUI";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SubscriptionGuard from "@/components/common/SubscriptionGuard";
import GlobalClinicalStatusBar from "@/components/control-tower/GlobalClinicalStatusBar";
import PatientPriorityRadar from "@/components/control-tower/PatientPriorityRadar";
import AICommandFeed from "@/components/control-tower/AICommandFeed";
import ClinicalFocusQueue from "@/components/control-tower/ClinicalFocusQueue";
import PatientHealthMatrix from "@/components/control-tower/PatientHealthMatrix";
import AutomationTransparencyPanel from "@/components/control-tower/AutomationTransparencyPanel";

function SectionHeader({ icon: Icon, title, subtitle, color }: { icon: React.ElementType; title: string; subtitle: string; color: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
        <Icon className="w-4.5 h-4.5 text-white" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <p className="text-[10px] text-white/30">{subtitle}</p>
      </div>
    </div>
  );
}

export default function ClinicalControlTower() {
  return (
    <DashboardLayout>
    <SubscriptionGuard requiredTier="premium" featureName="Clinical Control Tower">
    <div className="min-h-screen bg-zinc-950 text-white -m-6 -mt-14 p-6 pt-6">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-500/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-sky-500/[0.02] rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-amber-500/[0.015] rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-sky-500/20 border border-white/10 flex items-center justify-center shadow-xl shadow-emerald-500/10">
              <Brain className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                Clinical Control Tower
              </h1>
              <p className="text-xs text-white/30">Centro de Comando de Inteligência Clínica</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-white/30 uppercase tracking-widest">Sistema Ativo</span>
          </div>
        </motion.div>

        {/* 1️⃣ Global Clinical Status Bar */}
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <GlobalClinicalStatusBar />
        </motion.section>

        {/* 2️⃣ Patient Priority Radar */}
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <SectionHeader icon={Radar} title="Radar de Prioridade" subtitle="Segmentação visual por zona clínica" color="from-amber-500/30 to-red-500/20" />
          <PatientPriorityRadar />
        </motion.section>

        {/* Mid section: Feed + Focus Queue */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 3️⃣ AI Command Feed */}
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <SectionHeader icon={Activity} title="Feed de Inteligência" subtitle="Stream de atividade clínica em tempo real" color="from-violet-500/30 to-sky-500/20" />
            <div className="rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-sm p-4">
              <AICommandFeed />
            </div>
          </motion.section>

          {/* 4️⃣ Clinical Focus Queue */}
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
            <SectionHeader icon={Target} title="Fila de Foco Clínico" subtitle="Ações prioritárias aguardando revisão" color="from-orange-500/30 to-amber-500/20" />
            <div className="rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-sm p-4">
              <ClinicalFocusQueue />
            </div>
          </motion.section>
        </div>

        {/* Bottom section: Matrix + Automation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 5️⃣ Patient Health Matrix */}
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <SectionHeader icon={BarChart3} title="Matriz de Saúde" subtitle="Adesão × Progresso Clínico" color="from-sky-500/30 to-emerald-500/20" />
            <PatientHealthMatrix />
          </motion.section>

          {/* 6️⃣ Automation Transparency Panel */}
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
            <SectionHeader icon={Shield} title="Transparência de Automação" subtitle="IA poderosa mas clinicamente responsável" color="from-emerald-500/30 to-violet-500/20" />
            <AutomationTransparencyPanel />
          </motion.section>
        </div>

        {/* Footer trust mark */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center py-6 border-t border-white/5"
        >
          <div className="flex items-center justify-center gap-2">
            <Zap className="w-3.5 h-3.5 text-emerald-400/50" />
            <p className="text-[10px] text-white/20 uppercase tracking-[0.2em]">
              FitJourney Clinical Intelligence Operating System
            </p>
          </div>
        </motion.div>
      </div>
    </div>
    </SubscriptionGuard>
    </DashboardLayout>
  );
}
