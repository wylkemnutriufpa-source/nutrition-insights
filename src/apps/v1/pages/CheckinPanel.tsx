import { useState, useEffect } from "react";
import StorageImage from "@v1/components/common/StorageImage";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@v1/lib/auth";
import { supabase } from "@v1/integrations/supabase/client";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { Button } from "@v1/components/ui/button";
import { Input } from "@v1/components/ui/input";
import { Label } from "@v1/components/ui/label";
import { Textarea } from "@v1/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Badge } from "@v1/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@v1/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft, MessageSquare, Scale, Camera, CheckCircle2, Clock,
  Smile, Meh, Frown, User, Play, FileText, Eye, X, Send, Zap
} from "lucide-react";

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };

interface CheckinData {
  id: string;
  patient_id: string;
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
  patient_name?: string;
}

interface Protocol {
  id: string;
  title: string;
  category: string;
}

export default function CheckinPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [checkins, setCheckins] = useState<CheckinData[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "reviewed">("pending");
  const [selectedCheckin, setSelectedCheckin] = useState<CheckinData | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [notes, setNotes] = useState("");
  const [action, setAction] = useState("");
  const [selectedProtocol, setSelectedProtocol] = useState("");

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch check-ins
      const { data: checkinsData, error: checkinsError } = await supabase
        .from("patient_checkins")
        .select("*")
        .eq("nutritionist_id", user.id)
        .order("created_at", { ascending: false });

      if (checkinsError) {
        console.error("Error fetching checkins:", checkinsError);
      }

      // Get patient names
      const patientIds = [...new Set(checkinsData?.map(c => c.patient_id) || [])];
      let profiles: { user_id: string; full_name: string | null }[] = [];
      if (patientIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", patientIds);
        profiles = profilesData || [];
      }

      const profileMap = new Map(profiles.map(p => [p.user_id, p.full_name]) || []);
      const enriched = (checkinsData || []).map(c => ({
        ...c,
        patient_name: profileMap.get(c.patient_id) || "Paciente",
      }));

      setCheckins(enriched);

      // Fetch protocols
      const { data: protocolsData } = await supabase
        .from("protocols")
        .select("id, title, category")
        .eq("created_by", user.id);
      setProtocols(protocolsData || []);
    } catch (err) {
      console.error("CheckinPanel fetchData error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (!selectedCheckin || !user) return;
    setReviewing(true);

    try {
      // CRITICAL: Only use protocol ID if it exists in our loaded protocols list
      // This prevents FK violations when protocol_activated_id references a deleted/invalid protocol
      const validProtocol = selectedProtocol
        ? protocols.find((p) => p.id === selectedProtocol) ?? null
        : null;

      // Build update — protocol_activated_id is either a valid UUID or explicitly null
      const updatePayload: Record<string, any> = {
        status: "reviewed",
        nutri_notes: notes || null,
        nutri_action: action || null,
        reviewed_at: new Date().toISOString(),
        protocol_activated_id: validProtocol?.id ?? null,
      };

      const { error } = await supabase
        .from("patient_checkins")
        .update(updatePayload)
        .eq("id", selectedCheckin.id);

      if (error) throw error;

      // If valid protocol selected, activate it for the patient
      if (validProtocol) {
        const { error: protocolActivationError } = await supabase.from("patient_protocols").insert({
          patient_id: selectedCheckin.patient_id,
          nutritionist_id: user.id,
          protocol_id: validProtocol.id,
          start_date: new Date().toISOString().split("T")[0],
          status: "active",
        });

        if (protocolActivationError) {
          console.warn("Protocol activation warning:", protocolActivationError.message);
          // Don't throw — check-in review succeeded, protocol activation is secondary
          toast.warning(`Check-in revisado, mas o protocolo não pôde ser ativado: ${protocolActivationError.message}`);
        } else {
          toast.success(`Protocolo "${validProtocol.title}" ativado!`);
        }
      }

      toast.success("Check-in revisado com sucesso!");
      setSelectedCheckin(null);
      setNotes("");
      setAction("");
      setSelectedProtocol("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao revisar");
    } finally {
      setReviewing(false);
    }
  };

  const getDifficultyIcon = (d: string) => {
    if (d === "easy") return <Smile className="w-4 h-4 text-emerald-500" />;
    if (d === "hard") return <Frown className="w-4 h-4 text-red-500" />;
    return <Meh className="w-4 h-4 text-amber-500" />;
  };

  const filtered = checkins.filter(c => filter === "all" || c.status === filter);
  const pendingCount = checkins.filter(c => c.status === "pending").length;

  return (
    <DashboardLayout>
      <motion.div className="p-4 sm:p-6 space-y-6" variants={stagger} initial="hidden" animate="show">
        {/* Header */}
        <motion.div variants={fadeUp} className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold font-display">Check-ins dos Pacientes</h1>
              <p className="text-sm text-muted-foreground">
                {pendingCount > 0 ? `${pendingCount} pendente(s) para revisar` : "Todos revisados!"}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {(["pending", "reviewed", "all"] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "outline"}
                onClick={() => setFilter(f)}
              >
                {f === "pending" && <Clock className="w-4 h-4 mr-1" />}
                {f === "reviewed" && <CheckCircle2 className="w-4 h-4 mr-1" />}
                {f === "pending" ? "Pendentes" : f === "reviewed" ? "Revisados" : "Todos"}
                {f === "pending" && pendingCount > 0 && (
                  <Badge className="ml-1 bg-amber-500 text-white">{pendingCount}</Badge>
                )}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <motion.div variants={fadeUp}>
            <Card className="shadow-card border-border/50">
              <CardContent className="py-16 text-center">
                <MessageSquare className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {filter === "pending" ? "Nenhum check-in pendente!" : "Nenhum check-in encontrado"}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div variants={fadeUp} className="grid gap-4">
            {filtered.map((checkin) => (
              <Card key={checkin.id} className="shadow-card border-border/50 hover:shadow-lg transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold">{checkin.patient_name}</span>
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
                          <DialogTitle className="font-display">
                            Check-in de {checkin.patient_name}
                          </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-5">
                          {/* Info */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="p-3 rounded-lg bg-muted/50 text-center">
                              <p className="text-xs text-muted-foreground mb-1">Peso</p>
                              <p className="font-semibold">{checkin.weight ? `${checkin.weight} kg` : "—"}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50 text-center">
                              <p className="text-xs text-muted-foreground mb-1">Dificuldade</p>
                              <div className="flex items-center justify-center gap-1">
                                {getDifficultyIcon(checkin.difficulty)}
                                <span className="font-semibold capitalize">{checkin.difficulty}</span>
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
                              <Label>Suas anotações / Resposta ao paciente</Label>
                              <Textarea
                                placeholder="Escreva um feedback para o paciente..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                className="mt-1"
                              />
                            </div>

                            <div>
                              <Label>Ação recomendada</Label>
                              <Input
                                placeholder="Ex: Ajustar macros, aumentar água..."
                                value={action}
                                onChange={(e) => setAction(e.target.value)}
                                className="mt-1"
                              />
                            </div>

                            <div>
                              <Label className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-primary" /> Ativar Protocolo (opcional)
                              </Label>
                              <Select value={selectedProtocol || "none"} onValueChange={(v) => setSelectedProtocol(v === "none" ? "" : v)}>
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder="Selecione um protocolo..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Nenhum</SelectItem>
                                  {protocols.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                      {p.title} ({p.category})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex gap-2 justify-end">
                              <DialogTrigger asChild>
                                <Button variant="outline">Cancelar</Button>
                              </DialogTrigger>
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
          </motion.div>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
