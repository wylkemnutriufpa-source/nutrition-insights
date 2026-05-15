
import React, { useState } from 'react';
import { Clock, Plus, Trash2, Utensils } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Meal, Food } from '../types/types';
import { FoodItemRow } from './FoodItemRow';
import { FoodSearch } from './FoodSearch';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";

interface MealCardProps {
  meal: Meal;
  onUpdateQuantity: (itemInstanceId: string, newQty: number) => void;
  onUpdateMacros: (itemInstanceId: string, val: number, type: 'kcal' | 'protein' | 'carbs' | 'fat') => void;
  onRemoveFood: (itemInstanceId: string) => void;

  onAddFood: (food: Food) => void;
  onRemoveMeal: () => void;
}

export const MealCard: React.FC<MealCardProps> = ({ 
  meal, onUpdateQuantity, onUpdateMacros, onRemoveFood, onAddFood, onRemoveMeal 
}) => {

  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const mealTotals = meal.items.reduce((acc, item) => {
    acc.kcal += item.kcal || 0;
    acc.protein += item.protein || 0;
    acc.carbs += item.carbs || 0;
    acc.fat += item.fat || 0;
    return acc;
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });

  return (
    <div className="bg-neutral-900/60 border border-white/5 rounded-[3rem] overflow-hidden backdrop-blur-2xl group/meal hover:bg-neutral-900/80 hover:border-emerald-500/30 hover:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]">
      {/* Header */}
      <div className="p-10 border-b border-white/5 flex items-center justify-between bg-gradient-to-b from-white/[0.02] to-transparent">
        <div className="flex items-center gap-8">
          <div className="w-16 h-16 rounded-[2rem] bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 group-hover/meal:scale-105 group-hover/meal:bg-emerald-500/20 group-hover/meal:border-emerald-500/40 transition-all duration-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]">
            <Utensils className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white group-hover/meal:text-emerald-400 transition-colors duration-500">
              {meal.name}
            </h3>
            <div className="flex items-center gap-2.5 mt-1.5">
              <Clock className="w-3.5 h-3.5 text-white/20" />
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/20">{meal.time || '08:00'}</span>
              <div className="w-1 h-1 rounded-full bg-white/10" />
              <Badge variant="outline" className="text-[8px] uppercase font-black border-white/10 text-white/30 px-2 py-0">Refeição Principal</Badge>
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
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemoveMeal}
            className="h-10 w-10 text-white/10 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all opacity-0 group-hover/meal:opacity-100"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Items */}
      <div className="p-8 space-y-4">
        {meal.items.length > 0 ? (
          meal.items.map((item) => (
            <FoodItemRow 
              key={item.instanceId} 
              item={item} 
              onUpdateQuantity={(qty) => onUpdateQuantity(item.instanceId, qty)}
              onUpdateMacros={(val, type) => onUpdateMacros(item.instanceId, val, type)}
              onRemove={() => onRemoveFood(item.instanceId)}
            />

          ))
        ) : (
          <div className="py-10 text-center border-2 border-dashed border-white/5 rounded-2xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Refeição Vazia</p>
          </div>
        )}

        {/* Add Food Trigger */}
        <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full h-16 bg-white/[0.01] border-dashed border-white/5 hover:bg-emerald-500/[0.03] hover:border-emerald-500/30 text-white/10 hover:text-emerald-400 rounded-2xl transition-all mt-4 group/add"
            >
              <Plus className="w-5 h-5 mr-2 group-hover/add:scale-125 transition-transform" />
              <span className="uppercase text-[10px] font-black tracking-widest">Adicionar Alimento Real</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-neutral-950 border-white/10 text-white max-w-lg rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase italic tracking-tighter">Biblioteca Soberana</DialogTitle>
            </DialogHeader>
            <FoodSearch 
              mealSlot={meal.name}
              onSelect={(food) => {
                onAddFood(food);
                setIsSearchOpen(false);
              }} 
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Footer Macros */}
      <div className="px-6 py-4 bg-white/[0.01] border-t border-white/5 grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-xs font-black text-emerald-500">{Math.round(mealTotals.protein)}g</p>
          <p className="text-[8px] uppercase font-black tracking-widest text-white/20">Prot</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-black text-blue-400">{Math.round(mealTotals.carbs)}g</p>
          <p className="text-[8px] uppercase font-black tracking-widest text-white/20">Carb</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-black text-amber-400">{Math.round(mealTotals.fat)}g</p>
          <p className="text-[8px] uppercase font-black tracking-widest text-white/20">Gord</p>
        </div>
      </div>
    </div>
  );
};
