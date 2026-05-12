import React from "react";
import { BUILD_INFO } from "@/lib/buildInfo";

const TestDeploy = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 font-mono">
      <div className="bg-white p-8 rounded-xl shadow-lg border-2 border-green-500 max-w-md w-full">
        <h1 className="text-2xl font-bold text-green-600 mb-4">DEPLOY SUCCESSFUL</h1>
        <div className="space-y-2 text-sm text-slate-600">
          <p><strong>Hash:</strong> {BUILD_INFO.hash}</p>
          <p><strong>Short:</strong> {BUILD_INFO.shortHash}</p>
          <p><strong>Timestamp:</strong> {BUILD_INFO.timestamp}</p>
          <p><strong>Mode:</strong> {BUILD_INFO.mode}</p>
          <p><strong>Current Date:</strong> {new Date().toLocaleString()}</p>
        </div>
        <hr className="my-6" />
        <p className="text-xs text-slate-400">
          Esta página confirma que o build mais recente foi propagado para o servidor.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-6 w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          FORCE RELOAD
        </button>
      </div>
    </div>
  );
};

export default TestDeploy;
