/**
 * 🍳 RecipeBuilder — Sprint H
 *
 * UI para criar/editar receitas dentro do Editor V3.
 * Macros calculados em tempo real via calcEngine.
 * Ao salvar: snapshot congelado → nos_recipes.
 *
 * SOMENTE no Editor V3 (camada de autoria).
 * NUNCA importar no Patient App.
 */

import React, { useState } from 'react';
import {
  ChefHat, Plus, Trash2, Save, Loader2,
  Flame, Beef, Wheat, Droplets, Leaf,
  Clock, Users, Search, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useRecipeBuilder } from '../hooks/useRecipeBuilder';
import { NOSFoodSearch } from './NOSFoodSearch';
import type { Food } from '@/features/editor-v3/types/types';

interface RecipeBuilderProps {
  onSaved?: (recipeId: string) => void;
  onCancel?: () => void;
}

function MacroChip({ icon, value, unit, color }: {
  icon: React.ReactNode; value: number; unit: string; color: string
}) {
  return (
    <div className={`flex flex-col items-center px-3 py-2 rounded-xl bg-white/5 border border-white/5 min-w-[64px]`}>
      <div className={color}>{icon}</div>
      <p className="text-base font-black text-white tabular-nums mt-0.5">{Math.round(value)}</p>
      <p className="text-[8px] uppercase font-black text-white/20">{unit}</p>
    </div>
  );
}

export const RecipeBuilder: React.FC<RecipeBuilderProps> = ({ onSaved, onCancel }) => {
  const {
    draft, portionMacros, totalMacros,
    updateField, addIngredient, updateIngredientQty, removeIngredient,
    save, saving,
  } = useRecipeBuilder();

  const [showFoodSearch, setShowFoodSearch] = useState(false);
  const [pendingQty, setPendingQty] = useState<Record<string, string>>({});

  const handleFoodSelect = (food: Food) => {
    addIngredient(
      {
        id:           food.id,
        name:         food.name,
        source:       (food as any).source || 'custom',
        kcal_100g:    food.kcal_100g ?? food.kcal ?? 0,
        protein_100g: food.protein_100g ?? food.protein ?? 0,
        carbs_100g:   food.carb_100g ?? food.carbs ?? 0,
        fat_100g:     food.fat_100g ?? food.fat ?? 0,
        fiber_100g:   0,
        portion_g:    food.clinical_mass_g ?? 100,
      },
      food.clinical_mass_g ?? 100
    );
    setShowFoodSearch(false);
  };

  const handleSave = async () => {
    const id = await save();
    if (id && onSaved) onSaved(id);
  };

  const handleQtyBlur = (foodId: string) => {
    const raw = pendingQty[foodId];
    if (raw === undefined) return;
    const parsed = parseFloat(raw.replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) {
      updateIngredientQty(foodId, parsed);
    }
    setPendingQty(prev => { const n = { ...prev }; delete n[foodId]; return n; });
  };

  return (
    <div className="flex flex-col h-full bg-neutral-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-neutral-900/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 border border-amber-500/20">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black uppercase italic tracking-tighter">Recipe Builder</h2>
            <p className="text-[9px] uppercase font-black tracking-widest text-white/20">NOS Sprint H</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button variant="ghost" size="icon" onClick={onCancel} className="text-white/30 hover:text-white">
              <X className="w-4 h-4" />
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={saving || !draft.name.trim() || draft.ingredients.length === 0}
            className="bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest text-[10px] h-9 px-5 rounded-xl"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar Receita
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6 max-w-2xl mx-auto">

          {/* Nome e descrição */}
          <div className="space-y-3">
            <div>
              <Label className="text-[9px] uppercase font-black tracking-widest text-white/30 mb-1.5 block">Nome da Receita *</Label>
              <Input
                value={draft.name}
                onChange={e => updateField('name', e.target.value)}
                placeholder="Ex: Frango grelhado com legumes"
                className="bg-neutral-900/80 border-white/10 text-white h-12 rounded-xl font-bold"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-[9px] uppercase font-black tracking-widest text-white/30 mb-1.5 block">Descrição</Label>
              <Textarea
                value={draft.description}
                onChange={e => updateField('description', e.target.value)}
                placeholder="Descreva a receita brevemente..."
                className="bg-neutral-900/80 border-white/10 text-white rounded-xl resize-none"
                rows={2}
              />
            </div>
          </div>

          {/* Rendimento e porção */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[9px] uppercase font-black tracking-widest text-white/30 mb-1.5 block">
                Rendimento total (g)
              </Label>
              <Input
                type="number"
                value={draft.yield_g}
                onChange={e => updateField('yield_g', Math.max(1, Number(e.target.value)))}
                className="bg-neutral-900/80 border-white/10 text-white h-10 rounded-xl"
              />
              <p className="text-[9px] text-white/20 mt-1">Calculado automaticamente com os ingredientes</p>
            </div>
            <div>
              <Label className="text-[9px] uppercase font-black tracking-widest text-white/30 mb-1.5 block">
                Porção (g)
              </Label>
              <Input
                type="number"
                value={draft.portion_g}
                onChange={e => updateField('portion_g', Math.max(1, Number(e.target.value)))}
                className="bg-neutral-900/80 border-white/10 text-white h-10 rounded-xl"
              />
            </div>
          </div>

          {/* Macros por porção — tempo real */}
          <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-4">
            <p className="text-[9px] uppercase font-black tracking-widest text-amber-400/60 mb-3 flex items-center gap-1.5">
              <Flame className="w-3 h-3" /> Macros por porção ({draft.portion_g}g) — tempo real
            </p>
            <div className="flex gap-3 flex-wrap">
              <MacroChip icon={<Flame className="w-3.5 h-3.5" />} value={portionMacros.kcal} unit="kcal" color="text-orange-400" />
              <MacroChip icon={<Beef className="w-3.5 h-3.5" />} value={portionMacros.protein_g} unit="prot" color="text-red-400" />
              <MacroChip icon={<Wheat className="w-3.5 h-3.5" />} value={portionMacros.carbs_g} unit="carbs" color="text-amber-400" />
              <MacroChip icon={<Droplets className="w-3.5 h-3.5" />} value={portionMacros.fat_g} unit="gord" color="text-blue-400" />
              <MacroChip icon={<Leaf className="w-3.5 h-3.5" />} value={portionMacros.fiber_g} unit="fibra" color="text-emerald-400" />
            </div>
            {draft.ingredients.length > 0 && (
              <p className="text-[9px] text-white/20 mt-3">
                Total receita: {Math.round(totalMacros.kcal)} kcal |
                Rendimento: {Math.round(draft.yield_g)}g |
                {Math.floor(draft.yield_g / draft.portion_g)} porções
              </p>
            )}
          </div>

          {/* Lista de ingredientes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[9px] uppercase font-black tracking-widest text-white/30">
                Ingredientes ({draft.ingredients.length})
              </Label>
              <Button
                type="button"
                size="sm"
                onClick={() => setShowFoodSearch(v => !v)}
                className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 text-[9px] uppercase font-black tracking-widest h-7 px-3 rounded-lg"
              >
                <Plus className="w-3 h-3 mr-1" />
                {showFoodSearch ? 'Fechar busca' : 'Adicionar ingrediente'}
              </Button>
            </div>

            {/* Busca de alimentos inline */}
            {showFoodSearch && (
              <div className="bg-neutral-900/80 border border-white/10 rounded-2xl p-4">
                <NOSFoodSearch onSelect={handleFoodSelect} />
              </div>
            )}

            {/* Lista */}
            {draft.ingredients.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-2xl">
                <ChefHat className="w-8 h-8 text-white/10 mx-auto mb-2" />
                <p className="text-[10px] uppercase font-black text-white/10">Nenhum ingrediente</p>
              </div>
            ) : (
              <div className="space-y-2">
                {draft.ingredients.map((ing) => {
                  const qtyVal = pendingQty[ing.food_id] !== undefined
                    ? pendingQty[ing.food_id]
                    : String(ing.qty_g);
                  return (
                    <div key={ing.food_id} className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/5 rounded-xl group">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{ing.food_name}</p>
                        <div className="flex items-center gap-3 mt-0.5 text-[9px] text-white/30 font-medium">
                          <span className="text-orange-400">{Math.round(ing.kcal)} kcal</span>
                          <span>P: {ing.protein_g.toFixed(1)}g</span>
                          <span>C: {ing.carbs_g.toFixed(1)}g</span>
                          <span>G: {ing.fat_g.toFixed(1)}g</span>
                        </div>
                      </div>
                      {/* Input de gramagem editável */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Input
                          type="number"
                          value={qtyVal}
                          onChange={e => setPendingQty(prev => ({ ...prev, [ing.food_id]: e.target.value }))}
                          onBlur={() => handleQtyBlur(ing.food_id)}
                          onKeyDown={e => e.key === 'Enter' && handleQtyBlur(ing.food_id)}
                          className="w-20 h-8 bg-neutral-900 border-white/10 text-white text-center text-sm font-bold rounded-lg"
                        />
                        <span className="text-[9px] text-white/20 font-black">g</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeIngredient(ing.food_id)}
                        className="w-7 h-7 opacity-0 group-hover:opacity-100 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Modo de preparo */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[9px] uppercase font-black tracking-widest text-white/30 mb-1.5 block">
                  <Clock className="w-3 h-3 inline mr-1" /> Preparo (min)
                </Label>
                <Input
                  type="number"
                  value={draft.prep_time_min || ''}
                  onChange={e => updateField('prep_time_min', Number(e.target.value))}
                  placeholder="0"
                  className="bg-neutral-900/80 border-white/10 text-white h-10 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-[9px] uppercase font-black tracking-widest text-white/30 mb-1.5 block">
                  <Clock className="w-3 h-3 inline mr-1" /> Cozimento (min)
                </Label>
                <Input
                  type="number"
                  value={draft.cook_time_min || ''}
                  onChange={e => updateField('cook_time_min', Number(e.target.value))}
                  placeholder="0"
                  className="bg-neutral-900/80 border-white/10 text-white h-10 rounded-xl"
                />
              </div>
            </div>
            <div>
              <Label className="text-[9px] uppercase font-black tracking-widest text-white/30 mb-1.5 block">
                Modo de preparo
              </Label>
              <Textarea
                value={draft.instructions}
                onChange={e => updateField('instructions', e.target.value)}
                placeholder="Descreva o passo a passo..."
                className="bg-neutral-900/80 border-white/10 text-white rounded-xl resize-none"
                rows={4}
              />
            </div>
          </div>

          {/* Compartilhar */}
          <div className="flex items-center gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
            <input
              type="checkbox"
              id="is_public"
              checked={draft.is_public}
              onChange={e => updateField('is_public', e.target.checked)}
              className="w-4 h-4 accent-emerald-500"
            />
            <label htmlFor="is_public" className="text-sm font-bold text-white/60 cursor-pointer">
              Compartilhar com outros nutricionistas do workspace
            </label>
          </div>

          {/* Espaço de respiro no final */}
          <div className="h-8" />
        </div>
      </ScrollArea>
    </div>
  );
};
