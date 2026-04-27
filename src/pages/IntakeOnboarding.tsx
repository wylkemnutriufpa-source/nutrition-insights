import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Loader2, AlertCircle, Link2Off, Clock, CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type TokenStatus = "loading" | "valid" | "TOKEN_NOT_FOUND" | "TOKEN_EXPIRED" | "TOKEN_USED" | "TOKEN_REVOKED" | "error";

interface TokenData {
  patient_id: string;
  nutritionist_id: string;
  pipeline_id: string | null;
  patient_name: string | null;
  nutritionist_name: string | null;
}

const ERROR_MESSAGES: Record<string, { icon: typeof AlertCircle; title: string; description: string }> = {
  TOKEN_NOT_FOUND: {
    icon: Link2Off,
    title: "Link inválido",
    description: "Este link de onboarding não foi encontrado. Solicite um novo link ao seu profissional.",
  },
  TOKEN_EXPIRED: {
    icon: Clock,
    title: "Link expirado",
    description: "Este link de onboarding expirou. Solicite um novo link ao seu profissional.",
  },
  TOKEN_USED: {
    icon: CheckCircle2,
    title: "Link já utilizado",
    description: "Este link já foi utilizado. Se precisar refazer o onboarding, solicite um novo link.",
  },
  TOKEN_REVOKED: {
    icon: ShieldAlert,
    title: "Link revogado",
    description: "Este link foi cancelado pelo profissional. Solicite um novo link se necessário.",
  },
  error: {
    icon: AlertCircle,
    title: "Erro ao validar",
    description: "Ocorreu um erro ao validar seu link. Tente novamente ou solicite um novo link.",
  },
};

export default function IntakeOnboarding() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<TokenStatus>("loading");
  const [tokenData, setTokenData] = useState<TokenData | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("TOKEN_NOT_FOUND");
      return;
    }
    validateToken(token);
  }, [token]);

  async function validateToken(t: string) {
    try {
      const { data, error } = await supabase.rpc("validate_onboarding_token" as any, { _token: t });
      if (error) throw error;

      const result = data as any;
      if (!result?.valid) {
        setStatus(result?.error || "error");
        return;
      }

      setTokenData({
        patient_id: result.patient_id,
        nutritionist_id: result.nutritionist_id,
        pipeline_id: result.pipeline_id,
        patient_name: result.patient_name,
        nutritionist_name: result.nutritionist_name,
      });
      setStatus("valid");
    } catch (err) {
      console.error("Token validation error:", err);
      setStatus("error");
    }
  }

  // If token is valid and user is logged in as the patient, redirect to onboarding
  useEffect(() => {
    if (status === "valid" && tokenData && user) {
      if (user.id === tokenData.patient_id) {
        navigate("/onboarding", { replace: true });
      }
    }
  }, [status, tokenData, user, navigate]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Validando seu link de onboarding...</p>
        </div>
      </div>
    );
  }

  if (status === "valid" && tokenData) {
    // User not logged in or logged in as different user — keep the professional binding in the registration URL
    const registerUrl = `/cadastro?nutri=${tokenData.nutritionist_id}&code=${token}`;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h2 className="text-xl font-bold">Link válido! ✅</h2>
            {tokenData.nutritionist_name && (
              <p className="text-muted-foreground">
                Profissional: <strong>{tokenData.nutritionist_name}</strong>
              </p>
            )}
            <p className="text-muted-foreground text-sm">
              Crie seu acesso para iniciar o onboarding com vínculo automático ao profissional.
            </p>
            <Button onClick={() => navigate(registerUrl, { replace: true })} className="w-full">
              Criar Acesso e Iniciar Onboarding
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error states
  const errorConfig = ERROR_MESSAGES[status] || ERROR_MESSAGES.error;
  const Icon = errorConfig.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center space-y-4">
          <Icon className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-bold">{errorConfig.title}</h2>
          <p className="text-muted-foreground text-sm">{errorConfig.description}</p>
          <Button variant="outline" onClick={() => navigate("/")}>
            Voltar ao início
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}