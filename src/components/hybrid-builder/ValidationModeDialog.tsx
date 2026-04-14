import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, PenTool, Lock, AlertTriangle } from "lucide-react";

export type ValidationMode = "MANUAL_EDIT" | "AUTO_ENGINE";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lockedMode: ValidationMode | null;
  onSelectMode: (mode: ValidationMode) => void;
}

export default function ValidationModeDialog({
  open,
  onOpenChange,
  lockedMode,
  onSelectMode,
}: Props) {
  const [confirmSwitch, setConfirmSwitch] = useState<ValidationMode | null>(null);

  const handleSelect = (mode: ValidationMode) => {
    if (lockedMode && lockedMode !== mode) {
      setConfirmSwitch(mode);
      return;
    }
    onSelectMode(mode);
    onOpenChange(false);
  };

  const handleConfirmSwitch = () => {
    if (confirmSwitch) {
      onSelectMode(confirmSwitch);
      setConfirmSwitch(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setConfirmSwitch(null); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Como deseja validar este plano?</DialogTitle>
          <DialogDescription>
            Escolha o modo de validação. Uma vez selecionado, o modo será travado para esta sessão.
          </DialogDescription>
        </DialogHeader>

        {confirmSwitch ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-amber-700 dark:text-amber-400">Trocar modo de validação?</p>
                <p className="text-muted-foreground mt-1">
                  Você está no modo <strong>{lockedMode === "MANUAL_EDIT" ? "Manual" : "Motor Inteligente"}</strong>.
                  Trocar para <strong>{confirmSwitch === "MANUAL_EDIT" ? "Manual" : "Motor Inteligente"}</strong> descarta
                  o contexto de validação atual.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setConfirmSwitch(null)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleConfirmSwitch}>
                Confirmar troca
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 mt-2">
            <button
              className="flex items-start gap-4 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-accent/50 transition-all text-left group"
              onClick={() => handleSelect("MANUAL_EDIT")}
            >
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                <PenTool className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">Validar manualmente</span>
                  {lockedMode === "MANUAL_EDIT" && (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Lock className="w-2.5 h-2.5" /> Ativo
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Controle total. Você edita e valida o plano sem correções automáticas.
                  Erros são reportados, mas não corrigidos automaticamente.
                </p>
              </div>
            </button>

            <button
              className="flex items-start gap-4 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-accent/50 transition-all text-left group"
              onClick={() => handleSelect("AUTO_ENGINE")}
            >
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">Validar com motor inteligente</span>
                  {lockedMode === "AUTO_ENGINE" && (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Lock className="w-2.5 h-2.5" /> Ativo
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  O motor clínico valida, corrige e revalida automaticamente.
                  Resumo das correções é exibido antes de salvar.
                </p>
              </div>
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
