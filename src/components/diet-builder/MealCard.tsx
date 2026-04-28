import React, { useState } from 'react';
import { Plus, Trash2, Repeat, Save, ChevronDown, Utensils, Package, Lock } from 'lucide-react';
import { Meal, useDietStore, Food } from '@/stores/diet-builder/useDietStore';
import { Button } from '@/components/ui/button';
import { AddFoodModal } from './AddFoodModal';
import { MarmitaLibraryModal } from './MarmitaLibraryModal';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MealCardProps {
  meal: Meal;
}

const SUBSTITUTIONS: Record<string, Omit<Food, 'id'>[]> = {
  'Frango Grelhado': [
    { name: 'Carne Vermelha', calories: 220, protein: 28, carbs: 0, fat: 12 },
    { name: 'Peixe Grelhado', calories: 140, protein: 25, carbs: 0, fat: 3 },
    { name: 'Ovo Omelete', calories: 180, protein: 13, carbs: 2, fat: 14 },
  ],
  'Arroz Integral': [
    { name: 'Batata Doce', calories: 86, protein: 2, carbs: 20, fat: 0 },
    { name: 'Macarrão Integral', calories: 150, protein: 5, carbs: 30, fat: 1 },
    { name: 'Quinoa', calories: 120, protein: 4, carbs: 21, fat: 2 },
  ]
};

export const MealCard: React.FC<MealCardProps> = ({ meal }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMarmitaModalOpen, setIsMarmitaModalOpen] = useState(false);
  const { removeFood, replaceFood, saveAsTemplate } = useDietStore();

  const mealTotals = meal.items.reduce((acc, item) => ({
    calories: acc.calories + item.calories,
    protein: acc.protein + item.protein,
    carbs: acc.carbs + item.carbs,
    fat: acc.fat + item.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  return (
    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg">{meal.type}</h3>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {mealTotals.calories} kcal • {meal.items.length} itens
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {meal.items.length > 0 && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => saveAsTemplate(`${meal.type} personalizado`, meal.items)}
              className="rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
            >
              <Save className="w-4 h-4" />
            </Button>
          )}
          <Button 
            variant="outline"
            onClick={() => setIsMarmitaModalOpen(true)}
            className="rounded-xl border-emerald-200 text-emerald-600 hover:bg-emerald-50"
          >
            <Package className="w-4 h-4 mr-2" />
            Marmita
          </Button>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="rounded-xl bg-slate-900 hover:bg-emerald-600 text-white shadow-lg shadow-slate-200 transition-all px-4 py-2"
          >
            <Plus className="w-4 h-4 mr-2" />
            Alimento
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {meal.items.length > 0 ? (
          meal.items.map((item) => (
            <div 
              key={item.id} 
              className={`flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-transparent hover:border-slate-100 hover:bg-white transition-all group/item ${item.locked ? 'bg-emerald-50/30' : ''}`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">{item.name}</span>
                  {item.locked && <Lock className="w-3 h-3 text-emerald-500" />}
                  {SUBSTITUTIONS[item.name] && !item.locked && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 text-slate-300 hover:text-emerald-500 transition-colors">
                          <Repeat className="w-3 h-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="rounded-xl border-none shadow-xl">
                        <div className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3">Sugestões</div>
                        {SUBSTITUTIONS[item.name].map((sub, idx) => (
                          <DropdownMenuItem 
                            key={idx} 
                            onClick={() => replaceFood(meal.id, item.id, sub)}
                            className="rounded-lg cursor-pointer flex flex-col items-start px-3 py-2"
                          >
                            <span className="font-semibold text-sm">{sub.name}</span>
                            <span className="text-[10px] text-slate-500">{sub.calories} kcal • {sub.protein}g P</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  P: {item.protein}g • C: {item.carbs}g • G: {item.fat}g {item.locked && <span className="text-[10px] font-bold text-emerald-600 ml-2 uppercase">FIXO</span>}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-bold text-slate-900 text-sm">{item.calories} kcal</span>
                <button 
                  onClick={() => {
                    if (item.locked) {
                      toast.error("Marmitas não podem ser alteradas. Substitua a marmita inteira.");
                      return;
                    }
                    removeFood(meal.id, item.id);
                  }}
                  className={`p-2 transition-all ${item.locked ? 'text-slate-200 cursor-not-allowed' : 'text-slate-300 hover:text-red-500 opacity-0 group-hover/item:opacity-100'}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="py-10 border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center text-slate-300">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
              <Utensils className="w-6 h-6 opacity-20" />
            </div>
            <p className="text-sm font-medium">Nenhum alimento adicionado</p>
          </div>
        )}
      </div>

      <MarmitaLibraryModal
        isOpen={isMarmitaModalOpen}
        onClose={() => setIsMarmitaModalOpen(false)}
        mealId={meal.id}
      />
      <AddFoodModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        mealId={meal.id} 
      />
    </div>
  );
};
