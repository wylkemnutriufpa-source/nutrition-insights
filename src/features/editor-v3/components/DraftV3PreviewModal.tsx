
import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  CheckCircle2, Loader2, Sparkles, AlertTriangle, 
  Clock, Flame, Utensils, Trash2, Plus, ArrowRight,
  PieChart, Coffee, Soup, Moon, Sun, ChevronRight
} from 'lucide-react';
import { Meal, MealItem } from '../types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DraftV3PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  draftMeals: Meal[];
  onApprove: (meals: Meal[]) => void;
  patientName: string;
}

export const DraftV3PreviewModal: React.FC<DraftV3PreviewModalProps> = ({
  isOpen, onClose, draftMeals, onApprove, patientName
}) => {
  const [localMeals, setLocalMeals] = useState<Meal[]>([]);
  const [isApproving, setIsApproving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalMeals(JSON.parse(JSON.stringify(draftMeals)));
    }
  }, [isOpen, draftMeals]);

  const handleUpdateQuantity = (mealId: string, itemInstanceId: string, newQty: number) => {
    setLocalMeals(prev => prev.map(m => {
      if (m.id !== mealId) return m;
      return {
        ...m,
        items: m.items.map(i => {
          if (i.instanceId !== itemInstanceId) return i;
          
          // Calculate new macros proportionally
          const ratio = newQty / (i.quantity || 1);
          return {
            ...i,
            quantity: newQty,
            kcal: (i.kcal || 0) * ratio,
            protein: (i.protein || 0) * ratio,
            carbs: (i.carbs || 0) * ratio,
            fat: (i.fat || 0) * ratio,
            clinical_mass_g: (i.measurementType === 'gram' || i.measurementType === 'ml') ? newQty : i.clinical_mass_g
          };
        })
      };
    }));
  };

  const handleRemoveItem = (mealId: string, itemInstanceId: string) => {
    setLocalMeals(prev => prev.map(m => {
      if (m.id !== mealId) return m;
      return {
        ...m,
        items: m.items.filter(i => i.instanceId !== itemInstanceId)
      };
    }));
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await onApprove(localMeals);
      onClose();
    } catch (err) {
      toast.error("Erro ao aprovar draft");
    } finally {
      setIsApproving(false);
    }
  };

  const totalKcal = localMeals.reduce((acc, m) => 
    acc + m.items.reduce((sum, i) => sum + (i.kcal || 0), 0), 0
  );

  const getMealIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('café') || n.includes('desjejum')) return <Coffee className="w-4 h-4" />;
    if (n.includes('almoço') || n.includes('jantar')) return <Soup className="w-4 h-4" />;
    if (n.includes('lanche')) return <Utensils className="w-4 h-4" />;
    if (n.includes('ceia')) return <Moon className="w-4 h-4" />;
    return <Sun className="w-4 h-4" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl bg-neutral-950 border-white/10 text-white p-0 overflow-hidden rounded-[2rem] shadow-2xl">
        <div className="flex flex-col h-[90vh] max-h-[900px]">
          {/* Header Soberano */}
          <DialogHeader className="p-8 border-b border-white/5 bg-neutral-900/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/20 rounded-2xl border border-emerald-500/20">
                  <Sparkles className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-black uppercase tracking-widest px-2">
                      Rascunho V3 Soberano
                    </Badge>
                    <span className="text-[10px] text-white/20 font-black uppercase tracking-widest">• Totalmente Editável</span>
                  </div>
                  <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter">
                    Revisar Plano: <span className="text-white/40">{patientName}</span>
                  </DialogTitle>
                </div>
              </div>

              <div className="flex items-center gap-6 bg-black/40 px-6 py-3 rounded-2xl border border-white/5">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-none mb-1">Total Meta</span>
                  <span className="text-xl font-black italic text-emerald-400">{Math.round(totalKcal)} <span className="text-xs opacity-50 not-italic uppercase">kcal</span></span>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-white/20 uppercase">Prot</span>
                    <span className="text-xs font-bold text-emerald-500/80">{Math.round(localMeals.reduce((acc, m) => acc + m.items.reduce((s, i) => s + (i.protein || 0), 0), 0))}g</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-white/20 uppercase">Carb</span>
                    <span className="text-xs font-bold text-blue-500/80">{Math.round(localMeals.reduce((acc, m) => acc + m.items.reduce((s, i) => s + (i.carbs || 0), 0), 0))}g</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-white/20 uppercase">Gord</span>
                    <span className="text-xs font-bold text-amber-500/80">{Math.round(localMeals.reduce((acc, m) => acc + m.items.reduce((s, i) => s + (i.fat || 0), 0), 0))}g</span>
                  </div>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-neutral-950">
            <ScrollArea className="flex-1 p-8">
              <div className="max-w-4xl mx-auto space-y-10">
                {(() => {
                  const days = Array.from(new Set(localMeals.map(m => m.day_of_week ?? 0))).sort((a, b) => a - b);
                  const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

                  return days.map(day => {
                    const mealsForDay = localMeals.filter(m => (m.day_of_week ?? 0) === day);
                    if (mealsForDay.length === 0) return null;

                    return (
                      <div key={day} className="space-y-6">
                        {days.length > 1 && (
                          <div className="flex items-center gap-3 px-4">
                            <div className="h-px flex-1 bg-white/5" />
                            <h2 className="text-xl font-black italic uppercase tracking-tighter text-emerald-400/60">
                              {dayNames[day]}
                            </h2>
                            <div className="h-px flex-1 bg-white/5" />
                          </div>
                        )}

                        <div className="space-y-6">
                          {mealsForDay.map((meal) => (
                            <div key={meal.id} className="group bg-neutral-900/40 border border-white/5 rounded-3xl overflow-hidden hover:border-emerald-500/20 transition-all">
                              <div className="p-5 border-b border-white/5 flex items-center justify-between bg-neutral-900/20">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-emerald-400">
                                    {getMealIcon(meal.name)}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <h3 className="text-lg font-black uppercase italic tracking-tight">{meal.name}</h3>
                                      <span className="text-[10px] font-black text-white/20 uppercase">{meal.time}</span>
                                    </div>
                                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                                      {meal.items.length} ITENS • {Math.round(meal.items.reduce((acc, i) => acc + (i.kcal || 0), 0))} KCAL
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="p-4 space-y-2">
                                {meal.items.map((item) => (
                                  <div key={item.instanceId} className="flex items-center gap-4 p-3 bg-black/20 border border-white/5 rounded-2xl hover:bg-black/40 transition-all group/item">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 overflow-hidden flex-shrink-0">
                                      {item.imageUrl ? (
                                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover opacity-80" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <Utensils className="w-4 h-4 text-white/10" />
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <h4 className="text-sm font-bold text-white uppercase truncate tracking-tight">{item.name}</h4>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] font-bold text-emerald-500/60 uppercase">{Math.round(item.kcal || 0)} kcal</span>
                                        <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">• {item.clinical_mass_g || item.quantity}{item.display_unit || item.portionUnitLabel || 'g'}</span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                      <div className="flex items-center bg-black/40 border border-white/10 rounded-xl overflow-hidden h-9">
                                        <Input 
                                          type="number"
                                          value={item.quantity || ''}
                                          onChange={(e) => handleUpdateQuantity(meal.id, item.instanceId, Number(e.target.value))}
                                          className="w-16 h-full bg-transparent border-none text-center text-xs font-black p-0 focus-visible:ring-0"
                                        />
                                        <div className="px-3 border-l border-white/10 flex items-center justify-center bg-white/5">
                                          <span className="text-[9px] font-black text-white/30 uppercase">{item.display_unit || item.portionUnitLabel || 'g'}</span>
                                        </div>
                                      </div>

                                      <Button 
                                        variant="ghost" 
                                        size="icon"
                                        onClick={() => handleRemoveItem(meal.id, item.instanceId)}
                                        className="h-9 w-9 rounded-xl hover:bg-rose-500/10 hover:text-rose-500 text-white/20 transition-all"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}

                                <Button 
                                  variant="ghost" 
                                  className="w-full h-10 border border-dashed border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/5 text-white/20 hover:text-emerald-500 text-[10px] font-black uppercase tracking-widest rounded-2xl gap-2 mt-2"
                                >
                                  <Plus className="w-3.5 h-3.5" /> Adicionar Item ao Bloco
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              <div className="max-w-4xl mx-auto mt-6">
                <div className="bg-amber-500/5 border border-amber-500/20 p-6 rounded-[2rem] flex gap-4">
                  <div className="p-3 bg-amber-500/20 rounded-2xl shrink-0 h-fit">
                    <AlertTriangle className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase italic text-amber-500 mb-1">Atenção Nutricional</h4>
                    <p className="text-xs text-white/50 leading-relaxed uppercase font-medium">
                      Este rascunho foi gerado dinamicamente via <span className="text-white font-bold">V3 Sandbox</span>. 
                      Verifique as porções e distribuições antes de aplicar ao prontuário do paciente.
                      A alteração de quantidades impacta o score nutricional global.
                    </p>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>

          <DialogFooter className="p-8 bg-neutral-900/50 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="flex flex-col">
                 <span className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-none mb-1">Status do Draft</span>
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-black uppercase text-white/80">Pronto para Validação</span>
                 </div>
               </div>
            </div>

            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={onClose}
                className="h-14 px-8 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/5 rounded-2xl"
              >
                Descartar Rascunho
              </Button>
              <Button 
                disabled={isApproving}
                onClick={handleApprove}
                className="h-14 px-12 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.2)] gap-3"
              >
                {isApproving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                Aprovar e Publicar Plano
                <ChevronRight className="w-4 h-4 opacity-30" />
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
