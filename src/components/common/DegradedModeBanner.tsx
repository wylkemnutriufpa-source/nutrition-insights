import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function DegradedModeBanner() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] p-2 bg-background/80 backdrop-blur-sm border-b animate-in fade-in slide-in-from-top duration-500">
      <Alert variant="destructive" className="max-w-4xl mx-auto border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-400">
        <AlertCircle className="h-4 w-4 stroke-orange-600 dark:stroke-orange-400" />
        <AlertTitle className="text-sm font-bold flex items-center gap-2">
          Modo de Operação Limitado (Degradado)
        </AlertTitle>
        <AlertDescription className="text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-1">
          <span>
            A sincronização do seu perfil está demorando mais que o esperado. 
            Você pode navegar no sistema, mas ações como <strong>salvar anamnese</strong> ou <strong>atualizar dados</strong> estão temporariamente bloqueadas.
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-[10px] border-orange-500/30 hover:bg-orange-500/20 text-orange-700 dark:text-orange-400 whitespace-nowrap"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            Recarregar
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
