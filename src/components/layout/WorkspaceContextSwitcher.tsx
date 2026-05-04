import { motion } from "framer-motion";
import { Briefcase, User, ArrowLeftRight } from "lucide-react";
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";
import { useExperienceMode } from "@/hooks/useExperienceMode";
import { toast } from "sonner";

interface Props {
  collapsed?: boolean;
}

export default function WorkspaceContextSwitcher({ collapsed = false }: Props) {
  const { activeContext, setContext, isHybridUser } = useWorkspaceContext();
  const { isBasic } = useExperienceMode() as any;

  if (!isHybridUser || isBasic) return null;

  const isPro = activeContext === "professional";

  const toggle = () => {
    const next = isPro ? "patient" : "professional";
    setContext(next);
    toast.success(next === "professional" ? "Área Profissional ativada" : "Minha Jornada ativada");
  };

  if (collapsed) {
    return (
      <button
        onClick={toggle}
        className="mx-auto flex items-center justify-center w-10 h-10 rounded-xl border border-border bg-muted/50 hover:bg-muted transition-all"
        title={isPro ? "Mudar para Minha Jornada" : "Mudar para Área Profissional"}
      >
        <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className="mx-3 mb-2">
      <div className="relative flex rounded-xl border border-border bg-muted/30 p-0.5">
        <motion.div
          className="absolute top-0.5 bottom-0.5 rounded-lg bg-card shadow-sm border border-border/50"
          initial={false}
          animate={{ left: isPro ? "2px" : "50%", width: "calc(50% - 4px)" }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
        <button
          onClick={() => setContext("professional")}
          className={`relative z-10 flex items-center justify-center gap-1.5 flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
            isPro ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Profissional</span>
        </button>
        <button
          onClick={() => setContext("patient")}
          className={`relative z-10 flex items-center justify-center gap-1.5 flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
            !isPro ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Minha Jornada</span>
        </button>
      </div>
    </div>
  );
}
