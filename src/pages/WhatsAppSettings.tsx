import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MessageCircle, Wifi, WifiOff, Send, Loader2, CheckCircle2, XCircle, Clock, Phone, Shield, Zap } from "lucide-react";
import { BrainLoaderInline } from "@/components/common/BrainLoader";
import {
  getIntegration,
  saveIntegration,
  disconnectIntegration,
  sendWhatsAppMessage,
  getWhatsAppLogs,
  type WhatsAppIntegration,
  type WhatsAppLog,
} from "@/services/whatsappService";
import { supabase } from "@/integrations/supabase/client";

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

      // Load patients
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

  async function handleConnect() {
    if (!instanceId.trim() || !token.trim()) {
      toast.error("Instance ID e Token são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      await saveIntegration({
        professionalId: professionalId!,
        instanceId: instanceId.trim(),
        token: token.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
      });
      toast.success("WhatsApp conectado com sucesso!");
      setShowConnect(false);
      setInstanceId("");
      setToken("");
      setPhoneNumber("");
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
    setSending(true);
    try {
      const result = await sendWhatsAppMessage({
        patientPhone: testPhone,
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
              <div className="flex items-start justify-between gap-4">
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
                        : "Conecte seu número para enviar lembretes automáticos e acompanhar pacientes em tempo real."}
                    </p>
                    {isConnected && (
                      <Badge variant="outline" className="mt-2 border-green-500/30 text-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Ativo
                      </Badge>
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
                                : "border-amber-500/30 text-amber-600 text-xs"
                            }
                          >
                            {log.delivery_status === "sent" ? "✓ Enviado" : log.delivery_status === "error" ? "✗ Erro" : "⏳ Pendente"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{log.event_type}</span>
                        </div>
                        <p className="text-sm truncate mt-1">{log.message_body}</p>
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

        {/* How to connect info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Como conectar</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Acesse <a href="https://www.z-api.io" target="_blank" rel="noopener noreferrer" className="text-primary underline">z-api.io</a> e crie sua conta</li>
              <li>Crie uma instância e escaneie o QR Code com seu WhatsApp profissional</li>
              <li>Copie o <strong>Instance ID</strong> e o <strong>Token</strong> da sua instância</li>
              <li>Cole aqui na plataforma e clique em Conectar</li>
              <li>Pronto! O sistema enviará automações clínicas pelo seu número</li>
            </ol>
          </CardContent>
        </Card>

        {/* Connect Modal */}
        <Dialog open={showConnect} onOpenChange={setShowConnect}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-green-500" />
                Conectar WhatsApp (Z-API)
              </DialogTitle>
              <DialogDescription>
                Informe os dados da sua instância Z-API para conectar seu número profissional
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="instanceId">Instance ID *</Label>
                <Input
                  id="instanceId"
                  value={instanceId}
                  onChange={(e) => setInstanceId(e.target.value)}
                  placeholder="Ex: 3C9E2A1B4D5F..."
                />
              </div>
              <div>
                <Label htmlFor="token">Token *</Label>
                <Input
                  id="token"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Seu token Z-API"
                />
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
              <Button onClick={handleConnect} disabled={saving} className="w-full bg-green-600 hover:bg-green-700">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Conectar
              </Button>
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
                Enviar Teste
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
