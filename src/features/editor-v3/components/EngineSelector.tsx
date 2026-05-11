import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap, History, Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface EngineSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (version: 'v2' | 'v3') => void;
  patientName?: string;
}

export const EngineSelector = ({ isOpen, onClose, onSelect, patientName }: EngineSelectorProps) => {
  const [selected, setSelected] = React.useState<'v2' | 'v3'>(() => {
    return (localStorage.getItem('fitjourney:last-engine-choice') as 'v2' | 'v3') || 'v3';
  });

  const handleConfirm = () => {
    localStorage.setItem('fitjourney:last-engine-choice', selected);
    onSelect(selected);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-md border-border/40 bg-background/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-display flex items-center gap-2">
            Selecione o motor do plano
          </DialogTitle>
          <DialogDescription>
            Escolha a tecnologia para o plano de {patientName || 'seu paciente'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <button
            onClick={() => setSelected('v3')}
            className={cn(
              "relative flex flex-col text-left p-4 rounded-xl border-2 transition-all group",
              selected === 'v3' 
                ? "border-primary bg-primary/5 ring-4 ring-primary/10" 
                : "border-border/50 hover:border-primary/40 hover:bg-accent/5"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-2 rounded-lg",
                  selected === 'v3' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:text-primary transition-colors"
                )}>
                  <Zap className="w-4 h-4" />
                </div>
                <span className="font-bold text-lg">V3 (Recomendado)</span>
              </div>
              {selected === 'v3' && <Check className="w-5 h-5 text-primary" />}
            </div>
            
            <ul className="space-y-1.5 ml-10">
              <li className="text-sm flex items-center gap-2 text-muted-foreground">
                <div className="w-1 h-1 rounded-full bg-success" /> ✅ Substituições inteligentes
              </li>
              <li className="text-sm flex items-center gap-2 text-muted-foreground">
                <div className="w-1 h-1 rounded-full bg-success" /> ✅ Modo semanal e marmitas
              </li>
              <li className="text-sm flex items-center gap-2 text-muted-foreground">
                <div className="w-1 h-1 rounded-full bg-success" /> ✅ Imagens automáticas curadas
              </li>
            </ul>
          </button>

          {/* V2 Removed as requested by clinical protocol */}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            className="rounded-xl border-border/50"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm}
            className="rounded-xl gap-2 font-bold px-6"
          >
            Continuar <ArrowRight className="w-4 h-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
