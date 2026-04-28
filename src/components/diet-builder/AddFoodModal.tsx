import React, { useState } from 'react';
import { Search, Package, Zap, Plus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDietStore, Food } from '@/stores/diet-builder/useDietStore';

interface AddFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  mealId: string;
}

// Base nutricional USDA - Cada alimento deve ter ID, Macros e ser consistente.
const MOCK_FOODS: Omit<Food, 'id'>[] = [
  { name: 'Peito de Frango Grelhado (USDA)', calories: 165, protein: 31, carbs: 0, fat: 4 },
  { name: 'Arroz Integral Cozido (USDA)', calories: 111, protein: 2.6, carbs: 23, fat: 0.9 },
  { name: 'Batata Doce Cozida (USDA)', calories: 86, protein: 1.6, carbs: 20, fat: 0.1 },
  { name: 'Ovo de Galinha Inteiro (USDA)', calories: 155, protein: 13, carbs: 1.1, fat: 11 },
  { name: 'Banana Nanica (USDA)', calories: 89, protein: 1.1, carbs: 23, fat: 0.3 },
  { name: 'Aveia em Flocos (USDA)', calories: 389, protein: 16.9, carbs: 66, fat: 6.9 },
  { name: 'Carne Moída Patinho (USDA)', calories: 219, protein: 26, carbs: 0, fat: 12 },
  { name: 'Brócolis Cozido (USDA)', calories: 35, protein: 2.4, carbs: 7, fat: 0.4 },
];

export const AddFoodModal: React.FC<AddFoodModalProps> = ({ isOpen, onClose, mealId }) => {
  const [activeTab, setActiveTab] = useState<'search' | 'template' | 'auto'>('search');
  const [searchTerm, setSearchTerm] = useState('');
  const { addFood, templates, addTemplate, calorieTarget, totals } = useDietStore();

  const filteredFoods = MOCK_FOODS.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddAuto = () => {
    const remaining = calorieTarget - totals.calories;
    if (remaining <= 0) return;
    
    // Simple logic for auto-suggestion
    const suggestion = MOCK_FOODS[Math.floor(Math.random() * MOCK_FOODS.length)];
    addFood(mealId, suggestion);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white border-none shadow-2xl rounded-3xl overflow-hidden p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-bold text-slate-800">Adicionar à Refeição</DialogTitle>
        </DialogHeader>

        <div className="flex p-4 gap-2">
          <button 
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-3 px-2 rounded-2xl flex flex-col items-center gap-1 transition-all ${activeTab === 'search' ? 'bg-emerald-50 text-emerald-600 ring-2 ring-emerald-500/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
          >
            <Search className="w-5 h-5" />
            <span className="text-xs font-medium">Buscar</span>
          </button>
          <button 
            onClick={() => setActiveTab('template')}
            className={`flex-1 py-3 px-2 rounded-2xl flex flex-col items-center gap-1 transition-all ${activeTab === 'template' ? 'bg-violet-50 text-violet-600 ring-2 ring-violet-500/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
          >
            <Package className="w-5 h-5" />
            <span className="text-xs font-medium">Templates</span>
          </button>
          <button 
            onClick={() => setActiveTab('auto')}
            className={`flex-1 py-3 px-2 rounded-2xl flex flex-col items-center gap-1 transition-all ${activeTab === 'auto' ? 'bg-blue-50 text-blue-600 ring-2 ring-blue-500/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
          >
            <Zap className="w-5 h-5" />
            <span className="text-xs font-medium">Sugestão</span>
          </button>
        </div>

        <div className="px-6 pb-8 max-h-[400px] overflow-y-auto">
          {activeTab === 'search' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Ex: Frango, Arroz..." 
                  className="pl-10 h-12 bg-slate-50 border-none rounded-xl focus-visible:ring-emerald-500/30"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-1 gap-2">
                {filteredFoods.map((food, idx) => (
                  <button
                    key={idx}
                    onClick={() => { addFood(mealId, food); onClose(); }}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-emerald-50 hover:text-emerald-700 transition-colors group"
                  >
                    <div className="text-left">
                      <p className="font-semibold">{food.name}</p>
                      <p className="text-xs text-slate-500">{food.calories} kcal • P:{food.protein}g C:{food.carbs}g G:{food.fat}g</p>
                    </div>
                    <Plus className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'template' && (
            <div className="space-y-3">
              {templates.length > 0 ? templates.map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => { addTemplate(mealId, t.name); onClose(); }}
                  className="w-full flex items-center justify-between p-5 bg-violet-50/50 border border-violet-100 rounded-2xl hover:bg-violet-50 transition-colors group"
                >
                  <div className="text-left">
                    <p className="font-bold text-violet-700">{t.name}</p>
                    <p className="text-xs text-violet-600/70">{t.items.length} itens inclusos</p>
                  </div>
                  <Plus className="w-5 h-5 text-violet-600" />
                </button>
              )) : (
                <div className="text-center py-8 text-slate-400">Nenhum template salvo</div>
              )}
            </div>
          )}

          {activeTab === 'auto' && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Zap className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800">IA de Sugestão</h4>
                <p className="text-sm text-slate-500 px-4">Com base na meta de {calorieTarget} kcal, sugerimos o combo ideal para esta refeição.</p>
              </div>
              <Button onClick={handleAddAuto} className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700">
                Gerar Sugestão
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
