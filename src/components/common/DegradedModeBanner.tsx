import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DegradedModeBanner() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white px-4 py-2 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-2 text-sm font-medium">
        <AlertCircle className="h-4 w-4" />
        <span>Modo Degradado: O sistema está com dificuldade de carregar seu perfil. Algumas funções podem estar limitadas.</span>
      </div>
      <Button 
        variant="ghost" 
        size="sm" 
        className="text-white hover:bg-white/10 gap-1.5 h-8 text-xs"
        onClick={() => window.location.reload()}
      >
        <RefreshCw className="h-3 w-3" />
        Recarregar
      </Button>
    </div>
  );
}
