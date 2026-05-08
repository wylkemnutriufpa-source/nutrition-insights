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

  const Switcher = () => (
    <button
      onClick={() => setMode(mode === 'V1' ? 'V2' : 'V1')}
      className={`fixed top-4 right-4 z-[9999] px-6 py-2.5 rounded-full text-xs font-bold uppercase transition-all shadow-2xl border flex items-center gap-3 ${
        mode === 'V2'
          ? 'bg-green-600 text-white border-green-400 hover:bg-green-700'
          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
      }`}
    >
      <div className={`w-2.5 h-2.5 rounded-full ${mode === 'V2' ? 'bg-white animate-pulse' : 'bg-slate-500'}`} />
      <span>{mode === 'V2' ? 'FitJourney 2.0 (Beta)' : 'FitJourney 1.0'}</span>
      <span className="opacity-50 text-[10px] border-l border-white/20 pl-3">Clique para Alternar</span>
    </button>
  );

  if (mode === 'V1') {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
        <Switcher />
        <div className="relative z-10 max-w-2xl space-y-6">
          <div className="h-20 w-20 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-white/5 shadow-2xl">
            <span className="text-3xl font-black italic text-slate-500">V1</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic">FitJourney 1.0 indisponível nesta branch</h1>
          <p className="text-slate-400 leading-relaxed">
            O código-fonte do sistema V1 não existe na branch <span className="font-mono text-slate-300">fitjourney2.0</span> —
            ele permanece intacto na branch <span className="font-mono text-slate-300">projeto-fase-3</span> (produção).
            <br /><br />
            <span className="text-xs font-mono text-slate-500 uppercase block">
              Para usar a V1 real, alterne a branch no Lovable de volta para projeto-fase-3.
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
