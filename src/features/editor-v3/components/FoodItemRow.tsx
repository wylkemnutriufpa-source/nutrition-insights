
import React from 'react';
import { Trash2, ChevronRight, Flame, Target } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MealItem } from '../types/types';
import { cn } from '@/lib/utils';

interface FoodItemRowProps {
  item: MealItem;
  onUpdateQuantity: (newQty: number) => void;
  onUpdateMacros: (val: number, type: 'kcal' | 'protein' | 'carbs' | 'fat') => void;
  onRemove: () => void;
}

export const FoodItemRow: React.FC<FoodItemRowProps> = ({ item, onUpdateQuantity, onUpdateMacros, onRemove }) => {
  return (
    <div className="group relative flex flex-col p-5 bg-white/[0.03] border border-white/5 rounded-3xl hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-black uppercase italic tracking-tight text-white group-hover:text-emerald-400 transition-colors">
              {item.name}
            </h4>
            <Badge variant="outline" className="text-[7px] uppercase font-black bg-emerald-500/10 border-transparent text-emerald-500 px-1 py-0 h-3">Real Food</Badge>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-1">
              <Flame className="w-2.5 h-2.5 text-orange-500" />
              <input 
                type="number"
                value={Math.round(item.kcal || 0)}
                onChange={(e) => onUpdateMacros(Number(e.target.value), 'kcal')}
                className="bg-transparent border-none p-0 w-12 text-[10px] font-black text-white/60 focus:ring-0 focus:text-white transition-colors"
              />
              <span className="text-[8px] uppercase font-black text-white/20">kcal</span>
            </div>
            <div className="flex items-center gap-1">
              <Target className="w-2.5 h-2.5 text-emerald-500" />
              <input 
                type="number"
                value={Math.round(item.protein || 0)}
                onChange={(e) => onUpdateMacros(Number(e.target.value), 'protein')}
                className="bg-transparent border-none p-0 w-8 text-[10px] font-black text-white/60 focus:ring-0 focus:text-white transition-colors"
              />
              <span className="text-[8px] uppercase font-black text-white/20">g P</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500/20 flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-blue-500" />
              </div>
              <span className="text-[10px] font-black text-white/60">{Math.round(item.carbs || 0)}</span>
              <span className="text-[8px] uppercase font-black text-white/20">g C</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative group/qty">
            <Input
              type="number"
              value={item.clinical_mass_g || item.quantity || 0}
              onChange={(e) => onUpdateQuantity(Number(e.target.value))}
              className="bg-neutral-900 border-white/10 text-right pr-7 h-11 w-28 font-black text-sm rounded-xl focus:ring-emerald-500/50 hover:border-emerald-500/30 transition-all"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-white/20 group-hover/qty:text-emerald-500 transition-colors">g</span>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-11 w-11 text-white/10 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Substituições Dinâmicas Soberanas */}
      {item.substitutions && item.substitutions.length > 0 && (
        <div className="mt-2 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ChevronRight className="w-3 h-3 text-emerald-500" />
              <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Equivalentes Dinâmicos</span>
            </div>
            <Badge variant="outline" className="text-[7px] uppercase font-black border-white/10 text-white/20">Ajuste Proporcional Ativo</Badge>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {item.substitutions.map((sub, idx) => (
              <div 
                key={idx}
                className="flex flex-col p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/20 hover:bg-emerald-500/[0.02] transition-all group/sub"
              >
                <span className="text-[10px] font-bold text-white/60 truncate group-hover/sub:text-emerald-400 transition-colors">{sub.name}</span>
                <span className="text-[11px] font-black text-white mt-1">
                  {(sub as any).clinical_mass_g || sub.portionValue || 100}
                  <span className="text-[8px] uppercase ml-1 opacity-30">g</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
