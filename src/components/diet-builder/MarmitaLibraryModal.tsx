import React, { useState } from 'react';
import { Package, Utensils, Plus, ArrowLeft, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDietStore, Food } from '@/stores/diet-builder/useDietStore';

// Regra crítica: Marmitas são fixas e não editáveis.
// Estrutura: template { id, nome, tipo: "marmita", locked: true, imagem, alimentos[], macros_fixos }
const MARMITAS_DB = [
  { id: 'm1', name: 'Marmita Fit Frango c/ Batata Doce', imagem: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400', locked: true, items: [{ id: 'a1', name: 'Frango', calories: 200, protein: 30, carbs: 0, fat: 5 }, { id: 'a2', name: 'Batata Doce', calories: 100, protein: 2, carbs: 22, fat: 0 }] },
  { id: 'm2', name: 'Marmita Carne c/ Arroz Integral', imagem: 'https://images.unsplash.com/photo-1544025162-d76694265547?w=400', locked: true, items: [{ id: 'b1', name: 'Patinho', calories: 220, protein: 28, carbs: 0, fat: 8 }, { id: 'b2', name: 'Arroz', calories: 120, protein: 3, carbs: 25, fat: 1 }] },
];

export const MarmitaLibraryModal: React.FC<{ isOpen: boolean; onClose: () => void; mealId: string }> = ({ isOpen, onClose, mealId }) => {
  const { addFood } = useDietStore();
  const [view, setView] = useState<'list' | 'preview'>('list');
  const [selected, setSelected] = useState<any>(null);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-white rounded-3xl p-0 overflow-hidden shadow-2xl border-none">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-2">
            {view === 'preview' && <Button variant="ghost" size="icon" onClick={() => setView('list')}><ArrowLeft className="w-5 h-5" /></Button>}
            <DialogTitle className="text-xl font-bold">Biblioteca de Marmitas</DialogTitle>
          </div>
        </DialogHeader>

        <div className="p-6 pt-2 max-h-[500px] overflow-y-auto">
          {view === 'list' ? (
            <div className="grid grid-cols-1 gap-3">
              {MARMITAS_DB.map(m => (
                <button
                  key={m.id}
                  onClick={() => { setSelected(m); setView('preview'); }}
                  className="w-full flex items-center p-3 bg-emerald-50 rounded-2xl border border-emerald-100 hover:bg-emerald-100 transition-colors"
                >
                  <img src={m.imagem} className="w-14 h-14 rounded-xl object-cover" alt={m.name} />
                  <div className="ml-4 text-left">
                    <p className="font-bold text-slate-800">{m.name}</p>
                    <p className="text-[10px] uppercase font-bold text-emerald-600">Marmita Congelada</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <img src={selected.imagem} className="w-full h-48 rounded-2xl object-cover" />
              <h3 className="text-lg font-bold">{selected.name}</h3>
              <div className="bg-slate-50 p-4 rounded-xl space-y-2">
                <p className="text-sm font-semibold text-slate-500">Macros Fixos:</p>
                <div className="flex gap-4">
                  <span className="text-sm font-bold text-emerald-600">P: {selected.items.reduce((a, b) => a + b.protein, 0)}g</span>
                  <span className="text-sm font-bold text-emerald-600">C: {selected.items.reduce((a, b) => a + b.carbs, 0)}g</span>
                  <span className="text-sm font-bold text-emerald-600">G: {selected.items.reduce((a, b) => a + b.fat, 0)}g</span>
                </div>
              </div>
              <Button 
                className="w-full h-12 bg-emerald-600 rounded-xl"
                onClick={() => { selected.items.forEach(i => addFood(mealId, i)); onClose(); }}
              >
                Adicionar Marmita
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};