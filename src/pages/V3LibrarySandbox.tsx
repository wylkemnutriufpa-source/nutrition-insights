
import React, { useState, useEffect } from 'react';
import { V3SandboxGenerator } from '@/features/editor-v3/services/v3SandboxGenerator';
import { DietTemplateService } from '@/features/editor-v3/services/dietTemplateService';
import { LibraryV3MassiveE2E, E2EResult } from '@/features/editor-v3/services/massiveE2E';
import { Meal, V3DietTemplate } from '@/features/editor-v3/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateV3MealDescription } from '@/features/editor-v3/utils/v3VisualEngine';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { LayoutGrid, Target, Zap, Settings2, BarChart3, AlertTriangle, CheckCircle2, FlaskConical } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const V3LibrarySandbox = () => {
  const [templates, setTemplates] = useState<V3DietTemplate[]>([]);
  const [selectedTemplateSlug, setSelectedTemplateSlug] = useState<string>('');
  const [goal, setGoal] = useState('hipertrofia');
  const [weight, setWeight] = useState(80);
  const [kcal, setKcal] = useState(2800);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(false);
  const [e2eLoading, setE2eLoading] = useState(false);
  const [e2eResults, setE2eResults] = useState<E2EResult | null>(null);

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
          goal: goal as any,
          weight,
          calories_target: kcal,
        }
      });
      setMeals(draft);
      setE2eResults(null);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunE2E = async () => {
    setE2eLoading(true);
    try {
      const results = await LibraryV3MassiveE2E.runMassiveTest(300);
      setE2eResults(results);
      setMeals([]);
    } catch (error) {
      console.error(error);
    } finally {
      setE2eLoading(false);
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
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Clinical E2E Ready</Badge>
              </div>
              <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">V3 Sovereign Sandbox</h1>
              <p className="text-slate-500 text-lg">Ambiente de validação massiva para soberania clínica e visual.</p>
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex gap-4 items-end">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-400">Template</Label>
                <Select value={selectedTemplateSlug} onValueChange={handleTemplateChange}>
                  <SelectTrigger className="w-[200px] bg-slate-50 border-none font-medium">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.slug}>{t.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-400">Target</Label>
                <Select value={kcal.toString()} onValueChange={(v) => setKcal(Number(v))}>
                  <SelectTrigger className="w-28 bg-slate-50 border-none font-medium">
                    <SelectValue placeholder="Kcal" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedTemplate?.kcal_profiles?.map((k, idx) => {
                      const val = typeof k === 'number' ? k : k.kcal;
                      return <SelectItem key={`${val}-${idx}`} value={val.toString()}>{val} kcal</SelectItem>
                    }) || (
                      <SelectItem value="2000">2000 kcal</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleGenerate} 
                  disabled={loading || e2eLoading} 
                  variant="outline"
                  className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                >
                  {loading ? <Zap className="w-4 h-4 animate-pulse mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                  Simular Unitário
                </Button>

                <Button 
                  onClick={handleRunE2E} 
                  disabled={loading || e2eLoading} 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200"
                >
                  {e2eLoading ? <FlaskConical className="w-4 h-4 animate-spin mr-2" /> : <FlaskConical className="w-4 h-4 mr-2" />}
                  E2E Massivo (300)
                </Button>
              </div>
            </div>
          </div>
        </header>

        {e2eResults ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: 'Clinical Coherence', value: e2eResults.clinicalCoherenceScore, icon: Target, color: 'text-blue-600' },
                { label: 'Human Scaling', value: e2eResults.humanScalingScore, icon: Settings2, color: 'text-amber-600' },
                { label: 'Visual Rotation', value: e2eResults.visualRotationScore, icon: Zap, color: 'text-purple-600' },
                { label: 'Meal Integrity', value: e2eResults.mealIntegrityScore, icon: CheckCircle2, color: 'text-green-600' },
                { label: 'Total Plans', value: e2eResults.totalPlans, icon: BarChart3, color: 'text-slate-600', noPct: true },
              ].map((stat, i) => (
                <Card key={i} className="p-6 border-none shadow-sm flex flex-col items-center text-center">
                  <stat.icon className={`w-8 h-8 mb-3 ${stat.color}`} />
                  <div className="text-3xl font-black text-slate-900">{stat.value}{!stat.noPct && '%'}</div>
                  <div className="text-xs font-bold uppercase text-slate-400 mt-1">{stat.label}</div>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="col-span-2 p-8 border-none shadow-sm space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-xl font-bold text-slate-900">Heatmap de Coerência por Cluster</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(e2eResults.heatmap).map(([cluster, score]) => (
                    <div key={cluster} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[10px] font-bold uppercase text-slate-400 mb-1 truncate">{cluster}</div>
                      <div className="flex items-end justify-between">
                        <span className="text-lg font-bold text-slate-700">{score}%</span>
                        <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${score > 90 ? 'bg-green-500' : score > 70 ? 'bg-amber-500' : 'bg-red-500'}`} 
                            style={{ width: `${score}%` }} 
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-8 border-none shadow-sm space-y-6 bg-indigo-900 text-white">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-indigo-300" />
                  <h2 className="text-xl font-bold">Veredito Clínico</h2>
                </div>
                <div className="space-y-4">
                  {e2eResults.recommendations.map((rec, i) => (
                    <div key={i} className="flex gap-3 items-start bg-white/10 p-4 rounded-xl border border-white/10">
                      <div className="mt-1"><CheckCircle2 className="w-4 h-4 text-green-400" /></div>
                      <p className="text-sm font-medium leading-relaxed">{rec}</p>
                    </div>
                  ))}
                </div>
                {e2eResults.topErrors.length > 0 && (
                  <div className="pt-4 border-t border-white/10">
                    <div className="flex items-center gap-2 text-amber-400 mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase">Incidentes Detectados</span>
                    </div>
                    <ScrollArea className="h-24">
                      {e2eResults.topErrors.map((err, i) => (
                        <div key={i} className="text-[10px] text-indigo-200 mb-1">• {err}</div>
                      ))}
                    </ScrollArea>
                  </div>
                )}
              </Card>
            </div>
          </div>
        ) : (
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
                    </div>
                    
                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="text-xl font-bold text-slate-900 leading-tight mb-4">{meal.name}</h3>
                      <div className="bg-slate-50 rounded-lg p-4 mb-4 border border-slate-100 flex-1">
                        <div className="text-sm text-slate-700 space-y-2 whitespace-pre-wrap font-medium">
                          {generateV3MealDescription(meal)}
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {meals.length === 0 && !e2eResults && !loading && !e2eLoading && (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-slate-200 rounded-3xl bg-white/50 backdrop-blur-sm">
            <div className="bg-slate-100 p-4 rounded-full mb-4">
              <FlaskConical className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-600 mb-2">Pronto para Validação Massiva</h3>
            <p className="text-slate-400 max-w-sm text-center">Execute o teste E2E para validar 300 planos simultâneos ou simule um template unitário.</p>
          </div>
        )}

        {(loading || e2eLoading) && (
          <div className="flex flex-col items-center justify-center py-32">
            <FlaskConical className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
            <h3 className="text-xl font-bold text-slate-900">Executando Auditoria Clínica...</h3>
            <p className="text-slate-500">Avaliando integridade de clusters, scaling humano e rotação visual.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default V3LibrarySandbox;

