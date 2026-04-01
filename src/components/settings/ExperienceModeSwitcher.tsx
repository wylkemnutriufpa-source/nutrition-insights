import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useExperienceMode, type ExperienceMode } from "@/hooks/useExperienceMode";
import { useAuth } from "@/lib/auth";
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";
import { Zap, BarChart3, Rocket } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import ExperienceModeRecommendation from "./ExperienceModeRecommendation";

type ModeConfig = { key: ExperienceMode; label: string; desc: string; icon: typeof Zap; color: string; bgColor: string };

const PRO_MODES: ModeConfig[] = [
  {
    key: "basic",
    label: "Básico",
    desc: "Interface limpa com verde escuro. Agenda, pacientes e planos essenciais.",
    icon: Zap,
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-700/10 border-green-700/30 dark:bg-green-400/10 dark:border-green-400/30",
  },
  {
    key: "pro",
    label: "Profissional",
    desc: "Fundo escuro com tons azuis. Alertas, relatórios, insights e mais elementos.",
    icon: BarChart3,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-600/10 border-blue-600/30 dark:bg-blue-400/10 dark:border-blue-400/30",
  },
  {
    key: "advanced",
    label: "Avançado (Premium)",
    desc: "Detalhes em dourado premium. Automações, Control Tower e layout elaborado.",
    icon: Rocket,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-600/10 border-amber-600/30 dark:bg-amber-400/10 dark:border-amber-400/30",
  },
];

const PATIENT_MODES: ModeConfig[] = [
  {
    key: "basic",
    label: "Simples",
    desc: "Plano alimentar, receitas e avaliação física. Foco no essencial.",
    icon: Zap,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10 border-emerald-500/30",
  },
  {
    key: "pro",
    label: "Completo",
    desc: "Checklist diário, agenda, gráficos de evolução e acompanhamento.",
    icon: BarChart3,
    color: "text-primary",
    bgColor: "bg-primary/10 border-primary/30",
  },
  {
    key: "advanced",
    label: "Avançado",
    desc: "Insights com IA, projeção corporal, metas e recursos extras.",
    icon: Rocket,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10 border-amber-500/30",
  },
];

export default function ExperienceModeSwitcher() {
  const { mode, setMode } = useExperienceMode();
  const { isNutritionist, isPersonal, isAdmin } = useAuth();
  const { isProfessionalContext } = useWorkspaceContext();
  const isProRole = (isNutritionist || isPersonal || isAdmin) && isProfessionalContext;
  const MODES = isProRole ? PRO_MODES : PATIENT_MODES;

  const handleSelect = (key: ExperienceMode) => {
    setMode(key);
    const label = MODES.find(m => m.key === key)?.label;
    toast.success(`Modo ${label} ativado`);
  };

  return (
    <Card className="border-border bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Rocket className="w-4 h-4 text-primary" />
          Nível de Experiência
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {isProRole
            ? "Controle a complexidade da interface. Você pode mudar a qualquer momento."
            : "Escolha o quanto quer ver no seu painel. Comece pelo simples!"}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {isProRole && <ExperienceModeRecommendation />}
        {MODES.map((m) => {
          const Icon = m.icon;
          const selected = mode === m.key;
          return (
            <motion.button
              key={m.key}
              onClick={() => handleSelect(m.key)}
              whileTap={{ scale: 0.98 }}
              className={`w-full text-left rounded-xl border p-3 transition-all ${
                selected
                  ? `${m.bgColor} ring-1 ring-offset-1 ring-offset-background`
                  : "border-border hover:bg-muted/50"
              }`}
              
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${selected ? m.bgColor : "bg-muted"}`}>
                  <Icon className={`w-4.5 h-4.5 ${selected ? m.color : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${selected ? m.color : "text-foreground"}`}>
                      {m.label}
                    </span>
                    {selected && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                        Ativo
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{m.desc}</p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </CardContent>
    </Card>
  );
}
