
import React, { useState, useEffect } from 'react';
import { V3SandboxGenerator } from '@/features/editor-v3/services/v3SandboxGenerator';
import { DietTemplateService } from '@/features/editor-v3/services/dietTemplateService';
import { Meal, V3DietTemplate } from '@/features/editor-v3/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateV3MealDescription } from '@/features/editor-v3/utils/v3VisualEngine';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { LayoutGrid, Target, Zap, Settings2 } from 'lucide-react';

const V3LibrarySandbox = () => {
  const [templates, setTemplates] = useState<V3DietTemplate[]>([]);
  const [selectedTemplateSlug, setSelectedTemplateSlug] = useState<string>('');
  const [goal, setGoal] = useState('hipertrofia');
  const [weight, setWeight] = useState(80);
  const [kcal, setKcal] = useState(2800);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadTemplates = async () => {
      const data = await DietTemplateService.listTemplates();
      setTemplates(data);
      if (data.length > 0) {
        setSelectedTemplateSlug(data[0].slug);
        setGoal(data[0].objective);
      }
    };
    loadTemplates();
  }, []);

  const handleTemplateChange = (slug: string) => {
    setSelectedTemplateSlug(slug);
    const template = templates.find(t => t.slug === slug);
    if (template) {
      setGoal(template.objective);
      // Sugerir uma kcal do perfil se disponível
      if (template.kcal_profiles && template.kcal_profiles.length > 0) {
        const profileValues = template.kcal_profiles.map(p => typeof p === 'number' ? p : p.kcal);
        const defaultKcal = profileValues.includes(2000) ? 2000 : profileValues[0];
        setKcal(defaultKcal);
      }
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const draft = await V3SandboxGenerator.generateDraft({
        templateSlug: selectedTemplateSlug,
        patientContext: {
          goal,
          weight,
          calories_target: kcal,
        }
      });
      setMeals(draft);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const selectedTemplate = templates.find(t => t.slug === selectedTemplateSlug);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">V3 Sandbox</Badge>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Admin Only</Badge>
              </div>
              <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Templates Soberanos V3</h1>
              <p className="text-slate-500 text-lg">Ambiente estéril para validação da inteligência clínica e visual.</p>
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex gap-6 items-end">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-400">Template Clínico</Label>
                <Select value={selectedTemplateSlug} onValueChange={handleTemplateChange}>
                  <SelectTrigger className="w-[280px] bg-slate-50 border-none font-medium">
                    <SelectValue placeholder="Selecione um template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.slug}>{t.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-400">Meta (Kcal)</Label>
                <Select value={kcal.toString()} onValueChange={(v) => setKcal(Number(v))}>
                  <SelectTrigger className="w-32 bg-slate-50 border-none font-medium">
                    <SelectValue placeholder="Kcal" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedTemplate?.kcal_profiles?.map(k => (
                      <SelectItem key={k} value={k.toString()}>{k} kcal</SelectItem>
                    )) || (
                      <>
                        <SelectItem value="1500">1500 kcal</SelectItem>
                        <SelectItem value="2000">2000 kcal</SelectItem>
                        <SelectItem value="2500">2500 kcal</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleGenerate} 
                disabled={loading} 
                size="lg"
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 px-8"
              >
                {loading ? (
                  <Zap className="w-4 h-4 animate-pulse mr-2" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                {loading ? 'Processando...' : 'Rodar Resolver V3'}
              </Button>
            </div>
          </div>

          {selectedTemplate && (
            <div className="flex gap-4 items-center text-sm text-slate-500 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100">
              <div className="flex items-center gap-1.5">
                <Target className="w-4 h-4 text-indigo-500" />
                <span className="font-semibold text-indigo-700">Objetivo:</span> {selectedTemplate.objective}
              </div>
              <div className="w-px h-4 bg-indigo-200" />
              <div className="flex items-center gap-1.5">
                <LayoutGrid className="w-4 h-4 text-indigo-500" />
                <span className="font-semibold text-indigo-700">Distribuição:</span> {selectedTemplate.meal_distribution.length} refeições
              </div>
              <div className="w-px h-4 bg-indigo-200" />
              <div className="flex items-center gap-1.5 italic">
                "{selectedTemplate.description}"
              </div>
            </div>
          )}
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          <AnimatePresence>
            {meals.map((meal, index) => (
              <motion.div
                key={meal.id}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: index * 0.05, type: 'spring', stiffness: 100 }}
              >
                <Card className="group overflow-hidden border-none shadow-xl bg-white h-full flex flex-col hover:shadow-2xl transition-all duration-300">
                  <div className="relative h-56 bg-slate-100 overflow-hidden">
                    {meal.imageUrl ? (
                      <img 
                        src={meal.imageUrl} 
                        alt={meal.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <span className="text-sm">Imagem Soberana Indisponível</span>
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-white/90 backdrop-blur text-slate-900 border-none shadow-sm">
                        {meal.time}
                      </Badge>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-slate-900 leading-tight">{meal.name}</h3>
                    </div>
                    
                    <div className="bg-slate-50 rounded-lg p-4 mb-4 border border-slate-100 flex-1">
                      <div className="text-sm text-slate-700 space-y-2 whitespace-pre-wrap font-medium">
                        {generateV3MealDescription(meal)}
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-bold text-slate-400 pt-2 border-t border-slate-100">
                      <span>V3 Sovereign Resolver</span>
                      <span>Deterministic scaling</span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {meals.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-slate-200 rounded-3xl bg-white/50 backdrop-blur-sm">
            <div className="bg-slate-100 p-4 rounded-full mb-4">
              <Settings2 className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-600 mb-2">Pronto para Validação</h3>
            <p className="text-slate-400 max-w-sm text-center">Selecione um template soberano acima para simular a resolução dinâmica de refeições pela Biblioteca V3.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default V3LibrarySandbox;
