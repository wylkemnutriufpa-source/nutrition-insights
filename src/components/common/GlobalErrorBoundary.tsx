import React, { useEffect, useState } from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { friendlySupabaseError } from '@/lib/supabaseErrorMapper';

interface RuntimeError {
  section: string;
  message: string;
  timestamp: string;
  metadata?: any;
}

export const GlobalErrorBoundary = () => {
  const [error, setError] = useState<RuntimeError | null>(null);

  useEffect(() => {
    const handleRuntimeError = (event: any) => {
      const errorDetail = event.detail;
      // We only show critical system errors or schema errors in the global alert
      const isSchemaError = 
        errorDetail.message.includes('column') || 
        errorDetail.message.includes('relation') ||
        errorDetail.message.includes('does not exist');

      if (isSchemaError) {
        setError(errorDetail);
      }
    };

    window.addEventListener('fj-runtime-error', handleRuntimeError);
    return () => window.removeEventListener('fj-runtime-error', handleRuntimeError);
  }, []);

  if (!error) return null;

  const friendlyMessage = friendlySupabaseError(error.message);

  return (
    <div className="fixed bottom-4 right-4 z-[200] max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300">
      <Alert variant="destructive" className="shadow-2xl border-2">
        <AlertCircle className="h-4 w-4" />
        <div className="flex justify-between items-start w-full">
          <div className="pr-4">
            <AlertTitle className="font-bold flex items-center gap-2">
              Erro de Sistema Detectado
            </AlertTitle>
            <AlertDescription className="mt-2 text-xs opacity-90">
              <p className="font-semibold mb-1">{friendlyMessage}</p>
              <p className="text-[10px] opacity-70">Seção: {error.section}</p>
              <div className="mt-3 flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-7 text-[10px] bg-white/10 hover:bg-white/20 border-white/20"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCcw className="mr-1 h-3 w-3" /> Atualizar App
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-7 text-[10px] hover:bg-white/10"
                  onClick={() => setError(null)}
                >
                  Ignorar
                </Button>
              </div>
            </AlertDescription>
          </div>
          <button 
            onClick={() => setError(null)}
            className="text-white/50 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </Alert>
    </div>
  );
};
