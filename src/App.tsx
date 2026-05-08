import React from 'react';

const App = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8 text-center">
      <h1 className="text-4xl font-bold mb-4">FitJourney 2.0</h1>
      <p className="text-xl text-slate-400 max-w-2xl">
        Ambiente isolado (V2) ativo. 
        O motor de prescrição está sendo re-implementado com regras de precisão.
      </p>
      <div className="mt-8 p-6 bg-slate-800 rounded-xl border border-slate-700">
        <p className="text-green-400 font-mono">STATUS: CORE MOTOR ACTIVE (BRANCH FitJourney 2.0)</p>
      </div>
    </div>
  );
};

export default App;
