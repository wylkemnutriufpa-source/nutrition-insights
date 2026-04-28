import React, { useState } from 'react';
import { useMealEditorV3Store } from '@/hooks/meal-editor-v3/useMealEditorV3Store';
import { MealListSidebar } from './MealListSidebar';
import { ActiveMealContent } from './ActiveMealContent';
import { MacroSummary } from './MacroSummary';
import { Button } from '@/components/ui/button';
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
    planStatus, optimizePlan 
  } = useMealEditorV3Store();
  
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  const handleGenerate = (optionId: string) => {
    // Check if it's a clinical condition or a goal
    const isClinical = GENERATION_OPTIONS.find(o => o.id === optionId)?.isClinical;
    
    if (isClinical) {
      generateDeterministicPlan('simple', { conditionId: optionId });
    } else {
      generateDeterministicPlan(optionId);
    }
    
    setIsGenerateModalOpen(false);
    toast.success('Plano gerado com sucesso!');
  };

  const handleOptimize = () => {
    optimizePlan();
    toast.success('Plano otimizado clinicamente!');
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
                    className="flex items-center gap-1 bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded text-[9px] font-bold"
                  >
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    {planStatus === 'validated' ? 'VALIDADO' : 'OTIMIZADO'}
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
          
          <Button size="sm" className="font-bold shadow-lg shadow-primary/20 px-6">
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
            <ActiveMealContent />
          </motion.div>
        </main>

        <aside className="w-80 border-l bg-muted/20 p-6 hidden xl:block">
          <MacroSummary />
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
    </div>
  );
};

