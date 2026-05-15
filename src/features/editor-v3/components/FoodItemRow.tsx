
import React from 'react';
import { Trash2, ChevronRight, Info } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MealItem } from '../types/types';
import { cn } from '@/lib/utils';

interface FoodItemRowProps {
  item: MealItem;
  onUpdateQuantity: (newQty: number) => void;
  onRemove: () => void;
}

export const FoodItemRow: React.FC<FoodItemRowProps> = ({ item, onUpdateQuantity, onRemove }) => {
  return (
    <div className="group relative flex flex-col p-4 bg-white/5 border border-white/5 rounded-2xl hover:border-white/10 transition-all">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex-1">
          <h4 className="text-sm font-black uppercase italic tracking-tight text-white/90 group-hover:text-emerald-400 transition-colors">
            {item.name}
          </h4>
          <div className="flex gap-2 mt-1">
            <Badge variant="outline" className="text-[8px] uppercase font-black bg-white/5 border-white/5 text-white/40">
              {Math.round(item.kcal || 0)} kcal
            </Badge>
            <Badge variant="outline" className="text-[8px] uppercase font-black bg-white/5 border-white/5 text-white/40">
              {Math.round(item.protein || 0)}g P
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-24">
            <Input
              type="number"
              value={item.clinical_mass_g || item.quantity || 0}
              onChange={(e) => onUpdateQuantity(Number(e.target.value))}
              className="bg-neutral-900 border-white/10 text-right pr-6 h-9 font-black text-xs rounded-lg focus:ring-emerald-500/50"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase text-white/20">g</span>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-9 w-9 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Substituições Dinâmicas */}
      {item.substitutions && item.substitutions.length > 0 && (
        <div className="mt-2 pt-2 border-t border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <ChevronRight className="w-3 h-3 text-emerald-500" />
            <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Equivalentes Proporcionais</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {item.substitutions.map((sub, idx) => (
              <div 
                key={idx}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/5 text-[9px] font-bold text-white/60"
              >
                <span>{sub.name}</span>
                <span className="text-emerald-500">{(sub as any).clinical_mass_g || sub.portionValue || 100}g</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
