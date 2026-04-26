import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MessageCircle, Wifi, WifiOff, Send, Loader2, CheckCircle2, XCircle, Clock, Phone, Shield, Zap, AlertTriangle } from "lucide-react";
import { BrainLoaderInline } from "@/components/common/BrainLoader";
import {
  getIntegration,
  validateAndSaveIntegration,
  validateZApiCredentials,
  disconnectIntegration,
  sendWhatsAppMessage,
  getWhatsAppLogs,
  normalizePhone,
  type WhatsAppIntegration,
  type WhatsAppLog,
} from "@/services/whatsappService";
import { supabase } from "@/integrations/supabase/client";
import { validateWhatsApp } from "@/utils/whatsapp";


export default function WhatsAppSettings() {
  const { profile } = useAuth();
  const [integration, setIntegration] = useState<WhatsAppIntegration | null>(null);
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConnect, setShowConnect] = useState(false);
  const [showTest, setShowTest] = useState(false);

  // Connect form
  const [instanceId, setInstanceId] = useState("");
  const [token, setToken] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; error?: string } | null>(null);

  // Test form
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Olá! Esta é uma mensagem de teste do FitJourney. 🧠💪");
  const [sending, setSending] = useState(false);

  // Patients for test
  const [patients, setPatients] = useState<Array<{ id: string; full_name: string; phone: string | null }>>([]);

  const professionalId = profile?.id;

  useEffect(() => {
    if (!professionalId) return;
    loadData();
  }, [professionalId]);

  async function loadData() {
    setLoading(true);
    try {
      const [integ, logData] = await Promise.all([
        getIntegration(professionalId!),
        getWhatsAppLogs(professionalId!, 20),
      ]);
      setIntegration(integ);
      setLogs(logData);

      const { data: pats } = await (supabase as any)
        .from("nutritionist_patients")
        .select("patient:profiles!nutritionist_patients_patient_id_fkey(id, full_name, phone)")
        .eq("nutritionist_id", professionalId)
        .eq("status", "active");

      if (pats) {
        setPatients(pats.map((p: any) => p.patient).filter(Boolean));
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function handleValidate() {
    if (!instanceId.trim() || !token.trim()) {
      toast.error("Instance ID e Token são obrigatórios");
      return;
    }
    setValidating(true);
    setValidationResult(null);
    try {
      const result = await validateZApiCredentials({
        instanceId: instanceId.trim(),
        token: token.trim(),
      });
      setValidationResult({ valid: result.valid && result.connected, error: result.error });
      if (result.valid && result.connected) {
        if (result.phone) setPhoneNumber(result.phone);
        toast.success("Credenciais válidas! Instância conectada.");
      } else {
        toast.error(result.error || "Instância não está conectada na Z-API");
      }
    } catch (err: any) {
      setValidationResult({ valid: false, error: err.message });
      toast.error("Erro ao validar credenciais");
    } finally {
      setValidating(false);
    }
  }

  async function handleConnect() {
    if (!instanceId.trim() || !token.trim()) {
      toast.error("Instance ID e Token são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      const result = await validateAndSaveIntegration({
        instanceId: instanceId.trim(),
        token: token.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
      });
      if (result.validated) {
        toast.success("WhatsApp conectado e validado com sucesso!");
      } else {
        toast.warning("Credenciais salvas, mas instância não respondeu. Verifique na Z-API.");
      }
      setShowConnect(false);
      setInstanceId("");
      setToken("");
      setPhoneNumber("");
      setValidationResult(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao conectar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    try {
      await disconnectIntegration(professionalId!);
      toast.success("WhatsApp desconectado");
      setIntegration(null);
    } catch {
      toast.error("Erro ao desconectar");
    }
  }

  async function handleTestSend() {
    if (!testPhone.trim()) {
      toast.error("Informe o número do paciente");
      return;
    }
    
    const validation = validateWhatsApp(testPhone);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    const normalized = normalizePhone(testPhone);
    if (!normalized) {
      toast.error("Erro na normalização do número");
      return;
    }
    setSending(true);
    try {
      const result = await sendWhatsAppMessage({
        patientPhone: normalized,
        message: testMessage,
        eventType: "TEST",
      });
      if (result?.success) {
        toast.success(result.status === "queued" ? "Mensagem agendada (fora do horário)" : "Mensagem enviada!");
        setShowTest(false);
        await loadData();
      } else {
        toast.error(result?.error || "Erro ao enviar");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <BrainLoaderInline text="Carregando configurações..." />
        </div>
      </DashboardLayout>
    );
  }

  const isConnected = integration?.is_active;
  const isValidated = !!integration?.connection_validated_at;
  const lastLog = logs[0];

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-green-500" />
            WhatsApp Profissional
          </h1>
          <p className="text-muted-foreground">
            Conecte seu número e envie automações clínicas para seus pacientes
          </p>
        </div>

        {/* Hero Status Card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className={`border-2 ${isConnected ? "border-green-500/30 bg-green-500/5" : "border-muted"}`}>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${isConnected ? "bg-green-500/10" : "bg-muted"}`}>
                    {isConnected ? (
                      <Wifi className="h-8 w-8 text-green-500" />
                    ) : (
                      <WifiOff className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">
                      {isConnected ? "WhatsApp Conectado" : "WhatsApp Não Conectado"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {isConnected
                        ? `Número: ${integration?.phone_number || "Não informado"} • Provider: Z-API`
                        : "Conecte seu número para enviar lembretes automáticos."}
                    </p>
                    {isConnected && (
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="border-green-500/30 text-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Ativo
                        </Badge>
                        {isValidated ? (
                          <Badge variant="outline" className="border-blue-500/30 text-blue-600 text-xs">
                            <Shield className="h-3 w-3 mr-1" /> Validado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-500/30 text-amber-600 text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" /> Não validado
                          </Badge>
                        )}
                      </div>
                    )}
                    {isConnected && integration?.connection_validated_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Validado em: {new Date(integration.connection_validated_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                    {integration?.last_error && (
                      <p className="text-xs text-destructive mt-1">Último erro: {integration.last_error}</p>
                    )}
                    {lastLog && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Último envio: {new Date(lastLog.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} ({lastLog.delivery_status})
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {isConnected ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setShowTest(true)}>
                        <Send className="h-4 w-4 mr-1" /> Testar envio
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowConnect(true)}>
                        <Zap className="h-4 w-4 mr-1" /> Reconectar
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={handleDisconnect}>
                        <XCircle className="h-4 w-4 mr-1" /> Desconectar
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => setShowConnect(true)} className="bg-green-600 hover:bg-green-700">
                      <Phone className="h-4 w-4 mr-2" /> Conectar WhatsApp
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Automations info */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-5 w-5 text-amber-500" />
                Automações Clínicas
              </CardTitle>
              <CardDescription>
                O sistema enviará mensagens automaticamente quando eventos clínicos acontecerem
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: "Onboarding liberado", desc: "Avisa paciente quando onboarding for liberado", icon: "🚀" },
                  { label: "Plano publicado", desc: "Notifica quando novo plano alimentar estiver pronto", icon: "📋" },
                  { label: "Lembrete de checklist", desc: "Lembrete diário de tarefas pendentes", icon: "✅" },
                  { label: "Baixa adesão", desc: "Alerta quando adesão cair significativamente", icon: "⚠️" },
                  { label: "Foco do dia", desc: "Envia o direcionamento terapêutico diário", icon: "🎯" },
                  { label: "Resumo semanal", desc: "Resumo da evolução da semana", icon: "📊" },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30">
                    <span className="text-lg">{item.icon}</span>
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-amber-700 dark:text-amber-400">Anti-spam ativo</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Máximo 3 mensagens/dia por paciente • Envio apenas entre 8h e 21h • Sem duplicatas
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Logs */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-5 w-5 text-blue-500" />
                Histórico de Envios
              </CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma mensagem enviada ainda
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-auto">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={
                              log.delivery_status === "sent"
                                ? "border-green-500/30 text-green-600 text-xs"
                                : log.delivery_status === "error"
                                ? "border-red-500/30 text-red-600 text-xs"
                                : log.delivery_status === "received"
                                ? "border-blue-500/30 text-blue-600 text-xs"
                                : "border-amber-500/30 text-amber-600 text-xs"
                            }
                          >
                            {log.delivery_status === "sent" ? "✓ Enviado" : log.delivery_status === "error" ? "✗ Erro" : log.delivery_status === "received" ? "↓ Recebido" : "⏳ Pendente"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{log.event_type}</span>
                        </div>
                        <p className="text-sm truncate mt-1">{log.message_body}</p>
                        {log.error_message && (
                          <p className="text-xs text-destructive truncate mt-1">{log.error_message}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {new Date(log.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* How to connect */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Como conectar</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Acesse <a href="https://www.z-api.io" target="_blank" rel="noopener noreferrer" className="text-primary underline">z-api.io</a> e crie sua conta</li>
              <li>Crie uma instância e escaneie o QR Code com seu WhatsApp profissional</li>
              <li>Copie o <strong>Instance ID</strong> e o <strong>Token</strong> da sua instância</li>
              <li>Cole aqui na plataforma e clique em <strong>Validar</strong> antes de conectar</li>
              <li>Pronto! O sistema enviará automações clínicas pelo seu número</li>
            </ol>
          </CardContent>
        </Card>

        {/* Webhook Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-500" />
              Webhook de Respostas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Para receber respostas dos pacientes, configure na Z-API o webhook abaixo:
            </p>
            <div className="p-3 rounded-lg bg-muted font-mono text-xs break-all select-all">
              {`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/whatsapp-inbound`}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Cole esta URL no campo "Webhook de recebimento" da sua instância Z-API.
            </p>
          </CardContent>
        </Card>

        {/* Connect Modal */}
        <Dialog open={showConnect} onOpenChange={(open) => { setShowConnect(open); if (!open) setValidationResult(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-green-500" />
                Conectar WhatsApp (Z-API)
              </DialogTitle>
              <DialogDescription>
                Informe os dados da sua instância Z-API. O sistema validará antes de salvar.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="instanceId">Instance ID *</Label>
                <Input
                  id="instanceId"
                  value={instanceId}
                  onChange={(e) => { setInstanceId(e.target.value); setValidationResult(null); }}
                  placeholder="Ex: 3C9E2A1B4D5F..."
                />
              </div>
              <div>
                <Label htmlFor="token">Token *</Label>
                <Input
                  id="token"
                  type="password"
                  value={token}
                  onChange={(e) => { setToken(e.target.value); setValidationResult(null); }}
                  placeholder="Seu token Z-API"
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  <Shield className="h-3 w-3 inline mr-1" />
                  Token protegido — não será exibido após salvar
                </p>
              </div>
              <div>
                <Label htmlFor="phoneNumber">Número conectado</Label>
                <Input
                  id="phoneNumber"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>

              {validationResult && (
                <div className={`p-3 rounded-lg text-sm ${validationResult.valid ? "bg-green-500/10 text-green-700 border border-green-500/20" : "bg-red-500/10 text-red-700 border border-red-500/20"}`}>
                  {validationResult.valid ? (
                    <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Instância válida e conectada</span>
                  ) : (
                    <span className="flex items-center gap-2"><XCircle className="h-4 w-4" /> {validationResult.error || "Instância inválida ou desconectada"}</span>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleValidate}
                  disabled={validating || !instanceId.trim() || !token.trim()}
                  className="flex-1"
                >
                  {validating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
                  Validar
                </Button>
                <Button
                  onClick={handleConnect}
                  disabled={saving || !instanceId.trim() || !token.trim()}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Conectar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Test Send Modal */}
        <Dialog open={showTest} onOpenChange={setShowTest}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-blue-500" />
                Enviar Mensagem Teste
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {patients.length > 0 && (
                <div>
                  <Label>Selecionar paciente</Label>
                  <Select onValueChange={(val) => {
                    const p = patients.find((x) => x.id === val);
                    if (p?.phone) setTestPhone(p.phone);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um paciente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.filter((p) => p.phone).map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label htmlFor="testPhone">Número</Label>
                <Input
                  id="testPhone"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <Label htmlFor="testMsg">Mensagem</Label>
                <Input
                  id="testMsg"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                />
              </div>
              <Button onClick={handleTestSend} disabled={sending} className="w-full">
                {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Enviar teste
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
