/**
 * Compact inline experience mode toggle for the top of the dashboard.
 * Allows quick switching between Basic / Pro / Advanced.
 */
import { useExperienceMode, type ExperienceMode } from "@/hooks/useExperienceMode";
import { useAuth } from "@/lib/auth";
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";
import { Zap, BarChart3, Rocket } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface ModeOption {
  key: ExperienceMode;
  label: string;
  shortLabel: string;
  icon: typeof Zap;
}

const PRO_MODES: ModeOption[] = [
  { key: "basic", label: "Básico", shortLabel: "Básico", icon: Zap },
  { key: "pro", label: "Profissional", shortLabel: "Pro", icon: BarChart3 },
  { key: "advanced", label: "Avançado", shortLabel: "Full", icon: Rocket },
];

const PATIENT_MODES: ModeOption[] = [
  { key: "basic", label: "Simples", shortLabel: "Simples", icon: Zap },
  { key: "pro", label: "Completo", shortLabel: "Completo", icon: BarChart3 },
  { key: "advanced", label: "Avançado", shortLabel: "Avançado", icon: Rocket },
];

export default function InlineExperienceToggle() {
  const { mode, setMode } = useExperienceMode();
  const { isNutritionist, isPersonal, isAdmin } = useAuth();
  const { isProfessionalContext } = useWorkspaceContext();
  const isProRole = (isNutritionist || isPersonal || isAdmin) && isProfessionalContext;
  const MODES = isProRole ? PRO_MODES : PATIENT_MODES;

  const currentIdx = MODES.findIndex(m => m.key === mode);

  const handleSelect = (key: ExperienceMode) => {
    if (key === mode) return;
    setMode(key);
    const label = MODES.find(m => m.key === key)?.label;
    toast.success(`Modo ${label} ativado`);
  };

  return (
    <div className="relative flex rounded-xl border border-border bg-muted/30 p-0.5">
      {/* Animated background pill */}
      <motion.div
        className="absolute top-0.5 bottom-0.5 rounded-lg bg-card shadow-sm border border-border/50"
        initial={false}
        animate={{
          left: `calc(${currentIdx} * (100% / ${MODES.length}) + 2px)`,
          width: `calc(100% / ${MODES.length} - 4px)`,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      />

      {MODES.map((m) => {
        const Icon = m.icon;
        const selected = mode === m.key;
        return (
          <button
            key={m.key}
            onClick={() => handleSelect(m.key)}
            className={`relative z-10 flex items-center justify-center gap-1.5 flex-1 py-1.5 px-2 rounded-lg text-[11px] font-medium transition-colors ${
              selected ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-3 h-3" />
            <span className="hidden sm:inline">{m.label}</span>
            <span className="sm:hidden">{m.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
