import React, { useState, useEffect } from 'react';
import { useDietStore } from '@/stores/diet-builder/useDietStore';
import { MealCard } from '@/components/diet-builder/MealCard';
import { PlanGenerationModal } from '@/components/diet-builder/PlanGenerationModal';
import { 
  Target, 
  Flame, 
  Dna, 
  Wheat, 
  Droplets,
  ChevronLeft,
  Share2,
  MoreVertical,
  Zap,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { logAuditEvent } from '@/lib/diet/planGeneratorEngine';

const DietBuilder: React.FC = () => {
  const { id: patientIdFromUrl } = useParams();
  const { 
    meals, 
    totals, 
    calorieTarget, 
    patientName, 
    goal, 
    isFallback, 
    loadFromBackend,
    patientId,
    setPatientData
  } = useDietStore();
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (patientIdFromUrl) {
        // Se mudou de paciente, carrega do backend
        if (patientId !== patientIdFromUrl) {
          await loadFromBackend(patientIdFromUrl);
          await logAuditEvent(user.id, patientIdFromUrl, 'escolha_editor', { mode: 'V3' });
        }
      }
    }
    init();
  }, [patientIdFromUrl, loadFromBackend, patientId]);

  const calPercentage = Math.min((totals.calories / calorieTarget) * 100, 100);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#F8FAFC] pb-20 -m-6">
        {/* Header Fixo */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-100">
          <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => {
                  if (confirm("Deseja sair sem salvar as alterações?")) {
                    navigate(-1);
                  }
                }} 
                className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-slate-600" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-slate-800 leading-tight">{patientName}</h1>
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest">{goal}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => setIsGenModalOpen(true)}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 px-4 shadow-lg shadow-emerald-100"
              >
                <Sparkles className="w-4 h-4" />
                Gerar Plano
              </Button>
              <Button variant="ghost" size="icon" className="rounded-xl">
                <Share2 className="w-5 h-5 text-slate-400" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-xl">
                <MoreVertical className="w-5 h-5 text-slate-400" />
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 pt-8 space-y-8">
          {/* Banner de Fallback */}
          {isFallback && (
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 flex items-center gap-4 text-amber-800 animate-in fade-in slide-in-from-top-4">
              <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold leading-tight">Plano gerado com dados básicos</p>
                <p className="text-xs font-medium opacity-80">Complete a anamnese para maior precisão clínica.</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-xl border-amber-200 bg-white hover:bg-amber-100 text-amber-700 h-9 font-bold"
                onClick={() => setIsGenModalOpen(true)}
              >
                Regerar
              </Button>
            </div>
          )}
          {/* Dashboard de Macros */}
          <section className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="space-y-4 flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-400" />
                    <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">Calorias Diárias</span>
                  </div>
                  <span className="text-sm font-bold">{totals.calories} / {calorieTarget} kcal</span>
                </div>
                <Progress value={calPercentage} className="h-3 bg-white/10" />
              </div>

              <div className="grid grid-cols-3 gap-6 md:border-l md:border-white/10 md:pl-8">
                <div className="text-center">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-2">
                    <Dna className="w-5 h-5 text-blue-400" />
                  </div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Proteína</p>
                  <p className="text-lg font-bold">{totals.protein}g</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-2">
                    <Wheat className="w-5 h-5 text-emerald-400" />
                  </div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Carbos</p>
                  <p className="text-lg font-bold">{totals.carbs}g</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-2">
                    <Droplets className="w-5 h-5 text-amber-400" />
                  </div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Gordura</p>
                  <p className="text-lg font-bold">{totals.fat}g</p>
                </div>
              </div>
            </div>
          </section>

          {/* Lista de Refeições */}
          <section className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Refeições do Dia</h2>
              <div className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500" /> EDITOR V3
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-32">
              {meals.map((meal) => (
                <MealCard key={meal.id} meal={meal} />
              ))}
            </div>
          </section>

          {/* Footer de Ação */}
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-md z-20">
            <Button 
              className="w-full h-16 rounded-3xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg shadow-2xl shadow-emerald-200 transition-all active:scale-95"
            >
              Finalizar e Salvar Dieta
            </Button>
          </div>
        </main>

        <PlanGenerationModal 
          isOpen={isGenModalOpen} 
          onClose={() => setIsGenModalOpen(false)} 
        />
      </div>
    </DashboardLayout>
  );
};

export default DietBuilder;
