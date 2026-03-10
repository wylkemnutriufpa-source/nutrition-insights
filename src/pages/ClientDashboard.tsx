import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import SmartTips from "@/components/patient/SmartTips";
import {
  Rocket, CalendarDays, Bell, TrendingUp, CheckCircle2,
  UtensilsCrossed, Trophy, Target
} from "lucide-react";
import RankingWidget from "@/components/prestige/RankingWidget";
import ExplorerProgressWidget from "@/components/dashboard/ExplorerProgressWidget";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProgramInfo {
  id: string;
  title: string;
  tag: string;
  start_date: string;
  current_phase: number | null;
  status: string;
}

interface AppointmentInfo {
  id: string;
  title: string;
  appointment_date: string;
  status: string;
  appointment_type: string;
}

interface NotificationInfo {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  type: string;
}

interface ChecklistStats {
  total: number;
  completed: number;
}

export default function ClientDashboard() {
  const { user, profile } = useAuth();
  const [programs, setPrograms] = useState<ProgramInfo[]>([]);
  const [appointments, setAppointments] = useState<AppointmentInfo[]>([]);
  const [notifications, setNotifications] = useState<NotificationInfo[]>([]);
  const [checklistStats, setChecklistStats] = useState<ChecklistStats>({ total: 0, completed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const today = format(new Date(), "yyyy-MM-dd");

    Promise.all([
      // Active programs
      supabase
        .from("program_patients")
        .select("program_id, current_phase, status, programs(id, title, tag, start_date)")
        .eq("patient_id", user.id)
        .eq("status", "active"),

      // Upcoming appointments
      supabase
        .from("patient_appointments")
        .select("id, title, appointment_date, status, appointment_type")
        .eq("patient_id", user.id)
        .gte("appointment_date", new Date().toISOString())
        .order("appointment_date", { ascending: true })
        .limit(5),

      // Recent notifications
      supabase
        .from("notifications")
        .select("id, title, message, created_at, is_read, type")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8),

      // Today's checklist
      supabase
        .from("checklist_tasks")
        .select("id, completed")
        .eq("patient_id", user.id)
        .eq("date", today),
    ]).then(([programsRes, appointmentsRes, notificationsRes, checklistRes]) => {
      if (programsRes.data) {
        setPrograms(
          programsRes.data.map((p: any) => ({
            id: p.programs?.id || p.program_id,
            title: p.programs?.title || "Programa",
            tag: p.programs?.tag || "",
            start_date: p.programs?.start_date || "",
            current_phase: p.current_phase,
            status: p.status,
          }))
        );
      }
      if (appointmentsRes.data) setAppointments(appointmentsRes.data);
      if (notificationsRes.data) setNotifications(notificationsRes.data);
      if (checklistRes.data) {
        setChecklistStats({
          total: checklistRes.data.length,
          completed: checklistRes.data.filter((t: any) => t.completed).length,
        });
      }
      setLoading(false);
    });
  }, [user]);

  const checklistPercent = checklistStats.total > 0
    ? Math.round((checklistStats.completed / checklistStats.total) * 100)
    : 0;

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-display font-bold">
            Olá, {profile?.full_name?.split(" ")[0] || "Paciente"} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Acompanhe seu progresso e mantenha seus hábitos em dia.
          </p>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Ranking Widget */}
          <RankingWidget />
          <Link to="/checklist">
            <Card className="hover:border-primary/30 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Checklist Hoje</p>
                    <p className="text-lg font-bold">{checklistStats.completed}/{checklistStats.total}</p>
                  </div>
                </div>
                <Progress value={checklistPercent} className="mt-2 h-1.5" />
              </CardContent>
            </Card>
          </Link>

          <Link to="/my-diet">
            <Card className="hover:border-primary/30 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <UtensilsCrossed className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Minha Dieta</p>
                    <p className="text-sm font-medium">Ver plano</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/achievements">
            <Card className="hover:border-primary/30 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Conquistas</p>
                    <p className="text-sm font-medium">Ver todas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/journey">
            <Card className="hover:border-primary/30 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-info" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Progresso</p>
                    <p className="text-sm font-medium">Jornada</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Active Programs */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Rocket className="w-4 h-4 text-primary" />
                Programas Ativos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {programs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum programa ativo no momento.</p>
              ) : (
                programs.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Target className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.tag} • Fase {p.current_phase || 1}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Upcoming Appointments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-accent" />
                Próximas Consultas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {appointments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma consulta agendada.</p>
              ) : (
                appointments.slice(0, 4).map((a, i) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border"
                  >
                    <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                      <CalendarDays className="w-4 h-4 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(a.appointment_date), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      a.status === "confirmed" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      {a.status === "confirmed" ? "Confirmada" : a.status === "scheduled" ? "Agendada" : a.status}
                    </span>
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Explorer Progress */}
          <ExplorerProgressWidget />

          {/* Smart Tips */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dicas Inteligentes</CardTitle>
            </CardHeader>
            <CardContent>
              <SmartTips />
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="w-4 h-4 text-warning" />
                Notificações
                {unreadCount > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning font-medium">
                    {unreadCount} novas
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma notificação.</p>
              ) : (
                notifications.slice(0, 5).map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 rounded-lg border transition-all ${
                      n.is_read ? "border-border bg-muted/30 opacity-60" : "border-primary/20 bg-primary/5"
                    }`}
                  >
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(n.created_at), "dd/MM 'às' HH:mm")}
                    </p>
                  </div>
                ))
              )}
              {notifications.length > 5 && (
                <Link to="/notifications" className="block text-xs text-primary text-center pt-2 hover:underline">
                  Ver todas as notificações
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
