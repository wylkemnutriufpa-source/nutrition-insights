import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Zap, LayoutTemplate, Package, Plus, History, Star, PlusCircle } from 'lucide-react';
import { QUICK_FOODS, MARMITAS } from '@/hooks/meal-editor-v3/constants';
import { useMealEditorV3Store, Food } from '@/hooks/meal-editor-v3/useMealEditorV3Store';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FoodSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  mealId: string;
  onSelect?: (food: Food) => void;
}

export const FoodSelectionModal: React.FC<FoodSelectionModalProps> = ({ isOpen, onClose, mealId, onSelect }) => {
  const { addFoodToMeal } = useMealEditorV3Store();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [history, setHistory] = useState<Food[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedForBatch, setSelectedForBatch] = useState<Food[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 150);
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
      // If onSelect is provided, we might want to batch select for substitutions
      if (selectedForBatch.find(f => f.id === food.id)) {
        setSelectedForBatch(prev => prev.filter(f => f.id !== food.id));
      } else {
        setSelectedForBatch(prev => [...prev, food]);
      }
    } else {
      addFoodToMeal(mealId, food);
      toast.success(`${food.name} adicionado`);
      
      setHistory(prev => {
        const filtered = prev.filter(f => f.id !== food.id);
        return [food, ...filtered].slice(0, 5);
      });
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
    f.name.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, filteredQuickFoods.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, 0));
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredQuickFoods.length > 0) {
        handleAdd(filteredQuickFoods[activeIndex]);
      }
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  useEffect(() => {
    setActiveIndex(0);
  }, [debouncedSearch]);

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

        <Tabs defaultValue="search" className="flex-1 flex flex-col">
          <div className="px-6 py-2 bg-muted/20 border-b overflow-x-auto no-scrollbar">
            <TabsList className="grid grid-cols-3 w-full max-w-md bg-transparent">
              <TabsTrigger value="search" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Search className="w-3.5 h-3.5 mr-2" />
                Busca
              </TabsTrigger>
              <TabsTrigger value="quick" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Zap className="w-3.5 h-3.5 mr-2" />
                Rápido
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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {QUICK_FOODS.slice(0, 12).map((food, idx) => (
                    <motion.div
                      key={food.id}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                    >
                      <Button 
                        variant="outline" 
                        className="h-24 w-full flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-all rounded-2xl border-muted/50 shadow-sm hover:shadow-md"
                        onClick={() => handleAdd(food)}
                      >
                        <span className="text-xs font-bold leading-tight px-2">{food.name}</span>
                        <Badge variant="secondary" className="text-[10px] font-bold bg-muted/50 border-none px-1.5 h-4">
                          {food.calories} kcal
                        </Badge>
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="templates" className="h-full p-6 m-0">
              <ScrollArea className="h-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-10">
                  {MARMITAS.map((food, idx) => (
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
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

const FoodRow = ({ food, onAdd, isRecent, isActive }: { food: Food, onAdd: () => void, isRecent?: boolean, isActive?: boolean }) => (
  <button 
    className={cn(
      "w-full flex items-center justify-between p-3.5 rounded-xl border bg-card hover:bg-accent transition-all text-left group hover:border-primary/20 hover:shadow-sm",
      isActive && "border-primary bg-primary/5 shadow-md ring-2 ring-primary/10"
    )}
    onClick={onAdd}
  >
    <div className="flex items-center gap-3">
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
        isRecent ? "bg-amber-100 text-amber-600" : "bg-muted group-hover:bg-primary/10 group-hover:text-primary"
      )}>
        {isRecent ? <History className="w-4 h-4" /> : <Package className="w-4 h-4" />}
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
    <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all">
      <Plus className="w-4 h-4" />
    </div>
  </button>
);
