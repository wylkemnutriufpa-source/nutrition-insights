import React, { useState } from 'react';
import { Package, Utensils, Plus, ArrowLeft, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDietStore, Food } from '@/stores/diet-builder/useDietStore';

// Regra crítica: Marmitas são fixas e não editáveis.
// Estrutura: template { id, nome, tipo: "marmita", locked: true, imagem, alimentos[], macros_fixos }
const MARMITAS_DB = [
  { 
    id: 'm1', 
    name: 'Fit Frango c/ Batata Doce (350g)', 
    imagem: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400', 
    locked: true, 
    items: [
      { name: 'Frango desfiado (Fit)', calories: 185, protein: 32, carbs: 0, fat: 4, locked: true }, 
      { name: 'Batata doce cozida (Fit)', calories: 125, protein: 2, carbs: 28, fat: 0, locked: true },
      { name: 'Mix de Legumes (Fit)', calories: 40, protein: 2, carbs: 6, fat: 0, locked: true }
    ] 
  },
  { 
    id: 'm2', 
    name: 'Carne Moída c/ Arroz Integral (350g)', 
    imagem: 'https://images.unsplash.com/photo-1544025162-d76694265547?w=400', 
    locked: true, 
    items: [
      { name: 'Patinho moído (Fit)', calories: 210, protein: 29, carbs: 0, fat: 9, locked: true }, 
      { name: 'Arroz integral cozido (Fit)', calories: 140, protein: 3, carbs: 30, fat: 1, locked: true },
      { name: 'Cenoura baby (Fit)', calories: 35, protein: 1, carbs: 7, fat: 0, locked: true }
    ] 
  },
  { 
    id: 'm3', 
    name: 'Strogonoff de Frango Fit (320g)', 
    imagem: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400', 
    locked: true, 
    items: [
      { name: 'Strogonoff de Frango (Fit)', calories: 240, protein: 34, carbs: 8, fat: 7, locked: true }, 
      { name: 'Arroz branco (Fit)', calories: 130, protein: 2, carbs: 28, fat: 0, locked: true }
    ] 
  },
  { 
    id: 'm4', 
    name: 'Salmão Grelhado c/ Quinoa (300g)', 
    imagem: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400', 
    locked: true, 
    items: [
      { name: 'Filé de Salmão (Fit)', calories: 260, protein: 28, carbs: 0, fat: 14, locked: true }, 
      { name: 'Quinoa real (Fit)', calories: 120, protein: 4, carbs: 21, fat: 2, locked: true }
    ] 
  },
  { 
    id: 'm5', 
    name: 'Escondidinho de Mandioca c/ Carne (400g)', 
    imagem: 'https://images.unsplash.com/photo-1541529086526-db283c563270?w=400', 
    locked: true, 
    items: [
      { name: 'Carne desfiada (Fit)', calories: 230, protein: 32, carbs: 0, fat: 10, locked: true }, 
      { name: 'Purê de Mandioca (Fit)', calories: 180, protein: 2, carbs: 42, fat: 0, locked: true }
    ] 
  },
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
                  <div className="ml-4 text-left flex-1">
                    <p className="font-bold text-slate-800 text-sm">{m.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px] uppercase font-bold text-emerald-600">Marmita Fit</p>
                      <span className="text-[10px] text-slate-400">•</span>
                      <p className="text-[10px] font-bold text-slate-500">
                        {m.items.reduce((a, b) => a + b.calories, 0)} kcal
                      </p>
                    </div>
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