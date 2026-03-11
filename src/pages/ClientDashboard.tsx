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
import PlanRequestButton from "@/components/patient/PlanRequestButton";
import ProgramJoinRequest from "@/components/patient/ProgramJoinRequest";
import SubscriptionCard from "@/components/patient/SubscriptionCard";
import { Button } from "@/components/ui/button";

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

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function ClientDashboard() {
  const { user, profile } = useAuth();
  const [programs, setPrograms] = useState<ProgramInfo[]>([]);
  const [appointments, setAppointments] = useState<AppointmentInfo[]>([]);
  const [notifications, setNotifications] = useState<NotificationInfo[]>([]);
  const [checklistStats, setChecklistStats] = useState<ChecklistStats>({ total: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [programJoinOpen, setProgramJoinOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const today = format(new Date(), "yyyy-MM-dd");

    Promise.all([
      supabase
        .from("program_patients")
        .select("program_id, current_phase, status, programs(id, title, tag, start_date)")
        .eq("patient_id", user.id)
        .eq("status", "active"),
      supabase
        .from("patient_appointments")
        .select("id, title, appointment_date, status, appointment_type")
        .eq("patient_id", user.id)
        .gte("appointment_date", new Date().toISOString())
        .order("appointment_date", { ascending: true })
        .limit(5),
      supabase
        .from("notifications")
        .select("id, title, message, created_at, is_read, type")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8),
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
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* Premium Header */}
        <motion.div variants={item} className="relative overflow-hidden rounded-2xl gradient-border particles-bg">
          <div className="glass-premium rounded-2xl p-6 shimmer-sweep">
            <div className="flex items-center justify-between">
              <div>
                <motion.p
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-sm text-muted-foreground mb-1"
                >
                  {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </motion.p>
                <h1 className="font-display text-2xl md:text-3xl font-bold">
                  Olá, {profile?.full_name?.split(" ")[0] || "Paciente"} 👋
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Acompanhe seu progresso e mantenha seus hábitos em dia.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div variants={item} className="flex flex-wrap gap-2">
          <SubscriptionCard />
          <PlanRequestButton />
        </motion.div>

        <ProgramJoinRequest open={programJoinOpen} onOpenChange={setProgramJoinOpen} />

        {/* Quick Stats */}
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Ranking Widget */}
          <RankingWidget />

          <Link to="/checklist">
            <motion.div whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.98 }} className="glass-premium rounded-xl p-4 cursor-pointer metric-glow transition-all duration-300 shimmer-sweep h-full">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Checklist Hoje</p>
                  <p className="text-lg font-display font-bold counter-animate">{checklistStats.completed}/{checklistStats.total}</p>
                </div>
              </div>
              <Progress value={checklistPercent} className="mt-3 h-1.5" />
            </motion.div>
          </Link>

          <Link to="/my-diet">
            <motion.div whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.98 }} className="glass-premium rounded-xl p-4 cursor-pointer metric-glow transition-all duration-300 shimmer-sweep h-full">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 flex items-center justify-center">
                  <UtensilsCrossed className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Minha Dieta</p>
                  <p className="text-sm font-medium">Ver plano</p>
                </div>
              </div>
            </motion.div>
          </Link>

          <Link to="/achievements">
            <motion.div whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.98 }} className="glass-premium rounded-xl p-4 cursor-pointer metric-glow transition-all duration-300 shimmer-sweep h-full">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-warning/15 to-warning/5 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Conquistas</p>
                  <p className="text-sm font-medium">Ver todas</p>
                </div>
              </div>
            </motion.div>
          </Link>

          <Link to="/journey">
            <motion.div whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.98 }} className="glass-premium rounded-xl p-4 cursor-pointer metric-glow transition-all duration-300 shimmer-sweep h-full">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-info/15 to-info/5 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-info" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Progresso</p>
                  <p className="text-sm font-medium">Jornada</p>
                </div>
              </div>
            </motion.div>
          </Link>
        </motion.div>

        {/* Participar de Projetos - Destaque Dourado */}
        <motion.div variants={item}>
          <motion.button
            whileHover={{ y: -3, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setProgramJoinOpen(true)}
            className="w-full glass-premium rounded-xl p-5 cursor-pointer shimmer-sweep border border-yellow-500/30 hover:border-yellow-400/50 transition-all duration-300 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-amber-400/10 to-yellow-500/5 opacity-60 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center justify-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center">
                <Rocket className="w-5.5 h-5.5 text-amber-500" />
              </div>
              <div className="text-left">
                <p className="text-xs uppercase tracking-widest font-bold bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
                  ✨ Projetos Disponíveis
                </p>
                <p className="text-sm font-display font-bold bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
                  Participar de um Projeto
                </p>
              </div>
            </div>
          </motion.button>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Active Programs */}
          <motion.div variants={item}>
            <div className="glass-premium rounded-xl overflow-hidden shimmer-sweep">
              <div className="p-5 pb-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
                  <Rocket className="w-4.5 h-4.5 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-base">Projetos Ativos</h3>
              </div>
              <div className="px-5 pb-5 space-y-3">
                {programs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum programa ativo no momento.</p>
                ) : (
                  programs.map((p, i) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/20 transition-all"
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
              </div>
            </div>
          </motion.div>

          {/* Upcoming Appointments */}
          <motion.div variants={item}>
            <div className="glass-premium rounded-xl overflow-hidden shimmer-sweep">
              <div className="p-5 pb-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 flex items-center justify-center">
                  <CalendarDays className="w-4.5 h-4.5 text-accent" />
                </div>
                <h3 className="font-display font-semibold text-base">Próximas Consultas</h3>
              </div>
              <div className="px-5 pb-5 space-y-3">
                {appointments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma consulta agendada.</p>
                ) : (
                  appointments.slice(0, 4).map((a, i) => (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50 hover:border-accent/20 transition-all"
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
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        a.status === "confirmed" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}>
                        {a.status === "confirmed" ? "Confirmada" : a.status === "scheduled" ? "Agendada" : a.status}
                      </span>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </motion.div>

          {/* Explorer Progress */}
          <motion.div variants={item}>
            <ExplorerProgressWidget />
          </motion.div>

          {/* Smart Tips */}
          <motion.div variants={item}>
            <div className="glass-premium rounded-xl overflow-hidden shimmer-sweep">
              <div className="p-5 pb-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-success/15 to-success/5 flex items-center justify-center">
                  <TrendingUp className="w-4.5 h-4.5 text-success" />
                </div>
                <h3 className="font-display font-semibold text-base">Dicas Inteligentes</h3>
              </div>
              <div className="px-5 pb-5">
                <SmartTips />
              </div>
            </div>
          </motion.div>

          {/* Notifications */}
          <motion.div variants={item} className="md:col-span-2">
            <div className="glass-premium rounded-xl overflow-hidden shimmer-sweep">
              <div className="p-5 pb-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-warning/15 to-warning/5 flex items-center justify-center">
                  <Bell className="w-4.5 h-4.5 text-warning" />
                </div>
                <h3 className="font-display font-semibold text-base">Notificações</h3>
                {unreadCount > 0 && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-warning/10 text-warning font-semibold">
                    {unreadCount} novas
                  </span>
                )}
              </div>
              <div className="px-5 pb-5 space-y-2">
                {notifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma notificação.</p>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-2">
                    {notifications.slice(0, 6).map((n, i) => (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className={`p-3 rounded-xl border transition-all hover:scale-[1.01] ${
                          n.is_read ? "border-border/50 bg-muted/20 opacity-60" : "border-primary/20 bg-primary/5"
                        }`}
                      >
                        <p className="text-sm font-medium">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(n.created_at), "dd/MM 'às' HH:mm")}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                )}
                {notifications.length > 6 && (
                  <Link to="/notifications" className="block text-xs text-primary text-center pt-2 hover:underline font-medium">
                    Ver todas as notificações
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
