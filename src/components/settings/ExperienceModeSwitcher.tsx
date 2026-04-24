import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useExperienceMode, type ExperienceMode } from "@/hooks/useExperienceMode";
import { useAuth } from "@/lib/auth";
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";
import { Zap, BarChart3, Rocket, RefreshCw, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
    desc: "Visual verde escuro e minimalista. Plano alimentar, receitas e o essencial.",
    icon: Zap,
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-700/10 border-green-700/30 dark:bg-green-400/10 dark:border-green-400/30",
  },
  {
    key: "pro",
    label: "Completo",
    desc: "Visual azul refinado. Checklist, gráficos de evolução e mais recursos.",
    icon: BarChart3,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-600/10 border-blue-600/30 dark:bg-blue-400/10 dark:border-blue-400/30",
  },
  {
    key: "advanced",
    label: "Avançado",
    desc: "Visual dourado premium. IA, projeção corporal e experiência completa.",
    icon: Rocket,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-600/10 border-amber-600/30 dark:bg-amber-400/10 dark:border-amber-400/30",
  },
];

export default function ExperienceModeSwitcher() {
  const { mode, setMode, isLoading, failedMode, retryLastMode } = useExperienceMode();
  const { isNutritionist, isPersonal, isAdmin } = useAuth();
  const { isProfessionalContext } = useWorkspaceContext();
  const isProRole = (isNutritionist || isPersonal || isAdmin) && isProfessionalContext;
  const MODES = isProRole ? PRO_MODES : PATIENT_MODES;

  const handleSelect = async (key: ExperienceMode) => {
    if (key === mode) return;
    
    try {
      await setMode(key);
      const label = MODES.find(m => m.key === key)?.label;
      toast.success(`Modo ${label} ativado`);
    } catch (error: any) {
      if (error.code === "MODE_LOCKED") {
        const unlockDateMsg = error.unlock_date 
          ? ` A liberação está prevista para ${new Date(error.unlock_date).toLocaleDateString()}.` 
          : "";
        toast.error("Alteração Negada", {
          description: (error.message || "Sua conta está restrita ao modo Básico por enquanto. Complete as atualizações pendentes para liberar outros modos.") + unlockDateMsg,
          duration: 8000,
        });
      } else {
        toast.error("Erro ao atualizar modo", {
          description: "Não foi possível salvar sua preferência. Verifique sua conexão.",
          action: {
            label: "Tentar novamente",
            onClick: () => handleSelect(key),
          },
        });
      }
    }
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
        
        {failedMode && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs font-medium">Erro ao atualizar para modo {MODES.find(m => m.key === failedMode)?.label}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => retryLastMode()}
              disabled={isLoading}
              className="h-7 text-[10px] gap-1 px-2 border-destructive/30 hover:bg-destructive/10"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              Tentar
            </Button>
          </div>
        )}
        <div className="relative">
          {isLoading && (
            <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-[1px] rounded-xl flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            </div>
          )}
          
          <div className="space-y-3">
            {MODES.map((m) => {
              const Icon = m.icon;
              const selected = mode === m.key;
              return (
                <motion.button
                  key={m.key}
                  onClick={() => handleSelect(m.key)}
                  disabled={isLoading}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full text-left rounded-xl border p-3 transition-all relative ${
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
