
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
    <div className="flex flex-col h-full">
      <div className="flex flex-col md:flex-row gap-6 mb-10 items-end">
        <div className="flex-1 w-full relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-emerald-500 transition-colors" />
          <Input 
            placeholder="Buscar por objetivo, nome ou ingrediente..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-14 pl-12 bg-white/5 border-white/10 rounded-2xl text-sm font-bold uppercase tracking-widest focus:ring-emerald-500/20 transition-all shadow-inner"
          />
        </div>
        
        <div className="flex gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/10">
          {categories.slice(0, 4).map(cat => (
            <Button
              key={cat}
              variant={activeCategory === cat ? 'default' : 'ghost'}
              onClick={() => setActiveCategory(cat)}
              className={`h-11 px-6 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                activeCategory === cat 
                  ? 'bg-emerald-500 text-black hover:bg-emerald-400' 
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1 pr-6 -mr-6">
        <AnimatePresence mode="popLayout">
          <motion.div 
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {filteredTemplates.map((template, idx) => (
              <motion.button
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                key={template.id}
                onClick={() => onSelect(template)}
                className="flex flex-col p-8 rounded-[3rem] bg-neutral-900/40 border border-white/5 hover:border-emerald-500/40 hover:bg-neutral-900 transition-all duration-700 text-left group relative overflow-hidden shadow-2xl"
              >
                <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 blur-[60px] -mr-20 -mt-20 rounded-full group-hover:bg-emerald-500/15 transition-all duration-700" />
                
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 group-hover:text-emerald-500 group-hover:bg-emerald-500/10 transition-all duration-500">
                    <Zap className="w-5 h-5" />
                  </div>
                  <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-white/10 text-white/20 px-2 py-0.5 rounded-md">
                    {template.objective || 'Soberano'}
                  </Badge>
                </div>

                <h4 className="text-2xl font-black uppercase italic tracking-tighter group-hover:text-emerald-400 transition-colors duration-500 leading-none">
                  {template.title}
                </h4>
                
                <p className="text-[11px] text-white/20 mt-6 line-clamp-3 uppercase font-bold leading-relaxed tracking-wide group-hover:text-white/40 transition-colors">
                  {template.description}
                </p>

                <div className="mt-10 flex items-center justify-between border-t border-white/5 pt-6">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-white/20">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-black tracking-widest">7 DIAS</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-white/20">
                      <Star className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-black tracking-widest">PRO</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-black transition-all duration-700 shadow-xl">
                    <ChevronRight className="w-5 h-5" />
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
      </ScrollArea>
    </div>
  );
};
