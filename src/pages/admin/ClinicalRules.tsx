import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Plus, Trash2, ShieldCheck, History, Save, 
  Stethoscope, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Rule {
  id: string;
  condition_name: string;
  description: string;
  restrictions: string[];
  recommendations: string[];
  version: number;
}

const ClinicalRulesAdmin: React.FC = () => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<Partial<Rule> | null>(null);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('meal_clinical_rules')
      .select('*')
      .order('condition_name');
    
    if (data) setRules(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!editingRule?.condition_name) {
      toast.error('Nome da condição é obrigatório');
      return;
    }

    const { id, ...payload } = editingRule;
    
    if (id) {
      const { error } = await supabase
        .from('meal_clinical_rules')
        .update({ ...payload, version: (editingRule.version || 1) + 1 })
        .eq('id', id);
      
      if (!error) toast.success('Regra atualizada (v' + ((editingRule.version || 1) + 1) + ')');
    } else {
      const { error } = await supabase
        .from('meal_clinical_rules')
        .insert([payload]);
      
      if (!error) toast.success('Nova regra criada');
    }

    setEditingRule(null);
    fetchRules();
  };

  const handleAddItem = (field: 'restrictions' | 'recommendations', value: string) => {
    if (!value) return;
    const current = editingRule?.[field] || [];
    setEditingRule({ ...editingRule, [field]: [...current, value] });
  };

  const handleRemoveItem = (field: 'restrictions' | 'recommendations', index: number) => {
    const current = editingRule?.[field] || [];
    setEditingRule({ ...editingRule, [field]: current.filter((_, i) => i !== index) });
  };

  return (
    <div className="container mx-auto py-10 space-y-8 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciar Regras Clínicas</h1>
          <p className="text-muted-foreground">Configure restrições e recomendações sem depender de código.</p>
        </div>
        <Button onClick={() => setEditingRule({ restrictions: [], recommendations: [] })} className="rounded-full shadow-lg">
          <Plus className="w-4 h-4 mr-2" /> NOVA CONDIÇÃO
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-4">
          <h2 className="text-xs font-bold uppercase text-muted-foreground tracking-widest px-1">Condições Ativas</h2>
          <div className="grid gap-3">
            {rules.map(rule => (
              <Card 
                key={rule.id} 
                className={cn(
                  "p-4 cursor-pointer hover:border-primary transition-all group relative overflow-hidden",
                  editingRule?.id === rule.id && "border-primary bg-primary/5"
                )}
                onClick={() => setEditingRule(rule)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm">{rule.condition_name}</h3>
                    <p className="text-[10px] text-muted-foreground mt-1">Versão {rule.version}</p>
                  </div>
                  <ShieldCheck className={cn("w-4 h-4", editingRule?.id === rule.id ? "text-primary" : "text-muted-foreground opacity-20")} />
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          <AnimatePresence mode="wait">
            {editingRule ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="p-8 space-y-6 shadow-xl border-primary/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                        <Stethoscope className="w-6 h-6" />
                      </div>
                      <h2 className="text-xl font-bold">{editingRule.id ? 'Editar Condição' : 'Nova Condição'}</h2>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={() => setEditingRule(null)}>Cancelar</Button>
                      <Button onClick={handleSave} className="px-8"><Save className="w-4 h-4 mr-2" /> SALVAR VERSÃO</Button>
                    </div>
                  </div>

                  <div className="grid gap-6">
                    <div className="space-y-2">
                      <Label>Nome da Condição</Label>
                      <Input 
                        value={editingRule.condition_name || ''} 
                        onChange={e => setEditingRule({...editingRule, condition_name: e.target.value})}
                        placeholder="Ex: Gastrite, Diabetes Tipo 2..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Descrição / Objetivo</Label>
                      <Textarea 
                        value={editingRule.description || ''} 
                        onChange={e => setEditingRule({...editingRule, description: e.target.value})}
                        placeholder="Descreva o propósito clínico desta regra..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <Label className="text-red-500">Restrições (IDs ou Nomes)</Label>
                        <div className="flex gap-2">
                          <Input id="new-restriction" placeholder="Adicionar item..." onKeyDown={e => {
                            if (e.key === 'Enter') {
                              handleAddItem('restrictions', (e.target as HTMLInputElement).value);
                              (e.target as HTMLInputElement).value = '';
                            }
                          }} />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {editingRule.restrictions?.map((r, i) => (
                            <Badge key={i} variant="outline" className="bg-red-50 text-red-600 border-red-100 pr-1">
                              {r}
                              <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 hover:bg-red-100" onClick={() => handleRemoveItem('restrictions', i)}>
                                <Trash2 className="w-2.5 h-2.5" />
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <Label className="text-green-600">Recomendações</Label>
                        <div className="flex gap-2">
                          <Input placeholder="Adicionar item..." onKeyDown={e => {
                            if (e.key === 'Enter') {
                              handleAddItem('recommendations', (e.target as HTMLInputElement).value);
                              (e.target as HTMLInputElement).value = '';
                            }
                          }} />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {editingRule.recommendations?.map((r, i) => (
                            <Badge key={i} variant="outline" className="bg-green-50 text-green-600 border-green-100 pr-1">
                              {r}
                              <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 hover:bg-green-100" onClick={() => handleRemoveItem('recommendations', i)}>
                                <Trash2 className="w-2.5 h-2.5" />
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ) : (
              <div className="h-[400px] flex flex-col items-center justify-center border-2 border-dashed rounded-3xl opacity-40">
                <AlertCircle className="w-12 h-12 mb-4" />
                <p>Selecione uma condição para editar ou crie uma nova.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

export default ClinicalRulesAdmin;
