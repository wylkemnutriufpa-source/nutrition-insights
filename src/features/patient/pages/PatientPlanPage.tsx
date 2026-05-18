import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { patientService } from '../services/patientService';
import { PatientPlan } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, Share2, Download, Flame, Trophy, Calendar, 
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { PRODUCTION_URL } from '@/lib/config';
import { copyToClipboard } from '@/utils/clipboard';

export const PatientPlanPage = () => {
  const { id, token } = useParams<{ id?: string, token?: string }>();
  const [plan, setPlan] = useState<PatientPlan | null>(null);
  const [completions, setCompletions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

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
          // 🛡️ AUDITORIA SOBERANA: Validar integridade antes de renderizar
          import('../utils/sovereign-guard').then(({ sovereignGuard }) => {
            sovereignGuard.validate(data);
            sovereignGuard.auditRuntime();
          });
          
          setPlan(data);
          const todayCompletions = await patientService.getTodayCompletions(data.id);
          setCompletions(todayCompletions);
          await patientService.logAccess(data.id, 'view');
        }
      } catch (err: any) {
        console.error("[PatientApp] Plan Loading Error:", err);
        toast.error("Erro ao carregar o plano.");
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
    toast[success ? 'success' : 'error'](success ? 'Link copiado!' : 'Erro ao copiar.');
  };

  const handleExport = () => {
    toast.info('Em breve disponível para exportação.');
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-black text-white">Carregando plano...</div>;
  if (!plan) return <div className="flex items-center justify-center h-screen bg-black text-white">Plano não encontrado.</div>;

  const progress = Math.round((completions.length / plan.meals.length) * 100) || 0;

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
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
          <Card className="bg-emerald-950/20 border-emerald-500/20 text-white">
            <CardContent className="pt-6">
              <span className="text-xs text-gray-400">Proteína</span>
              <p className="text-2xl font-bold mt-2">{Math.round(plan.meta_proteinas)}g</p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-950/20 border-emerald-500/20 text-white">
            <CardContent className="pt-6">
              <span className="text-xs text-gray-400">Carbo</span>
              <p className="text-2xl font-bold mt-2">{Math.round(plan.meta_carboidratos)}g</p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-950/20 border-emerald-500/20 text-white">
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
              className="h-full bg-emerald-500 transition-all duration-500 ease-out" 
              style={{ width: `${progress}%` }} 
            />
          </div>
        </section>

        <section className="space-y-4">
          {plan.meals.map((meal) => {
            const isCompleted = completions.includes(meal.id);
            return (
              <Card key={meal.id} className={`transition-all duration-300 ${isCompleted ? 'bg-emerald-950/30 border-emerald-500/40 opacity-75' : 'bg-gray-950 border-gray-800'}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${isCompleted ? 'bg-emerald-500' : 'bg-gray-900'}`}>
                      <span className="text-lg text-white">🍽️</span>
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
                      <li key={item.id} className="flex items-center justify-between text-gray-300">
                        <div className="flex items-center gap-3">
                          {item.imageUrl && (
                            <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-lg object-cover border border-gray-800" />
                          )}
                          <div>
                            <span className="font-medium">{item.name}</span>
                            <p className="text-xs text-gray-500">{item.display_quantity}</p>
                          </div>
                        </div>
                        <span className="text-emerald-500/80 font-medium text-sm">
                          {Math.round(item.kcal)} kcal
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </section>
      </div>
    </div>
  );
};