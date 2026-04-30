import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useEditorState } from './useEditorState';
import { mockMarmitas, mockFoods, mockTemplates } from './constants';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  ArrowLeft, UserX, Plus, Trash2, Lock,
  Sparkles, Save, Package, ChefHat, Clock,
  Apple, Layers, Utensils
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const EditorV3Page = () => {
  const { patientId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const planId = searchParams.get('planId');
  
  const { 
    meals, setPatientId, addMarmitaToMeal, 
    removeFood, generatePlan, savePlan, planStatus,
    resetEditor 
  } = useEditorState();

  useEffect(() => {
    if (patientId) {
      setPatientId(patientId);
    }
  }, [patientId, setPatientId]);

  if (!patientId && !planId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6">
          <UserX className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Paciente não selecionado</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          Para utilizar o Editor V3, você precisa selecionar um paciente ou carregar um plano existente.
        </p>
        <Button onClick={() => navigate('/patients')} variant="default" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar para Pacientes
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#050505] flex flex-col">
      {/* Header V3 */}
      <header className="border-b bg-background/50 backdrop-blur-xl sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Editor V3</h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Core Engine V3 Active
            </p>
          </div>
          <Badge variant="outline" className={cn(
            "ml-2 text-[10px] font-bold",
            planStatus === 'saved' ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"
          )}>
            {planStatus === 'saved' ? 'SINCRONIZADO' : 'PENDENTE'}
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={resetEditor}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            Resetar
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => generatePlan('muscle-gain')}
            className="gap-2 border-primary/20 text-primary hover:bg-primary/5 font-bold"
          >
            <Sparkles className="w-3.5 h-3.5" />
            GERAR V3
          </Button>
          <Button 
            size="sm" 
            onClick={savePlan}
            disabled={planStatus === 'saving'}
            className="gap-2 font-bold shadow-lg shadow-primary/20"
          >
            <Save className="w-3.5 h-3.5" />
            {planStatus === 'saving' ? 'SALVANDO...' : 'SALVAR PLANO'}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-8">
        {meals.map((meal) => (
          <section key={meal.id} className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ChefHat className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">{meal.name}</h2>
                  <div className="flex items-center gap-2 text-muted-foreground text-xs">
                    <Clock className="w-3 h-3" />
                    {meal.time}
                  </div>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-full gap-2 text-xs font-bold"
                onClick={() => addMarmitaToMeal(meal.id, mockMarmitas[0])}
              >
                <Plus className="w-3 h-3" />
                Adicionar marmita
              </Button>
            </div>

            <div className="grid gap-4">
              {meal.items.length === 0 ? (
                <div className="border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-muted-foreground bg-muted/5">
                  <Package className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-sm font-medium">Nenhum item nesta refeição</p>
                </div>
              ) : (
                meal.items.map((item) => (
                  <Card 
                    key={item.instanceId} 
                    className={cn(
                      "p-4 flex items-center justify-between border-l-4 transition-all hover:shadow-md",
                      item.locked ? "border-l-amber-500 bg-amber-500/[0.02]" : "border-l-primary"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      {item.imageUrl && (
                        <img 
                          src={item.imageUrl} 
                          alt={item.name} 
                          className="w-12 h-12 rounded-lg object-cover shadow-sm"
                        />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm">{item.name}</p>
                          {item.locked && (
                            <Badge variant="outline" className="h-4 text-[9px] bg-amber-500/10 text-amber-700 border-amber-500/20 gap-1">
                              <Lock className="w-2 h-2" />
                              LOCKED
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {item.calories} kcal • {item.protein}g Prot • {item.carbs}g Carb
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right mr-4">
                        <p className="font-bold text-sm">{item.quantity} {item.portionUnit}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Quantidade</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeFood(meal.id, item.instanceId)}
                        disabled={item.locked}
                        className={cn(
                          "h-8 w-8 text-muted-foreground rounded-full",
                          item.locked ? "opacity-30 cursor-not-allowed" : "hover:text-destructive hover:bg-destructive/10"
                        )}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </section>
        ))}
      </main>

      {/* Footer Info */}
      <footer className="p-6 text-center border-t bg-muted/10">
        <p className="text-xs text-muted-foreground font-medium">
          FitJourney Editor V3 • Engine v3.0.1-stable
        </p>
      </footer>
    </div>
  );
};

export default EditorV3Page;
