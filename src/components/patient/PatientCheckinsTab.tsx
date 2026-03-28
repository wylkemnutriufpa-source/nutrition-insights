import { useState, useEffect } from "react";
import StorageImage from "@/components/common/StorageImage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  MessageSquare, Scale, Camera, CheckCircle2, Clock, Eye,
  Smile, Meh, Frown, Zap, Settings
} from "lucide-react";

interface CheckinData {
  id: string;
  weight: number | null;
  feedback: string | null;
  difficulty: string;
  photo_front_url: string | null;
  photo_side_url: string | null;
  photo_back_url: string | null;
  status: string;
  nutri_notes: string | null;
  nutri_action: string | null;
  protocol_activated_id: string | null;
  created_at: string;
  reviewed_at: string | null;
}

interface Protocol {
  id: string;
  title: string;
}

interface PatientCheckinsTabProps {
  patientId: string;
}

export default function PatientCheckinsTab({ patientId }: PatientCheckinsTabProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [checkins, setCheckins] = useState<CheckinData[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [frequency, setFrequency] = useState("weekly");
  const [savingFreq, setSavingFreq] = useState(false);

  // Review state
  const [selectedCheckin, setSelectedCheckin] = useState<CheckinData | null>(null);
  const [notes, setNotes] = useState("");
  const [action, setAction] = useState("");
  const [selectedProtocol, setSelectedProtocol] = useState("");
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    if (!patientId || !user) return;
    fetchData();
  }, [patientId, user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const [checkinsRes, protocolsRes, npRes] = await Promise.all([
      supabase
        .from("patient_checkins")
        .select("*")
        .eq("patient_id", patientId)
        .eq("nutritionist_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("protocols").select("id, title").eq("created_by", user.id),
      supabase
        .from("nutritionist_patients")
        .select("checkin_frequency")
        .eq("patient_id", patientId)
        .eq("nutritionist_id", user.id)
        .maybeSingle(),
    ]);

    setCheckins(checkinsRes.data || []);
    setProtocols(protocolsRes.data || []);
    if (npRes.data?.checkin_frequency) setFrequency(npRes.data.checkin_frequency);
    setLoading(false);
  };

  const handleFrequencyChange = async (newFreq: string) => {
    if (!user) return;
    setSavingFreq(true);
    const { error } = await supabase
      .from("nutritionist_patients")
      .update({ checkin_frequency: newFreq })
      .eq("patient_id", patientId)
      .eq("nutritionist_id", user.id);
    setSavingFreq(false);
    if (error) {
      toast.error("Erro ao salvar frequência");
    } else {
      setFrequency(newFreq);
      toast.success("Frequência atualizada!");
    }
  };

  const handleReview = async () => {
    if (!selectedCheckin || !user) return;
    setReviewing(true);

    const selectedProtocolRecord = protocols.find((protocol) => protocol.id === selectedProtocol) ?? null;
    const validProtocolId = selectedProtocolRecord?.id ?? null;

    const updatePayload: Record<string, any> = {
      status: "reviewed",
      nutri_notes: notes || null,
      nutri_action: action || null,
      reviewed_at: new Date().toISOString(),
      protocol_activated_id: validProtocolId,
    };

    const { error } = await supabase
      .from("patient_checkins")
      .update(updatePayload)
      .eq("id", selectedCheckin.id);

    if (error) {
      toast.error(error.message);
    } else {
      if (validProtocolId) {
        const { error: protocolActivationError } = await supabase.from("patient_protocols").insert({
          patient_id: patientId,
          nutritionist_id: user.id,
          protocol_id: validProtocolId,
          start_date: new Date().toISOString().split("T")[0],
          status: "active",
        });

        if (protocolActivationError) {
          toast.error(protocolActivationError.message);
          setReviewing(false);
          return;
        }

        toast.success(`Protocolo "${selectedProtocolRecord?.title}" ativado!`);
      } else if (selectedProtocol) {
        toast.success("Check-in revisado sem ativar protocolo porque o protocolo selecionado não é mais válido.");
      }

      if (!selectedProtocol || validProtocolId) {
        toast.success("Check-in revisado!");
      }
      setSelectedCheckin(null);
      setNotes("");
      setAction("");
      setSelectedProtocol("");
      fetchData();
    }
    setReviewing(false);
  };

  const getDifficultyIcon = (d: string) => {
    if (d === "easy") return <Smile className="w-4 h-4 text-emerald-500" />;
    if (d === "hard") return <Frown className="w-4 h-4 text-red-500" />;
    return <Meh className="w-4 h-4 text-amber-500" />;
  };

  const pendingCount = checkins.filter((c) => c.status === "pending").length;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with frequency config */}
      <Card className="glass shadow-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Settings className="w-5 h-5 text-muted-foreground" />
              Configuração de Check-in
            </CardTitle>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Frequência:</Label>
              <Select value={frequency} onValueChange={handleFrequencyChange} disabled={savingFreq}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diário</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="biweekly">Quinzenal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="free">Livre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {pendingCount > 0 ? (
              <span className="text-amber-500 font-medium">{pendingCount} check-in(s) pendente(s) para revisão</span>
            ) : (
              "Todos os check-ins foram revisados."
            )}
          </p>
        </CardContent>
      </Card>

      {/* Check-ins list */}
      {checkins.length === 0 ? (
        <Card className="glass shadow-card">
          <CardContent className="py-12 text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum check-in recebido ainda</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {checkins.map((checkin) => (
            <Card key={checkin.id} className="glass shadow-card">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      {getDifficultyIcon(checkin.difficulty)}
                      {checkin.weight && (
                        <Badge variant="secondary" className="gap-1">
                          <Scale className="w-3 h-3" /> {checkin.weight} kg
                        </Badge>
                      )}
                      {(checkin.photo_front_url || checkin.photo_side_url || checkin.photo_back_url) && (
                        <Badge variant="outline" className="gap-1">
                          <Camera className="w-3 h-3" /> Fotos
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={
                          checkin.status === "reviewed"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-amber-500/10 text-amber-500"
                        }
                      >
                        {checkin.status === "reviewed" ? "Revisado" : "Pendente"}
                      </Badge>
                    </div>
                    {checkin.feedback && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{checkin.feedback}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(checkin.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant={checkin.status === "pending" ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setSelectedCheckin(checkin);
                          setNotes(checkin.nutri_notes || "");
                          setAction(checkin.nutri_action || "");
                          setSelectedProtocol(
                            protocols.some((protocol) => protocol.id === checkin.protocol_activated_id)
                              ? checkin.protocol_activated_id || ""
                              : "",
                          );
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        {checkin.status === "pending" ? "Revisar" : "Ver"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Detalhes do Check-in</DialogTitle>
                      </DialogHeader>

                      <div className="space-y-5">
                        {/* Info grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="p-3 rounded-lg bg-muted/50 text-center">
                            <p className="text-xs text-muted-foreground mb-1">Peso</p>
                            <p className="font-semibold">{checkin.weight ? `${checkin.weight} kg` : "—"}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50 text-center">
                            <p className="text-xs text-muted-foreground mb-1">Dificuldade</p>
                            <div className="flex items-center justify-center gap-1">
                              {getDifficultyIcon(checkin.difficulty)}
                            </div>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50 text-center">
                            <p className="text-xs text-muted-foreground mb-1">Status</p>
                            <Badge
                              className={
                                checkin.status === "reviewed"
                                  ? "bg-emerald-500 text-white"
                                  : "bg-amber-500 text-white"
                              }
                            >
                              {checkin.status === "reviewed" ? "Revisado" : "Pendente"}
                            </Badge>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50 text-center">
                            <p className="text-xs text-muted-foreground mb-1">Data</p>
                            <p className="font-semibold text-sm">
                              {new Date(checkin.created_at).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        </div>

                        {/* Feedback */}
                        {checkin.feedback && (
                          <div>
                            <Label className="text-muted-foreground">Feedback do paciente</Label>
                            <div className="mt-1 p-3 rounded-lg bg-muted/50 text-sm">{checkin.feedback}</div>
                          </div>
                        )}

                        {/* Photos */}
                        {(checkin.photo_front_url || checkin.photo_side_url || checkin.photo_back_url) && (
                          <div>
                            <Label className="text-muted-foreground mb-2 block">Fotos de evolução</Label>
                            <div className="grid grid-cols-3 gap-3">
                              {[
                                { label: "Frente", url: checkin.photo_front_url },
                                { label: "Lado", url: checkin.photo_side_url },
                                { label: "Costas", url: checkin.photo_back_url },
                              ].map((photo) => (
                                <div key={photo.label} className="aspect-[3/4] rounded-lg bg-muted overflow-hidden">
                                  {photo.url ? (
                                    <StorageImage src={photo.url} bucket="checkin-photos" alt={photo.label} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                                      {photo.label}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Review form */}
                        <div className="border-t border-border pt-4 space-y-4">
                          <div>
                            <Label>Suas anotações</Label>
                            <Textarea
                              placeholder="Escreva um feedback..."
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              rows={3}
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label>Ação recomendada</Label>
                            <Input
                              placeholder="Ex: Ajustar macros..."
                              value={action}
                              onChange={(e) => setAction(e.target.value)}
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label className="flex items-center gap-2">
                              <Zap className="w-4 h-4 text-primary" /> Ativar Protocolo
                            </Label>
                            <Select value={selectedProtocol || "none"} onValueChange={(v) => setSelectedProtocol(v === "none" ? "" : v)}>
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Nenhum" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Nenhum</SelectItem>
                                {protocols.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.title}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex gap-2 justify-end">
                            <Button onClick={handleReview} disabled={reviewing} className="gap-2">
                              {reviewing ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4" />
                              )}
                              Marcar como Revisado
                            </Button>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
