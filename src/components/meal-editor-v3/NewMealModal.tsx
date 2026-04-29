import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Sun, Coffee, Utensils, Apple, Moon, Star, Clock, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMealEditorV3Store } from '@/hooks/meal-editor-v3/useMealEditorV3Store';
import { toast } from 'sonner';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const ICONS = [
  { id: 'sun', label: 'Café/Manhã', Icon: Sun },
  { id: 'coffee', label: 'Café', Icon: Coffee },
  { id: 'utensils', label: 'Refeição', Icon: Utensils },
  { id: 'apple', label: 'Lanche', Icon: Apple },
  { id: 'moon', label: 'Noite', Icon: Moon },
  { id: 'star', label: 'Especial', Icon: Star },
];

const PRESET_NAMES = [
  'Café da manhã',
  'Lanche da manhã',
  'Almoço',
  'Lanche da tarde',
  'Jantar',
  'Ceia',
];

export const NewMealModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { addMeal } = useMealEditorV3Store();
  const [name, setName] = useState('Café da manhã');
  const [time, setTime] = useState('07:00');
  const [icon, setIcon] = useState('sun');

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error('Digite um nome para a refeição');
      return;
    }
    addMeal({ name: name.trim(), time, icon });
    toast.success(`${name} adicionada`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle className="text-base font-bold text-center">
            Nova refeição
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-5 space-y-5">
          {/* Nome */}
          <div>
            <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Nome da refeição
            </Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="mt-1.5 w-full flex items-center justify-between px-4 h-11 rounded-xl bg-muted/40 border border-border/50 text-sm font-bold">
                  <span>{name}</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] rounded-xl">
                {PRESET_NAMES.map((preset) => (
                  <DropdownMenuItem
                    key={preset}
                    onClick={() => setName(preset)}
                    className="text-xs font-bold cursor-pointer"
                  >
                    {preset}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 h-9 text-xs rounded-xl bg-background"
              placeholder="Ou digite um nome personalizado"
            />
          </div>

          {/* Horário */}
          <div>
            <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Horário
            </Label>
            <div className="mt-1.5 relative">
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-11 rounded-xl bg-muted/40 border-border/50 font-bold text-sm pr-10"
              />
              <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Ícone */}
          <div>
            <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Ícone
            </Label>
            <div className="mt-2 grid grid-cols-6 gap-2">
              {ICONS.map(({ id, Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setIcon(id)}
                  title={label}
                  className={cn(
                    'aspect-square flex items-center justify-center rounded-xl border transition-all',
                    icon === id
                      ? 'bg-primary/15 border-primary text-primary shadow-md'
                      : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'
                  )}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleCreate}
            className="w-full h-12 rounded-2xl font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20"
          >
            Criar e adicionar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
