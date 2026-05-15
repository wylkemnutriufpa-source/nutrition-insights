
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useEditorState } from '../hooks/useEditorState';
import { MealCard } from './MealCard';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, Save, Plus, Target, Flame, 
  CheckCircle2, AlertCircle, Info, Send, Share2,
  Trash2, Copy, MoreHorizontal, Settings
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function EditorV3Page() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const store = useEditorState();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPlan() {
      if (!id) return;
      setLoading(true);
      try {
        const { data: plan, error } = await supabase
          .from('meal_plans')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        if (plan?.items_payload && (plan.items_payload as any).meals) {
          store.hydrateMeals((plan.items_payload as any).meals);
        } else if (plan?.meals) {
          // Fallback for older schema if needed
          store.hydrateMeals(plan.meals as any);
        }
        
        if (plan?.patient_id) {
          store.setPatientId(plan.patient_id);
        }
      } catch (err) {
        console.error('Erro ao carregar plano:', err);
        toast.error('Erro ao carregar dados do plano');
      } finally {
        setLoading(false);
      }
    }

    loadPlan();
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-neutral-950">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }


  // Totals for the whole plan
  const planTotals = store.meals.reduce((acc, meal) => {
    meal.items.forEach(item => {
      acc.kcal += item.kcal || 0;
      acc.protein += item.protein || 0;
      acc.carbs += item.carbs || 0;
      acc.fat += item.fat || 0;
    });
    return acc;
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });

  const handleSave = async () => {
    setSaving(true);
    const toastId = toast.loading('Salvando alterações...');
    
    try {
      // In a real implementation, we would persist store.meals to the DB
      // For now, let's simulate and update the metadata
      const { error } = await supabase
        .from('meal_plans')
        .update({
          items_payload: { meals: store.meals },
          total_target_calories: Math.round(planTotals.kcal),
          total_target_protein: Math.round(planTotals.protein),
          total_target_carbs: Math.round(planTotals.carbs),
          total_target_fat: Math.round(planTotals.fat),
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', id);

      if (error) throw error;
      toast.success('Plano salvo com sucesso!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar plano', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const handleAddMeal = () => {
    const names = ["Café da Manhã", "Lanche", "Almoço", "Café da Tarde", "Jantar", "Ceia"];
    const currentCount = store.meals.length;
    const name = names[currentCount % names.length];
    store.addMeal(name);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-64px)] bg-neutral-950 text-white">
        {/* Header Superior */}
        <header className="px-8 py-4 bg-neutral-900 border-b border-white/10 flex items-center justify-between sticky top-0 z-10 shadow-xl backdrop-blur-md bg-neutral-900/80">
          <div className="flex items-center gap-6">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(-1)}
              className="h-10 w-10 text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black uppercase italic tracking-tighter">Editor Soberano V3</h1>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] font-black uppercase tracking-widest px-2 py-0">Manual</Badge>
              </div>
              <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest mt-0.5">Gestão dinâmica de templates e alimentos reais</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              className="bg-white/5 border-white/10 hover:bg-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest h-10 px-6 rounded-xl hidden md:flex"
            >
              <Share2 className="w-4 h-4 mr-2" /> Compartilhar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest h-10 px-8 rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
            >
              <Save className="w-4 h-4 mr-2" /> Salvar Plano
            </Button>
          </div>
        </header>

        {/* Dashboard de Macros */}
        <div className="px-8 py-6 bg-neutral-900/50 border-b border-white/5 grid grid-cols-2 md:grid-cols-4 gap-6 items-center">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
              <Flame className="w-3 h-3 text-orange-500" /> Valor Calórico
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black italic tracking-tighter text-white">{Math.round(planTotals.kcal)}</span>
              <span className="text-xs font-black uppercase text-white/20 tracking-widest">kcal</span>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
              <Target className="w-3 h-3 text-emerald-500" /> Proteínas
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black italic tracking-tighter text-white">{Math.round(planTotals.protein)}</span>
              <span className="text-xs font-black uppercase text-white/20 tracking-widest">g</span>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
              <Target className="w-3 h-3 text-blue-500" /> Carboidratos
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black italic tracking-tighter text-white">{Math.round(planTotals.carbs)}</span>
              <span className="text-xs font-black uppercase text-white/20 tracking-widest">g</span>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
              <Target className="w-3 h-3 text-amber-500" /> Lipídeos
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black italic tracking-tighter text-white">{Math.round(planTotals.fat)}</span>
              <span className="text-xs font-black uppercase text-white/20 tracking-widest">g</span>
            </div>
          </div>
        </div>

        {/* Workspace Principal */}
        <main className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Timeline de Refeições */}
          <ScrollArea className="flex-1 h-full px-8 py-8">
            <div className="max-w-4xl mx-auto space-y-8 pb-20">
              {store.meals.map((meal) => (
                <MealCard 
                  key={meal.id} 
                  meal={meal} 
                  onUpdateQuantity={(itemId, qty) => store.updateFoodQuantity(meal.id, itemId, qty)}
                  onRemoveFood={(itemId) => store.removeFood(meal.id, itemId)}
                  onAddFood={(food) => store.addFoodToMeal(meal.id, food)}
                  onRemoveMeal={() => store.removeMeal(meal.id)}
                />
              ))}

              {/* Botão Adicionar Refeição */}
              <Button 
                onClick={handleAddMeal}
                className="w-full h-24 bg-white/5 border-2 border-dashed border-white/5 hover:bg-white/10 hover:border-emerald-500/30 text-white/20 hover:text-emerald-500 rounded-3xl transition-all group"
              >
                <div className="flex flex-col items-center gap-1">
                  <Plus className="w-6 h-6 group-hover:scale-125 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Nova Refeição</span>
                </div>
              </Button>
            </div>
          </ScrollArea>

          {/* Barra Lateral de Status (Hidden on Mobile) */}
          <aside className="hidden lg:flex w-80 bg-neutral-900 border-l border-white/10 p-6 flex-col gap-8">
            <section>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Validação Soberana
              </h4>
              <div className="space-y-3">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black uppercase text-emerald-400 mb-1">Coerência Real-time</p>
                    <p className="text-[9px] text-white/40 font-medium leading-tight">Cálculos e equivalentes ajustados automaticamente.</p>
                  </div>
                </div>
                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex gap-3 opacity-50">
                  <Info className="w-4 h-4 text-white/20 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black uppercase text-white/40 mb-1">Avisos Clínicos</p>
                    <p className="text-[9px] text-white/30 font-medium leading-tight">Nenhum conflito detectado no plano atual.</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-auto">
              <div className="p-6 bg-white/5 border border-white/10 rounded-3xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Editor Protocol</p>
                <p className="text-sm font-bold text-white mb-4 italic">"Comida Real. Dieta Prática. Estrutura Clara."</p>
                <Badge className="bg-white/10 text-white/60 border-transparent text-[8px] uppercase font-black">v3.0.0-sovereign</Badge>
              </div>
            </section>
          </aside>
        </main>
      </div>
    </DashboardLayout>
  );
}
