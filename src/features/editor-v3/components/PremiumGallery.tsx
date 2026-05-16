
import React, { useState, useMemo } from 'react';
import { Search, Filter, Layout, ChevronRight, Tag, Zap, Clock, Star, Library } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { V3DietTemplate } from '../types/types';
import { motion, AnimatePresence } from 'framer-motion';

interface PremiumGalleryProps {
  templates: V3DietTemplate[];
  onSelect: (template: V3DietTemplate) => void;
}

export const PremiumGallery: React.FC<PremiumGalleryProps> = ({ templates, onSelect }) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Todos');

  const categories = useMemo(() => {
    const cats = new Set<string>(['Todos']);
    templates.forEach(t => {
      if (t.objective) cats.add(t.objective);
    });
    return Array.from(cats);
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                           t.description?.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === 'Todos' || t.objective === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [templates, search, activeCategory]);

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full overflow-hidden">
      <div className="flex flex-col md:flex-row gap-4 mb-6 items-end flex-shrink-0 relative z-20">
        <div className="flex-1 w-full relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-emerald-500 transition-colors" />
          <Input 
            placeholder="Buscar Protocolo Clínico..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 pl-10 bg-white/5 border-white/10 rounded-xl text-[11px] font-black uppercase tracking-widest focus:ring-emerald-500/20 transition-all shadow-inner"
          />
        </div>
        
        <div className="flex gap-1.5 p-1 bg-white/5 rounded-xl border border-white/10 overflow-x-auto no-scrollbar max-w-full">
          {categories.map(cat => (
            <Button
              key={cat}
              variant={activeCategory === cat ? 'default' : 'ghost'}
              onClick={() => setActiveCategory(cat)}
              className={`h-9 px-4 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all flex-shrink-0 ${
                activeCategory === cat 
                  ? 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                  : 'text-white/30 hover:text-white hover:bg-white/5'
              }`}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 -mr-2 custom-scrollbar pb-20">
        <AnimatePresence mode="popLayout">
          <motion.div 
            layout
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
          >
            {filteredTemplates.map((template, idx) => (
              <motion.button
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: idx * 0.02 }}
                key={template.id}
                onClick={() => onSelect(template)}
                className="flex flex-col p-5 rounded-2xl bg-neutral-900/60 border border-white/5 hover:border-emerald-500/50 hover:bg-neutral-800 transition-all duration-300 text-left group relative overflow-hidden shadow-xl min-h-[180px]"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-[30px] -mr-12 -mt-12 rounded-full group-hover:bg-emerald-500/10 transition-all" />
                
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <Badge variant="outline" className="text-[7px] font-black uppercase tracking-[0.15em] border-emerald-500/20 bg-emerald-500/5 text-emerald-500 px-2 py-0.5 rounded-sm">
                    {template.objective?.split(' ')[0] || 'V3'}
                  </Badge>
                  <div className="flex items-center gap-1.5 opacity-30 group-hover:opacity-100 transition-opacity">
                    <Star className="w-3 h-3 text-emerald-500" />
                    <span className="text-[8px] font-black">PRO</span>
                  </div>
                </div>

                <h4 className="text-sm font-black uppercase italic tracking-tight group-hover:text-emerald-400 transition-colors duration-300 leading-tight mb-2 line-clamp-2 relative z-10">
                  {template.title}
                </h4>
                
                <p className="text-[9px] text-white/30 line-clamp-2 uppercase font-bold leading-tight tracking-wide group-hover:text-white/50 transition-colors relative z-10 mb-4">
                  {template.description}
                </p>

                <div className="mt-auto pt-4 flex items-center justify-between border-t border-white/5 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-white/20 group-hover:text-white/40 transition-colors">
                      <Clock className="w-2.5 h-2.5" />
                      <span className="text-[8px] font-black tracking-widest uppercase">7D</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-white/20 group-hover:text-white/40 transition-colors">
                      <Zap className="w-2.5 h-2.5" />
                      <span className="text-[8px] font-black tracking-widest uppercase">{template.kcal_profiles?.length || 5}P</span>
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-black transition-all duration-300">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </motion.button>
            ))}
          </motion.div>
        </AnimatePresence>
        
        {filteredTemplates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
              <Search className="w-10 h-10 text-white/10" />
            </div>
            <h3 className="text-xl font-black uppercase italic tracking-tighter text-white/40">Nenhum template encontrado</h3>
            <p className="text-xs text-white/20 uppercase font-bold tracking-widest mt-2">Tente ajustar sua busca ou filtros</p>
          </div>
        )}
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(16, 185, 129, 0.5);
          border-radius: 10px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(16, 185, 129, 0.8);
          border: 2px solid transparent;
          background-clip: content-box;
        }
      `}</style>
    </div>
  );
};
