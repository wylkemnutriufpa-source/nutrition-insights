import React, { useState, useEffect } from 'react';

const App = () => {
  const [mode, setMode] = useState<'V1' | 'V2'>(() => {
    return (localStorage.getItem('fitjourney_mode') as 'V1' | 'V2') || 'V2';
  });

  useEffect(() => {
    localStorage.setItem('fitjourney_mode', mode);
  }, [mode]);

  if (mode === 'V1') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8 text-center">
        <div className="absolute top-4 right-4">
          <button 
            onClick={() => setMode('V2')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
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
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8 text-center">
      <div className="absolute top-4 right-4">
        <button 
          onClick={() => setMode('V1')}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-medium transition-colors"
        >
          Voltar para V1
        </button>
      </div>
      
      <div className="space-y-6">
        <h1 className="text-5xl font-black tracking-tighter mb-2">FITJOURNEY 2.0</h1>
        <div className="inline-block px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
          <p className="text-green-400 text-xs font-mono uppercase tracking-widest">Core Engine Active</p>
        </div>
        
        <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Ambiente isolado de alta performance. <br />
          O motor de prescrição baseado em <span className="text-white font-semibold">Proteína Primeiro</span> está operando via módulos.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12 text-left max-w-3xl mx-auto">
          <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
            <h3 className="text-sm font-bold text-slate-500 uppercase mb-2">Módulos Carregados</h3>
            <ul className="space-y-1 text-sm font-mono text-slate-300">
              <li>• meal-builder.ts</li>
              <li>• plan-generator.ts</li>
              <li>• marmitas-database.ts</li>
            </ul>
          </div>
          <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
            <h3 className="text-sm font-bold text-slate-500 uppercase mb-2">Regras de Negócio</h3>
            <ul className="space-y-1 text-sm font-mono text-slate-300">
              <li>• Protein-First logic</li>
              <li>• 19 Fixed Marmitas</li>
              <li>• Multi-tenant Isolation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
