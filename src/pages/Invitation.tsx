import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserPlus, Building2, User, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Invitation() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInvitation() {
      if (!code) return;
      
      try {
        const { data, error } = await supabase
          .from("invitations")
          .select(`
            *,
            professional:profiles!professional_id(full_name, avatar_url),
            clinic:tenants(name)
          `)
          .eq("code", code)
          .single();

        if (error) throw error;
        setInvitation(data);
      } catch (err: any) {
        console.error("Error fetching invitation:", err);
        setError("Convite não encontrado ou já expirou.");
      } finally {
        setLoading(false);
      }
    }

    fetchInvitation();
  }, [code]);

  const handleAccept = () => {
    if (!invitation) return;
    
    // Redirect to registration with professional info
    navigate(`/register-patient?nutri=${invitation.professional_id}&code=${code}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-destructive/20">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Ops!</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate("/auth")}>Ir para Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { professional, clinic, patient_name } = invitation;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full border-primary/20 bg-primary/5">
        <CardHeader className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
            <UserPlus className="w-10 h-10 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-display font-bold">Você foi convidado!</CardTitle>
            <CardDescription className="text-base mt-2">
              {patient_name ? `Olá, ${patient_name}! ` : ""}
              Seu acompanhamento está prestes a começar.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-background border border-border">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Profissional</p>
                <p className="text-lg font-bold">{professional?.full_name || "Seu Nutricionista"}</p>
              </div>
            </div>

            {clinic && (
              <div className="flex items-center gap-4 p-4 rounded-xl bg-background border border-border">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Clínica</p>
                  <p className="text-lg font-bold">{clinic.name}</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Button onClick={handleAccept} size="lg" className="w-full gap-2 text-lg h-14 shadow-lg shadow-primary/20">
              Aceitar Convite e Começar
              <ArrowRight className="w-5 h-5" />
            </Button>
            <p className="text-[10px] text-center text-muted-foreground px-4">
              Ao clicar em aceitar, você será redirecionado para concluir seu cadastro oficial no FitJourney.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
