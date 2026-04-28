import React, { useState } from 'react';
import { useMealEditorV3Store } from '@/hooks/meal-editor-v3/useMealEditorV3Store';
import { MealListSidebar } from './MealListSidebar';
import { ActiveMealContent } from './ActiveMealContent';
import { MacroSummary } from './MacroSummary';
import { Button } from '@/components/ui/button';
import { RefreshCw, Save, Zap, Dumbbell, Flame, Apple, Salad, Soup, Package, ShieldCheck, Settings2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const GENERATION_OPTIONS = [
  { id: 'weight-loss', label: 'Emagrecimento', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50' },
  { id: 'muscle-gain', label: 'Hipertrofia', icon: Dumbbell, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'simple', label: 'Simples', icon: Apple, color: 'text-green-500', bg: 'bg-green-50' },
  { id: 'low-carb', label: 'Low Carb', icon: Salad, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { id: 'keto', label: 'Cetogênica', icon: Soup, color: 'text-purple-500', bg: 'bg-purple-50' },
  { id: 'marmitas', label: 'Marmitas', icon: Package, color: 'text-amber-500', bg: 'bg-amber-50' },
  { id: 'clinical', label: 'Clínico', icon: ShieldCheck, color: 'text-cyan-500', bg: 'bg-cyan-50' },
  { id: 'custom', label: 'Personalizado', icon: Settings2, color: 'text-slate-500', bg: 'bg-slate-50' },
];

export const MealPlanEditorV3: React.FC = () => {
  const { generateDeterministicPlan, resetPlan } = useMealEditorV3Store();
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  const handleGenerate = (goalId: string) => {
    generateDeterministicPlan(goalId);
    setIsGenerateModalOpen(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Editor de Dieta Inteligente V3</h1>
          <p className="text-muted-foreground text-sm">Monte planos perfeitos em minutos</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={resetPlan}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Recomeçar
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsGenerateModalOpen(true)} className="bg-primary/5 border-primary/20 text-primary hover:bg-primary/10">
            <Zap className="w-4 h-4 mr-2" />
            Gerar Plano
          </Button>
          <Button size="sm">
            <Save className="w-4 h-4 mr-2" />
            Salvar Plano
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 border-r bg-muted/30">
          <MealListSidebar />
        </aside>

        <main className="flex-1 overflow-y-auto bg-background p-6">
          <ActiveMealContent />
        </main>

        <aside className="w-80 border-l bg-muted/30 p-6">
          <MacroSummary />
        </aside>
      </div>

      <Dialog open={isGenerateModalOpen} onOpenChange={setIsGenerateModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gerar Plano de Dieta</DialogTitle>
            <DialogDescription>
              Selecione o objetivo para gerar um plano determinístico baseado na anamnese.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4">
            {GENERATION_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleGenerate(opt.id)}
                className={`flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 border-transparent hover:border-primary/20 hover:shadow-md transition-all ${opt.bg}`}
              >
                <opt.icon className={`w-8 h-8 ${opt.color}`} />
                <span className="text-xs font-semibold text-center">{opt.label}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

