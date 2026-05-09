
import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Minus, Plus, Settings2 } from 'lucide-react';
import { Meal } from '../types';
import { adjustPlan, PlanAdjustmentParams } from '../services/planAdjustmentService';
import { calculateItemMacros } from '@/lib/nutricore_v2/helpers';

interface PlanAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  meals: Meal[];
  onApply: (newMeals: Meal[]) => void;
  goalMetadata: {
    goalProtein?: number;
    goalCarbs?: number;
    goalFat?: number;
    goalCalories?: number;
  };
}

const PlanAdjustmentModal: React.FC<PlanAdjustmentModalProps> = ({
  isOpen,
  onClose,
  meals,
  onApply,
  goalMetadata
}) => {
  const [initialMeals, setInitialMeals] = useState<Meal[]>([]);
  
  // Current totals of ORIGINAL meals
  const originalTotals = useMemo(() => {
    if (initialMeals.length === 0) return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    return initialMeals.reduce((acc, meal) => {
      meal.items.forEach(item => {
        const macros = calculateItemMacros(item, item.quantity);
        acc.kcal += macros.kcal;
        acc.protein += macros.protein;
        acc.carbs += macros.carbs;
        acc.fat += macros.fat;
      });
      return acc;
    }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  }, [initialMeals]);

  const [params, setParams] = useState<PlanAdjustmentParams>({
    proteinTarget: 0,
    carbTarget: 0,
    fatTarget: 0,
    removeCarbsIntensity: 'none',
    removeCarbsMeals: ['Almoço', 'Jantar'],
    removeBeansOption: 'none'
  });

  // Snapshot initial meals when opened
  useEffect(() => {
    if (isOpen) {
      // Usar a versão atual de meals como base para o ajuste
      const currentMealsClone = JSON.parse(JSON.stringify(meals));
      setInitialMeals(currentMealsClone);
      
      const totals = currentMealsClone.reduce((acc: any, meal: Meal) => {
        meal.items.forEach(item => {
          const macros = calculateItemMacros(item, item.quantity);
          acc.kcal += macros.kcal;
          acc.protein += macros.protein;
          acc.carbs += macros.carbs;
          acc.fat += macros.fat;
        });
        return acc;
      }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });

      setParams({
        proteinTarget: Math.round(totals.protein),
        carbTarget: Math.round(totals.carbs),
        fatTarget: Math.round(totals.fat),
        removeCarbsIntensity: 'none',
        removeCarbsMeals: ['Almoço', 'Jantar'],
        removeBeansOption: 'none'
      });
    }
  }, [isOpen]);

  // Real-time preview: apply to initial snapshot
  useEffect(() => {
    if (isOpen && initialMeals.length > 0) {
      const adjustedMeals = adjustPlan(initialMeals, params);
      onApply(adjustedMeals);
    }
  }, [params, isOpen, initialMeals]);

  const updateParam = (key: keyof PlanAdjustmentParams, value: any) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const adjustNumeric = (key: 'proteinTarget' | 'carbTarget' | 'fatTarget', delta: number) => {
    setParams(prev => ({ ...prev, [key]: Math.max(0, prev[key] + delta) }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-neutral-900 border-white/10 text-white p-6 rounded-3xl shadow-2xl backdrop-blur-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mb-6">
          <div className="flex items-center gap-2 text-emerald-500 mb-1">
            <Settings2 className="w-5 h-5" />
            <DialogTitle className="text-lg font-black uppercase tracking-tight">⚙️ Ajustar Plano</DialogTitle>
          </div>
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Ajuste o plano em tempo real com base nas metas clínicas.</p>
        </DialogHeader>

        <div className="space-y-8">
          {/* Proteína */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-[10px] font-black text-white/60 uppercase tracking-widest">Ajustar Proteína</Label>
              <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                <span className="text-[10px] font-black text-emerald-500 uppercase">Meta: {goalMetadata.goalProtein || 0}g</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => adjustNumeric('proteinTarget', -5)}
                className="h-10 w-10 bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl"
              >
                <Minus size={16} />
              </Button>
              <div className="flex-1 bg-white/5 border border-white/10 rounded-xl h-10 flex items-center justify-center font-black text-lg">
                {params.proteinTarget}g
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => adjustNumeric('proteinTarget', 5)}
                className="h-10 w-10 bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl"
              >
                <Plus size={16} />
              </Button>
            </div>
            <p className="text-[10px] text-white/20 italic">
              Original: {Math.round(originalTotals.protein)}g → Novo: {params.proteinTarget}g
            </p>
          </div>

          {/* Carboidrato */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-[10px] font-black text-white/60 uppercase tracking-widest">Ajustar Carboidrato</Label>
              <div className="flex items-center gap-1.5 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20">
                <span className="text-[10px] font-black text-blue-500 uppercase">Meta: {goalMetadata.goalCarbs || 0}g</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => adjustNumeric('carbTarget', -10)}
                className="h-10 w-10 bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl"
              >
                <Minus size={16} />
              </Button>
              <div className="flex-1 bg-white/5 border border-white/10 rounded-xl h-10 flex items-center justify-center font-black text-lg">
                {params.carbTarget}g
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => adjustNumeric('carbTarget', 10)}
                className="h-10 w-10 bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl"
              >
                <Plus size={16} />
              </Button>
            </div>
            <p className="text-[10px] text-white/20 italic">
              Original: {Math.round(originalTotals.carbs)}g → Novo: {params.carbTarget}g
            </p>
          </div>

          {/* Lipídeos/Gordura */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-[10px] font-black text-white/60 uppercase tracking-widest">Ajustar Lipídeos/Gordura</Label>
              <div className="flex items-center gap-1.5 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                <span className="text-[10px] font-black text-amber-500 uppercase">Meta: {goalMetadata.goalFat || 0}g</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => adjustNumeric('fatTarget', -5)}
                className="h-10 w-10 bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl"
              >
                <Minus size={16} />
              </Button>
              <div className="flex-1 bg-white/5 border border-white/10 rounded-xl h-10 flex items-center justify-center font-black text-lg">
                {params.fatTarget}g
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => adjustNumeric('fatTarget', 5)}
                className="h-10 w-10 bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl"
              >
                <Plus size={16} />
              </Button>
            </div>
            <p className="text-[10px] text-white/20 italic">
              Original: {Math.round(originalTotals.fat)}g → Novo: {params.fatTarget}g
            </p>
          </div>

          {/* Retirar Carboidrato */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <Label className="text-[10px] font-black text-white/60 uppercase tracking-widest block">Retirar Carboidrato</Label>
            <RadioGroup 
              value={params.removeCarbsIntensity} 
              onValueChange={(val: any) => updateParam('removeCarbsIntensity', val)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="total" id="rc-total" className="border-white/20 text-emerald-500" />
                <Label htmlFor="rc-total" className="text-xs">Total</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="parcial" id="rc-parcial" className="border-white/20 text-emerald-500" />
                <Label htmlFor="rc-parcial" className="text-xs">Parcial</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="rc-none" className="border-white/20 text-emerald-500" />
                <Label htmlFor="rc-none" className="text-xs">Não retirar</Label>
              </div>
            </RadioGroup>

            <div className="flex flex-wrap gap-4 mt-2">
              {['Almoço', 'Jantar'].map(mealName => (
                <div key={mealName} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`check-${mealName}`}
                    checked={params.removeCarbsMeals.includes(mealName)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        updateParam('removeCarbsMeals', [...params.removeCarbsMeals, mealName]);
                      } else {
                        updateParam('removeCarbsMeals', params.removeCarbsMeals.filter(m => m !== mealName));
                      }
                    }}
                    className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:text-black"
                  />
                  <Label htmlFor={`check-${mealName}`} className="text-xs">{mealName}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Retirar Feijão */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <Label className="text-[10px] font-black text-white/60 uppercase tracking-widest block">Retirar Feijão</Label>
            <RadioGroup 
              value={params.removeBeansOption} 
              onValueChange={(val: any) => updateParam('removeBeansOption', val)}
              className="grid grid-cols-2 gap-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="total" id="rb-total" className="border-white/20 text-emerald-500" />
                <Label htmlFor="rb-total" className="text-xs">Total</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="almoco" id="rb-almoco" className="border-white/20 text-emerald-500" />
                <Label htmlFor="rb-almoco" className="text-xs">Só Almoço</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="jantar" id="rb-jantar" className="border-white/20 text-emerald-500" />
                <Label htmlFor="rb-jantar" className="text-xs">Só Jantar</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="rb-none" className="border-white/20 text-emerald-500" />
                <Label htmlFor="rb-none" className="text-xs">Não retirar</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className="mt-8 flex gap-3 sm:justify-center">
          <Button 
            onClick={onClose}
            className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest rounded-xl h-12"
          >
            Aplicar Ajustes
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              onApply(initialMeals);
              onClose();
            }}
            className="flex-1 border-white/10 bg-white/5 text-white hover:bg-white/10 rounded-xl h-12 uppercase font-black tracking-widest text-[10px]"
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PlanAdjustmentModal;
