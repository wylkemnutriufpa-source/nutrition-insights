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
      // Create a snapshot mimicking the Premium Templates
      const snapshot = {
        "custom": {
          days: [
            {
              day_of_week: 1, // Store as a generic single day plan
              meals: currentPlanData.meals || []
            }
          ]
        }
      };

      const mealDistribution = currentPlanData.meals?.map((m: any) => ({
        slot: m.name,
        time: m.time || '08:00'
      })) || [];

      // Create slug
      const slug = `custom-${user.id.substring(0,6)}-${Date.now()}`;

      const { error } = await supabase.from('v3_diet_templates').insert({
        slug,
        title,
        description,
        template_type: 'custom',
        objective: 'personalizado',
        meal_distribution: mealDistribution,
        cluster_map: {},
        kcal_profiles: [],
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
