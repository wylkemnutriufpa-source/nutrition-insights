import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function AuthConfirm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as any;
  const next = searchParams.get("next") || "/";

  const handleConfirm = async () => {
    if (!token_hash || !type) {
      setError("Link de confirmação inválido ou incompleto.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type,
      });

      if (error) {
        console.error("Auth confirmation error:", error);
        setError("O link de confirmação expirou ou já foi utilizado. Por favor, solicite um novo.");
      } else {
        toast.success("Login confirmado com sucesso!");
        navigate(next);
      }
    } catch (err) {
      console.error("Unexpected error during auth confirmation:", err);
      setError("Ocorreu um erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // If we have the necessary params, but haven't started loading yet, 
  // we wait for the user to click the button to prevent bot consumption.
  
  if (!token_hash || !type) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle>Link Inválido</CardTitle>
            <CardDescription>
              Este link de confirmação parece estar incompleto ou malformado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/auth")} className="w-full">
              Voltar para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full shadow-lg border-primary/20">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Confirmar Acesso</CardTitle>
          <CardDescription className="text-base">
            Clique no botão abaixo para finalizar seu acesso com segurança. 
            Isso evita que sistemas automáticos de e-mail invalidem seu link.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}
          
          <Button 
            onClick={handleConfirm} 
            disabled={loading}
            className="w-full h-12 text-lg font-semibold gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Confirmando...
              </>
            ) : (
              <>
                Entrar no FitJourney
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </Button>
          
          <p className="text-center text-xs text-muted-foreground pt-2">
            Ao clicar, você será redirecionado para sua conta.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
