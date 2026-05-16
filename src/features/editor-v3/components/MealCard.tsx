
import React, { useState } from 'react';
import { Clock, Plus, Trash2, Utensils, Search } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Meal, Food, MealItem } from '../types/types';
import { FoodItemRow } from './FoodItemRow';
import { FoodSearch } from './FoodSearch';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MealCardProps {
  meal: Meal;
  onUpdateQuantity: (itemInstanceId: string, newQty: number) => void;
  onUpdateMacros: (itemInstanceId: string, val: number, type: 'kcal' | 'protein' | 'carbs' | 'fat') => void;
  onRemoveFood: (itemInstanceId: string) => void;
  onAddFood: (food: Food) => void;
  onRemoveMeal: () => void;
  onAddSubstitution: (itemInstanceId: string, food: Food) => void;
  onUpdateMealHeader: (updates: Partial<Meal>) => void;
  onUpdateFoodName?: (itemInstanceId: string, name: string) => void;
}

export const MealCard: React.FC<MealCardProps> = ({ 
  meal, onUpdateQuantity, onUpdateMacros, onRemoveFood, onAddFood, onRemoveMeal, onAddSubstitution, onUpdateMealHeader, onUpdateFoodName 
}) => {

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeItemForSub, setActiveItemForSub] = useState<MealItem | null>(null);

  const mealTotals = meal.items.reduce((acc, item) => {
    acc.kcal += item.kcal || 0;
    acc.protein += item.protein || 0;
    acc.carbs += item.carbs || 0;
    acc.fat += item.fat || 0;
    return acc;
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="bg-neutral-900/60 border border-white/5 rounded-[2rem] overflow-hidden backdrop-blur-2xl group/meal hover:bg-neutral-900/80 hover:border-emerald-500/30 transition-all duration-500 cursor-pointer focus:ring-2 focus:ring-emerald-500/50">
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-b from-white/[0.02] to-transparent">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 group-hover/meal:scale-105 transition-all shadow-inner">
                <Utensils className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase italic tracking-tighter text-white group-hover/meal:text-emerald-400 transition-colors duration-300">
                  {meal.name}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <Clock className="w-3 h-3 text-white/20" />
                  <span className="text-[9px] font-black uppercase tracking-[0.1em] text-white/20">{meal.time || '08:00'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-xl font-black italic text-white leading-none">
                  {Math.round(mealTotals.kcal)}
                  <span className="text-[10px] uppercase ml-1 opacity-30">kcal</span>
                </p>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 mt-1">Total Refeição</p>
              </div>
              
              <div className="h-10 w-10 flex items-center justify-center text-white/40 opacity-0 group-hover/meal:opacity-100 transition-all">
                <Plus className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Quick View Items */}
          <div className="p-6 space-y-1">
            {meal.items.slice(0, 4).map((item) => (
              <div key={item.instanceId} className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-white/40">
                <span className="truncate pr-4">{item.name}</span>
                <span className="flex-shrink-0">{Math.round(item.kcal)} kcal</span>
              </div>
            ))}
            {meal.items.length > 4 && (
              <p className="text-[8px] font-black text-emerald-500/50 mt-1 uppercase tracking-widest">+{meal.items.length - 4} itens</p>
            )}
            {meal.items.length === 0 && (
              <p className="text-[9px] font-black uppercase tracking-widest text-white/10 py-2 text-center">Refeição Vazia</p>
            )}
          </div>

          {/* Footer Macros */}
          <div className="px-6 py-4 bg-white/[0.01] border-t border-white/5 grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xs font-black text-emerald-500">{Math.round(mealTotals.protein)}g</p>
              <p className="text-[7px] uppercase font-black text-white/10">Prot</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-black text-blue-400">{Math.round(mealTotals.carbs)}g</p>
              <p className="text-[7px] uppercase font-black text-white/10">Carb</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-black text-amber-400">{Math.round(mealTotals.fat)}g</p>
              <p className="text-[7px] uppercase font-black text-white/10">Gord</p>
            </div>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-4xl bg-neutral-950 border-white/10 text-white rounded-[1.5rem] p-0 overflow-hidden shadow-2xl">
        {/* Header Modal */}
        <div className="p-4 border-b border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
              <Utensils className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <input
                type="text"
                value={meal.name}
                onChange={(e) => onUpdateMealHeader({ name: e.target.value })}
                className="bg-transparent border-none p-0 text-base font-black uppercase italic tracking-tighter text-white focus:ring-0 focus:text-emerald-400 transition-colors w-full sm:w-64"
                placeholder="Nome da Refeição"
              />
              <div className="flex items-center gap-2 mt-0.5">
                <Clock className="w-3 h-3 text-white/20" />
                <input
                  type="time"
                  value={meal.time || "08:00"}
                  onChange={(e) => onUpdateMealHeader({ time: e.target.value })}
                  className="bg-transparent border-none p-0 text-[10px] font-black uppercase tracking-widest text-emerald-500/60 focus:ring-0 focus:text-emerald-400 transition-colors"
                />
              </div>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-2xl md:text-3xl font-black italic text-white leading-none">
              {Math.round(mealTotals.kcal)}
              <span className="text-xs uppercase ml-1 opacity-30 font-bold">kcal</span>
            </p>
          </div>
        </div>

        {/* Content Modal */}
        <ScrollArea className="max-h-[60vh] p-4 md:p-6">
          <div className="space-y-4">
            {meal.items.length > 0 ? (
              meal.items.map((item) => (
                <FoodItemRow 
                  key={item.instanceId} 
                  item={item} 
                  onUpdateQuantity={(qty) => onUpdateQuantity(item.instanceId, qty)}
                  onUpdateMacros={(val, type) => onUpdateMacros(item.instanceId, val, type)}
                  onRemove={() => onRemoveFood(item.instanceId)}
                  onUpdateName={onUpdateFoodName ? (name) => onUpdateFoodName(item.instanceId, name) : undefined}
                  onRequestSubstitution={() => {
                    setActiveItemForSub(item);
                    setIsSearchOpen(true);
                  }}
                />
              ))
            ) : (
              <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[2.5rem] bg-white/[0.01]">
                <p className="text-[11px] font-black uppercase tracking-widest text-white/20">Nenhum alimento cadastrado nesta refeição</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer Modal */}
        <div className="p-4 md:p-6 border-t border-white/5 bg-neutral-900/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex gap-4 md:gap-6">
            <div className="text-center px-4 md:px-6 py-2 md:py-3 bg-white/5 rounded-2xl border border-white/5">
              <p className="text-base md:text-lg font-black text-emerald-500">{Math.round(mealTotals.protein)}g</p>
              <p className="text-[8px] uppercase font-black tracking-widest text-white/20">Proteína</p>
            </div>
            <div className="text-center px-6 py-3 bg-white/5 rounded-2xl border border-white/5">
              <p className="text-base md:text-lg font-black text-blue-400">{Math.round(mealTotals.carbs)}g</p>
              <p className="text-[8px] uppercase font-black tracking-widest text-white/20">Carbo</p>
            </div>
            <div className="text-center px-6 py-3 bg-white/5 rounded-2xl border border-white/5">
              <p className="text-base md:text-lg font-black text-amber-400">{Math.round(mealTotals.fat)}g</p>
              <p className="text-[8px] uppercase font-black tracking-widest text-white/20">Gordura</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button 
              onClick={() => {
                setActiveItemForSub(null);
                setIsSearchOpen(true);
              }}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest text-[10px] h-11 px-6 rounded-xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95"
            >
              <Plus className="w-5 h-5 mr-3" /> Adicionar Alimento
            </Button>

            <Button
              variant="outline"
              onClick={onRemoveMeal}
              className="h-11 w-11 border-red-500/20 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Common Search Dialog - Moved out of the row to avoid nesting */}
        <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
          <DialogContent className="bg-neutral-950 border-white/10 text-white max-w-lg rounded-[2rem] p-6 shadow-2xl">
            <DialogHeader className="mb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black uppercase italic tracking-tighter">
                    {activeItemForSub ? "Trocar Equivalentes" : "Biblioteca Soberana"}
                  </DialogTitle>
                  <p className="text-[10px] uppercase font-black tracking-widest text-white/20 mt-1">
                    FitJourney Clinical Editor v3
                  </p>
                </div>
              </div>
              
              {activeItemForSub && (
                <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-[9px] uppercase font-black text-emerald-500/60 mb-0.5">Substituindo item:</p>
                    <p className="text-sm font-black text-white">{activeItemForSub.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-white/40">{Math.round(activeItemForSub.kcal)} kcal</p>
                  </div>
                </div>
              )}
            </DialogHeader>
            <FoodSearch 
              mealSlot={activeItemForSub ? (activeItemForSub.category || meal.name) : meal.name}
              onSelect={(food) => {
                if (activeItemForSub) {
                  onAddSubstitution(activeItemForSub.instanceId, food);
                } else {
                  onAddFood(food);
                }
                setIsSearchOpen(false);
              }} 
            />
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};
