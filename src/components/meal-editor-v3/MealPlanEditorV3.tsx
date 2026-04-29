import React, { useState, useEffect } from 'react';
import { useMealEditorV3Store } from '@/hooks/meal-editor-v3/useMealEditorV3Store';
import { MealListSidebar } from './MealListSidebar';
import { ActiveMealContent } from './ActiveMealContent';
import { MacroSummary } from './MacroSummary';
import { ClinicalRulesPanel } from './ClinicalRulesPanel';
import { ValidationModal } from './ValidationModal';
import { TemplateLibrary } from './TemplateLibrary';
import { MobileMealEditorV3 } from './MobileMealEditorV3';
import { NewMealModal } from './NewMealModal';
import { GenerateAIModal } from './GenerateAIModal';
import { FocusModeView } from './FocusModeView';
import { PatientViewModal } from './PatientViewModal';
import { WeeklyGridView } from './WeeklyGridView';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import PatientPickerDropdown from '../common/PatientPickerDropdown';
import { 
  RefreshCw, Save, Zap, Dumbbell, Flame, Apple, Salad, Soup, 
  Package, ShieldCheck, Settings2, Sparkles, CheckCircle2,
  Stethoscope, Baby, HeartPulse, Activity, UserPlus, Search,
  PlusCircle, Bot, Calendar, Eye
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
    fetchClinicalRules, patientTargets, meals, clinicalLog, isPatientView, setPatientView,
    viewMode, setViewMode, setPatientId, patientId, activeDay
  } = useMealEditorV3Store();
  
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [isPatientSearchOpen, setIsPatientSearchOpen] = useState(false);
  const [isNewMealModalOpen, setIsNewMealModalOpen] = useState(false);
  const [isFocusModeOpen, setIsFocusModeOpen] = useState(false);
  const [isGenerateAIModalOpen, setIsGenerateAIModalOpen] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [validationResults, setValidationResults] = useState<any>(null);

  useEffect(() => {
    const fetchPatients = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      const { data, error } = await supabase
        .from('nutritionist_patients')
        .select(`
          patient_id,
          profiles:profiles!inner (
            full_name
          )
        `)
        .eq('nutritionist_id', userData.user.id);
        
      if (data && !error) {
        const patientList = data.map((item: any) => ({
          id: item.patient_id,
          name: item.profiles.full_name || 'Sem nome'
        }));
        setPatients(patientList);
      }
    };
    fetchPatients();
  }, []);

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

  const handleSaveClick = async () => {
    if (!patientId) {
      toast.error('Selecione um paciente antes de salvar o plano');
      setIsPatientSearchOpen(true);
      return;
    }

    const totals = meals.reduce((acc, meal) => {
      meal.items.forEach(item => {
        const currentMeasure = item.householdMeasures?.find(m => m.unit === item.selectedUnit) || { unit: item.portionUnit, factor: 1 };
        const factor = item.quantity * currentMeasure.factor;
        acc.calories += item.calories * factor;
        acc.protein += item.protein * factor;
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
    <>
    {/* Mobile / Tablet — layout baseado na referência visual */}
    <div className="xl:hidden">
      <MobileMealEditorV3 />
    </div>

    {/* Desktop profissional */}
    <div className="hidden xl:flex flex-col h-screen bg-[#fafafa] dark:bg-[#050505] overflow-hidden selection:bg-primary/10">

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

          <div className="hidden lg:flex items-center gap-2 relative">
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 px-3 rounded-xl border-dashed font-bold text-xs gap-2 transition-all",
                patientId ? "border-emerald-500/50 text-emerald-600 bg-emerald-50" : "border-primary/30 text-primary hover:border-primary/50"
              )}
              onClick={() => setIsPatientSearchOpen(!isPatientSearchOpen)}
            >
              <UserPlus className="w-3.5 h-3.5" />
              {patientId ? patients.find(p => p.id === patientId)?.name || 'PACIENTE SELECIONADO' : 'ATRIBUIR PACIENTE'}
            </Button>
            {isPatientSearchOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 z-50 shadow-2xl">
                <PatientPickerDropdown 
                  patients={patients} 
                  onSelect={(id) => {
                    setPatientId(id);
                    setIsPatientSearchOpen(false);
                    toast.success('Paciente selecionado');
                  }} 
                />
              </div>
            )}
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

          <div className="hidden sm:flex items-center space-x-2 bg-muted/30 px-3 py-1.5 rounded-full border border-border/50">
            <Switch 
              id="patient-view" 
              checked={isPatientView} 
              onCheckedChange={setPatientView} 
              className="data-[state=checked]:bg-emerald-500"
            />
            <Label htmlFor="patient-view" className="text-xs font-bold flex items-center gap-1.5 cursor-pointer">
              <Apple className={cn("w-3 h-3 transition-colors", isPatientView ? "text-emerald-500" : "text-muted-foreground")} />
              VER COMO PACIENTE
            </Label>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-muted/30 px-1 py-1 rounded-lg border border-border/50">
          <Button 
            variant={viewMode === 'day' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => setViewMode('day')}
            className="h-7 text-[10px] font-bold px-3"
          >
            MODO DIA
          </Button>
          <Button 
            variant={viewMode === 'week' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => setViewMode('week')}
            className="h-7 text-[10px] font-bold px-3"
          >
            MODO SEMANA
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setIsFocusModeOpen(true)} className="text-muted-foreground hover:text-primary">
            <Search className="w-3.5 h-3.5 mr-2" />
            Modo Foco
          </Button>

          <Button variant="ghost" size="sm" onClick={() => setIsNewMealModalOpen(true)} className="text-muted-foreground hover:text-emerald-500">
            <PlusCircle className="w-3.5 h-3.5 mr-2 text-emerald-500" />
            Nova Refeição
          </Button>

          <Button variant="ghost" size="sm" onClick={resetPlan} className="text-muted-foreground hover:text-destructive">
            <RefreshCw className="w-3.5 h-3.5 mr-2" />
            Limpar
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              if (!patientId) {
                toast.error('Selecione um paciente antes de otimizar o plano');
                setIsPatientSearchOpen(true);
                return;
              }
              handleOptimize();
            }}
            className="bg-purple-500/5 border-purple-500/20 text-purple-600 hover:bg-purple-500/10 font-bold"
          >
            <Sparkles className="w-3.5 h-3.5 mr-2" />
            OTIMIZAR
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              if (!patientId) {
                toast.error('Selecione um paciente antes de gerar o plano');
                setIsPatientSearchOpen(true);
                return;
              }
              setIsGenerateAIModalOpen(true);
            }} 
            className="bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 font-bold px-4"
          >
            <Bot className="w-3.5 h-3.5 mr-2" />
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
            SALVAR NO PRONTUÁRIO
          </Button>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => saveAsFavorite('Meu Novo Modelo', 'full_plan')}
            className="text-muted-foreground hover:text-amber-500 font-bold"
          >
            <Star className="w-3.5 h-3.5 mr-2" />
            Salvar na Biblioteca
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        <aside className="w-72 border-r bg-white dark:bg-[#0a0a0a] hidden lg:block shadow-[1px_0_0_0_rgba(0,0,0,0.05)] z-10">
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
            {viewMode === 'day' ? <ActiveMealContent /> : <WeeklyGridView />}
          </motion.div>
        </main>

        <aside className="w-80 border-l bg-white dark:bg-[#0a0a0a] p-5 hidden xl:block overflow-y-auto shadow-[-1px_0_0_0_rgba(0,0,0,0.05)]">
          <Tabs defaultValue="summary">
            <TabsList className="w-full bg-muted/30 p-1 mb-6">
              <TabsTrigger value="summary" className="flex-1 text-[10px] font-bold">RESUMO</TabsTrigger>
              <TabsTrigger value="templates" className="flex-1 text-[10px] font-bold">BIBLIOTECA</TabsTrigger>
            </TabsList>
            <TabsContent value="summary" className="m-0 space-y-8">
              <MacroSummary />
              <div className="pt-8 border-t">
                <ClinicalRulesPanel />
              </div>
            </TabsContent>
            <TabsContent value="templates" className="m-0">
              <TemplateLibrary />
            </TabsContent>
          </Tabs>
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

      <NewMealModal 
        isOpen={isNewMealModalOpen} 
        onClose={() => setIsNewMealModalOpen(false)} 
      />

      <GenerateAIModal 
        isOpen={isGenerateAIModalOpen} 
        onClose={() => setIsGenerateAIModalOpen(false)} 
      />

      <FocusModeView 
        isOpen={isFocusModeOpen} 
        onClose={() => setIsFocusModeOpen(false)} 
        dayLabel={activeDay}
      />

      <PatientViewModal 
        isOpen={isPatientView} 
        onClose={() => setPatientView(false)} 
      />
    </div>
    </>
  );
};
