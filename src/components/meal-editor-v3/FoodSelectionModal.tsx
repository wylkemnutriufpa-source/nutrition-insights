import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Zap, LayoutTemplate, Package, Plus, History, Star, PlusCircle, X, Loader2 } from 'lucide-react';
import { QUICK_FOODS, MARMITAS } from '@/hooks/meal-editor-v3/constants';
import { useMealEditorV3Store, Food } from '@/hooks/meal-editor-v3/useMealEditorV3Store';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface FoodSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  mealId: string;
  onSelect?: (food: Food) => void;
  defaultTab?: 'quick' | 'search' | 'templates';
}

export const FoodSelectionModal: React.FC<FoodSelectionModalProps> = ({ isOpen, onClose, mealId, onSelect, defaultTab = 'quick' }) => {
  const { addFoodToMeal, meals } = useMealEditorV3Store();
  const [searchQuery, setSearchQuery] = useState('');
  const [dbResults, setDbResults] = useState<Food[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<Food[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedForBatch, setSelectedForBatch] = useState<Food[]>([]);

  useEffect(() => {
    const fetchDbFoods = async () => {
      if (searchQuery.length < 2) {
        setDbResults([]);
        return;
      }
      
      setIsLoading(true);
      const { data, error } = await supabase
        .from('food_database')
        .select('*')
        .ilike('name', `%${searchQuery}%`)
        .limit(20);

      if (data && !error) {
        const formatted = data.map((f: any) => ({
          id: f.id,
          name: f.name,
          calories: Number(f.calories),
          protein: Number(f.protein),
          carbs: Number(f.carbs),
          fat: Number(f.fat),
          portionValue: parseFloat(f.serving_size) || 100,
          portionUnit: f.serving_size.replace(/[0-9.]/g, '') || 'g',
          category: f.category
        }));
        setDbResults(formatted);
      }
      setIsLoading(false);
    };

    const timer = setTimeout(fetchDbFoods, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setSelectedForBatch([]);
    }
  }, [isOpen]);

  const handleAdd = (food: Food) => {
    if (onSelect) {
      if (selectedForBatch.find(f => f.id === food.id)) {
        setSelectedForBatch(prev => prev.filter(f => f.id !== food.id));
      } else {
        setSelectedForBatch(prev => [...prev, food]);
      }
    } else {
      addFoodToMeal(mealId, food);
      // addFoodToMeal already handles toast and validation
    }
  };

  const confirmBatch = () => {
    if (onSelect && selectedForBatch.length > 0) {
      selectedForBatch.forEach(food => onSelect(food));
      toast.success(`${selectedForBatch.length} substituições adicionadas`);
      onClose();
    }
  };

  const filteredQuickFoods = QUICK_FOODS.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const list = searchQuery.length >= 2 ? dbResults : filteredQuickFoods;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, list.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, 0));
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (list.length > 0) {
        handleAdd(list[activeIndex]);
      }
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  useEffect(() => {
    setActiveIndex(0);
  }, [searchQuery]);

  const activeMeal = meals.find(m => m.id === mealId);
  const mealName = activeMeal?.name.toLowerCase() || "";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 overflow-hidden sm:rounded-2xl border-none shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b bg-background/80 backdrop-blur-md sticky top-0 z-10">
          <DialogTitle className="text-xl font-bold flex items-center justify-between w-full pr-8">
            <div className="flex items-center gap-2">
              {onSelect ? <Star className="w-5 h-5 text-yellow-500" /> : <PlusCircle className="w-5 h-5 text-primary" />}
              {onSelect ? 'Selecionar Substituições' : 'Adicionar Alimento'}
            </div>
            {onSelect && selectedForBatch.length > 0 && (
              <Button onClick={confirmBatch} size="sm" className="h-8 font-bold px-4">
                CONFIRMAR ({selectedForBatch.length})
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col">
          <div className="px-6 py-2 bg-muted/20 border-b overflow-x-auto no-scrollbar">
            <TabsList className="grid grid-cols-3 w-full max-w-md bg-transparent">
              <TabsTrigger value="search" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Search className="w-3.5 h-3.5 mr-2" />
                Busca (TACO/USDA)
              </TabsTrigger>
              <TabsTrigger value="quick" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Zap className="w-3.5 h-3.5 mr-2" />
                Rápido (Refeições Prontas)
              </TabsTrigger>
              <TabsTrigger value="templates" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <LayoutTemplate className="w-3.5 h-3.5 mr-2" />
                Marmitas
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden relative">
            <TabsContent value="search" className="h-full flex flex-col p-0 m-0">
              <div className="p-4 border-b bg-background/50 backdrop-blur-sm">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    ref={inputRef}
                    placeholder="Busca inteligente..." 
                    className="pl-10 h-12 bg-muted/30 border-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-all rounded-xl"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-muted-foreground font-medium pointer-events-none opacity-50">
                    <kbd className="px-1 border rounded bg-background">ENTER</kbd> Adicionar
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">
                  {history.length > 0 && !debouncedSearch && (
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                        <History className="w-3 h-3" />
                        Usados Recentemente
                      </h4>
                      <div className="grid gap-2">
                        {history.map(food => (
                          <FoodRow key={food.id} food={food} onAdd={() => handleAdd(food)} isRecent />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {debouncedSearch ? 'Resultados da Busca' : 'Sugestões para Você'}
                    </h4>
                    <div className="grid gap-2">
                      <AnimatePresence mode="popLayout">
                        {filteredQuickFoods.map((food, idx) => (
                          <motion.div
                            key={food.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.03 }}
                          >
                            <FoodRow 
                              food={food} 
                              onAdd={() => handleAdd(food)} 
                              isActive={idx === activeIndex}
                              isSelected={selectedForBatch.some(f => f.id === food.id)}
                            />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="quick" className="h-full m-0">
               <ScrollArea className="h-full p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-10">
                  {QUICK_FOODS.filter(f => !!f.imageUrl).map((food, idx) => (
                    <motion.div
                      key={food.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Card 
                        className="overflow-hidden cursor-pointer hover:border-primary transition-all group rounded-2xl border-muted/50 shadow-sm hover:shadow-xl"
                        onClick={() => handleAdd(food)}
                      >
                        <div className="aspect-[16/10] bg-muted relative">
                          <img src={food.imageUrl} alt={food.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                          <Badge className="absolute top-2 right-2 bg-primary border-none font-bold text-[9px] h-4">PRONTO</Badge>
                        </div>
                        <div className="p-3">
                          <h4 className="font-bold text-sm mb-1 line-clamp-1">{food.name}</h4>
                          <div className="flex gap-2 text-[9px] font-bold text-muted-foreground uppercase">
                            <span className="text-blue-500">{food.protein}g P</span>
                            <span className="text-green-500">{food.carbs}g C</span>
                            <span>{food.calories} kcal</span>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="templates" className="h-full p-6 m-0">
              <ScrollArea className="h-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-10">
                  {true ? (
                    MARMITAS.map((food, idx) => (
                      <motion.div
                        key={food.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <Card 
                          className="overflow-hidden cursor-pointer hover:border-primary transition-all group rounded-2xl border-muted/50 shadow-sm hover:shadow-xl"
                          onClick={() => handleAdd(food)}
                        >
                          <div className="aspect-[16/10] bg-muted relative">
                            {food.imageUrl ? (
                              <img src={food.imageUrl} alt={food.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted/50">
                                <Package className="w-8 h-8 opacity-20" />
                              </div>
                            )}
                            <Badge className="absolute top-2 right-2 bg-orange-500 border-none font-bold text-[9px] h-4">MARMITA</Badge>
                          </div>
                          <div className="p-3">
                            <h4 className="font-bold text-sm mb-1 line-clamp-1">{food.name}</h4>
                            <div className="flex gap-2 text-[9px] font-bold text-muted-foreground uppercase">
                              <span className="text-blue-500">{food.protein}g P</span>
                              <span className="text-green-500">{food.carbs}g C</span>
                              <span>{food.calories} kcal</span>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    ))
                  ) : null}
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

const FoodRow = ({ food, onAdd, isRecent, isActive, isSelected }: { food: Food, onAdd: () => void, isRecent?: boolean, isActive?: boolean, isSelected?: boolean }) => (
  <button 
    className={cn(
      "w-full flex items-center justify-between p-3.5 rounded-xl border bg-card hover:bg-accent transition-all text-left group hover:border-primary/20 hover:shadow-sm",
      isActive && "border-primary bg-primary/5 shadow-md ring-2 ring-primary/10",
      isSelected && "border-primary bg-primary/10 shadow-inner"
    )}
    onClick={onAdd}
  >
    <div className="flex items-center gap-3">
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
        isRecent ? "bg-amber-100 text-amber-600" : (isSelected ? "bg-primary text-white" : "bg-muted group-hover:bg-primary/10 group-hover:text-primary")
      )}>
        {isSelected ? <PlusCircle className="w-4 h-4" /> : (isRecent ? <History className="w-4 h-4" /> : <Package className="w-4 h-4" />)}
      </div>
      <div>
        <h4 className="font-bold text-sm leading-none mb-1">{food.name}</h4>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium uppercase">
          <span>{food.portionValue}{food.portionUnit}</span>
          <span className="opacity-30">•</span>
          <span className="text-primary font-bold">{food.calories} kcal</span>
          <span className="opacity-30">•</span>
          <span className="text-blue-500">{food.protein}g P</span>
        </div>
      </div>
    </div>
    <div className={cn(
      "h-7 w-7 rounded-full flex items-center justify-center transition-all",
      isSelected ? "bg-primary text-white" : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
    )}>
      {isSelected ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
    </div>
  </button>
);
