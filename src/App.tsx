import React, { useState, useEffect } from 'react';
import { PrescriptionDashboard } from './modules/FitJourney2/components/PrescriptionDashboard';

const App = () => {
  const [mode, setMode] = useState<'V1' | 'V2'>(() => {
    return (localStorage.getItem('fitjourney_mode') as 'V1' | 'V2') || 'V2';
  });

  useEffect(() => {
    localStorage.setItem('fitjourney_mode', mode);
  }, [mode]);

  if (mode === 'V1') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8 text-center relative">
        <div className="absolute top-4 right-4">
          <button 
            onClick={() => setMode('V2')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-900/20"
          >
            Mudar para BETA (V2)
          </button>
        </div>
        <h1 className="text-4xl font-bold mb-4">FitJourney 1.0 (PRODUÇÃO)</h1>
        <p className="text-xl text-slate-400 max-w-2xl">
          Você está no modo de compatibilidade. Como as pastas legadas foram removidas na branch V2, 
          esta tela serve como placeholder para o sistema antigo.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="fixed top-6 right-6 z-50">
        <button 
          onClick={() => setMode('V1')}
          className="px-4 py-2 bg-slate-900/80 backdrop-blur-md hover:bg-slate-800 border border-slate-700 rounded-lg text-sm font-medium transition-colors text-white"
        >
          Voltar para V1
        </button>
      </div>
      <PrescriptionDashboard />
    </div>
  );
};

export default App;

export default App;
