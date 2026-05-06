import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import IFJCommandCenter from "@/components/intelligence/modules/IFJCommandCenter";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Activity, CheckCircle2, TrendingUp, Target, UtensilsCrossed,
  Calendar, ArrowRight, Flame, Clock, Trophy, ChevronRight,
  Heart, Zap, Scale, Droplets
} from "lucide-react";
import { PatientRetentionAlerts } from "@/components/dashboard/PatientRetentionAlerts";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

interface OverviewData {
  checklistToday: { total: number; completed: number };
  nextAppointment: { title: string; date: string } | null;
  mealPlanActive: boolean;
  recentCheckins: number;
  daysSinceStart: number;
  notifications: number;
  achievements: number;
  streak: number;
}

export default function PatientOverview() {
  const { user, profile } = useAuth();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const handleSupabaseError = (error: any, context: string) => {
    console.error(`[Overview Error] ${context}:`, error);
    if (error.code === 'PGRST116' || error.message?.includes('Permission denied')) {
      // toast.error(`Acesso negado: ${context}`); // Optional, maybe too noisy
    }
  };

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      const fetchSafe = async (query: any, context: string) => {
        try {
          const { data, error } = await query;
          if (error) throw error;
          return { data };
        } catch (e) {
          handleSupabaseError(e, context);
          return { data: null };
        }
      };

      const [checklistRes, aptRes, mealRes, checkinRes, notifRes, achieveRes, npRes] = await Promise.all([
        fetchSafe(supabase.from("checklist_tasks" as any).select("id, completed").eq("patient_id", user.id).eq("date", today), "checklist"),
        fetchSafe(supabase.from("patient_appointments" as any).select("title, appointment_date").eq("patient_id", user.id).gte("appointment_date", new Date().toISOString()).order("appointment_date", { ascending: true }).limit(1), "consultas"),
        fetchSafe(supabase.from("meal_plans" as any).select("id").eq("patient_id", user.id).eq("is_active", true).limit(1), "plano alimentar"),
        fetchSafe(supabase.from("patient_checkins" as any).select("id").eq("patient_id", user.id).gte("created_at", weekAgo), "check-ins"),
        fetchSafe(supabase.from("notifications" as any).select("id").eq("user_id", user.id).eq("is_read", false), "notificações"),
        fetchSafe(supabase.from("user_achievements" as any).select("id").eq("user_id", user.id), "conquistas"),
        fetchSafe(supabase.from("nutritionist_patients" as any).select("created_at").eq("patient_id", user.id).eq("status", "active").limit(1), "vínculo profissional")
      ]);

      const checklist = checklistRes.data || [];
      const apt = aptRes.data?.[0];
      const startDate = npRes.data?.[0]?.created_at;

      setData({
        checklistToday: {
          total: checklist.length,
          completed: checklist.filter((t: any) => t.completed).length,
        },
        nextAppointment: apt ? { title: apt.title, date: apt.appointment_date } : null,
        mealPlanActive: (mealRes.data?.length || 0) > 0,
        recentCheckins: checkinRes.data?.length || 0,
        daysSinceStart: startDate ? differenceInDays(new Date(), new Date(startDate)) : 0,
        notifications: notifRes.data?.length || 0,
        achievements: achieveRes.data?.length || 0,
        streak: checkinRes.data?.length || 0,
      });
      setLoading(false);
    };

    fetchData().catch(() => setLoading(false));
  }, [user]);

  const checklistPercent = data ? (data.checklistToday.total > 0 ? Math.round((data.checklistToday.completed / data.checklistToday.total) * 100) : 0) : 0;
  const firstName = profile?.full_name?.split(" ")[0] || "Paciente";

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Meu Painel</h1>
              <p className="text-sm text-muted-foreground">
                Olá, {firstName}! Aqui está seu resumo de hoje.
              </p>
            </div>
          </div>
          {data && data.daysSinceStart > 0 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>Dia <strong className="text-foreground">{data.daysSinceStart}</strong> da sua jornada</span>
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
          <PatientRetentionAlerts />
        </motion.div>

        {loading || !data ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : (
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <motion.div variants={item}>
                <Link to="/checklist">
                  <Card className="group hover:shadow-lg hover:shadow-emerald-500/10 transition-all cursor-pointer border-emerald-500/20 hover:border-emerald-500/40">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
                      </div>
                      <p className="text-2xl font-bold text-foreground">{checklistPercent}%</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Checklist Hoje</p>
                      <Progress value={checklistPercent} className="mt-2 h-1.5" />
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>

              <motion.div variants={item}>
                <Link to="/checkin">
                  <Card className="group hover:shadow-lg hover:shadow-sky-500/10 transition-all cursor-pointer border-sky-500/20 hover:border-sky-500/40">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center">
                          <TrendingUp className="w-4.5 h-4.5 text-sky-500" />
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-sky-500 transition-colors" />
                      </div>
                      <p className="text-2xl font-bold text-foreground">{data.recentCheckins}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Check-ins (7 dias)</p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>

              <motion.div variants={item}>
                <Link to="/achievements">
                  <Card className="group hover:shadow-lg hover:shadow-amber-500/10 transition-all cursor-pointer border-amber-500/20 hover:border-amber-500/40">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                          <Trophy className="w-4.5 h-4.5 text-amber-500" />
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                      </div>
                      <p className="text-2xl font-bold text-foreground">{data.achievements}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Conquistas</p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>

              <motion.div variants={item}>
                <Link to="/patient-meal-plan">
                  <Card className="group hover:shadow-lg hover:shadow-violet-500/10 transition-all cursor-pointer border-violet-500/20 hover:border-violet-500/40">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
                          <UtensilsCrossed className="w-4.5 h-4.5 text-violet-500" />
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-violet-500 transition-colors" />
                      </div>
                      <p className="text-2xl font-bold text-foreground">{data.mealPlanActive ? "Ativo" : "—"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Plano Alimentar</p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            </div>

            {/* Quick Actions */}
            <motion.div variants={item}>
              <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Ações Rápidas
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Registrar Refeição", icon: UtensilsCrossed, to: "/meals", color: "from-emerald-500 to-teal-600" },
                  { label: "Fazer Check-in", icon: Scale, to: "/checkin", color: "from-sky-500 to-blue-600" },
                  { label: "Meu Checklist", icon: CheckCircle2, to: "/checklist", color: "from-violet-500 to-purple-600" },
                  { label: "Analisar Prato", icon: Target, to: "/analyze", color: "from-amber-500 to-orange-600" },
                ].map((action) => (
                  <Link key={action.to} to={action.to}>
                    <Card className="group hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5">
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                          <action.icon className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">{action.label}</span>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </motion.div>

            {/* Next Appointment + Journey */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div variants={item}>
                <Card className="border-sky-500/20">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Calendar className="w-4 h-4 text-sky-500" />
                      <span className="text-sm font-bold text-foreground">Próxima Consulta</span>
                    </div>
                    {data.nextAppointment ? (
                      <div>
                        <p className="text-foreground font-semibold">{data.nextAppointment.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(data.nextAppointment.date), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhuma consulta agendada</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={item}>
                <Link to="/journey">
                  <Card className="group hover:shadow-md transition-all cursor-pointer border-amber-500/20 hover:border-amber-500/40">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Flame className="w-4 h-4 text-amber-500" />
                          <span className="text-sm font-bold text-foreground">Minha Jornada</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Acompanhe sua evolução completa, milestones e conquistas ao longo do tempo.
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            </div>

            {/* More links */}
            <motion.div variants={item}>
              <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500" />
                Explore Mais
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: "Calculadora de Peso", icon: Scale, to: "/weight-calculator" },
                  { label: "Calculadora de Água", icon: Droplets, to: "/water-calculator" },
                  { label: "Quiz de Saúde", icon: Heart, to: "/health-quiz" },
                  { label: "Biblioteca", icon: Target, to: "/library" },
                  { label: "Lista de Compras", icon: UtensilsCrossed, to: "/shopping-list" },
                  { label: "Ranking Global", icon: Trophy, to: "/ranking" },
                ].map((link) => (
                  <Link key={link.to} to={link.to}>
                    <Card className="group hover:bg-muted/50 transition-all cursor-pointer">
                      <CardContent className="p-3 flex items-center gap-3">
                        <link.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">{link.label}</span>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </motion.div>

            {/* IFJ Command Center for Patient */}
            <motion.div variants={item}>
              <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Minha Inteligência IFJ
              </h2>
              <IFJCommandCenter role="patient" />
            </motion.div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
