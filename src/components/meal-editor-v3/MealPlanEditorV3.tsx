import React, { useState, useEffect } from 'react';
import { useMealEditorV3Store } from '@/hooks/meal-editor-v3/useMealEditorV3Store';
import { MealListSidebar } from './MealListSidebar';
import { ActiveMealContent } from './ActiveMealContent';
import { MacroSummary } from './MacroSummary';
import { ClinicalRulesPanel } from './ClinicalRulesPanel';
import { ValidationModal } from './ValidationModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw, Save, Zap, Dumbbell, Flame, Apple, Salad, Soup, 
  Package, ShieldCheck, Settings2, Sparkles, CheckCircle2,
  Stethoscope, Baby, HeartPulse, Activity
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const GENERATION_OPTIONS = [
  { id: 'weight-loss', label: 'Emagrecimento', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50' },
  { id: 'muscle-gain', label: 'Hipertrofia', icon: Dumbbell, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'low-carb', label: 'Low Carb', icon: Salad, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { id: 'marmitas', label: 'Marmitas', icon: Package, color: 'text-amber-500', bg: 'bg-amber-50' },
  { id: 'gastritis', label: 'Gastrite', icon: Stethoscope, color: 'text-rose-500', bg: 'bg-rose-50', isClinical: true },
  { id: 'lactating', label: 'Lactante', icon: Baby, color: 'text-pink-500', bg: 'bg-pink-50', isClinical: true },
  { id: 'triglycerides', label: 'Triglicerídeos', icon: HeartPulse, color: 'text-red-500', bg: 'bg-red-50', isClinical: true },
  { id: 'liver_fat', label: 'Gordura Fígado', icon: Activity, color: 'text-green-600', bg: 'bg-green-50', isClinical: true },
];

export const MealPlanEditorV3: React.FC = () => {
  const { 
    generateDeterministicPlan, resetPlan, fastMode, setFastMode, 
    planStatus, optimizePlan, validateAndSave, consistencyMessage, lastActionInsight,
    fetchClinicalRules, patientTargets, meals, clinicalLog, isPatientView, setPatientView
  } = useMealEditorV3Store();

  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [validationResults, setValidationResults] = useState<any>(null);

  useEffect(() => {
    fetchClinicalRules();
  }, []);

  const handleGenerate = async (optionId: string) => {
    const isClinical = GENERATION_OPTIONS.find(o => o.id === optionId)?.isClinical;
    
    if (isClinical) {
      await generateDeterministicPlan('simple', { conditionId: optionId });
    } else {
      await generateDeterministicPlan(optionId);
    }
    
    setIsGenerateModalOpen(false);
    toast.success('Plano gerado com sucesso!');
  };

  const handleOptimize = () => {
    optimizePlan();
    toast.success('Plano otimizado clinicamente!');
  };

  const handleSaveClick = () => {
    const totals = meals.reduce((acc, meal) => {
      meal.items.forEach(item => {
        acc.calories += item.calories * item.quantity;
        acc.protein += item.protein * item.quantity;
      });
      return acc;
    }, { calories: 0, protein: 0 });

    const targetCals = patientTargets?.calories || 2000;
    const targetProt = patientTargets?.protein || 150;

    const calDiff = Math.abs(totals.calories - targetCals) / targetCals;
    const protDiff = Math.abs(totals.protein - targetProt) / targetProt;

    const results = {
      calories: {
        target: targetCals,
        current: totals.calories,
        status: calDiff < 0.05 ? 'ok' : calDiff < 0.15 ? 'warn' : 'error'
      },
      protein: {
        target: targetProt,
        current: totals.protein,
        status: protDiff < 0.05 ? 'ok' : protDiff < 0.15 ? 'warn' : 'error'
      },
      clinicalRules: {
        status: consistencyMessage ? 'error' : clinicalLog ? 'ok' : 'ok',
        message: consistencyMessage || (clinicalLog ? 'Regras clínicas respeitadas' : 'Nenhuma regra clínica ativa')
      }
    };

    setValidationResults(results);
    setIsValidationModalOpen(true);
  };

  const confirmSave = async () => {
    const success = await validateAndSave();
    if (success) {
      setIsValidationModalOpen(false);
      toast.success('Plano validado e salvo com sucesso!');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background overflow-hidden selection:bg-primary/10">
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background/50 backdrop-blur-xl z-20">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Editor V3</h1>
            <div className="flex items-center gap-2">
              <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-widest">Intelligent Diet Engine</p>
              <AnimatePresence>
                {planStatus !== 'draft' && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold",
                      planStatus === 'error' || consistencyMessage ? "bg-red-500/10 text-red-600" : "bg-green-500/10 text-green-600"
                    )}
                  >
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    {consistencyMessage ? 'AJUSTES NECESSÁRIOS' : (planStatus === 'validated' ? 'PLANO CONSISTENTE' : 'OTIMIZADO')}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          
          <div className="h-8 w-px bg-border hidden sm:block" />
          
          <div className="hidden sm:flex items-center space-x-2 bg-muted/30 px-3 py-1.5 rounded-full border border-border/50">
            <Switch 
              id="fast-mode" 
              checked={fastMode} 
              onCheckedChange={setFastMode} 
              className="data-[state=checked]:bg-primary"
            />
            <Label htmlFor="fast-mode" className="text-xs font-bold flex items-center gap-1.5 cursor-pointer">
              <Zap className={cn("w-3 h-3 transition-colors", fastMode ? "text-primary" : "text-muted-foreground")} />
              MODO RÁPIDO
            </Label>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={resetPlan} className="text-muted-foreground hover:text-foreground">
            <RefreshCw className="w-3.5 h-3.5 mr-2" />
            Limpar
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleOptimize}
            className="bg-purple-500/5 border-purple-500/20 text-purple-600 hover:bg-purple-500/10 font-bold"
          >
            <Sparkles className="w-3.5 h-3.5 mr-2" />
            OTIMIZAR
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsGenerateModalOpen(true)} 
            className="bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 font-bold px-4"
          >
            <Zap className="w-3.5 h-3.5 mr-2" />
            GERAR PLANO
          </Button>
          
          <Button 
            size="sm" 
            onClick={handleSaveClick}
            className={cn(
              "font-bold shadow-lg shadow-primary/20 px-6",
              planStatus === 'error' && "bg-destructive hover:bg-destructive/90 shadow-destructive/20"
            )}
          >
            <Save className="w-3.5 h-3.5 mr-2" />
            SALVAR
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        <aside className="w-64 border-r bg-muted/20 hidden lg:block">
          <MealListSidebar />
        </aside>

        <main className="flex-1 overflow-y-auto bg-background/50 p-4 sm:p-8 scroll-smooth">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
             <AnimatePresence>
              {lastActionInsight && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mb-4 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl flex items-center gap-2 text-xs text-blue-600 font-medium"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {lastActionInsight}
                </motion.div>
              )}
            </AnimatePresence>
            <ActiveMealContent />
          </motion.div>
        </main>

        <aside className="w-80 border-l bg-muted/20 p-6 hidden xl:block overflow-y-auto">
          <MacroSummary />
          <div className="mt-8 pt-8 border-t">
            <ClinicalRulesPanel />
          </div>
        </aside>
      </div>

      <Dialog open={isGenerateModalOpen} onOpenChange={setIsGenerateModalOpen}>
        <DialogContent className="max-w-3xl sm:rounded-3xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Inteligência Clínica V3</DialogTitle>
            <DialogDescription className="font-medium">
              Gere um plano baseado em objetivos ou condições clínicas específicas.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6">
            {GENERATION_OPTIONS.map((opt, idx) => (
              <motion.button
                key={opt.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => handleGenerate(opt.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-3 p-5 rounded-3xl border-2 border-transparent transition-all group relative",
                  opt.bg,
                  "hover:border-primary/20 hover:shadow-xl hover:-translate-y-1 active:scale-95"
                )}
              >
                {opt.isClinical && (
                  <Badge className="absolute top-2 right-2 text-[8px] bg-primary/10 text-primary border-none font-bold">CLÍNICO</Badge>
                )}
                <div className={cn("p-3 rounded-2xl bg-white shadow-sm group-hover:shadow-md transition-all")}>
                  <opt.icon className={cn("w-8 h-8", opt.color)} />
                </div>
                <span className="text-[10px] font-bold text-center uppercase tracking-tight">{opt.label}</span>
              </motion.button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {validationResults && (
        <ValidationModal 
          isOpen={isValidationModalOpen}
          onClose={() => setIsValidationModalOpen(false)}
          onConfirm={confirmSave}
          results={validationResults}
        />
      )}
    </div>
  );
};
