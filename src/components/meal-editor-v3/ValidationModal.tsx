import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, AlertTriangle, XCircle, Info, 
  Flame, Dumbbell, Activity 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidationResult {
  calories: { target: number; current: number; status: 'ok' | 'warn' | 'error' };
  protein: { target: number; current: number; status: 'ok' | 'warn' | 'error' };
  clinicalRules: { status: 'ok' | 'warn' | 'error'; message: string | null };
}

interface ValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  results: ValidationResult;
}

export const ValidationModal: React.FC<ValidationModalProps> = ({ 
  isOpen, onClose, onConfirm, results 
}) => {
  const isGlobalError = results.calories.status === 'error' || results.protein.status === 'error' || results.clinicalRules.status === 'error';
  const isGlobalWarn = results.calories.status === 'warn' || results.protein.status === 'warn' || results.clinicalRules.status === 'warn';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl sm:rounded-3xl border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            Validação do Plano
            {isGlobalError ? <XCircle className="text-red-500" /> : isGlobalWarn ? <AlertTriangle className="text-amber-500" /> : <CheckCircle2 className="text-green-500" />}
          </DialogTitle>
          <DialogDescription>
            Revisão técnica completa antes de finalizar a prescrição.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <MetricCard 
              label="Energia Total" 
              icon={Flame} 
              current={results.calories.current} 
              target={results.calories.target} 
              unit="kcal"
              status={results.calories.status}
            />
            <MetricCard 
              label="Aporte Protéico" 
              icon={Dumbbell} 
              current={results.protein.current} 
              target={results.protein.target} 
              unit="g"
              status={results.protein.status}
            />
          </div>

          <Card className="p-4 bg-muted/20 border-none space-y-4">
            <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" /> Consistência Clínica
            </h4>
            <div className="flex items-start gap-3">
              {results.clinicalRules.status === 'ok' ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              ) : results.clinicalRules.status === 'warn' ? (
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              )}
              <div>
                <p className={cn(
                  "text-sm font-semibold",
                  results.clinicalRules.status === 'ok' ? "text-green-700" : results.clinicalRules.status === 'warn' ? "text-amber-700" : "text-red-700"
                )}>
                  {results.clinicalRules.status === 'ok' ? 'Regras clínicas respeitadas' : results.clinicalRules.message}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  O motor de inteligência analisou restrições e substituições.
                </p>
              </div>
            </div>
          </Card>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose} className="rounded-xl">VOLTAR AO EDITOR</Button>
          <Button 
            onClick={onConfirm} 
            disabled={isGlobalError}
            className={cn(
              "rounded-xl px-8 font-bold",
              isGlobalError ? "opacity-50" : ""
            )}
          >
            {isGlobalError ? 'PLANO BLOQUEADO' : 'CONFIRMAR E SALVAR'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const MetricCard = ({ label, icon: Icon, current, target, unit, status }: any) => {
  const percentage = Math.min((current / target) * 100, 100);
  
  return (
    <Card className="p-4 bg-muted/20 border-none space-y-3">
      <div className="flex items-center justify-between">
        <Icon className={cn(
          "w-5 h-5",
          status === 'ok' ? "text-green-500" : status === 'warn' ? "text-amber-500" : "text-red-500"
        )} />
        <Badge variant="outline" className={cn(
          "text-[10px] font-bold uppercase",
          status === 'ok' ? "bg-green-50 text-green-700 border-green-200" : status === 'warn' ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-700 border-red-200"
        )}>
          {status === 'ok' ? 'OK' : status === 'warn' ? 'AJUSTAR' : 'ERRO'}
        </Badge>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">{label}</p>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-xl font-bold">{Math.round(current)}</span>
          <span className="text-xs text-muted-foreground">/ {target} {unit}</span>
        </div>
      </div>
      <Progress value={percentage} className={cn(
        "h-1.5",
        status === 'ok' ? "bg-green-100" : status === 'warn' ? "bg-amber-100" : "bg-red-100"
      )} indicatorClassName={cn(
        status === 'ok' ? "bg-green-500" : status === 'warn' ? "bg-amber-500" : "bg-red-500"
      )} />
    </Card>
  );
};

import { Card } from '@/components/ui/card';
