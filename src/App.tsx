import React, { useState, useEffect } from 'react';
import { PrescriptionDashboard } from './modules/FitJourney2/components/PrescriptionDashboard';

const App = () => {
  const [mode, setMode] = useState<'V1' | 'V2'>(() => {
    const saved = localStorage.getItem('fitjourney_mode');
    return (saved === 'V1' || saved === 'V2') ? saved : 'V2';
  });

  useEffect(() => {
    localStorage.setItem('fitjourney_mode', mode);
  }, [mode]);

  // Global Switcher UI
  const Switcher = () => (
    <button 
      onClick={() => setMode(mode === 'V1' ? 'V2' : 'V1')}
      className={`fixed top-4 right-4 z-[9999] px-4 py-2 rounded-full text-xs font-bold uppercase transition-all shadow-xl border flex items-center gap-2 ${
        mode === 'V2' 
          ? 'bg-green-600 text-white border-green-500 hover:bg-green-700' 
          : 'bg-white text-black border-slate-200 hover:bg-slate-100'
      }`}
    >
      <div className={`w-2 h-2 rounded-full ${mode === 'V2' ? 'bg-white animate-pulse' : 'bg-slate-400'}`} />
      {mode === 'V2' ? 'FitJourney 2.0 (Beta)' : 'Mudar para FitJourney 2.0'}
      {mode === 'V2' && <span className="opacity-60 ml-1">| Voltar V1</span>}
    </button>
  );

  if (mode === 'V1') {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        {/* Background ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
        
        <Switcher />
        
        <div className="relative z-10 max-w-2xl space-y-6">
          <div className="h-20 w-20 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-white/5 shadow-2xl">
            <span className="text-3xl font-black italic text-slate-500">V1</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic">Modo Produção Ativo</h1>
          <p className="text-slate-400 leading-relaxed">
            Você está visualizando a base do sistema legado. 
            <br />
            <span className="text-xs font-mono text-slate-500 uppercase mt-4 block">
              Nota: Nesta branch as pastas físicas da V1 foram removidas para isolamento.
            </span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black">
      <Switcher />
      <PrescriptionDashboard />
    </div>
  );
};

export default App;
