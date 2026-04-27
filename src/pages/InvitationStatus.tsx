import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Clock, Eye, Activity, History, AlertCircle, RefreshCw, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function InvitationStatus() {
  const { code } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [whatsappLogs, setWhatsappLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      if (!code) return;
      
      console.log("[InvitationStatus] Fetching status for code:", code);
      
      try {
        const { data, error: fetchError } = await supabase
          .from("invitations")
          .select(`
            *,
            professional:profiles!professional_id(full_name),
            clinic:tenants(name)
          `)
          .eq("code", code)
          .maybeSingle();

        if (fetchError) {
          console.error("[InvitationStatus] Supabase error:", fetchError);
          setError("Erro ao conectar com o banco de dados.");
          throw fetchError;
        }

        if (!data) {
          console.warn("[InvitationStatus] Invitation not found:", code);
          setInvitation(null);
        } else {
          setInvitation(data);
          setError(null);

          const { data: logsData, error: logsError } = await supabase
            .from("invitation_logs")
            .select("*")
            .eq("invitation_id", data.id)
            .order("created_at", { ascending: false });
          
          if (logsError) console.error("[InvitationStatus] Error fetching logs:", logsError);
          setLogs(logsData || []);

          // Buscar logs de WhatsApp baseados no nome do paciente ou phone se disponível
          const { data: waLogs } = await supabase
            .from("whatsapp_invitation_logs")
            .select("*")
            .eq("patient_name", data.patient_name)
            .order("sent_at", { ascending: false });
          setWhatsappLogs(waLogs || []);
        }
      } catch (err: any) {
        console.error("[InvitationStatus] Fatal error:", err);
        setError(err.message || "Erro desconhecido.");
      } finally {
        setLoading(false);
      }
    }


    fetchStatus();

    // Polling leve: atualiza a cada 5 segundos
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [code]);


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
        <Card className="max-w-md w-full border-destructive/20 shadow-2xl">
          <CardHeader className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-2">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-display font-bold">Convite não encontrado</CardTitle>
            <CardDescription className="text-base">
              {error || `O código "${code}" não existe em nossa base ou o link expirou.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={() => window.location.reload()} className="w-full h-12 gap-2">
              <RefreshCw className="w-4 h-4" /> Tentar Novamente
            </Button>
            <Button variant="outline" onClick={() => navigate("/")} className="w-full h-12">Voltar ao Início</Button>
          </CardContent>
        </Card>
      </div>
    );
  }


  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return { icon: <CheckCircle2 className="text-emerald-500" />, label: "Concluído", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      case 'viewed':
        return { icon: <Eye className="text-blue-500" />, label: "Visualizado", color: "bg-blue-50 text-blue-700 border-blue-200" };
      case 'expired':
        return { icon: <Clock className="text-amber-500" />, label: "Expirado", color: "bg-amber-50 text-amber-700 border-amber-200" };
      case 'error':
        return { icon: <XCircle className="text-destructive" />, label: "Erro", color: "bg-destructive/10 text-destructive border-destructive/20" };
      default:
        return { icon: <Activity className="text-primary" />, label: "Pendente", color: "bg-primary/5 text-primary border-primary/20" };
    }
  };

  const statusConfig = getStatusConfig(invitation.status);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold">Status do Convite</h1>
          <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Código</p>
                <p className="font-mono text-sm">{invitation.code}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Paciente</p>
                <p className="font-medium">{invitation.patient_name || "Não informado"}</p>
                <p className="text-xs text-muted-foreground">{invitation.patient_email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Profissional</p>
                <p className="font-medium">{invitation.professional?.full_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Criado em</p>
                <p className="text-sm">{format(new Date(invitation.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
              </div>
              {invitation.expires_at && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Expira em</p>
                  <p className="text-sm">{format(new Date(invitation.expires_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-sm">Estado Atual</CardTitle>
                <CardDescription>Resumo da situação deste link</CardDescription>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${statusConfig.color}`}>
                {statusConfig.icon}
                <span className="text-xs font-bold">{statusConfig.label}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/50 p-4 rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center border border-border">
                    <History className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Linha do Tempo</h3>
                    <p className="text-xs text-muted-foreground">Últimas 5 interações registradas</p>
                  </div>
                </div>
                
                <div className="mt-4 space-y-4">
                  {logs.length > 0 ? (
                    logs.slice(0, 5).map((log, i) => (
                      <div key={log.id} className="relative pl-6 pb-2 border-l-2 border-border last:pb-0">
                        <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-primary" />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold capitalize">{log.event_type}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(log.created_at), "dd/MM 'às' HH:mm:ss", { locale: ptBR })}
                          </span>
                          {log.details?.domain && (
                            <span className="text-[9px] text-muted-foreground mt-0.5">Origem: {log.details.domain}</span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground py-2 text-center">Nenhuma atividade registrada ainda.</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => navigate(`/convite/${code}`)}>Visualizar como Paciente</Button>
                {invitation.status === 'completed' && (
                  <Button variant="outline" className="flex-1">Ir para Perfil do Paciente</Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#25D366]" /> Histórico de WhatsApp
              </CardTitle>
              <CardDescription>Convites e links compartilhados via WhatsApp para este paciente</CardDescription>
            </CardHeader>
            <CardContent>
              {whatsappLogs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {whatsappLogs.map((log) => (
                    <div key={log.id} className="p-3 rounded-lg border border-border bg-accent/5 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#25D366]/10 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-4 h-4 text-[#25D366]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold capitalize">{log.invitation_type.replace('_', ' ')}</p>
                        <p className="text-[10px] text-muted-foreground">{format(new Date(log.sent_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}</p>
                        {log.patient_phone && <p className="text-[9px] text-muted-foreground mt-1">📱 {log.patient_phone}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-muted/20 rounded-lg border border-dashed">
                  <p className="text-xs text-muted-foreground">Nenhum envio via WhatsApp registrado para este paciente.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
