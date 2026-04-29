import React from 'react';
import { useMealEditorV3Store } from '@/hooks/meal-editor-v3/useMealEditorV3Store';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Utensils, Clock, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const DAYS = [
  { id: 'mon', label: 'Segunda' },
  { id: 'tue', label: 'Terça' },
  { id: 'wed', label: 'Quarta' },
  { id: 'thu', label: 'Quinta' },
  { id: 'fri', label: 'Sexta' },
  { id: 'sat', label: 'Sábado' },
  { id: 'sun', label: 'Domingo' },
];

export const WeeklyGridView: React.FC = () => {
  const { meals, setActiveDay, setViewMode } = useMealEditorV3Store();

  const handleDayClick = (dayId: string) => {
    setActiveDay(dayId);
    setViewMode('day');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
      {DAYS.map((day, idx) => (
        <motion.div
          key={day.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
        >
          <Card 
            className="flex flex-col h-full bg-white dark:bg-[#0d0d0d] border-muted hover:border-primary/50 transition-all cursor-pointer group rounded-2xl overflow-hidden shadow-sm"
            onClick={() => handleDayClick(day.id)}
          >
            <div className="px-3 py-2 border-b bg-muted/20 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{day.label}</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            
            <div className="flex-1 p-2 space-y-2">
              {meals.slice(0, 4).map(meal => {
                const totalKcal = meal.items.reduce((acc, item) => {
                   const currentMeasure = item.householdMeasures?.find(m => m.unit === item.selectedUnit) || { unit: item.portionUnit, factor: 1 };
                   return acc + (item.calories * item.quantity * currentMeasure.factor);
                }, 0);
                
                return (
                  <div key={meal.id} className="p-1.5 rounded-lg bg-muted/10 border border-transparent group-hover:border-primary/5 transition-all">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[9px] font-bold truncate flex-1">{meal.name}</span>
                      <span className="text-[8px] font-black text-primary">{Math.round(totalKcal)}k</span>
                    </div>
                  </div>
                );
              })}
              {meals.length > 4 && (
                <p className="text-[8px] text-center text-muted-foreground font-bold">+{meals.length - 4} REFEIÇÕES</p>
              )}
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};