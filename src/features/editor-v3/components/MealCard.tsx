
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
  onRemoveFood: (itemInstanceId: string) => void;
  onAddFood: (food: Food) => void;
  onRemoveMeal: () => void;
}

export const MealCard: React.FC<MealCardProps> = ({ 
  meal, onUpdateQuantity, onRemoveFood, onAddFood, onRemoveMeal 
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
    <div className="bg-neutral-900/50 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-sm group/meal">
      {/* Header */}
      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 group-hover/meal:scale-110 transition-transform">
            <Utensils className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black uppercase italic tracking-tighter text-white group-hover/meal:text-emerald-400 transition-colors">
              {meal.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <Clock className="w-3 h-3 text-white/30" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30">{meal.time || '00:00'}</span>
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
      <div className="p-6 space-y-3">
        {meal.items.length > 0 ? (
          meal.items.map((item) => (
            <FoodItemRow 
              key={item.instanceId} 
              item={item} 
              onUpdateQuantity={(qty) => onUpdateQuantity(item.instanceId, qty)}
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
              className="w-full h-14 bg-white/5 border-dashed border-white/10 hover:bg-white/10 hover:border-emerald-500/50 text-white/40 hover:text-emerald-400 rounded-2xl transition-all mt-4 group/add"
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
