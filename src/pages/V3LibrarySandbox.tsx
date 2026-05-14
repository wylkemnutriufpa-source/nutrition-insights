
import React, { useState } from 'react';
import { V3SandboxGenerator } from '@/features/editor-v3/services/v3SandboxGenerator';
import { Meal } from '@/features/editor-v3/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { generateV3MealDescription } from '@/features/editor-v3/utils/v3VisualEngine';
import { motion, AnimatePresence } from 'framer-motion';

const V3LibrarySandbox = () => {
  const [goal, setGoal] = useState('hipertrofia');
  const [weight, setWeight] = useState(80);
  const [kcal, setKcal] = useState(2800);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const draft = await V3SandboxGenerator.generateDraft({
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

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Sandbox Operacional — Biblioteca V3</h1>
            <p className="text-slate-500">Validação de coerência alimentar e experiência visual premium.</p>
          </div>
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <Label>Objetivo</Label>
              <Input value={goal} onChange={(e) => setGoal(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-2">
              <Label>Peso (kg)</Label>
              <Input type="number" value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="w-24" />
            </div>
            <div className="space-y-2">
              <Label>Kcal Alvo</Label>
              <Input type="number" value={kcal} onChange={(e) => setKcal(Number(e.target.value))} className="w-24" />
            </div>
            <Button onClick={handleGenerate} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white">
              {loading ? 'Gerando...' : 'Gerar Simulação'}
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <AnimatePresence>
            {meals.map((meal, index) => (
              <motion.div
                key={meal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="overflow-hidden border-none shadow-xl bg-white h-full flex flex-col">
                  <div className="relative h-48 bg-slate-100">
                    {meal.imageUrl ? (
                      <img src={meal.imageUrl} alt={meal.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <span className="text-sm">Sem imagem</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-slate-600">
                      {meal.time}
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-lg font-bold text-slate-900 mb-3">{meal.name}</h3>
                    <div className="text-xs text-slate-600 space-y-1 whitespace-pre-wrap flex-1">
                      {generateV3MealDescription(meal)}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {meals.length === 0 && !loading && (
          <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
            <p className="text-slate-400">Configure os parâmetros e clique em "Gerar Simulação" para testar o Resolver V3.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default V3LibrarySandbox;
