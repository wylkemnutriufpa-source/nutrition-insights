/**
 * 🔍 NOSFoodSearch — Componente de busca soberana de alimentos
 *
 * Sprint G: Substitui FoodSearch (v3DataFetcher) no Editor V3.
 *
 * Fontes em cascata (fallback automático):
 *   1. nos_foods (TACO + USDA + custom + brand) via RPC nos_search_foods
 *   2. nos_nutritionist_library (itens favoritos/pinados do nutricionista)
 *   3. v3_library_items (biblioteca visual legada — mantida durante transição)
 *
 * Retorna Food compatível com src/features/editor-v3/types/types.ts
 *
 * REGRA: Este componente SOMENTE existe no Editor (camada de autoria).
 * NUNCA importar no Patient App.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Loader2, Star, Flame, Beef, Wheat, Droplets, Database, ChefHat, BookOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useNOSFoodSearch, type NOSFoodResult } from '../hooks/useNOSFoodSearch';
import { calcMacros } from '../engine/calcEngine';
import type { Food } from '@/features/editor-v3/types/types';
import { useAuth } from '@/lib/auth';

interface NOSFoodSearchProps {
  onSelect: (food: Food) => void;
  mealSlot?: string;
}

// Mapeia fonte para badge visual
const SOURCE_BADGE: Record<string, { label: string; color: string }> = {
  TACO:       { label: 'TACO',   color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' },
  USDA:       { label: 'USDA',   color: 'bg-blue-500/20 text-blue-400 border-blue-500/20' },
  IBGE:       { label: 'IBGE',   color: 'bg-purple-500/20 text-purple-400 border-purple-500/20' },
  custom:     { label: 'Meu',    color: 'bg-amber-500/20 text-amber-400 border-amber-500/20' },
  brand:      { label: 'Marca',  color: 'bg-orange-500/20 text-orange-400 border-orange-500/20' },
  supplement: { label: 'Supl',   color: 'bg-pink-500/20 text-pink-400 border-pink-500/20' },
};

/**
 * Converte NOSFoodResult → Food (compatível com Editor V3)
 * Preserva macros por 100g para cálculo proporcional no editor
 */
function nosResultToFood(item: NOSFoodResult, qty_g?: number): Food {
  const portion = qty_g ?? item.portion_g ?? 100;
  const macros = calcMacros(
    {
      kcal_100g:    item.kcal_100g,
      protein_100g: item.protein_100g,
      carbs_100g:   item.carbs_100g,
      fat_100g:     item.fat_100g,
      fiber_100g:   item.fiber_100g,
    },
    portion
  );

  return {
    id: item.id,
    name: item.name,
    // Macros para a porção de referência (usados pelo editor para exibição inicial)
    kcal:    macros.kcal,
    protein: macros.protein_g,
    carbs:   macros.carbs_g,
    fat:     macros.fat_g,
    // Base por 100g para cálculos proporcionais no editor
    kcal_100g:    item.kcal_100g,
    protein_100g: item.protein_100g,
    carb_100g:    item.carbs_100g,
    fat_100g:     item.fat_100g,
    // Gramagem padrão
    clinical_mass_g: portion,
    portionValue:    portion,
    portionUnitLabel: item.portion_label || `${portion}g`,
    quantity: portion,
    // Metadados
    category:  item.category || '',
    imageUrl:  item.image_url || undefined,
    substitutions: [],
  };
}

export const NOSFoodSearch: React.FC<NOSFoodSearchProps> = ({ onSelect, mealSlot }) => {
  const { user } = useAuth();
  const { results: nosResults, loading: nosLoading, search, clear } = useNOSFoodSearch(20);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'database' | 'library' | 'legacy'>('database');
  const [libraryItems, setLibraryItems] = useState<any[]>([]);
  const [legacyResults, setLegacyResults] = useState<any[]>([]);
  const [legacyLoading, setLegacyLoading] = useState(false);
  const [pinned, setPinned] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Foca no input ao montar
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Carrega itens pinados da biblioteca pessoal
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('nos_nutritionist_library' as any)
      .select('*')
      .eq('nutritionist_id', user.id)
      .eq('pinned', true)
      .order('use_count', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setPinned(data as any[]);
      });
  }, [user?.id]);

  // Carrega biblioteca pessoal completa
  useEffect(() => {
    if (!user?.id || tab !== 'library') return;
    const q = query.trim();
    supabase
      .from('nos_nutritionist_library' as any)
      .select('*')
      .eq('nutritionist_id', user.id)
      .order('use_count', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (!data) return;
        if (q.length >= 2) {
          const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          setLibraryItems((data as any[]).filter((item: any) => {
            const name = norm(item.item_snapshot?.name || item.nickname || '');
            return name.includes(norm(q));
          }));
        } else {
          setLibraryItems(data as any[]);
        }
      });
  }, [tab, query, user?.id]);

  // Busca legada na v3_library_items como fallback
  const searchLegacy = async (q: string) => {
    setLegacyLoading(true);
    try {
      const { data } = await supabase
        .from('v3_library_items')
        .select('*, images:v3_library_images(*)')
        .or(`title.ilike.%${q}%,slug.ilike.%${q}%`)
        .eq('active', true)
        .limit(20);
      setLegacyResults((data || []).map((item: any) => ({
        ...item,
        name: item.title || item.name,
        imageUrl: item.images?.[0]?.image_asset || item.images?.[0]?.image_url || null,
        kcal: item.kcal_base || item.kcal_100g || 0,
        protein: item.protein_base || item.protein_100g || 0,
        carbs: item.carbs_base || item.carb_100g || 0,
        fat: item.fats_base || item.fat_100g || 0,
        kcal_100g: item.kcal_100g || item.kcal_base || 0,
        protein_100g: item.protein_100g || item.protein_base || 0,
        carb_100g: item.carb_100g || item.carbs_base || 0,
        fat_100g: item.fat_100g || item.fats_base || 0,
      })));
    } finally {
      setLegacyLoading(false);
    }
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (tab === 'database') {
      search(val);
    } else if (tab === 'legacy' && val.length >= 2) {
      searchLegacy(val);
    }
  };

  const handleTabChange = (t: typeof tab) => {
    setTab(t);
    if (t === 'database' && query.length >= 2) search(query);
    if (t === 'legacy' && query.length >= 2) searchLegacy(query);
  };

  const handleSelectNOS = (item: NOSFoodResult) => {
    const food = nosResultToFood(item);
    // Incrementa use_count na biblioteca se existir
    if (user?.id) {
      supabase
        .from('nos_nutritionist_library' as any)
        .update({ use_count: supabase.rpc as any, last_used_at: new Date().toISOString() } as any)
        .eq('nutritionist_id', user.id)
        .eq('item_id', item.id)
        .then(() => {});
    }
    onSelect(food);
  };

  const handleSelectLegacy = (item: any) => {
    const food: Food = {
      id: item.id || crypto.randomUUID(),
      name: item.name || item.title || 'Alimento',
      kcal: item.kcal || 0,
      protein: item.protein || 0,
      carbs: item.carbs || 0,
      fat: item.fat || 0,
      kcal_100g: item.kcal_100g || item.kcal || 0,
      protein_100g: item.protein_100g || item.protein || 0,
      carb_100g: item.carb_100g || item.carbs || 0,
      fat_100g: item.fat_100g || item.fat || 0,
      clinical_mass_g: item.clinical_mass_g || item.portion_g || 100,
      portionValue: item.portion_g || 100,
      portionUnitLabel: item.portion_label || '100g',
      quantity: item.portion_g || 100,
      category: item.category || '',
      imageUrl: item.imageUrl || item.image_url || undefined,
      substitutions: item.substitutions || [],
    };
    onSelect(food);
  };

  const handleSelectLibrary = (item: any) => {
    const snap = item.item_snapshot || {};
    onSelect({
      id: snap.id || item.item_id,
      name: snap.name || item.nickname || 'Alimento',
      kcal: snap.kcal || 0,
      protein: snap.protein || 0,
      carbs: snap.carbs || 0,
      fat: snap.fat || 0,
      kcal_100g: snap.kcal_100g || snap.kcal || 0,
      protein_100g: snap.protein_100g || snap.protein || 0,
      carb_100g: snap.carb_100g || snap.carbs || 0,
      fat_100g: snap.fat_100g || snap.fat || 0,
      clinical_mass_g: snap.clinical_mass_g || snap.portion_g || 100,
      portionValue: snap.portion_g || 100,
      category: snap.category || '',
      imageUrl: snap.image_url || undefined,
      substitutions: [],
    });
  };

  const isLoading = tab === 'database' ? nosLoading : tab === 'legacy' ? legacyLoading : false;
  const showResults = tab === 'database' ? nosResults :
                      tab === 'library' ? libraryItems :
                      legacyResults;

  return (
    <div className="space-y-4">
      {/* Input de busca */}
      <div className="relative group">
        <div className="absolute inset-0 bg-emerald-500/10 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity rounded-2xl" />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-emerald-500 transition-colors" />
        <Input
          ref={inputRef}
          placeholder="Buscar alimento... (TACO, USDA, custom)"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          className="bg-neutral-900/80 border-white/10 pl-12 h-14 rounded-2xl text-white placeholder:text-white/20 focus:border-emerald-500/50 focus:ring-emerald-500/20 text-base font-medium relative z-10"
        />
      </div>

      {/* Tabs de fonte */}
      <div className="flex gap-2">
        {([
          { id: 'database', label: 'Base NOS', icon: <Database className="w-3 h-3" /> },
          { id: 'library',  label: 'Minha Biblioteca', icon: <BookOpen className="w-3 h-3" /> },
          { id: 'legacy',   label: 'Visual Library', icon: <ChefHat className="w-3 h-3" /> },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              tab === t.id
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-white/30 hover:text-white/60 border border-white/5 hover:border-white/10'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Itens pinados (atalho rápido quando sem query) */}
      {query.length < 2 && tab === 'database' && pinned.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-white/20 flex items-center gap-1.5">
            <Star className="w-3 h-3 text-amber-400" /> Favoritos
          </p>
          <div className="flex flex-wrap gap-2">
            {pinned.map((p: any) => (
              <button
                key={p.id}
                onClick={() => handleSelectLibrary(p)}
                className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] font-bold text-amber-400 hover:bg-amber-500/20 transition-all"
              >
                {p.nickname || p.item_snapshot?.name || 'Item'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lista de resultados */}
      <ScrollArea className="h-[350px] pr-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
              {tab === 'database' ? 'Consultando base NOS...' : 'Buscando...'}
            </p>
          </div>
        ) : showResults.length > 0 ? (
          <div className="space-y-2 pb-4">
            {tab === 'database' && (nosResults as NOSFoodResult[]).map((item) => {
              const badge = SOURCE_BADGE[item.source] || SOURCE_BADGE.custom;
              const portion = item.portion_g ?? 100;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectNOS(item)}
                  className="w-full flex items-center justify-between p-4 rounded-[1.5rem] bg-white/[0.03] border border-white/5 hover:bg-emerald-500/[0.03] hover:border-emerald-500/40 transition-all duration-200 text-left group gap-3"
                >
                  {item.image_url && (
                    <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 border border-white/5">
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-sm font-black uppercase italic tracking-tight text-white group-hover:text-emerald-400 transition-colors truncate">
                        {item.name}
                      </p>
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border ${badge.color}`}>
                        {badge.label}
                      </span>
                      {item.verified && (
                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          ✓ Verificado
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] text-white/30 font-medium">{item.portion_label || `${portion}g`}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[9px] text-white/40 flex items-center gap-0.5">
                        <Flame className="w-2.5 h-2.5 text-orange-400" />
                        {Math.round(item.kcal_100g * portion / 100)} kcal
                      </span>
                      <span className="text-[9px] text-white/40 flex items-center gap-0.5">
                        <Beef className="w-2.5 h-2.5 text-red-400" />
                        {(item.protein_100g * portion / 100).toFixed(1)}g
                      </span>
                      <span className="text-[9px] text-white/40 flex items-center gap-0.5">
                        <Wheat className="w-2.5 h-2.5 text-amber-400" />
                        {(item.carbs_100g * portion / 100).toFixed(1)}g
                      </span>
                      <span className="text-[9px] text-white/40 flex items-center gap-0.5">
                        <Droplets className="w-2.5 h-2.5 text-blue-400" />
                        {(item.fat_100g * portion / 100).toFixed(1)}g
                      </span>
                    </div>
                  </div>
                  <div className="w-9 h-9 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-black transition-all flex-shrink-0">
                    <Plus className="w-4 h-4" />
                  </div>
                </button>
              );
            })}

            {tab === 'library' && libraryItems.map((item: any) => (
              <button
                key={item.id}
                onClick={() => handleSelectLibrary(item)}
                className="w-full flex items-center justify-between p-4 rounded-[1.5rem] bg-white/[0.03] border border-white/5 hover:bg-amber-500/[0.03] hover:border-amber-500/40 transition-all text-left group gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-black uppercase italic tracking-tight text-white group-hover:text-amber-400 transition-colors">
                      {item.nickname || item.item_snapshot?.name || 'Item'}
                    </p>
                    {item.pinned && <Star className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                  </div>
                  <p className="text-[9px] text-white/30">{item.item_type}</p>
                </div>
                <div className="w-9 h-9 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-black transition-all">
                  <Plus className="w-4 h-4" />
                </div>
              </button>
            ))}

            {tab === 'legacy' && legacyResults.map((item: any) => (
              <button
                key={item.id}
                onClick={() => handleSelectLegacy(item)}
                className="w-full flex items-center justify-between p-4 rounded-[1.5rem] bg-white/[0.03] border border-white/5 hover:bg-blue-500/[0.03] hover:border-blue-500/40 transition-all text-left group gap-3"
              >
                {item.imageUrl && (
                  <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 border border-white/5">
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black uppercase italic tracking-tight text-white group-hover:text-blue-400 transition-colors truncate">
                    {item.name}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[9px] text-white/40 flex items-center gap-0.5">
                      <Flame className="w-2.5 h-2.5 text-orange-400" />{Math.round(item.kcal)} kcal
                    </span>
                    <span className="text-[9px] text-white/40 flex items-center gap-0.5">
                      <Beef className="w-2.5 h-2.5 text-red-400" />{item.protein}g
                    </span>
                  </div>
                </div>
                <div className="w-9 h-9 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-black transition-all">
                  <Plus className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>
        ) : query.length >= 2 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-black text-white/20 uppercase tracking-[0.2em]">Nenhum resultado</p>
            <p className="text-[10px] text-white/10 mt-2">Tente outra fonte ou verifique a ortografia</p>
          </div>
        ) : (
          <div className="py-16 text-center">
            <p className="text-[10px] font-black text-white/10 uppercase tracking-[0.2em]">
              Digite para buscar na base NOS (TACO + USDA)
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
