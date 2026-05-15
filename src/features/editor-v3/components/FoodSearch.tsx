
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

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <Input
          placeholder="Buscar alimento real..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="bg-white/5 border-white/10 pl-10 h-12 rounded-xl text-white placeholder:text-white/20"
        />
      </div>

      <ScrollArea className="h-[300px] pr-4">
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-1 gap-2">
            {results.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-emerald-500/30 transition-all text-left group"
              >
                <div>
                  <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                    {item.title || item.name}
                  </p>
                  <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">
                    {item.kcal_100g || item.kcal || 0} kcal / 100g
                  </p>
                </div>
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                  <Plus className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>
        ) : query.length >= 2 ? (
          <p className="text-center text-white/30 py-10 text-xs uppercase font-black">Nenhum alimento encontrado</p>
        ) : (
          <p className="text-center text-white/30 py-10 text-xs uppercase font-black italic">Digite para buscar na biblioteca soberana</p>
        )}
      </ScrollArea>
    </div>
  );
};
