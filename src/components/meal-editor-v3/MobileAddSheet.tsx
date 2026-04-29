import React from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  PlusSquare, Plus, Package, Sparkles, LayoutTemplate, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type AddAction =
  | 'new-meal'
  | 'add-food'
  | 'add-marmita'
  | 'generate-ai'
  | 'apply-template';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (action: AddAction) => void;
}

const ITEMS: {
  id: AddAction;
  label: string;
  desc: string;
  icon: any;
  highlight?: boolean;
}[] = [
  { id: 'new-meal', label: 'Nova refeição', desc: 'Criar uma nova refeição', icon: PlusSquare },
  { id: 'add-food', label: 'Adicionar alimento', desc: 'Buscar e adicionar alimento', icon: Plus },
  { id: 'add-marmita', label: 'Adicionar marmita', desc: 'Refeições completas prontas', icon: Package },
  {
    id: 'generate-ai',
    label: 'Gerar Plano Inteligente',
    desc: 'Motor clínico determinístico FitJourney',
    icon: Sparkles,
    highlight: true,
  },
  { id: 'apply-template', label: 'Template', desc: 'Usar um template pronto', icon: LayoutTemplate },
];

export const MobileAddSheet: React.FC<Props> = ({ open, onOpenChange, onSelect }) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-none bg-background p-0 max-w-md mx-auto"
      >
        <div className="px-5 pt-5 pb-8">
          <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-5" />
          <h2 className="text-base font-bold mb-3 px-1">Adicionar</h2>

          <div className="space-y-1.5">
            {ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onSelect(item.id);
                  onOpenChange(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-colors',
                  'hover:bg-muted/60 active:bg-muted',
                  item.highlight && 'bg-primary/5 hover:bg-primary/10 border border-primary/20'
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                    item.highlight ? 'bg-primary/15 text-primary' : 'bg-muted text-foreground'
                  )}
                >
                  <item.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-sm font-bold truncate',
                      item.highlight && 'text-primary'
                    )}
                  >
                    {item.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">{item.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            className="w-full mt-4 h-12 rounded-2xl font-bold"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
