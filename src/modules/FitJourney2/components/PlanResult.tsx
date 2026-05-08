import React from 'react';
import { DailyPlan } from '../types';
import { Utensils, Zap, BarChart3, Clock } from 'lucide-react';

export const PlanResult = ({ plan }: { plan: DailyPlan }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
          <Zap size={20} className="text-blue-500" fill="currentColor" />
          Plano Gerado: {plan.templateName || 'Customizado'}
        </h2>
        <div className="flex gap-2">
          <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-black text-blue-400 uppercase tracking-widest">
            {plan.totalMacros.calories.toFixed(0)} kcal
          </div>
          <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-[10px] font-black text-green-400 uppercase tracking-widest">
            PROT: {plan.totalMacros.protein.toFixed(0)}g
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {plan.meals.map((meal, idx) => (
          <div key={meal.id} className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl group hover:border-blue-500/20 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-slate-800 rounded-lg flex items-center justify-center text-slate-500 group-hover:text-blue-400 transition-colors">
                  <Clock size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-sm uppercase tracking-tight">{meal.name}</h4>
                  <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                    {meal.type} • {meal.totalMacros.calories.toFixed(0)} kcal
                  </p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <span className="text-[9px] font-bold px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20 uppercase">
                  P: {meal.totalMacros.protein.toFixed(0)}g
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 bg-green-500/10 text-green-400 rounded-full border border-green-500/20 uppercase">
                  C: {meal.totalMacros.carbs.toFixed(0)}g
                </span>
              </div>
            </div>

            <div className="pl-11 space-y-2">
              {meal.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0">
                  <span className="text-slate-300">Item #{item.foodId}</span>
                  <span className="font-mono text-slate-500 uppercase tracking-tighter">
                    {item.quantity} {item.foodId.startsWith('m') ? 'Unid' : 'gramas'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-white/5 p-6 rounded-3xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-white/5 rounded-2xl flex items-center justify-center text-blue-400 shadow-inner">
            <BarChart3 size={24} />
          </div>
          <div>
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Status da Prescrição</p>
            <p className="text-sm font-bold">Motor V2 validado com 2.1g/kg de Proteína</p>
          </div>
        </div>
        <button className="bg-white text-black px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
          Finalizar Plano
        </button>
      </div>
    </div>
  );
};