import React, { useState } from 'react';
import { PlanGenerator } from '../core/plan-generator';
import { PLAN_TEMPLATES } from '../data/database';
import { UserProfile, DailyPlan } from '../types';
import { FileText, Zap, ChevronRight, Check, Layout, Calculator } from 'lucide-react';

export const TemplateSelector = ({ onPlanGenerated }: { onPlanGenerated: (plan: DailyPlan) => void }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>(PLAN_TEMPLATES[0].id);
  
  // Mock profile para teste de plotagem
  const mockProfile: UserProfile = {
    weight: 80,
    height: 180,
    age: 30,
    gender: 'male',
    activityLevel: 1.5,
    goal: 'gain',
    targetCalories: 2800,
    targetProtein: 160
  };

  const handleGenerate = () => {
    const plan = PlanGenerator.generateFromTemplate(mockProfile, selectedTemplate);
    onPlanGenerated(plan);
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-md">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-10 w-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
          <Layout size={20} />
        </div>
        <div>
          <h3 className="text-xl font-black uppercase tracking-tight">Templates de Alta Performance</h3>
          <p className="text-xs text-slate-500 font-mono">SELECIONE UMA ESTRUTURA PARA PLOTAR</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {PLAN_TEMPLATES.map((template) => (
          <button
            key={template.id}
            onClick={() => setSelectedTemplate(template.id)}
            className={`p-6 rounded-2xl border-2 text-left transition-all relative overflow-hidden group ${
              selectedTemplate === template.id 
                ? 'border-blue-500 bg-blue-500/5' 
                : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
            }`}
          >
            {selectedTemplate === template.id && (
              <div className="absolute top-0 right-0 p-3 text-blue-500">
                <Check size={16} />
              </div>
            )}
            <h4 className={`font-black uppercase text-sm mb-1 ${selectedTemplate === template.id ? 'text-blue-400' : 'text-slate-300'}`}>
              {template.name}
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">{template.description}</p>
            
            <div className="flex gap-2">
              <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-800 rounded-full text-slate-400 uppercase tracking-tighter">
                {template.meals.length} Refeições
              </span>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${
                template.category === 'hypertrophy' ? 'bg-orange-500/10 text-orange-400' : 'bg-green-500/10 text-green-400'
              }`}>
                {template.category}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-6 mb-8 flex items-start gap-4">
        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 mt-1">
          <Calculator size={18} />
        </div>
        <div>
          <p className="text-xs font-black uppercase text-blue-400 mb-1">Cálculo de Substituição Ativo</p>
          <p className="text-[11px] text-slate-400 leading-relaxed italic">
            O motor V2 está recalculando as gramaturas baseadas no peso do paciente (80kg) para manter 2.0g/kg de proteína.
          </p>
        </div>
      </div>

      <button
        onClick={handleGenerate}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-2xl font-black uppercase text-sm tracking-widest flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-900/30"
      >
        <Zap size={18} fill="currentColor" />
        Plotar Template no Paciente
        <ChevronRight size={18} />
      </button>
    </div>
  );
};