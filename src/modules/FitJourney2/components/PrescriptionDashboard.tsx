import React, { useState } from 'react';
import { useNutritionistProfile } from '../hooks/useNutritionistProfile';
import { usePatients } from '../hooks/usePatients';
import { Users, Utensils, ClipboardCheck, ArrowRight, Plus, Layout, Zap, Search } from 'lucide-react';
import { TemplateSelector } from './TemplateSelector';
import { PlanResult } from './PlanResult';
import { DailyPlan, UserProfile } from '../types';

export const PrescriptionDashboard = () => {
  const { profile, loading: loadingProfile } = useNutritionistProfile();
  const { patients, loading: loadingPatients } = usePatients(profile?.id);
  const [activePlan, setActivePlan] = useState<DailyPlan | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPatientList, setShowPatientList] = useState(false);

  if (loadingProfile) {
    return <div className="flex items-center justify-center h-screen bg-black text-white">Carregando...</div>;
  }

  const filteredPatients = patients.filter(p => 
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectPatient = (patient: any) => {
    setSelectedPatient(patient);
    setShowPatientList(false);
    setShowEditor(true);
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic text-white">Dashboard V2</h1>
          <p className="text-slate-500 text-sm font-mono tracking-widest uppercase">Motor: Proteína Primeiro</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right mr-4 hidden md:block">
            <p className="text-xs text-slate-500 uppercase font-bold">Nutricionista</p>
            <p className="text-sm font-medium">{profile?.full_name || 'Usuário Beta'}</p>
          </div>
          <div className="h-10 w-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full border-2 border-white/10 shadow-lg shadow-green-500/20" />
        </div>
      </header>

      {showEditor ? (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
          <div className="flex items-center justify-between border-b border-slate-800 pb-6">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowEditor(false)}
                className="h-10 w-10 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <ArrowRight className="rotate-180" size={20} />
              </button>
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight">Editor V2: Novo Plano</h2>
                <p className="text-xs text-slate-500 font-mono">SELECIONE O TEMPLATE PARA PLOTAGEM AUTOMÁTICA</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <TemplateSelector onPlanGenerated={(plan) => setActivePlan(plan)} />
            {activePlan ? (
              <PlanResult plan={activePlan} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 bg-slate-900/20 border border-dashed border-slate-800 rounded-3xl text-center space-y-4">
                <div className="h-16 w-16 bg-slate-900 rounded-full flex items-center justify-center text-slate-700">
                  <Layout size={32} />
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase text-sm tracking-widest">Aguardando Plotagem</p>
                  <p className="text-xs text-slate-600 max-w-[200px] mt-2">Selecione um template ao lado para visualizar os cálculos automáticos</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl backdrop-blur-sm group hover:border-green-500/30 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-green-500/10 rounded-lg text-green-400">
                  <Users size={20} />
                </div>
                <span className="text-xs text-green-500 font-mono bg-green-500/10 px-2 py-0.5 rounded-full">+2 hoje</span>
              </div>
              <p className="text-3xl font-black mb-1">{patients.length}</p>
              <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Pacientes Ativos</p>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl backdrop-blur-sm group hover:border-blue-500/30 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                  <ClipboardCheck size={20} />
                </div>
              </div>
              <p className="text-3xl font-black mb-1">12</p>
              <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Planos em Rascunho</p>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl backdrop-blur-sm group hover:border-purple-500/30 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                  <Utensils size={20} />
                </div>
              </div>
              <p className="text-3xl font-black mb-1">19</p>
              <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Marmitas Validadas</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-black uppercase tracking-tight">Pacientes Recentes</h2>
                <button className="text-xs font-bold text-green-400 flex items-center gap-1 hover:text-green-300 transition-colors uppercase">
                  Ver todos <ArrowRight size={14} />
                </button>
              </div>

              <div className="bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden">
                {loadingPatients ? (
                  <div className="p-8 text-center text-slate-500 font-mono text-sm">Escaneando base de dados...</div>
                ) : patients.length === 0 ? (
                  <div className="p-12 text-center space-y-4">
                    <div className="h-12 w-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-600">
                      <Users size={24} />
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium">Nenhum paciente cadastrado na V2</p>
                      <p className="text-slate-600 text-xs mt-1 uppercase font-bold tracking-wider">Inicie sua base de dados isolada</p>
                    </div>
                    <button className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-xl text-sm font-black uppercase transition-all flex items-center gap-2 mx-auto">
                      <Plus size={16} /> Novo Paciente
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {patients.map((patient) => (
                      <div 
                        key={patient.id} 
                        onClick={() => setShowEditor(true)}
                        className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 font-bold">
                            {patient.full_name[0]}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{patient.full_name}</p>
                            <p className="text-xs text-slate-500 font-mono italic">OBJETIVO: HIPERTROFIA</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="hidden md:block text-right mr-4">
                            <div className="h-1 w-20 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500 w-[65%]" />
                            </div>
                            <p className="text-[10px] text-slate-500 uppercase mt-1 font-bold">Adesão: 65%</p>
                          </div>
                          <button className="h-8 w-8 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-green-500 group-hover:text-white transition-all">
                            <ArrowRight size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-xl font-black uppercase tracking-tight">Atalhos</h2>
              <div className="grid grid-cols-1 gap-4">
                <button 
                  onClick={() => setShowEditor(true)}
                  className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-600 to-green-500 rounded-2xl text-left hover:scale-[1.02] transition-transform shadow-lg shadow-green-900/20"
                >
                  <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center text-white">
                    <Plus size={20} />
                  </div>
                  <div>
                    <p className="font-black uppercase text-sm">Nova Prescrição</p>
                    <p className="text-xs text-white/70">Inicia motor 2.0</p>
                  </div>
                </button>

                <button className="flex items-center gap-4 p-4 bg-slate-900 border border-slate-800 rounded-2xl text-left hover:bg-slate-800 transition-colors">
                  <div className="h-10 w-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
                    <Utensils size={20} />
                  </div>
                  <div>
                    <p className="font-bold uppercase text-sm">Banco de Marmitas</p>
                    <p className="text-xs text-slate-500">19 opções fixas</p>
                  </div>
                </button>

                <button className="flex items-center gap-4 p-4 bg-slate-900 border border-slate-800 rounded-2xl text-left hover:bg-slate-800 transition-colors">
                  <div className="h-10 w-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400">
                    <ClipboardCheck size={20} />
                  </div>
                  <div>
                    <p className="font-bold uppercase text-sm">Configuração BETA</p>
                    <p className="text-xs text-slate-500">Ajuste de guardrails</p>
                  </div>
                </button>
              </div>

              <div className="mt-8 p-6 bg-green-500/5 border border-green-500/10 rounded-2xl">
                <h4 className="text-xs font-black uppercase text-green-500 mb-3 tracking-widest">Dica do Motor</h4>
                <p className="text-sm text-slate-400 leading-relaxed italic">
                  "No FitJourney 2.0, as calorias são ajustadas apenas após o volume proteico estar garantido (min. 1.8g/kg)."
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};