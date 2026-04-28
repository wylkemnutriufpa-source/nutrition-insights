import { motion } from "framer-motion";
import { UserX, RefreshCw, LogOut, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export function OrphanUserBlock() {
  const { user, signOut } = useAuth();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 backdrop-blur-sm p-4 text-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full space-y-6"
      >
        <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center text-destructive">
          <UserX size={40} />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Vínculo não identificado</h1>
          <p className="text-muted-foreground">
            Detectamos que sua conta ({user?.email}) não possui um vínculo ativo com um profissional ou organização.
          </p>
        </div>

        <div className="bg-muted p-4 rounded-lg text-sm text-left border space-y-3">
          <p className="font-medium">O que aconteceu?</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>O link de convite pode ter expirado</li>
            <li>O profissional pode ter removido o acesso</li>
            <li>Ocorreu uma falha no momento do cadastro</li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <Button 
            className="w-full" 
            variant="default"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
          
          <Button 
            className="w-full" 
            variant="outline"
            onClick={() => signOut()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair e usar outro link
          </Button>

          <a 
            href="https://fitjourney.com.br/suporte" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground flex items-center justify-center hover:text-primary transition-colors"
          >
            Precisa de ajuda? Falar com suporte
            <ExternalLink size={12} className="ml-1" />
          </a>
        </div>
      </motion.div>
    </div>
  );
}
