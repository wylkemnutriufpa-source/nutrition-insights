import React, { useState, useEffect, useRef } from 'react';
import { useMealEditorV3Store, Food } from '@/hooks/meal-editor-v3/useMealEditorV3Store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, Trash2, SwitchCamera, Package, PlusCircle, X, 
  Copy, Eraser, Scale, Undo2, Redo2, Zap, MoreHorizontal
} from 'lucide-react';
import { FoodSelectionModal } from './FoodSelectionModal';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';

export const ActiveMealContent: React.FC = () => {
  const { 
    meals, activeMealId, removeFoodFromMeal, updateFoodQuantity, 
    addSubstitution, removeSubstitution, fastMode,
    undo, redo, clearMeal, duplicateMeal, balanceMacros,
    history, generateDeterministicPlan
  } = useMealEditorV3Store();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [substitutionModalData, setSubstitutionModalData] = useState<{ instanceId: string } | null>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);

  const activeMeal = meals.find((m) => m.id === activeMealId);

  useEffect(() => {
  }, [activeMealId]);

  if (!activeMeal) return null;

  const handleAddSubstitution = (instanceId: string, food: Food) => {
    addSubstitution(activeMeal.id, instanceId, food);
    setSubstitutionModalData(null);
    toast.success('Substituição adicionada');
  };

  const handleRemove = (id: string, name: string) => {
    removeFoodFromMeal(activeMeal.id, id);
    toast.error(`${name} removido`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{activeMeal.name}</h2>
          {!fastMode && <p className="text-muted-foreground text-sm">Gerencie os alimentos desta refeição</p>}
        </div>
        
        <div className="flex items-center gap-2">
          {!fastMode && (
            <div className="hidden md:flex items-center gap-1 bg-muted/30 p-1 rounded-xl border mr-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 text-[10px] font-bold px-3 hover:bg-background"
                onClick={() => duplicateMeal(activeMeal.id)}
              >
                <Copy className="w-3 h-3 mr-1.5" /> DUPLICAR
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 text-[10px] font-bold px-3 hover:bg-background"
                onClick={() => balanceMacros(activeMeal.id, 500)}
              >
                <Scale className="w-3 h-3 mr-1.5" /> BALANCEAR
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 text-[10px] font-bold px-3 hover:text-destructive hover:bg-destructive/5"
                onClick={() => clearMeal(activeMeal.id)}
              >
                <Eraser className="w-3 h-3 mr-1.5" /> LIMPAR
              </Button>
            </div>
          )}

          <div className="flex border rounded-xl overflow-hidden mr-1 bg-muted/30">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 border-r rounded-none hover:bg-background" 
              onClick={undo}
              disabled={history.past.length === 0}
            >
              <Undo2 className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 rounded-none hover:bg-background" 
              onClick={redo}
              disabled={history.future.length === 0}
            >
              <Redo2 className="w-4 h-4" />
            </Button>
          </div>

          <Button 
            ref={addBtnRef}
            onClick={() => setIsAddModalOpen(true)} 
            className="rounded-xl shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 ml-1 font-bold px-6"
          >
            <Plus className="w-4 h-4 mr-2" />
            ADICIONAR
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        <AnimatePresence mode="popLayout">
          {activeMeal.items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="flex flex-col items-center justify-center p-12 bg-muted/20 border-dashed">
                <Package className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground font-medium">Plano vazio. Como deseja começar?</p>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => generateDeterministicPlan('simple')} className="text-[10px] font-bold">
                    <Zap className="w-3 h-3 mr-1" /> GERAR PLANO BÁSICO
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(true)} className="text-[10px] font-bold">
                    <Plus className="w-3 h-3 mr-1" /> ADICIONAR CAFÉ PADRÃO
                  </Button>
                </div>
              </Card>
            </motion.div>
          ) : (
            activeMeal.items.map((item) => (
              <motion.div 
                key={item.instanceId} 
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-2"
              >
                <Card className="p-4 flex items-center gap-4 group hover:border-primary/50 transition-colors shadow-sm relative overflow-hidden">
                  {item.imageUrl && !fastMode && (
                    <div className="w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0 border">
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate text-sm">{item.name}</h3>
                      {item.isMarmita && (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200 text-[10px] h-4 uppercase tracking-tighter">
                          Marmita
                        </Badge>
                      )}
                    </div>
                    
                    {!fastMode && (
                      <div className="flex gap-3 text-[10px] text-muted-foreground uppercase font-medium">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                          {Math.round(item.protein * item.quantity)}g P
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                          {Math.round(item.carbs * item.quantity)}g C
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                          {Math.round(item.fat * item.quantity)}g G
                        </span>
                      </div>
                    )}
                    
                    <div className="mt-1 flex items-center gap-2">
                       <span className="text-foreground font-bold text-xs">
                        {Math.round(item.calories * item.quantity)} kcal
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => {
                          if (item.isMarmita) {
                            toast.error('Marmitas possuem composição fixa');
                            return;
                          }
                          updateFoodQuantity(activeMeal.id, item.instanceId, parseFloat(e.target.value) || 0);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addBtnRef.current?.focus();
                          }
                        }}
                        disabled={item.isMarmita}
                        className={cn(
                          "w-14 h-8 text-center text-xs font-bold",
                          item.isMarmita && "opacity-50 cursor-not-allowed bg-muted"
                        )}
                        min="0"
                        step="0.1"
                      />
                      <span className="text-[10px] text-muted-foreground w-8 truncate font-medium">{item.portionUnit}</span>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-primary rounded-full"
                        onClick={() => setSubstitutionModalData({ instanceId: item.instanceId })}
                      >
                        <PlusCircle className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-full"
                        onClick={() => handleRemove(item.instanceId, item.name)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>

                {(item.substitutions || []).length > 0 && (
                  <div className="ml-8 space-y-1">
                    {item.substitutions?.map((sub) => (
                      <motion.div 
                        key={sub.id} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between px-3 py-1 bg-muted/30 rounded-md border border-dashed text-[10px] text-muted-foreground"
                      >
                        <div className="flex items-center gap-2">
                          <span className="italic font-bold text-[8px] opacity-50">OU</span>
                          <span className="font-semibold">{sub.name}</span>
                          <span className="opacity-70">({sub.calories} kcal)</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-4 w-4 hover:text-destructive rounded-full p-0"
                          onClick={() => removeSubstitution(activeMeal.id, item.instanceId, sub.id)}
                        >
                          <X className="w-2.5 h-2.5" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <FoodSelectionModal 
        isOpen={isAddModalOpen || !!substitutionModalData} 
        onClose={() => {
          setIsAddModalOpen(false);
          setSubstitutionModalData(null);
          addBtnRef.current?.focus();
        }} 
        mealId={activeMeal.id}
        onSelect={substitutionModalData ? (food) => handleAddSubstitution(substitutionModalData.instanceId, food) : undefined}
      />
    </div>
  );
};
