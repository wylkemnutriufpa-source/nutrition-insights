import { AlertTriangle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export function OrphanUserBlock() {
  const { signOut } = useAuth();

  return (
    <div className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-md flex items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Vínculo não encontrado</h2>
          <p className="text-muted-foreground">
            Detectamos que sua conta não possui um vínculo ativo com um nutricionista. 
            Isso pode ocorrer se o link de convite estiver expirado ou se houve um erro no cadastro.
          </p>
        </div>
        <div className="bg-muted p-4 rounded-xl text-left text-sm space-y-1">
          <p className="font-semibold">O que fazer?</p>
          <p>1. Solicite um novo link de convite ao seu profissional.</p>
          <p>2. Certifique-se de completar o cadastro usando o link recebido.</p>
        </div>
        <Button 
          variant="outline" 
          className="w-full gap-2 h-11"
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4" />
          Sair e tentar novamente
        </Button>
      </div>
    </div>
  );
}
