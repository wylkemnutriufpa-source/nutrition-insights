import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Zap, LayoutTemplate, Package, Plus } from 'lucide-react';
import { QUICK_FOODS, MARMITAS } from '@/hooks/meal-editor-v3/constants';
import { useMealEditorV3Store, Food } from '@/hooks/meal-editor-v3/useMealEditorV3Store';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FoodSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  mealId: string;
  onSelect?: (food: Food) => void;
}

export const FoodSelectionModal: React.FC<FoodSelectionModalProps> = ({ isOpen, onClose, mealId, onSelect }) => {
  const { addFoodToMeal } = useMealEditorV3Store();
  const [searchQuery, setSearchQuery] = useState('');

  const handleAdd = (food: Food) => {
    if (onSelect) {
      onSelect(food);
    } else {
      addFoodToMeal(mealId, food);
    }
  };

  const filteredQuickFoods = QUICK_FOODS.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>{onSelect ? 'Selecionar Substituição' : 'Adicionar Alimento'}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="search" className="flex-1 flex flex-col">
          <div className="px-6 py-2 bg-muted/20 border-b">
            <TabsList className="grid grid-cols-3 w-full max-w-md">
              <TabsTrigger value="search">
                <Search className="w-4 h-4 mr-2" />
                Busca
              </TabsTrigger>
              <TabsTrigger value="quick">
                <Zap className="w-4 h-4 mr-2" />
                Rápido
              </TabsTrigger>
              <TabsTrigger value="templates">
                <LayoutTemplate className="w-4 h-4 mr-2" />
                Marmitas
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="search" className="h-full flex flex-col p-0 m-0">
              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Busca inteligente (USDA + Custom)..." 
                    className="pl-10 h-12"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="grid gap-2">
                  {filteredQuickFoods.map(food => (
                    <FoodRow key={food.id} food={food} onAdd={() => handleAdd(food)} />
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="quick" className="h-full p-6 m-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {QUICK_FOODS.slice(0, 9).map(food => (
                  <Button 
                    key={food.id} 
                    variant="outline" 
                    className="h-24 flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-all"
                    onClick={() => handleAdd(food)}
                  >
                    <span className="text-xs font-semibold">{food.name}</span>
                    <span className="text-[10px] text-muted-foreground">{food.calories} kcal</span>
                  </Button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="templates" className="h-full p-6 m-0">
              <ScrollArea className="h-full">
                <div className="grid grid-cols-2 gap-4">
                  {MARMITAS.map(food => (
                    <Card 
                      key={food.id} 
                      className="overflow-hidden cursor-pointer hover:border-primary transition-all group"
                      onClick={() => handleAdd(food)}
                    >
                      <div className="aspect-video bg-muted relative">
                        {food.imageUrl ? (
                          <img src={food.imageUrl} alt={food.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Package className="w-8 h-8 opacity-20" />
                          </div>
                        )}
                        <Badge className="absolute top-2 right-2 bg-orange-500 hover:bg-orange-500">Marmita</Badge>
                      </div>
                      <div className="p-3">
                        <h4 className="font-semibold text-sm mb-1">{food.name}</h4>
                        <p className="text-[10px] text-muted-foreground">
                          {food.calories} kcal • {food.protein}g P • {food.carbs}g C • {food.fat}g G
                        </p>
                      </div>
                    </Card>
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

const FoodRow = ({ food, onAdd }: { food: Food, onAdd: () => void }) => (
  <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent transition-colors">
    <div>
      <h4 className="font-medium text-sm">{food.name}</h4>
      <p className="text-xs text-muted-foreground">
        {food.portionValue}{food.portionUnit} • {food.calories} kcal • {food.protein}g P • {food.carbs}g C • {food.fat}g G
      </p>
    </div>
    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground" onClick={onAdd}>
      <Plus className="w-4 h-4" />
    </Button>
  </div>
);
