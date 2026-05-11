
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Save, Search, Layers, X } from 'lucide-react';
import { MealTemplate, Food } from '../types';
import { searchFoods } from '../utils/dataFetcher';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TemplateEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: MealTemplate | null;
  onSave: (updatedTemplate: MealTemplate) => void;
}

const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({
  isOpen,
  onClose,
  template,
  onSave
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<Food[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (template && isOpen) {
      setName(template.name);
      setDescription(template.description);
      setItems([...template.items]);
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [template, isOpen]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const results = await searchFoods(query);
    setSearchResults(results);
    setIsSearching(false);
  };

  const addItem = (food: Food) => {
    setItems([...items, { ...food, id: Math.random().toString(36).substring(2, 9) }]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleSave = async () => {
    if (!template || !name) return;
    
    setIsSaving(true);
    try {
      const foodsStructure = items.map(i => ({
        name: i.name,
        kcal: i.kcal,
        protein: i.protein,
        carbs: i.carbs,
        fat: i.fat,
        portion: i.portionLabel || "100g"
      }));

      const { error } = await supabase
        .from('nutritionist_meal_templates')
        .update({
          name: name,
          goal_tags: description.split(',').map(s => s.trim()).filter(s => s !== ''),
          foods_structure: foodsStructure,
          updated_at: new Date().toISOString()
        })
        .eq('id', template.id);

      if (error) throw error;

      const updatedTemplate: MealTemplate = {
        ...template,
        name,
        description,
        items
      };

      onSave(updatedTemplate);
      toast.success('Template personalizado com sucesso!');
      onClose();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error('Erro ao salvar template: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-neutral-900 border-white/10 text-white p-0 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 bg-white/[0.02]">
          <DialogHeader>
            <div className="flex items-center gap-3 text-amber-500 mb-1">
              <Layers className="w-5 h-5" />
              <DialogTitle className="text-xl font-black uppercase tracking-tight italic">Personalizar Template</DialogTitle>
            </div>
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Edite os itens e detalhes do seu template de refeição.</p>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Nome do Template</Label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Café da Manhã Hipercalórico"
                className="bg-white/5 border-white/10 text-white rounded-xl h-12 focus:ring-amber-500/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Tags / Descrição (separadas por vírgula)</Label>
              <Input 
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Hipertrofia, Pré-treino"
                className="bg-white/5 border-white/10 text-white rounded-xl h-12 focus:ring-amber-500/50"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Alimentos no Template</Label>
            <ScrollArea className="h-[200px] w-full rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-white/10 py-8">
                  <X className="w-8 h-8 opacity-20 mb-2" />
                  <p className="text-[10px] font-black uppercase">Nenhum alimento adicionado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 group hover:border-white/10 transition-all">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-white uppercase">{item.name}</span>
                        <span className="text-[9px] text-white/40 font-medium uppercase tracking-tighter">
                          {Math.round(item.kcal)} kcal • {item.portionLabel}
                        </span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeItem(item.id)}
                        className="h-8 w-8 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="space-y-3">
            <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Adicionar Alimento</Label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <Input 
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Buscar na base de dados..."
                className="pl-11 bg-white/5 border-white/10 text-white rounded-xl h-12 focus:ring-amber-500/50"
              />
            </div>

            {searchResults.length > 0 && (
              <div className="absolute z-50 w-[calc(100%-3rem)] mt-1 rounded-2xl border border-white/10 bg-neutral-800 shadow-2xl overflow-hidden max-h-[200px] overflow-y-auto">
                {searchResults.map((food) => (
                  <button
                    key={food.id}
                    onClick={() => addItem(food)}
                    className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                  >
                    <div className="text-left">
                      <p className="text-[11px] font-bold text-white uppercase">{food.name}</p>
                      <p className="text-[9px] text-white/40 uppercase">{Math.round(food.kcal)} kcal • {food.portionLabel}</p>
                    </div>
                    <Plus className="w-4 h-4 text-amber-500" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 bg-white/[0.02] border-t border-white/5 flex gap-3">
          <Button 
            onClick={handleSave}
            disabled={isSaving || !name || items.length === 0}
            className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest rounded-xl h-12 gap-2 shadow-lg shadow-amber-500/10"
          >
            {isSaving ? <Layers className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Template
          </Button>
          <Button 
            variant="outline" 
            onClick={onClose}
            className="px-8 border-white/10 bg-white/5 text-white hover:bg-white/10 rounded-xl h-12 uppercase font-black tracking-widest text-[10px]"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateEditorModal;
