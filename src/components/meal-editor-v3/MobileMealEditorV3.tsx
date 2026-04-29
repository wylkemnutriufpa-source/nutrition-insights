import React, { useState } from 'react';
import { useMealEditorV3Store, MealItem } from '@/hooks/meal-editor-v3/useMealEditorV3Store';
import { MobileWeekTabs } from './MobileWeekTabs';
import { MobileMealCard } from './MobileMealCard';
import { MobileAddSheet, AddAction } from './MobileAddSheet';
import { FoodSelectionModal } from './FoodSelectionModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import {
  Plus, ChevronLeft, MoreHorizontal, Sparkles, Flame, Beef, Wheat, Droplet, Target,
  RefreshCw, Save, Zap, Dumbbell, Salad, Package, Settings2, ShieldCheck, Eraser, Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const DEFAULT_TIMES: Record<string, string> = {
  'café da manhã': '07:00',
  'lanche da manhã': '10:00',
  almoço: '13:00',
  'lanche da tarde': '16:00',
  jantar: '19:00',
  ceia: '21:30',
};

const GENERATION_OPTIONS = [
  { id: 'weight-loss', label: 'Emagrecimento' },
  { id: 'muscle-gain', label: 'Hipertrofia' },
  { id: 'low-carb', label: 'Low Carb' },
  { id: 'simple', label: 'Plano Equilibrado' },
];

export const MobileMealEditorV3: React.FC = () => {
  const navigate = useNavigate();
  const {
    meals, patientTargets, generateDeterministicPlan, planStatus,
    viewMode, setViewMode, activeDay, setActiveDay,
    resetPlan, optimizePlan, validateAndSave, fastMode, setFastMode,
    isPatientView, setPatientView
  } = useMealEditorV3Store();

  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [addModalMealId, setAddModalMealId] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<'quick' | 'search' | 'templates'>('search');
  const [substitutionTarget, setSubstitutionTarget] = useState<{
    mealId: string;
    item: MealItem;
  } | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);

  const totals = meals.reduce(
    (acc, m) => {
      m.items.forEach((i) => {
        acc.calories += i.calories * i.quantity;
        acc.protein += i.protein * i.quantity;
        acc.carbs += i.carbs * i.quantity;
        acc.fat += i.fat * i.quantity;
      });
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const targets = patientTargets || { calories: 2000, protein: 150, carbs: 200, fat: 60 };

  const handleAddAction = (action: AddAction) => {
    switch (action) {
      case 'add-food':
        setModalTab('search');
        setAddModalMealId(meals[1]?.id || meals[0]?.id);
        break;
      case 'add-marmita':
        setModalTab('templates');
        setAddModalMealId(meals.find((m) => m.name.toLowerCase() === 'almoço')?.id || meals[0]?.id);
        break;
      case 'generate-ai':
        setGenerateOpen(true);
        break;
      case 'new-meal':
        toast.info('Use o painel desktop para criar refeições adicionais');
        break;
      case 'apply-template':
        toast.info('Abra a aba Templates no modo desktop');
        break;
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100dvh-4rem)] bg-background">
      {/* Top bar compacto */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-lg text-muted-foreground hover:bg-muted active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold">Plano Alimentar</h1>
            {planStatus === 'validated' && (
              <Badge className="bg-emerald-500/15 text-emerald-600 border-none text-[9px] font-bold uppercase">
                Publicado
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-9 px-2 text-muted-foreground hover:text-orange-500 rounded-xl font-bold text-[10px]"
              onClick={() => {
                setModalTab('templates');
                setAddModalMealId(meals[0]?.id || 'default');
              }}
            >
              <Package className="w-3.5 h-3.5 mr-1" />
              MARMITAS
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-9 px-2 text-muted-foreground hover:text-primary rounded-xl font-bold text-[10px]"
              onClick={() => {
                setModalTab('search');
                setAddModalMealId(meals[0]?.id || 'default');
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              BUSCAR
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 -mr-2 rounded-lg text-muted-foreground hover:bg-muted active:scale-95 transition-transform">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-2xl border-none bg-background/95 backdrop-blur-xl">
                <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 py-2">
                  Ferramentas V3
                </DropdownMenuLabel>
                
                <DropdownMenuItem onClick={() => setGenerateOpen(true)} className="rounded-xl py-2.5 px-3 focus:bg-primary/5 focus:text-primary cursor-pointer">
                  <Zap className="w-4 h-4 mr-3 text-primary" />
                  <span className="text-xs font-bold">Gerar Plano IA</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => { optimizePlan(); toast.success('Otimizado clinicamente'); }} className="rounded-xl py-2.5 px-3 focus:bg-purple-500/5 focus:text-purple-600 cursor-pointer">
                  <Sparkles className="w-4 h-4 mr-3 text-purple-500" />
                  <span className="text-xs font-bold">Otimizar Plano</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1 bg-border/50" />
                
                <DropdownMenuItem onClick={() => setFastMode(!fastMode)} className="rounded-xl py-2.5 px-3 cursor-pointer">
                  <Settings2 className={cn("w-4 h-4 mr-3", fastMode ? "text-primary" : "text-muted-foreground")} />
                  <span className="text-xs font-bold">{fastMode ? "Desativar" : "Ativar"} Modo Rápido</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => setPatientView(!isPatientView)} className="rounded-xl py-2.5 px-3 cursor-pointer">
                  <ShieldCheck className={cn("w-4 h-4 mr-3", isPatientView ? "text-emerald-500" : "text-muted-foreground")} />
                  <span className="text-xs font-bold">{isPatientView ? "Sair da" : "Ver como"} Paciente</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1 bg-border/50" />

                <DropdownMenuItem onClick={async () => { 
                  const ok = await validateAndSave(); 
                  if (ok) toast.success('Plano salvo!'); 
                }} className="rounded-xl py-2.5 px-3 focus:bg-primary focus:text-white cursor-pointer">
                  <Save className="w-4 h-4 mr-3" />
                  <span className="text-xs font-bold">Salvar Plano</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => { resetPlan(); toast.info('Plano limpo'); }} className="rounded-xl py-2.5 px-3 focus:bg-destructive/5 focus:text-destructive cursor-pointer">
                  <Eraser className="w-4 h-4 mr-3 text-destructive" />
                  <span className="text-xs font-bold text-destructive">Limpar Tudo</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Macros chips */}
        <div className="px-4 pb-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <MacroChip
            icon={Flame}
            value={Math.round(totals.calories)}
            unit="kcal"
            label=""
            color="text-orange-500"
          />
          <MacroChip
            icon={Beef}
            value={Math.round(totals.protein)}
            unit="g"
            label="proteínas"
            color="text-blue-500"
          />
          <MacroChip
            icon={Wheat}
            value={Math.round(totals.carbs)}
            unit="g"
            label="carboidratos"
            color="text-emerald-500"
          />
          <MacroChip
            icon={Droplet}
            value={Math.round(totals.fat)}
            unit="g"
            label="gorduras"
            color="text-amber-500"
          />
        </div>

        {/* Tabs Dia/Semana + Dias */}
        <div className="px-4 pb-3 space-y-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'day' | 'week')}>
            <TabsList className="grid grid-cols-2 w-full h-8 bg-muted/50">
              <TabsTrigger value="day" className="text-[11px] font-bold h-6">
                Modo Dia
              </TabsTrigger>
              <TabsTrigger value="week" className="text-[11px] font-bold h-6">
                Modo Semana
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <MobileWeekTabs activeDay={activeDay} onChange={setActiveDay} />
        </div>
      </header>

      {/* Lista de refeições */}
      <main className="flex-1 px-4 py-4 space-y-3 pb-32">
        {viewMode === 'week' && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-[11px] text-primary font-semibold">
            <Sparkles className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
            Modo Semana — visualizando substituições do plano vigente. Não gera novos planos.
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {meals.map((meal, idx) => (
            <motion.div
              key={meal.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
            >
              <MobileMealCard
                meal={meal}
                defaultTime={DEFAULT_TIMES[meal.name.toLowerCase()]}
                weekMode={viewMode === 'week'}
                activeDayId={activeDay}
                onAddItem={(mealId) => setAddModalMealId(mealId)}
                onEditItem={(mealId) => setAddModalMealId(mealId)}
                onSubstituteItem={(mealId, item) =>
                  setSubstitutionTarget({ mealId, item })
                }
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Footer de progresso */}
        <div className="rounded-2xl border bg-card px-4 py-3 mt-2">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Meta calórica
            </p>
            <p className="text-[11px] font-bold tabular-nums">
              {Math.round(totals.calories)} / {targets.calories} kcal
            </p>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all',
                Math.abs(totals.calories - targets.calories) / targets.calories < 0.05
                  ? 'bg-emerald-500'
                  : 'bg-primary'
              )}
              style={{
                width: `${Math.min((totals.calories / targets.calories) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      </main>

      {/* FAB */}
      <button
        onClick={() => setAddSheetOpen(true)}
        aria-label="Adicionar"
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Sheets / Modais */}
      <MobileAddSheet
        open={addSheetOpen}
        onOpenChange={setAddSheetOpen}
        onSelect={handleAddAction}
      />

      {addModalMealId && (
        <FoodSelectionModal
          isOpen={!!addModalMealId}
          onClose={() => setAddModalMealId(null)}
          mealId={addModalMealId}
          defaultTab={modalTab}
        />
      )}

      {substitutionTarget && (
        <FoodSelectionModal
          isOpen={!!substitutionTarget}
          onClose={() => setSubstitutionTarget(null)}
          mealId={substitutionTarget.mealId}
          onSelect={(food) => {
            useMealEditorV3Store
              .getState()
              .addSubstitution(substitutionTarget.mealId, substitutionTarget.item.instanceId, food);
            toast.success('Substituição adicionada');
            setSubstitutionTarget(null);
          }}
        />
      )}

      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Gerar Plano Inteligente
            </DialogTitle>
            <DialogDescription className="text-xs">
              Motor clínico determinístico FitJourney baseado em anamnese, objetivo, restrições e
              preferências.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 pt-2">
            {GENERATION_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={async () => {
                  await generateDeterministicPlan(opt.id);
                  setGenerateOpen(false);
                  toast.success('Plano gerado pelo motor FitJourney');
                }}
                className="p-4 rounded-xl border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left"
              >
                <Target className="w-4 h-4 text-primary mb-2" />
                <p className="text-xs font-bold">{opt.label}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const MacroChip: React.FC<{
  icon: any;
  value: number;
  unit: string;
  label: string;
  color: string;
}> = ({ icon: Icon, value, unit, label, color }) => (
  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-muted/40 flex-shrink-0">
    <Icon className={cn('w-3.5 h-3.5', color)} />
    <div className="flex items-baseline gap-0.5">
      <span className="text-xs font-bold tabular-nums">{value}</span>
      <span className="text-[9px] font-bold text-muted-foreground">{unit}</span>
    </div>
    {label && (
      <span className="text-[9px] font-semibold text-muted-foreground hidden sm:inline">
        {label}
      </span>
    )}
  </div>
);
