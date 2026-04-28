import React from 'react';
import { useMealEditorV3Store } from '@/hooks/meal-editor-v3/useMealEditorV3Store';
import { MealListSidebar } from './MealListSidebar';
import { ActiveMealContent } from './ActiveMealContent';
import { MacroSummary } from './MacroSummary';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Save, Zap } from 'lucide-react';

export const MealPlanEditorV3: React.FC = () => {
  const { generateDeterministicPlan } = useMealEditorV3Store();

  const handleGenerate = () => {
    // We'll implement the modal later, for now just a call
    generateDeterministicPlan('weight-loss', {});
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Editor de Dieta Inteligente V3</h1>
          <p className="text-muted-foreground text-sm">Monte planos perfeitos em minutos</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => {}}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Recomeçar
          </Button>
          <Button variant="outline" size="sm" onClick={handleGenerate} className="bg-primary/5 border-primary/20 text-primary hover:bg-primary/10">
            <Zap className="w-4 h-4 mr-2" />
            Gerar Plano
          </Button>
          <Button size="sm">
            <Save className="w-4 h-4 mr-2" />
            Salvar Plano
          </Button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Meal List */}
        <aside className="w-64 border-r bg-muted/30">
          <MealListSidebar />
        </aside>

        {/* Center: Active Meal */}
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <ActiveMealContent />
        </main>

        {/* Right: Nutritional Summary */}
        <aside className="w-80 border-l bg-muted/30 p-6">
          <MacroSummary />
        </aside>
      </div>
    </div>
  );
};
