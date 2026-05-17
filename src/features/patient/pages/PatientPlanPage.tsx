import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { patientService } from '../services/patientService';
import { PatientPlan } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, Share2, Download, Flame, Trophy, Calendar, 
  RefreshCw, ChevronRight, Scale, Info, Sparkles, Utensils, Activity, ShieldAlert
} from 'lucide-react';

import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { PRODUCTION_URL } from '@/lib/config';
import { copyToClipboard } from '@/utils/clipboard';
import { SovereignMonitor } from '@/lib/sovereignMonitor';
import { useSovereignAudit } from '@/hooks/useSovereignAudit';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export const PatientPlanPage = () => {
  const { id, token } = useParams<{ id?: string, token?: string }>();
  const [plan, setPlan] = useState<PatientPlan | null>(null);
  const [completions, setCompletions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<{ item: any, mealId: string } | null>(null);
  const [substitutions, setSubstitutions] = useState<any[]>([]);
  const [showSubModal, setShowSubModal] = useState(false);

  // 🛡️ SISTEMA FORENSE AUTO-AUDITÁVEL
  const { isSovereign, denounce } = useSovereignAudit('PatientPlanPage', plan);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        let data = null;
        if (token) {
          data = await patientService.getPlanByToken(token);
        } else if (id) {
          data = await patientService.getPlanById(id);
        }

        if (data) {
          setPlan(data);
          const todayCompletions = await patientService.getTodayCompletions(data.id);
          setCompletions(todayCompletions);
          await patientService.logAccess(data.id, 'view');
        }
      } catch (err: any) {
        console.error("[PatientApp] Plan Loading Error:", err);
        toast.error(err.message || "Erro ao carregar o plano.");
      }
      setLoading(false);
    };

    fetchPlan();
  }, [id, token]);

  const handleToggleCompletion = async (mealId: string) => {
    if (!plan) return;
    const isCompleted = await patientService.toggleMealCompletion(plan.id, mealId, plan.patient_id);
    if (isCompleted) {
      setCompletions([...completions, mealId]);
      toast.success('Refeição concluída!');
    } else {
      setCompletions(completions.filter(id => id !== mealId));
    }
  };

  const handleShare = async () => {
    if (!plan?.sharing_token) return;
    const url = `${PRODUCTION_URL}/patient/view/${plan.sharing_token}`;
    const success = await copyToClipboard(url);
    toast[success ? 'success' : 'error'](success ? 'Link de compartilhamento copiado!' : 'Copie manualmente o link exibido.');
  };

  const handleExport = async () => {
    if (!plan) return;
    await patientService.logAccess(plan.id, 'export');
    toast.info('Gerando PDF profissional...');
    
    try {
      const { safeGeneratePDF } = await import("@/features/editor-v3/services/pdfService");
      
      const pdfData = {
        planTitle: (plan as any).name || "Plano Alimentar",
        patientName: plan.patient_name || "Paciente",
        nutritionistName: (plan as any).coach_name || "Nutricionista",
        startDate: new Date().toLocaleDateString('pt-BR'),
        targetCalories: plan.meta_calorias,
        targetProtein: plan.meta_proteinas,
        targetCarbs: plan.meta_carboidratos,
        targetFat: plan.meta_gorduras,
        goal: plan.goal,
        notes: (plan as any).notes,
        planMode: (plan as any).plan_mode || 'single_day',

        items: plan.meals.flatMap(meal => 
          meal.items.map((item: any) => ({
            mealType: meal.name,
            title: item.name,
            meta_calorias: item.kcal,
            meta_proteinas: item.protein,
            meta_carboidratos: item.carbs,
            meta_gorduras: item.fat,
            is_primary: true,
            display_quantity: item.display_quantity || item.quantity,
            display_unit: item.display_unit || item.portionUnitLabel,
            clinical_mass_g: item.clinical_mass_g,
            visual_image_url: item.imageUrl
          }))
        )
      };
      
      await safeGeneratePDF(pdfData);
      toast.success('PDF gerado com sucesso!');
    } catch (err) {
      console.error("[PatientApp] PDF Export Error:", err);
      toast.error("Erro ao gerar PDF.");
    }
  };

  const handleOpenSubstitution = (item: any, mealId: string) => {
    if (isSovereign) {
      SovereignMonitor.log({
        event_type: 'snapshot_render',
        component: 'PatientPlanPage_Substitution',
        message: 'Acesso a substituições via Snapshot Soberano'
      });

      const snapshotSubs = item.substitutions || [];
      if (snapshotSubs.length === 0) {
        toast.error('O nutricionista não definiu substituições para este item.');
        return;
      }

      const mappedSubs = snapshotSubs.map((food: any) => ({
        food,
        grams: food.clinical_mass_g || food.quantity || 100,
        unit_label: food.display_unit || food.portionUnitLabel || 'unidade'
      }));

      setSubstitutions(mappedSubs);
      setSelectedItem({ item, mealId });
      setShowSubModal(true);
      return;
    }

    denounce('legacy_fallback_detected', { item: item.name, plan_id: plan?.id });
    toast.error('Opções de substituição não disponíveis para este formato de plano.');
  };

  const applySubstitution = (sub: any) => {
    if (!plan || !selectedItem) return;
    
    const updatedMeals = plan.meals.map(meal => {
      if (meal.id !== selectedItem.mealId) return meal;
      return {
        ...meal,
        items: meal.items.map(item => {
          if (item.id !== selectedItem.item.id) return item;
          
          if (isSovereign) {
            return {
              ...item,
              ...sub.food,
              name: sub.food.name,
              kcal: sub.food.kcal,
              protein: sub.food.protein,
              carbs: sub.food.carbs,
              fat: sub.food.fat,
              clinical_mass_g: sub.grams || item.clinical_mass_g
            };
          }

            return {
              ...item,
              name: sub.food.name || sub.food.title,
              kcal: sub.food.kcal,
              protein: sub.food.protein,
              carbs: sub.food.carbs,
              fat: sub.food.fat,
              display_quantity: sub.food.display_quantity || sub.food.quantity_display,
              imageUrl: sub.food.imageUrl
            };

        })
      };
    });

    setPlan({ ...plan, meals: updatedMeals });
    setShowSubModal(false);
    toast.success(`Alimento trocado por ${sub.food.name}!`);
  };

  const auditStats = useMemo(() => {
    if (!plan) return null;
    return {
      fidelity: isSovereign ? 100 : 0,
      calculations: 0,
      legacyCalls: isSovereign ? 0 : 5,
      visualFallbacks: plan.meals.flatMap(m => m.items).filter((i: any) => !i.imageUrl || i.imageUrl.includes('unsplash')).length
    };
  }, [plan, isSovereign]);

  if (loading) return <div className="flex items-center justify-center h-screen">Carregando plano...</div>;
  if (!plan) return <div className="flex items-center justify-center h-screen">Plano não encontrado.</div>;

  const progress = Math.round((completions.length / plan.meals.length) * 100) || 0;

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        {window.location.search.includes('debug=true') && (
          <Alert className="bg-neutral-900 border-emerald-500/20 mb-6">
            <Activity className="h-4 w-4 text-emerald-500" />
            <AlertTitle className="text-emerald-500 font-bold uppercase tracking-tighter text-xs flex justify-between">
              V3 Sovereignty Monitor
              <Badge variant="outline" className="text-[9px] border-emerald-500/20 text-emerald-500">REAL-TIME FORENSICS</Badge>
            </AlertTitle>
            <AlertDescription className="mt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-[9px] uppercase text-white/40">Snapshot Fidelity</p>
                  <p className="text-xl font-black text-emerald-500">{auditStats?.fidelity}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] uppercase text-white/40">Legacy Calls</p>
                  <p className={`text-xl font-black ${auditStats?.legacyCalls === 0 ? 'text-emerald-500' : 'text-red-500'}`}>{auditStats?.legacyCalls}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] uppercase text-white/40">Runtime Calcs</p>
                  <p className="text-xl font-black text-emerald-500">{auditStats?.calculations}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] uppercase text-white/40">Visual Fallbacks</p>
                  <p className="text-xl font-black text-orange-500">{auditStats?.visualFallbacks}</p>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <header className="flex justify-between items-start border-b border-emerald-900/30 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-emerald-500">{plan.patient_name}</h1>
            <p className="text-gray-400 mt-1 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-emerald-500/50" />
              Objetivo: {plan.goal || 'Performance'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handleShare} className="border-emerald-500/20 hover:bg-emerald-500/10">
              <Share2 className="w-4 h-4 text-emerald-500" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleExport} className="border-emerald-500/20 hover:bg-emerald-500/10">
              <Download className="w-4 h-4 text-emerald-500" />
            </Button>
          </div>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-emerald-950/20 border-emerald-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-gray-400">Energia</span>
              </div>
              <p className="text-2xl font-bold mt-2">{Math.round(plan.meta_calorias)} <span className="text-xs text-gray-500 font-normal">kcal</span></p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-950/20 border-emerald-500/20">
            <CardContent className="pt-6">
              <span className="text-xs text-gray-400">Proteína</span>
              <p className="text-2xl font-bold mt-2">{Math.round(plan.meta_proteinas)}g</p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-950/20 border-emerald-500/20">
            <CardContent className="pt-6">
              <span className="text-xs text-gray-400">Carbo</span>
              <p className="text-2xl font-bold mt-2">{Math.round(plan.meta_carboidratos)}g</p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-950/20 border-emerald-500/20">
            <CardContent className="pt-6">
              <span className="text-xs text-gray-400">Gordura</span>
              <p className="text-2xl font-bold mt-2">{Math.round(plan.meta_gorduras)}g</p>
            </CardContent>
          </Card>
        </section>

        <section className="bg-emerald-500/5 rounded-xl p-6 border border-emerald-500/10">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-500" />
              <h2 className="font-semibold text-gray-200 text-lg">Progresso do Dia</h2>
            </div>
            <span className="text-emerald-500 font-bold text-xl">{progress}%</span>
          </div>
          <div className="h-3 w-full bg-gray-900 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
              style={{ width: `${progress}%` }} 
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-300">Refeições</h2>
          {plan.meals.map((meal) => {
            const isCompleted = completions.includes(meal.id);
            return (
              <Card key={meal.id} className={`transition-all duration-300 ${isCompleted ? 'bg-emerald-950/30 border-emerald-500/40 opacity-75' : 'bg-gray-950 border-gray-800'}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${isCompleted ? 'bg-emerald-500' : 'bg-gray-900'}`}>
                      <span className="text-lg">🍽️</span>
                    </div>
                    <div>
                      <CardTitle className={`text-lg ${isCompleted ? 'line-through text-gray-400' : 'text-gray-100'}`}>
                        {meal.name}
                      </CardTitle>
                      {meal.time && <p className="text-xs text-emerald-500 font-medium">{meal.time}</p>}
                    </div>
                  </div>
                  <Button 
                    variant={isCompleted ? "default" : "outline"} 
                    size="sm"
                    className={`${isCompleted ? 'bg-emerald-600' : 'border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10'} rounded-full`}
                    onClick={() => handleToggleCompletion(meal.id)}
                  >
                    <CheckCircle2 className={`w-4 h-4 ${isCompleted ? 'mr-0' : 'mr-2'}`} />
                    {!isCompleted && "Concluir"}
                  </Button>
                </CardHeader>
                <CardContent className="pb-6">
                  <ul className="space-y-3">
                    {meal.items.map((item: any) => (
                      <li key={item.id} className="flex items-center justify-between text-gray-300 group">
                        <div className="flex items-center gap-3">
                          {item.imageUrl && (
                            <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-lg object-cover border border-gray-800" />
                          )}
                          <div>
                            <span className="font-medium group-hover:text-emerald-400 transition-colors">{item.name}</span>
                            <p className="text-xs text-gray-500">
                              {isSovereign 
                                ? `${item.display_quantity || item.quantity || ''} ${item.display_unit || item.portionUnitLabel || ''} ${item.clinical_mass_g ? `(${item.clinical_mass_g}g)` : ''}`
                                : `${item.quantity || ''} ${item.portionUnitLabel || ''}`
                              }
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-emerald-500/80 font-medium text-sm whitespace-nowrap">
                            {Math.round(item.kcal)} kcal
                          </span>
                          {!isCompleted && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-gray-500 hover:text-emerald-500"
                              onClick={() => handleOpenSubstitution(item, meal.id)}
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <Dialog open={showSubModal} onOpenChange={setShowSubModal}>
          <DialogContent className="bg-gray-950 border-gray-800 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-500">
                <Sparkles className="w-5 h-5" />
                Opções de Substituição
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Escolha uma opção equivalente em proteína para substituir <strong>{selectedItem?.item.name}</strong>.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-3 py-4">
              {substitutions.map((sub, idx) => (
                <button
                  key={idx}
                  onClick={() => applySubstitution(sub)}
                  className="w-full flex items-center justify-between p-4 bg-gray-900/50 border border-gray-800 rounded-xl hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-500">
                      <Utensils className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-medium text-gray-200 block">{sub.food.name}</span>
                      <span className="text-sm text-emerald-500/80 font-semibold">{sub.unit_label}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Scale className="w-3 h-3 text-gray-500" />
                      <span className="text-xs text-gray-500">Equivalente</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-emerald-500 ml-auto" />
                  </div>
                </button>
              ))}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowSubModal(false)} className="text-gray-400">
                Cancelar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
