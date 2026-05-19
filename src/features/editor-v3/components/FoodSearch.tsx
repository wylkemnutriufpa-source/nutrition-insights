
import React, { useState } from 'react';
import { Search, Plus, Loader2 } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { searchV3LibraryItems } from '../utils/v3DataFetcher';
import { Food } from '../types/types';

interface FoodSearchProps {
  onSelect: (food: Food) => void;
  mealSlot?: string;
}

export const FoodSearch: React.FC<FoodSearchProps> = ({ onSelect, mealSlot }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (val.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    const data = await searchV3LibraryItems(val, 'all', mealSlot);
    setResults(data);
    setLoading(false);
  };

  const [suggested, setSuggested] = useState<any[]>([]);

  React.useEffect(() => {
    // Carregar sugestões iniciais baseadas no slot
    const loadInitial = async () => {
      setLoading(true);
      const data = await searchV3LibraryItems('', 'all', mealSlot);
      setSuggested(data.slice(0, 10));
      setLoading(false);
    };
    loadInitial();
  }, [mealSlot]);

  return (
    <div className="space-y-6">
      <div className="relative group">
        <div className="absolute inset-0 bg-emerald-500/10 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity rounded-2xl" />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-emerald-500 transition-colors" />
        <Input
          placeholder="Buscar na Biblioteca Soberana..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="bg-neutral-900/80 border-white/10 pl-12 h-14 rounded-2xl text-white placeholder:text-white/20 focus:border-emerald-500/50 focus:ring-emerald-500/20 text-base font-medium relative z-10"
          autoFocus
        />
      </div>

      <ScrollArea className="h-[400px] pr-4 relative z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Acessando Biblioteca Clínica...</p>
          </div>
        ) : (results.length > 0 || suggested.length > 0) ? (
          <div className="grid grid-cols-1 gap-3 pb-4">
            {(query.length >= 2 ? results : suggested).map((item) => (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                className="flex items-center justify-between p-4 rounded-[1.5rem] bg-white/[0.03] border border-white/5 hover:bg-emerald-500/[0.03] hover:border-emerald-500/40 hover:scale-[1.01] transition-all duration-300 text-left group shadow-sm gap-4"
              >
                {item.imageUrl && (
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-white/5 group-hover:border-emerald-500/20 transition-all">
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="text-base font-black uppercase italic tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                      {item.title || item.name}
                    </p>
                    {item.substitutions_group && (
                      <div className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-[7px] font-black text-blue-400 uppercase tracking-widest">
                        Possui Substitutos
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-[9px] text-white/40 uppercase font-black tracking-widest flex items-center gap-1.5">
                      <div className="w-1 h-1 rounded-full bg-orange-500" />
                      {Math.round(item.kcal_100g || item.kcal || 0)} kcal / 100g
                    </p>
                    <p className="text-[9px] text-white/40 uppercase font-black tracking-widest flex items-center gap-1.5">
                      <div className="w-1 h-1 rounded-full bg-emerald-500" />
                      {Math.round(item.protein_100g || item.protein || 0)}g Prot
                    </p>
                  </div>
                </div>
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-black transition-all">
                  <Plus className="w-5 h-5" />
                </div>
              </button>
            ))}
          </div>
        ) : query.length >= 2 ? (
          <div className="py-20 text-center">
            <p className="text-sm font-black text-white/20 uppercase tracking-[0.2em]">Nenhum item encontrado</p>
          </div>
        ) : null}
      </ScrollArea>
    </div>
  );
};
