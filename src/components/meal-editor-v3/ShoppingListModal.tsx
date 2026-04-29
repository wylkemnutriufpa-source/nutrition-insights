import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useMealEditorV3Store } from '@/hooks/meal-editor-v3/useMealEditorV3Store';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShoppingBag, CheckCircle2, Package } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ShoppingListModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { meals } = useMealEditorV3Store();
  const [checkedItems, setCheckedItems] = React.useState<Record<string, boolean>>({});

  // Agrupar alimentos por nome e somar quantidades
  const shoppingList = React.useMemo(() => {
    const list: Record<string, { name: string; quantity: number; unit: string }> = {};
    
    meals.forEach(meal => {
      meal.items.forEach(item => {
        const key = `${item.name}-${item.selectedUnit || item.portionUnit}`;
        if (list[key]) {
          list[key].quantity += item.quantity;
        } else {
          list[key] = {
            name: item.name,
            quantity: item.quantity,
            unit: item.selectedUnit || item.portionUnit
          };
        }
      });
    });
    
    return Object.values(list);
  }, [meals]);

  const toggleItem = (name: string) => {
    setCheckedItems(prev => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md h-[80vh] flex flex-col p-0 overflow-hidden sm:rounded-3xl border-none shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b bg-emerald-600 text-white">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <ShoppingBag className="w-6 h-6" />
            Lista de Compras
          </DialogTitle>
          <DialogDescription className="text-emerald-100 text-xs font-medium">
            Gerada automaticamente a partir do seu plano alimentar
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 bg-muted/30">
          <div className="p-4 space-y-3">
            {shoppingList.length === 0 ? (
              <div className="py-20 text-center opacity-30">
                <Package className="w-12 h-12 mx-auto mb-4" />
                <p className="font-bold">Nenhum item no plano</p>
              </div>
            ) : (
              shoppingList.map((item) => (
                <Card 
                  key={item.name} 
                  className={cn(
                    "p-4 flex items-center justify-between transition-all cursor-pointer border-none shadow-sm rounded-2xl",
                    checkedItems[item.name] ? "opacity-50 bg-emerald-50/50" : "bg-background hover:shadow-md"
                  )}
                  onClick={() => toggleItem(item.name)}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      checked={checkedItems[item.name]} 
                      onCheckedChange={() => toggleItem(item.name)}
                      className="rounded-full border-emerald-500 data-[state=checked]:bg-emerald-500"
                    />
                    <div>
                      <h3 className={cn(
                        "font-bold text-sm",
                        checkedItems[item.name] && "line-through"
                      )}>
                        {item.name}
                      </h3>
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">
                        Total: {item.quantity.toFixed(1)} {item.unit}
                      </p>
                    </div>
                  </div>
                  {checkedItems[item.name] && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  )}
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

// Re-using the cn helper
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
