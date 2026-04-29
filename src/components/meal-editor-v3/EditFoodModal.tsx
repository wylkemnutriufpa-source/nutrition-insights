import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Trash2, Utensils, ArrowLeft, SwitchCamera, Save, ChevronDown } from 'lucide-react';
import { useMealEditorV3Store, MealItem, HouseholdMeasure } from '@/hooks/meal-editor-v3/useMealEditorV3Store';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mealId: string | null;
  item: MealItem | null;
  onSubstitute?: () => void;
}

export const EditFoodModal: React.FC<Props> = ({ isOpen, onClose, mealId, item, onSubstitute }) => {
  const { updateFoodQuantity, removeFoodFromMeal, updateFoodUnit } = useMealEditorV3Store();
  const [quantity, setQuantity] = useState<number>(item?.quantity || 1);
  const [selectedUnit, setSelectedUnit] = useState<string>(item?.selectedUnit || item?.portionUnit || 'g');

  useEffect(() => {
    if (item) {
      setQuantity(item.quantity);
      setSelectedUnit(item.selectedUnit || item.portionUnit);
    }
  }, [item]);

  if (!item || !mealId) return null;

  const totalGrams = Math.round(quantity * item.portionValue);
  const factor = quantity;

  const handleSave = () => {
    updateFoodQuantity(mealId, item.instanceId, quantity);
    toast.success('Alterações salvas');
    onClose();
  };

  const handleRemove = () => {
    removeFoodFromMeal(mealId, item.instanceId);
    toast.success(`${item.name} removido`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="px-4 py-3 border-b flex flex-row items-center justify-between">
          <button
            onClick={onClose}
            className="p-2 -ml-2 rounded-lg text-muted-foreground hover:bg-muted active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <DialogTitle className="text-sm font-bold flex-1 text-center">
            Editar alimento
          </DialogTitle>
          <button
            onClick={handleRemove}
            disabled={item.isMarmita || item.locked}
            className="p-2 -mr-2 rounded-lg text-destructive hover:bg-destructive/10 active:scale-95 transition-transform disabled:opacity-30"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Imagem */}
          <div className="aspect-[16/10] rounded-2xl overflow-hidden bg-muted">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted/50">
                <Utensils className="w-10 h-10 text-muted-foreground/30" />
              </div>
            )}
          </div>

          <h2 className="text-xl font-black tracking-tight">{item.name}</h2>

          {/* Quantidade */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Quantidade
              </Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                disabled={item.isMarmita || item.locked}
                className="mt-1.5 h-12 rounded-xl bg-muted/40 border-border/50 font-black text-base text-center"
              />
            </div>
            <div>
              <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Medida
              </Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="mt-1.5 w-full h-12 rounded-xl bg-muted/30 border-border/50 font-bold text-xs uppercase"
                    disabled={item.isMarmita || item.locked || !item.householdMeasures}
                  >
                    {selectedUnit}
                    <ChevronDown className="w-3 h-3 ml-auto opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[140px] rounded-xl">
                  <DropdownMenuItem onClick={() => setSelectedUnit(item.portionUnit)} className="text-xs font-bold uppercase">
                    {item.portionUnit}
                  </DropdownMenuItem>
                  {item.householdMeasures?.map(m => (
                    <DropdownMenuItem key={m.unit} onClick={() => setSelectedUnit(m.unit)} className="text-xs font-bold uppercase">
                      {m.unit}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Macros */}
          <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Informações nutricionais
              </p>
              <p className="text-[10px] font-bold text-muted-foreground">
                Por {totalGrams}{item.portionUnit}
              </p>
            </div>
            <div className="space-y-1.5">
              <MacroRow label="Calorias" value={Math.round(item.calories * factor)} unit="kcal" />
              <MacroRow label="Proteínas" value={Math.round(item.protein * factor * 10) / 10} unit="g" />
              <MacroRow label="Carboidratos" value={Math.round(item.carbs * factor * 10) / 10} unit="g" />
              <MacroRow label="Gorduras" value={Math.round(item.fat * factor * 10) / 10} unit="g" />
            </div>
          </div>

          {/* Ações */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => { onSubstitute?.(); }}
              disabled={item.isMarmita || item.locked}
              className="h-12 rounded-2xl font-bold border-border/50"
            >
              <SwitchCamera className="w-4 h-4 mr-2" />
              Substituir
            </Button>
            <Button
              onClick={handleSave}
              disabled={item.isMarmita || item.locked}
              className="h-12 rounded-2xl font-bold bg-primary shadow-lg shadow-primary/20"
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const MacroRow = ({ label, value, unit }: { label: string; value: number; unit: string }) => (
  <div className="flex items-center justify-between text-xs">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-bold tabular-nums">
      {value} <span className="text-muted-foreground font-medium">{unit}</span>
    </span>
  </div>
);
