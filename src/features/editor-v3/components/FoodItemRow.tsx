
import React from 'react';
import { Trash2, ChevronRight, Flame, Target, Plus, Search } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MealItem, Food } from '../types/types';
import { cn } from '@/lib/utils';

interface FoodItemRowProps {
  item: MealItem;
  onUpdateQuantity: (newQty: number) => void;
  onUpdateMacros: (val: number, type: 'kcal' | 'protein' | 'carbs' | 'fat') => void;
  onRemove: () => void;
  onRequestSubstitution: () => void;
}

export const FoodItemRow: React.FC<FoodItemRowProps> = ({ 
  item, onUpdateQuantity, onUpdateMacros, onRemove, onRequestSubstitution 
}) => {
  return (
    <div className="group relative flex flex-col p-8 bg-neutral-800/20 border border-white/5 rounded-[2.5rem] hover:bg-neutral-800/40 hover:border-emerald-500/30 hover:shadow-2xl transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[40px] -mr-16 -mt-16 rounded-full group-hover:bg-emerald-500/10 transition-all duration-700" />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-6 relative z-10">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-3">
            <h4 className="text-xl font-black uppercase italic tracking-tighter text-white group-hover:text-emerald-400 transition-colors duration-500">
              {item.name}
            </h4>
            <Badge variant="outline" className="text-[8px] uppercase font-black bg-emerald-500/10 border-emerald-500/20 text-emerald-500 px-2 py-0.5 h-4 tracking-widest rounded-md">Alimento Real</Badge>
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
              className="bg-neutral-900/80 border-white/5 text-right pr-7 h-12 w-32 font-black text-base rounded-2xl focus:ring-emerald-500/30 hover:border-emerald-500/20 transition-all backdrop-blur-sm shadow-inner"
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
      <div className="mt-4 pt-6 border-t border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ChevronRight className="w-3 h-3 text-emerald-500" />
            <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Lista de Substituição</span>
          </div>
          
          <Button 
            variant="ghost" 
            onClick={onRequestSubstitution}
            className="h-7 px-3 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase tracking-widest rounded-lg"
          >
            <Search className="w-2.5 h-2.5 mr-1.5" /> Adicionar Substituto
          </Button>
        </div>
        
        {item.substitutions && item.substitutions.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {item.substitutions.map((sub, idx) => (
              <div 
                key={idx}
                className="flex flex-col p-3.5 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-emerald-500/20 hover:bg-emerald-500/[0.02] transition-all group/sub shadow-sm"
              >
                <span className="text-[10px] font-bold text-white/60 truncate group-hover/sub:text-emerald-400 transition-colors">{sub.name}</span>
                <span className="text-[11px] font-black text-white mt-1">
                  {Math.round((sub as any).clinical_mass_g || sub.portionValue || 100)}
                  <span className="text-[8px] uppercase ml-1 opacity-30">g</span>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center bg-white/[0.01] border border-dashed border-white/5 rounded-2xl">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/10 italic">Nenhum equivalente cadastrado</p>
          </div>
        )}
      </div>
    </div>
  );
};
