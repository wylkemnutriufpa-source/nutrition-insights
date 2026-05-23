/**
 * 🥡 ComboBuilder — Sprint I
 *
 * UI para criar marmitas, refeições prontas e combos.
 * Macros calculados em tempo real via calcEngine.
 * Salva em nos_meal_combos com snapshot congelado.
 * Integrado no Editor V3 — adiciona todos os itens do combo
 * diretamente em uma refeição.
 *
 * SOMENTE no Editor V3. NUNCA importar no Patient App.
 */

import React, { useState } from 'react';
import {
  Package, Plus, Trash2, Save, Loader2,
  Flame, Beef, Wheat, Droplets,
  X, Send, ChevronDown, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  useComboBuilder,
  COMBO_TYPE_LABELS,
  MEAL_SLOT_OPTIONS,
  type ComboType,
} from '../hooks/useComboBuilder';
import { useMyLibrary } from '../hooks/useMyLibrary';
import { NOSFoodSearch } from './NOSFoodSearch';
import type { Food } from '@/features/editor-v3/types/types';

interface ComboBuilderProps {
  /** Ao confirmar "Adicionar ao Plano", retorna a lista de Foods para o editor */
  onAddToMeal?: (foods: Food[]) => void;
  onCancel?: () => void;
}

function MacroBar({ kcal, protein, carbs, fat }: { kcal: number; protein: number; carbs: number; fat: number }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {[
        { icon: <Flame className="w-3 h-3" />, val: kcal, unit: 'kcal', color: 'text-orange-400' },
        { icon: <Beef className="w-3 h-3" />,  val: protein, unit: 'P',  color: 'text-red-400' },
        { icon: <Wheat className="w-3 h-3" />, val: carbs,   unit: 'C',  color: 'text-amber-400' },
        { icon: <Droplets className="w-3 h-3" />, val: fat,  unit: 'G',  color: 'text-blue-400' },
      ].map(m => (
        <span key={m.unit} className={`flex items-center gap-1 text-[10px] font-black ${m.color}`}>
          {m.icon} {Math.round(m.val)}{m.unit}
        </span>
      ))}
    </div>
  );
}

export const ComboBuilder: React.FC<ComboBuilderProps> = ({ onAddToMeal, onCancel }) => {
  const {
    draft, totalMacros,
    updateField, addItem, updateItemQty, removeItem,
    resetDraft, save, saving, comboToFoods,
  } = useComboBuilder();

  const { combos, loading: libraryLoading, refetch } = useMyLibrary('all');

  const [tab, setTab] = useState<'build' | 'library'>('build');
  const [showFoodSearch, setShowFoodSearch] = useState(false);
  const [pendingQty, setPendingQty] = useState<Record<string, string>>({});

  const handleFoodSelect = (food: Food) => {
    addItem({
      id:           food.id,
      name:         food.name,
      type:         'food',
      kcal_100g:    food.kcal_100g ?? food.kcal ?? 0,
      protein_100g: food.protein_100g ?? food.protein ?? 0,
      carbs_100g:   food.carb_100g ?? food.carbs ?? 0,
      fat_100g:     food.fat_100g ?? food.fat ?? 0,
      portion_g:    food.clinical_mass_g ?? 100,
      portion_label: food.portionUnitLabel,
      image_url:    food.imageUrl ?? null,
    });
    setShowFoodSearch(false);
  };

  const handleSave = async () => {
    const id = await save();
    if (id) { resetDraft(); refetch(); setTab('library'); }
  };

  const handleAddToMeal = (foods: Food[]) => {
    if (onAddToMeal) onAddToMeal(foods);
  };

  const handleQtyBlur = (itemId: string) => {
    const raw = pendingQty[itemId];
    if (!raw) return;
    const parsed = parseFloat(raw.replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) updateItemQty(itemId, parsed);
    setPendingQty(prev => { const n = { ...prev }; delete n[itemId]; return n; });
  };

  return (
    <div className="flex flex-col h-full bg-neutral-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-neutral-900/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 border border-amber-500/20">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black uppercase italic tracking-tighter">Combo Builder</h2>
            <p className="text-[9px] uppercase font-black tracking-widest text-white/20">Marmitas · Refeições · Combos</p>
          </div>
        </div>
        {onCancel && (
          <Button variant="ghost" size="icon" onClick={onCancel} className="text-white/30 hover:text-white">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-4 pb-0">
        {(['build', 'library'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              tab === t
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-white/30 hover:text-white/60 border border-transparent'
            }`}
          >
            {t === 'build' ? '+ Novo Combo' : `Minha Biblioteca (${combos.length})`}
          </button>
        ))}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-5 max-w-2xl mx-auto">

          {/* ── TAB BUILD ─────────────────────────────── */}
          {tab === 'build' && (
            <>
              {/* Nome */}
              <div>
                <Label className="text-[9px] uppercase font-black tracking-widest text-white/30 mb-1.5 block">Nome do Combo *</Label>
                <Input
                  value={draft.name}
                  onChange={e => updateField('name', e.target.value)}
                  placeholder="Ex: Marmita Fitness Segunda"
                  className="bg-neutral-900/80 border-white/10 text-white h-12 rounded-xl font-bold"
                  autoFocus
                />
              </div>

              {/* Tipo + Slot */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[9px] uppercase font-black tracking-widest text-white/30 mb-1.5 block">Tipo</Label>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(COMBO_TYPE_LABELS) as ComboType[]).map(t => {
                      const cfg = COMBO_TYPE_LABELS[t];
                      return (
                        <button
                          key={t}
                          onClick={() => updateField('combo_type', t)}
                          className={`px-3 py-1.5 rounded-xl text-[9px] font-black border transition-all ${
                            draft.combo_type === t ? cfg.color : 'border-white/5 text-white/20 hover:border-white/20'
                          }`}
                        >
                          {cfg.emoji} {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <Label className="text-[9px] uppercase font-black tracking-widest text-white/30 mb-1.5 block">Slot da Refeição</Label>
                  <select
                    value={draft.meal_slot}
                    onChange={e => updateField('meal_slot', e.target.value)}
                    className="w-full bg-neutral-900/80 border border-white/10 text-white h-10 rounded-xl px-3 text-sm font-bold"
                  >
                    {MEAL_SLOT_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Totalizador de macros tempo real */}
              {draft.items.length > 0 && (
                <div className="bg-neutral-900/60 border border-amber-500/20 rounded-2xl p-4">
                  <p className="text-[9px] uppercase font-black tracking-widest text-amber-400/60 mb-2">Total do combo</p>
                  <MacroBar
                    kcal={totalMacros.kcal}
                    protein={totalMacros.protein_g}
                    carbs={totalMacros.carbs_g}
                    fat={totalMacros.fat_g}
                  />
                </div>
              )}

              {/* Itens */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-[9px] uppercase font-black tracking-widest text-white/30">
                    Itens do combo ({draft.items.length})
                  </Label>
                  <Button
                    size="sm"
                    onClick={() => setShowFoodSearch(v => !v)}
                    className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 text-[9px] uppercase font-black tracking-widest h-7 px-3 rounded-lg"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {showFoodSearch ? 'Fechar' : 'Adicionar item'}
                  </Button>
                </div>

                {showFoodSearch && (
                  <div className="bg-neutral-900/80 border border-white/10 rounded-2xl p-4">
                    <NOSFoodSearch onSelect={handleFoodSelect} />
                  </div>
                )}

                {draft.items.length === 0 ? (
                  <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-2xl">
                    <Package className="w-8 h-8 text-white/10 mx-auto mb-2" />
                    <p className="text-[10px] uppercase font-black text-white/10">Combo vazio</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {draft.items.map(item => {
                      const qtyVal = pendingQty[item.id] !== undefined
                        ? pendingQty[item.id]
                        : String(item.qty_g);
                      return (
                        <div key={item.id} className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/5 rounded-xl group">
                          {item.image_url && (
                            <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 border border-white/5">
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{item.name}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-[9px] font-medium">
                              <span className="text-orange-400">{Math.round(item.kcal)} kcal</span>
                              <span className="text-red-400">P{item.protein_g.toFixed(1)}g</span>
                              <span className="text-amber-400">C{item.carbs_g.toFixed(1)}g</span>
                              <span className="text-blue-400">G{item.fat_g.toFixed(1)}g</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Input
                              type="number"
                              value={qtyVal}
                              onChange={e => setPendingQty(prev => ({ ...prev, [item.id]: e.target.value }))}
                              onBlur={() => handleQtyBlur(item.id)}
                              onKeyDown={e => e.key === 'Enter' && handleQtyBlur(item.id)}
                              className="w-16 h-8 bg-neutral-900 border-white/10 text-white text-center text-xs font-bold rounded-lg"
                            />
                            <span className="text-[9px] text-white/20 font-black">g</span>
                          </div>
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => removeItem(item.id)}
                            className="w-7 h-7 opacity-0 group-hover:opacity-100 text-red-400 hover:bg-red-500/10 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Ações */}
              {draft.items.length > 0 && (
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleSave}
                    disabled={saving || !draft.name.trim()}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest text-[10px] h-11 rounded-xl"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Salvar na Biblioteca
                  </Button>
                  {onAddToMeal && (
                    <Button
                      onClick={() => handleAddToMeal(comboToFoods() as any)}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest text-[10px] h-11 rounded-xl"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Adicionar ao Plano
                    </Button>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── TAB LIBRARY ───────────────────────────── */}
          {tab === 'library' && (
            <div className="space-y-3">
              {libraryLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                </div>
              ) : combos.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed border-white/5 rounded-2xl">
                  <Package className="w-10 h-10 text-white/10 mx-auto mb-3" />
                  <p className="text-[10px] uppercase font-black text-white/10">Nenhum combo salvo</p>
                  <p className="text-[9px] text-white/10 mt-1">Crie um combo na aba "Novo Combo"</p>
                </div>
              ) : (
                combos.map(combo => {
                  const cfg = COMBO_TYPE_LABELS[combo.combo_type] ?? COMBO_TYPE_LABELS.combo;
                  return (
                    <div key={combo.id} className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl group hover:border-amber-500/30 transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-lg">{cfg.emoji}</span>
                            <p className="text-sm font-black text-white uppercase italic truncate">{combo.name}</p>
                            <Badge className={`text-[8px] font-black border px-1.5 py-0 ${cfg.color}`}>
                              {cfg.label}
                            </Badge>
                            {combo.use_count > 0 && (
                              <span className="flex items-center gap-0.5 text-[8px] text-white/20 font-black">
                                <Star className="w-2.5 h-2.5" /> {combo.use_count}x
                              </span>
                            )}
                          </div>
                          <MacroBar
                            kcal={combo.kcal_total}
                            protein={combo.protein_total}
                            carbs={combo.carbs_total}
                            fat={combo.fat_total}
                          />
                          <p className="text-[9px] text-white/20 mt-1">{combo.items?.length || 0} itens</p>
                        </div>
                        {onAddToMeal && (
                          <Button
                            size="sm"
                            onClick={() => {
                              // Converte itens do combo salvo → Food[] para o editor
                              const foods = (combo.items || []).map((item: any) => ({
                                id:           item.source_id || item.id,
                                name:         item.name,
                                kcal:         item.kcal,
                                protein:      item.protein_g,
                                carbs:        item.carbs_g,
                                fat:          item.fat_g,
                                kcal_100g:    item.kcal_100g,
                                protein_100g: item.protein_100g,
                                carb_100g:    item.carbs_100g,
                                fat_100g:     item.fat_100g,
                                clinical_mass_g: item.qty_g,
                                portionValue:    item.qty_g,
                                portionUnitLabel: item.quantity_display || `${item.qty_g}g`,
                                quantity:        item.qty_g,
                                imageUrl:        item.image_url ?? undefined,
                                substitutions:   [],
                              }));
                              handleAddToMeal(foods as any);
                            }}
                            className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-black text-[9px] uppercase font-black h-8 px-3 rounded-xl transition-all"
                          >
                            <Send className="w-3 h-3 mr-1" /> Usar
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          <div className="h-6" />
        </div>
      </ScrollArea>
    </div>
  );
};
