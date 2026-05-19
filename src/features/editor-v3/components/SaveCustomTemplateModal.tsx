import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface SaveCustomTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  currentPlanData: any; // The state from EditorV3 (meals, etc)
}

export const SaveCustomTemplateModal: React.FC<SaveCustomTemplateModalProps> = ({
  isOpen, onClose, onSaved, currentPlanData
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('O título do template é obrigatório.');
      return;
    }
    if (!user?.id) {
      toast.error('Sessão inválida. Faça login novamente.');
      return;
    }

    setIsSaving(true);
    try {
      const allMeals = currentPlanData.meals || [];

      // Calcular kcal total real
      let totalKcal = 0;
      const day1Meals = allMeals.filter((m: any) => (m.day_of_week ?? 1) === (allMeals[0]?.day_of_week ?? 1));
      for (const m of day1Meals) {
        for (const it of (m.items || [])) {
          totalKcal += (it.kcal || 0);
        }
      }
      const kcalKey = Math.round(totalKcal / 100) * 100 || 2000;

      // Agrupar meals por day_of_week
      const dayMap = new Map<number, any[]>();
      for (const m of allMeals) {
        const d = m.day_of_week ?? 1;
        if (!dayMap.has(d)) dayMap.set(d, []);
        dayMap.get(d)!.push(m);
      }

      const days = Array.from(dayMap.entries()).map(([d, meals]) => ({
        day_of_week: d,
        meals
      }));

      // Se só tem 1 dia, replicar para 7
      if (days.length === 1) {
        const baseMeals = days[0].meals;
        days.length = 0;
        for (let d = 0; d < 7; d++) {
          days.push({
            day_of_week: d,
            meals: baseMeals.map((m: any) => ({ ...m, id: crypto.randomUUID(), day_of_week: d }))
          });
        }
      }

      const snapshot = { [String(kcalKey)]: { days } };

      // Extrair distribuição de refeições do primeiro dia
      const firstDayMeals = days[0]?.meals || [];
      const mealDistribution = firstDayMeals.map((m: any) => ({
        slot: m.name,
        time: m.time || '08:00'
      }));

      const slug = `custom-${user.id.substring(0,6)}-${Date.now()}`;

      const { error } = await supabase.from('v3_diet_templates').insert({
        slug,
        title,
        description,
        template_type: 'custom',
        objective: 'personalizado',
        meal_distribution: mealDistribution,
        cluster_map: {},
        kcal_profiles: [kcalKey],
        visual_style: 'premium',
        substitutions_enabled: true,
        editable: true,
        active: true,
        plan_snapshot: snapshot,
        nutritionist_id: user.id
      });

      if (error) throw error;

      toast.success('Template salvo com sucesso! Você pode encontrá-lo na Galeria de Templates.');
      if (onSaved) onSaved();
      onClose();
      setTitle('');
      setDescription('');
    } catch (err: any) {
      console.error('Error saving custom template:', err);
      toast.error('Erro ao salvar template', { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-neutral-900 border-white/10 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight italic flex items-center gap-2">
            <Save className="w-5 h-5 text-emerald-500" /> Salvar Meu Template
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest">
              Nome do Template
            </Label>
            <Input 
              placeholder="Ex: Minha Dieta Detox 7 Dias"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-neutral-800 border-white/10"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest">
              Descrição Curta (Opcional)
            </Label>
            <Textarea 
              placeholder="Descreva o objetivo ou características principais..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-neutral-800 border-white/10 min-h-[80px]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
          <Button variant="ghost" onClick={onClose} disabled={isSaving} className="text-white/60 hover:text-white">
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving || !title.trim()}
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold"
          >
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
