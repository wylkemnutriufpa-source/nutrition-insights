import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bot, ChevronDown, Sparkles } from 'lucide-react';
import { useMealEditorV3Store } from '@/hooks/meal-editor-v3/useMealEditorV3Store';
import { toast } from 'sonner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const GOALS = [
  { id: 'weight-loss', label: 'Emagrecimento' },
  { id: 'muscle-gain', label: 'Hipertrofia' },
  { id: 'low-carb', label: 'Low Carb' },
  { id: 'simple', label: 'Plano Equilibrado' },
  { id: 'marmitas', label: 'Plano com Marmitas' },
];

const RESTRICTIONS = [
  'Nenhuma restrição',
  'Vegetariano',
  'Vegano',
  'Sem lactose',
  'Sem glúten',
  'Diabético',
];

const MEAL_COUNTS = ['3 refeições', '4 refeições', '5 refeições', '6 refeições'];

export const GenerateAIModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { generateDeterministicPlan, patientTargets } = useMealEditorV3Store();
  const [goal, setGoal] = useState('Hipertrofia');
  const [calories, setCalories] = useState(String(patientTargets?.calories || 1800));
  const [mealCount, setMealCount] = useState('5 refeições');
  const [restriction, setRestriction] = useState('Nenhuma restrição');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    const goalId = GOALS.find((g) => g.label === goal)?.id || 'simple';
    try {
      await generateDeterministicPlan(goalId);
      toast.success('Plano gerado com sucesso!');
      onClose();
    } catch (e) {
      toast.error('Erro ao gerar plano');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle className="text-base font-bold text-center">
            Gerar plano com IA
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-5 space-y-4">
          {/* Robot Avatar */}
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center">
                <Bot className="w-10 h-10 text-primary" />
                <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-primary animate-pulse" />
              </div>
            </div>
            <p className="text-[11px] text-center text-muted-foreground font-medium px-4 leading-relaxed">
              Vou criar um plano personalizado para seu paciente com base nas informações abaixo.
            </p>
          </div>

          {/* Objetivo */}
          <SelectField
            label="Objetivo"
            value={goal}
            options={GOALS.map((g) => g.label)}
            onChange={setGoal}
          />

          {/* Calorias */}
          <div>
            <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Calorias diárias
            </Label>
            <div className="mt-1.5 relative">
              <Input
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className="h-11 rounded-xl bg-muted/40 border-border/50 font-bold pr-14"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground uppercase">
                kcal
              </span>
            </div>
          </div>

          {/* Número de refeições */}
          <SelectField
            label="Número de refeições"
            value={mealCount}
            options={MEAL_COUNTS}
            onChange={setMealCount}
          />

          {/* Restrições */}
          <SelectField
            label="Preferências alimentares"
            value={restriction}
            options={RESTRICTIONS}
            onChange={setRestriction}
          />

          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full h-12 rounded-2xl font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20"
          >
            {loading ? 'Gerando...' : 'Gerar plano'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const SelectField = ({
  label, value, options, onChange,
}: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
}) => (
  <div>
    <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
      {label}
    </Label>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="mt-1.5 w-full flex items-center justify-between px-4 h-11 rounded-xl bg-muted/40 border border-border/50 text-sm font-bold">
          <span>{value}</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] rounded-xl max-h-64 overflow-y-auto">
        {options.map((opt) => (
          <DropdownMenuItem
            key={opt}
            onClick={() => onChange(opt)}
            className="text-xs font-bold cursor-pointer"
          >
            {opt}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);
