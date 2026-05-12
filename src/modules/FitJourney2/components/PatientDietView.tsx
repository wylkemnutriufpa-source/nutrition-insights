import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Utensils, Clock, Calendar, ChevronRight } from 'lucide-react';

export const PatientDietView = () => {
  const [plan, setPlan] = useState<any>(null);
  const [meals, setMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDiet() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Busca o plano ativo do paciente
      const { data: plans } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('patient_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (plans && plans.length > 0) {
        const activePlan = plans[0];
        setPlan(activePlan);

        // Busca os itens do plano
        const { data: items } = await supabase
          .from('meal_plan_items')
          .select('*')
          .eq('meal_plan_id', activePlan.id)
          .order('meal_type', { ascending: true });
        
        setMeals(items || []);
      }
      setLoading(false);
    }

    fetchDiet();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white font-mono uppercase tracking-widest">Carregando sua Dieta...</div>;
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-black text-white p-8 flex flex-col items-center justify-center text-center">
        <div className="h-20 w-20 bg-slate-900 rounded-full flex items-center justify-center mb-6 border border-slate-800">
          <Calendar className="text-slate-500" size={32} />
        </div>
        <h1 className="text-2xl font-black uppercase tracking-tight mb-2">Nenhum plano ativo</h1>
        <p className="text-slate-500 max-w-xs">Seu nutricionista ainda não publicou seu plano alimentar ou ele está em revisão.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="p-6 bg-gradient-to-b from-slate-900 to-black border-b border-slate-800">
        <h1 className="text-xs font-black uppercase tracking-widest text-green-500 mb-2">Minha Dieta</h1>
        <h2 className="text-2xl font-black uppercase tracking-tight">{plan.title}</h2>
        <div className="flex gap-4 mt-4">
          <div className="bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50">
            <p className="text-[10px] text-slate-500 uppercase font-bold">Calorias</p>
            <p className="text-sm font-black">{Math.round(plan.total_calories)} kcal</p>
          </div>
          <div className="bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50">
            <p className="text-[10px] text-slate-500 uppercase font-bold">Proteína</p>
            <p className="text-sm font-black text-blue-400">{Math.round(plan.total_protein)}g</p>
          </div>
        </div>
      </div>

      {/* Meals List */}
      <div className="p-6 space-y-4">
        {meals.length === 0 ? (
          <p className="text-center text-slate-600 py-10 italic">Nenhuma refeição detalhada encontrada.</p>
        ) : (
          meals.map((meal) => (
            <div key={meal.id} className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">
                  <Utensils size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm uppercase tracking-tight">{meal.title || meal.meal_type}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-1">
                    <Clock size={12} />
                    <span>REF: {meal.meal_type}</span>
                  </div>
                </div>
              </div>
              <ChevronRight className="text-slate-700 group-hover:text-green-500 transition-colors" size={20} />
            </div>
          ))
        )}
      </div>

      {/* Navigation Tab Bar (Mobile style) */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 flex items-center justify-around px-6">
        <button className="flex flex-col items-center gap-1 text-green-500">
          <Utensils size={20} />
          <span className="text-[10px] font-bold uppercase">Dieta</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-500">
          <Calendar size={20} />
          <span className="text-[10px] font-bold uppercase">Plano</span>
        </button>
      </div>
    </div>
  );
};