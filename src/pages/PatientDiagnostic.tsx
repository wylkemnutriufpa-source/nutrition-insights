import { useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  CheckCircle2, XCircle, AlertCircle, Loader2, 
  ShieldCheck, UserCheck, CreditCard, Link2,
  Copy, Download, FileJson, Info
} from "lucide-react";

export default function PatientDiagnostic() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [results, setResults] = useState<{
    invite: { status: 'ok' | 'error' | 'warning', message: string, reason?: string },
    professional: { status: 'ok' | 'error' | 'warning', message: string, reason?: string },
    subscription: { status: 'ok' | 'error' | 'warning', message: string, reason?: string },
    rls: { status: 'ok' | 'error' | 'warning', message: string, reason?: string }
  } | null>(null);

  const addLog = useCallback((msg: string) => {
    const timestamp = new Date().toISOString();
    setDebugLogs(prev => [...prev, `[${timestamp}] ${msg}`]);
  }, []);

  const copyLogs = () => {
    const logText = debugLogs.join("\n") + "\n\nResults:\n" + JSON.stringify(results, null, 2);
    navigator.clipboard.writeText(logText);
    toast.success("Logs copiados!");
  };

  const exportLogs = () => {
    const blob = new Blob([debugLogs.join("\n") + "\n\n" + JSON.stringify(results, null, 2)], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diagnostic_${user?.id}_${new Date().getTime()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const runDiagnostic = async () => {
    setLoading(true);
    setResults(null);
    setDebugLogs([]);
    addLog("Iniciando diagnóstico completo...");
    
    try {
      // 1. Check Invite
      addLog(`Buscando convites para: ${user?.email}`);
      const { data: invite, error: inviteErr } = await (supabase as any)
        .from("invitations")
        .select("*")
        .eq("patient_email", user?.email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let inviteResult: any;
      if (inviteErr) {
        addLog(`Erro ao buscar convite: ${inviteErr.message}`);
        inviteResult = { status: 'error', message: "Falha na comunicação com o servidor.", reason: inviteErr.message };
      } else if (invite) {
        addLog(`Convite encontrado: ${invite.id} (Status: ${invite.status})`);
        const isExpired = invite.expires_at && new Date(invite.expires_at) < new Date();
        if (isExpired) {
          inviteResult = { status: 'error', message: "Link expirado.", reason: "expirado" };
        } else if (invite.status === 'revoked') {
          inviteResult = { status: 'error', message: "Link revogado.", reason: "revogado" };
        } else {
          inviteResult = { status: 'ok', message: `Convite ${invite.status}.`, reason: invite.status };
        }
      } else {
        addLog("Nenhum convite específico encontrado.");
        inviteResult = { status: 'warning', message: "Sem convite direto.", reason: "not_found" };
      }

      // 2. Check Professional Link
      addLog("Verificando vínculo profissional ativo...");
      const { data: profLink, error: profErr } = await (supabase as any)
        .from("patient_professional_links")
        .select("professional_id, link_status")
        .eq("patient_id", user?.id)
        .maybeSingle();
      
      let profResult: any;
      if (profErr) {
        addLog(`Erro de permissão ou RLS no vínculo: ${profErr.message}`);
        profResult = { status: 'error', message: "Erro de permissão de acesso.", reason: "permission_denied" };
      } else if (profLink) {
        addLog(`Vínculo encontrado com: ${profLink.professional_id}`);
        profResult = { status: 'ok', message: `Vínculo ativo: ${profLink.link_status}.`, reason: profLink.link_status };
      } else {
        addLog("Nenhum profissional vinculado via patient_professional_links.");
        profResult = { status: 'error', message: "Vínculo inexistente.", reason: "no_link" };
      }

      // 3. Check Program Enrollment
      addLog("Verificando matrículas em programas...");
      const { data: enrollData, error: enrollErr } = await (supabase as any)
        .from("program_enrollments")
        .select("status")
        .eq("patient_id", user?.id)
        .limit(1)
        .maybeSingle();

      const enrollResult: any = enrollErr
        ? { status: 'error', message: "Erro ao verificar programas.", reason: enrollErr.message }
        : enrollData
          ? { status: 'ok', message: `Programa: ${enrollData.status}.` }
          : { status: 'warning', message: "Nenhum programa ativo." };

      // 4. Check RLS (Access to profile settings)
      addLog("Testando acesso às configurações (RLS Test)...");
      const { error: rlsErr } = await supabase
        .from("public_profile_settings")
        .select("id")
        .limit(1);
      
      const rlsResult: any = rlsErr
        ? { status: 'error', message: "Falha de RLS detectada.", reason: rlsErr.message }
        : { status: 'ok', message: "Permissões de banco OK." };

      setResults({
        invite: inviteResult,
        professional: profResult,
        subscription: enrollResult,
        rls: rlsResult
      });
      addLog("Diagnóstico concluído.");
      toast.success("Diagnóstico concluído.");
    } catch (err: any) {
      addLog(`Falha fatal no diagnóstico: ${err.message}`);
      toast.error("Falha ao executar diagnóstico.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'error': return <XCircle className="w-5 h-5 text-destructive" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-amber-500" />;
      default: return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold font-display">Diagnóstico da Conta</h1>
          <p className="text-muted-foreground">
            Use esta ferramenta para identificar problemas de acesso ou vínculo profissional.
          </p>
        </div>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Verificar meu vínculo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-lg bg-card border border-border">
              <div className="flex justify-between items-center mb-4">
                <div className="space-y-1">
                  <p className="font-medium">Identificador do Usuário</p>
                  <p className="text-xs font-mono text-muted-foreground">{user?.id}</p>
                </div>
                <Badge variant="outline">{(profile as any)?.role || 'Paciente'}</Badge>
              </div>
              <Button 
                onClick={runDiagnostic} 
                disabled={loading}
                className="w-full gradient-primary"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                {loading ? "Verificando..." : "Verificar Vínculo Agora"}
              </Button>
            </div>

            {results && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                <div className="grid gap-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                    <div className="flex items-center gap-3">
                      <Link2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Convite & Código</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{results.invite.message}</span>
                      {getStatusIcon(results.invite.status)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                    <div className="flex items-center gap-3">
                      <UserCheck className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Vínculo Profissional</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{results.professional.message}</span>
                      {getStatusIcon(results.professional.status)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Assinatura & Plano</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{results.subscription.message}</span>
                      {getStatusIcon(results.subscription.status)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Permissões de Dados (RLS)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{results.rls.message}</span>
                      {getStatusIcon(results.rls.status)}
                    </div>
                  </div>
                </div>

                {Object.values(results).some(r => r.status === 'error') && (
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex flex-col gap-3">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <div>
                        <strong>Detectamos um problema:</strong>
                        <div className="mt-1 space-y-1">
                          {results.professional.reason === 'no_link' && <p>Você não possui um vínculo ativo com um profissional. Peça para seu nutricionista reenviar o convite.</p>}
                          {results.invite.reason === 'expirado' && <p>Seu link de convite expirou. Links costumam durar 7 dias por segurança.</p>}
                          {results.invite.reason === 'revogado' && <p>Este convite foi cancelado pelo profissional.</p>}
                          {results.rls.status === 'error' && <p>Há uma falha de sincronização de dados (RLS). Tente sair e entrar novamente.</p>}
                          {!['no_link', 'expirado', 'revogado'].includes(results.professional.reason || '') && results.rls.status === 'ok' && (
                            <p>Alguns vínculos não estão corretos. Sugerimos que você limpe o cache do navegador ou entre em contato com o suporte.</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 mt-2 pt-3 border-t border-destructive/20">
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">Ações de diagnóstico:</span>
                      <Button variant="outline" size="sm" onClick={copyLogs} className="h-7 text-[10px] gap-1.5 border-destructive/30 hover:bg-destructive/10">
                        <Copy className="w-3 h-3" /> Copiar Logs
                      </Button>
                      <Button variant="outline" size="sm" onClick={exportLogs} className="h-7 text-[10px] gap-1.5 border-destructive/30 hover:bg-destructive/10">
                        <Download className="w-3 h-3" /> Baixar TXT
                      </Button>
                    </div>
                  </div>
                )}

                {debugLogs.length > 0 && (
                  <div className="p-4 rounded-lg bg-muted/30 border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-semibold">Rastro de Auditoria Local</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">{debugLogs.length} eventos</Badge>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1.5 font-mono text-[10px] text-muted-foreground">
                      {debugLogs.map((log, i) => (
                        <div key={i} className="border-l-2 border-primary/20 pl-2">{log}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
