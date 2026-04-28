import React, { useState } from 'react';
import { useMealEditorV3Store } from '@/hooks/meal-editor-v3/useMealEditorV3Store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, SwitchCamera, Info, Package } from 'lucide-react';
import { FoodSelectionModal } from './FoodSelectionModal';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const ActiveMealContent: React.FC = () => {
  const { meals, activeMealId, removeFoodFromMeal, updateFoodQuantity } = useMealEditorV3Store();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const activeMeal = meals.find((m) => m.id === activeMealId);

  if (!activeMeal) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{activeMeal.name}</h2>
          <p className="text-muted-foreground">Gerencie os alimentos desta refeição</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="rounded-full shadow-lg">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Alimento
        </Button>
      </div>

      <div className="grid gap-4">
        {activeMeal.items.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 bg-muted/20 border-dashed">
            <Package className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">Nenhum alimento adicionado ainda.</p>
            <p className="text-sm text-muted-foreground/70">Clique em adicionar para começar.</p>
          </Card>
        ) : (
          activeMeal.items.map((item) => (
            <Card key={item.instanceId} className="p-4 flex items-center gap-4 group hover:border-primary/50 transition-colors shadow-sm">
              {item.imageUrl && (
                <div className="w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold truncate">{item.name}</h3>
                  {item.isMarmita && (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200">
                      Marmita
                    </Badge>
                  )}
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    {Math.round(item.protein * item.quantity)}g P
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-400" />
                    {Math.round(item.carbs * item.quantity)}g C
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-yellow-400" />
                    {Math.round(item.fat * item.quantity)}g G
                  </span>
                  <span className="font-medium text-foreground ml-auto">
                    {Math.round(item.calories * item.quantity)} kcal
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateFoodQuantity(activeMeal.id, item.instanceId, parseFloat(e.target.value) || 0)}
                    disabled={item.isMarmita}
                    className="w-16 h-8 text-center"
                    min="0"
                    step="0.1"
                  />
                  <span className="text-sm text-muted-foreground w-12">{item.portionUnit}</span>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                    <SwitchCamera className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeFoodFromMeal(activeMeal.id, item.instanceId)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <FoodSelectionModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        mealId={activeMeal.id} 
      />
    </div>
  );
};
