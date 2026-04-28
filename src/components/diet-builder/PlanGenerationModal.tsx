import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Dumbbell, 
  TrendingDown, 
  Utensils, 
  Leaf, 
  Zap, 
  Package, 
  ChefHat, 
  Star,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useDietStore } from '@/stores/diet-builder/useDietStore';
import { PlanType, generateMealPlan, fetchPatientAnamnesis } from '@/lib/diet/planGeneratorEngine';
import { toast } from 'sonner';

interface PlanGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PLAN_OPTIONS = [
  { id: 'hipertrofia', label: 'Hipertrofia', icon: Dumbbell, color: 'text-blue-500', bg: 'bg-blue-50', desc: 'Superávit calórico e alta proteína' },
  { id: 'emagrecimento', label: 'Emagrecimento', icon: TrendingDown, color: 'text-rose-500', bg: 'bg-rose-50', desc: 'Déficit calórico estratégico' },
  { id: 'simples', label: 'Simples', icon: Utensils, color: 'text-slate-500', bg: 'bg-slate-50', desc: 'Arroz, feijão e básico do dia a dia' },
  { id: 'low_carb', label: 'Low Carb', icon: Leaf, color: 'text-emerald-500', bg: 'bg-emerald-50', desc: 'Redução drástica de carboidratos' },
  { id: 'cetogenico', label: 'Cetogênico', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50', desc: 'Alta gordura e zero açúcar' },
  { id: 'marmitas', label: 'Plano de Marmitas', icon: Package, color: 'text-indigo-500', bg: 'bg-indigo-50', desc: 'Focado em refeições congeladas' },
  { id: 'receitas', label: 'Plano com Receitas', icon: ChefHat, color: 'text-orange-500', bg: 'bg-orange-50', desc: 'Pratos elaborados e variados' },
  { id: 'elaborado', label: 'Plano Elaborado', icon: Star, color: 'text-purple-500', bg: 'bg-purple-50', desc: 'Máxima performance e variedade' },
];

export const PlanGenerationModal: React.FC<PlanGenerationModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<PlanType | null>(null);
  const { setMeals, setGoal, setCalorieTarget } = useDietStore();

  const handleGenerate = async () => {
    if (!selectedType) return;
    
    setLoading(true);
    try {
      const patientData = await fetchPatientAnamnesis();
      
      if (!patientData) {
        toast.error("Erro ao carregar dados do paciente.");
        return;
      }

      const generatedMeals = await generateMealPlan(patientData, selectedType);
      
      setMeals(generatedMeals);
      setGoal(selectedType.charAt(0).toUpperCase() + selectedType.slice(1));
      setCalorieTarget(patientData.calories_target);
      
      if (patientData.is_fallback) {
        toast.warning("Plano gerado com dados básicos. Complete a anamnese para maior precisão.", {
          duration: 6000,
          icon: <AlertCircle className="w-5 h-5 text-amber-500" />,
        });
      } else {
        toast.success("Plano gerado com sucesso!", {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
        });
      }
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar plano nutricional.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl rounded-[2.5rem] border-none shadow-2xl p-8">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-3xl font-black text-slate-800 tracking-tight">Gerar Plano Automático</DialogTitle>
          <DialogDescription className="text-slate-500 text-lg">
            Selecione o motor de geração ideal para o objetivo do paciente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PLAN_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                onClick={() => setSelectedType(opt.id as PlanType)}
                className={`flex items-start gap-4 p-5 rounded-[2rem] border-2 transition-all text-left group ${
                  selectedType === opt.id 
                  ? 'border-emerald-500 bg-emerald-50/50 shadow-lg shadow-emerald-100' 
                  : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className={`w-12 h-12 ${opt.bg} ${opt.color} rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800 mb-1">{opt.label}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        <DialogFooter className="mt-8 flex flex-col sm:flex-row gap-4">
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="rounded-2xl h-14 px-8 font-bold text-slate-500 hover:bg-slate-50"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleGenerate}
            disabled={!selectedType || loading}
            className="flex-1 rounded-2xl h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg shadow-xl shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                Gerando Motor...
              </>
            ) : (
              'Gerar Plano Completo'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
