import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@v1/lib/auth";
import { supabase } from "@v1/integrations/supabase/client";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { Button } from "@v1/components/ui/button";
import { Input } from "@v1/components/ui/input";
import { Card, CardContent } from "@v1/components/ui/card";
import { Badge } from "@v1/components/ui/badge";
import { Loader2, Search, Stethoscope, Clock, User, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface PatientRow {
  patient_id: string;
  status: string;
  attendance_mode: string;
  profile?: { full_name: string; avatar_url: string | null } | null;
}

interface ActiveSession {
  patient_id: string;
  current_step: number;
  created_at: string;
}

export default function InOfficeSelector() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      const [patientsRes, sessionsRes] = await Promise.all([
        supabase
          .from("nutritionist_patients")
          .select("patient_id, status, attendance_mode")
          .eq("nutritionist_id", user.id)
          .eq("status", "active"),
        supabase
          .from("in_office_sessions" as any)
          .select("patient_id, current_step, created_at")
          .eq("nutritionist_id", user.id)
          .is("completed_at", null)
          .order("created_at", { ascending: false }),
      ]);

      const links = (patientsRes.data || []) as PatientRow[];
      const sessions = (sessionsRes.data || []) as unknown as ActiveSession[];
      setActiveSessions(sessions);

      // Fetch profiles
      const ids = links.map((l) => l.patient_id);
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", ids);
        const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
        links.forEach((l) => {
          l.profile = profileMap.get(l.patient_id) || null;
        });
      }

      setPatients(links);
      setLoading(false);
    })();
  }, [user?.id]);

  const sessionMap = new Map(activeSessions.map((s) => [s.patient_id, s]));

  const filtered = patients.filter((p) => {
    if (!search.trim()) return true;
    const name = p.profile?.full_name?.toLowerCase() || "";
    return name.includes(search.toLowerCase());
  });

  // Sort: active sessions first, then by name
  const sorted = [...filtered].sort((a, b) => {
    const aSession = sessionMap.has(a.patient_id) ? 0 : 1;
    const bSession = sessionMap.has(b.patient_id) ? 0 : 1;
    if (aSession !== bSession) return aSession - bSession;
    return (a.profile?.full_name || "").localeCompare(b.profile?.full_name || "");
  });

  const STEP_LABELS = ["", "Cadastro", "Anamnese", "Avaliação", "Plano", "Finalização"];

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Stethoscope className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Modo Consultório</h1>
            <p className="text-sm text-muted-foreground">
              Selecione um paciente para iniciar ou retomar uma consulta presencial
            </p>
          </div>
        </div>

        {/* Active sessions banner */}
        {activeSessions.length > 0 && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">
                  {activeSessions.length} sessão(ões) em andamento
                </span>
              </div>
              <div className="space-y-2">
                {activeSessions.map((s) => {
                  const pat = patients.find((p) => p.patient_id === s.patient_id);
                  return (
                    <button
                      key={s.patient_id}
                      onClick={() => navigate(`/in-office/${s.patient_id}`)}
                      className="w-full flex items-center justify-between p-3 rounded-lg bg-background hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium">{pat?.profile?.full_name || "Paciente"}</p>
                          <p className="text-xs text-muted-foreground">
                            Etapa {s.current_step}/5 — {STEP_LABELS[s.current_step] || ""}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-primary border-primary/30">
                        Retomar <ArrowRight className="w-3 h-3 ml-1" />
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar paciente..."
            className="pl-10"
          />
        </div>

        {/* Patient list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Stethoscope className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum paciente encontrado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map((p, i) => {
              const hasSession = sessionMap.has(p.patient_id);
              return (
                <motion.div
                  key={p.patient_id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <button
                    onClick={() => navigate(`/in-office/${p.patient_id}`)}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        {p.profile?.avatar_url ? (
                          <img src={p.profile.avatar_url} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="text-left">
                        <p className="font-medium">{p.profile?.full_name || "Paciente"}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.attendance_mode === "presential" ? "🏥 Presencial" : "💻 Online"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasSession && (
                        <Badge className="bg-primary/10 text-primary border-0 text-xs">
                          Em andamento
                        </Badge>
                      )}
                      <Button variant="ghost" size="icon" className="text-muted-foreground">
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
