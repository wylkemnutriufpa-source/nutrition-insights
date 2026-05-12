import React, { useState, useEffect } from 'react';
import { X, Save, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { reconcileMeal, MealItem, MacroTargets, ClinicalProfile } from '../../../core/clinical-engine';

interface MealEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMeal: {
    name: string;
    items: MealItem[];
    targets: MacroTargets;
  };
  profile: ClinicalProfile;
  onSave: (reconciledMeal: { items: MealItem[]; totals: MacroTargets }) => void;
}

export const MealEditModal: React.FC<MealEditModalProps> = ({
  isOpen,
  onClose,
  initialMeal,
  profile,
  onSave
}) => {
  // 1. DRAFT LOCAL (Ação 4)
  const [draftItems, setDraftItems] = useState<MealItem[]>([]);
  const [preview, setPreview] = useState<{ items: MealItem[]; totals: MacroTargets } | null>(null);
  const [isReconciled, setIsReconciled] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDraftItems(JSON.parse(JSON.stringify(initialMeal.items)));
      setPreview(null);
      setIsReconciled(false);
    }
  }, [isOpen, initialMeal]);

  if (!isOpen) return null;

  // 2. RECONCILE (Ação 4)
  const handleReconcile = () => {
    const result = reconcileMeal(draftItems, initialMeal.targets, profile);
    setPreview(result);
    setIsReconciled(true);
  };

  const handleUpdateGrams = (id: string, grams: number) => {
    setDraftItems(items => items.map(it => it.id === id ? { ...it, grams } : it));
    setIsReconciled(false); // Force re-reconcile after edit
  };

  // 3. SAVE (Ação 4)
  const handleSave = () => {
    if (!preview) return;
    onSave(preview);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
              Editar: {initialMeal.name}
              <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full font-mono">SOBERANO v2</span>
            </h2>
            <p className="text-xs text-slate-500 font-mono uppercase mt-1">Modal Transacional — Sem Auto-save</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Targets Bar */}
          <div className="grid grid-cols-4 gap-4 p-4 bg-black/40 rounded-2xl border border-slate-800/50">
            <div className="text-center">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Kcal Alvo</p>
              <p className="text-lg font-black text-white">{Math.round(initialMeal.targets.calories)}</p>
            </div>
            <div className="text-center border-l border-slate-800/50">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Proteína</p>
              <p className="text-lg font-black text-blue-400">{Math.round(initialMeal.targets.protein)}g</p>
            </div>
            <div className="text-center border-l border-slate-800/50">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Carbos</p>
              <p className="text-lg font-black text-orange-400">{Math.round(initialMeal.targets.carbs)}g</p>
            </div>
            <div className="text-center border-l border-slate-800/50">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Gorduras</p>
              <p className="text-lg font-black text-yellow-400">{Math.round(initialMeal.targets.fat)}g</p>
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Itens no Rascunho</h3>
            {draftItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-slate-800/30 border border-slate-800 rounded-2xl group hover:border-slate-700 transition-all">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    item.macro_role === 'protein' ? 'bg-blue-500' :
                    item.macro_role === 'carb' ? 'bg-orange-500' :
                    'bg-slate-500'
                  }`} />
                  <div>
                    <p className="font-bold text-sm text-white">{item.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-mono">{item.macro_role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={item.grams}
                    onChange={(e) => handleUpdateGrams(item.id, parseInt(e.target.value) || 0)}
                    className="w-20 bg-black border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-black text-white focus:border-green-500 outline-none transition-all"
                  />
                  <span className="text-xs text-slate-500 font-bold uppercase">g</span>
                </div>
              </div>
            ))}
          </div>

          {/* Preview vs Targets */}
          {preview && (
            <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 size={16} className="text-green-500" />
                <h4 className="text-xs font-black uppercase text-green-500 tracking-wider">Preview Reconciliado (Ação 4)</h4>
              </div>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-bold">Kcal</p>
                  <p className={`font-black ${Math.abs(preview.totals.calories - initialMeal.targets.calories) < 10 ? 'text-white' : 'text-slate-400'}`}>
                    {Math.round(preview.totals.calories)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-bold">Proteína</p>
                  <p className="font-black text-blue-400">{Math.round(preview.totals.protein)}g</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-bold">Carbos</p>
                  <p className="font-black text-orange-400">{Math.round(preview.totals.carbs)}g</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-bold">Gordura</p>
                  <p className="font-black text-yellow-400">{Math.round(preview.totals.fat)}g</p>
                </div>
              </div>
            </div>
          )}

          {!isReconciled && draftItems.length > 0 && (
            <div className="flex items-center gap-2 text-yellow-500 p-3 bg-yellow-500/5 rounded-xl border border-yellow-500/20">
              <AlertTriangle size={16} />
              <p className="text-[10px] font-bold uppercase">Rascunho modificado. Recalcule para validar a soberania.</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-900/80 border-t border-slate-800 flex gap-4">
          <button
            onClick={handleReconcile}
            className="flex-1 flex items-center justify-center gap-2 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black uppercase text-xs transition-all active:scale-95"
          >
            <RefreshCw size={16} className={!isReconciled ? "animate-spin" : ""} />
            Reconciliar (Motor V2)
          </button>
          
          <button
            onClick={handleSave}
            disabled={!isReconciled}
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black uppercase text-xs transition-all active:scale-95 ${
              isReconciled 
              ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20' 
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Save size={16} />
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
};
