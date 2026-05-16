import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { 
  Utensils, 
  ChevronRight, 
  CalendarDays, 
  Trophy, 
  Zap, 
  ArrowRight,
  ClipboardCheck,
  Dumbbell
} from "lucide-react";
import { motion } from "framer-motion";

export default function ClientDashboard() {
  const { profile, isPatient, isNutritionist, isPersonal, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const isPro = isNutritionist || isPersonal || isAdmin;
    if (isPro && !isPatient) {
      navigate("/dashboard", { replace: true });
    }
  }, [isPatient, isNutritionist, isPersonal, isAdmin, navigate]);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Header de Boas-vindas Premium */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-display font-black tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
              Olá, {profile?.full_name?.split(' ')[0] || 'Campeão'}!
            </h1>
            <p className="text-muted-foreground text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary fill-primary" />
              Sua jornada soberana continua.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 border border-primary/20 rounded-2xl px-4 py-2 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70 leading-none">Nível</p>
                <p className="text-sm font-black leading-none">Bronze II</p>
              </div>
            </div>
          </div>
        </div>

        {/* Grade de Atalhos Críticos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card Dieta (O mais importante) */}
          <motion.div 
            whileHover={{ y: -4 }}
            className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 p-6 flex flex-col justify-between min-h-[220px] transition-all hover:shadow-xl hover:shadow-emerald-500/10 cursor-pointer"
            onClick={() => navigate("/patient-meal-plan")}
          >
            <div className="flex justify-between items-start">
              <div className="p-3 bg-emerald-500/20 rounded-2xl">
                <Utensils className="w-6 h-6 text-emerald-500" />
              </div>
              <ChevronRight className="w-5 h-5 text-emerald-500/50 group-hover:translate-x-1 transition-transform" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-display font-bold">Minha Dieta</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Acesse seu plano alimentar atualizado e registre sua adesão diária.
              </p>
            </div>
            
            <Button className="mt-4 w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-xl gap-2">
              Ver Plano <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>

          {/* Card Treinos */}
          <motion.div 
            whileHover={{ y: -4 }}
            className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/20 p-6 flex flex-col justify-between min-h-[220px] transition-all hover:shadow-xl hover:shadow-blue-500/10 cursor-pointer"
            onClick={() => navigate("/journey")}
          >
            <div className="flex justify-between items-start">
              <div className="p-3 bg-blue-500/20 rounded-2xl">
                <Dumbbell className="w-6 h-6 text-blue-500" />
              </div>
              <ChevronRight className="w-5 h-5 text-blue-500/50 group-hover:translate-x-1 transition-transform" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-display font-bold">Minha Jornada</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Acompanhe sua evolução física, fotos e métricas de desempenho.
              </p>
            </div>
            
            <Button variant="outline" className="mt-4 w-full border-blue-500/30 hover:bg-blue-500/10 text-blue-500 font-bold rounded-xl">
              Explorar
            </Button>
          </motion.div>

          {/* Card Check-in */}
          <motion.div 
            whileHover={{ y: -4 }}
            className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/20 p-6 flex flex-col justify-between min-h-[220px] transition-all hover:shadow-xl hover:shadow-amber-500/10 cursor-pointer"
            onClick={() => navigate("/checkin")}
          >
            <div className="flex justify-between items-start">
              <div className="p-3 bg-amber-500/20 rounded-2xl">
                <ClipboardCheck className="w-6 h-6 text-amber-500" />
              </div>
              <ChevronRight className="w-5 h-5 text-amber-500/50 group-hover:translate-x-1 transition-transform" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-display font-bold">Check-in</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Envie suas atualizações para seu nutricionista e receba feedbacks.
              </p>
            </div>
            
            <Button variant="outline" className="mt-4 w-full border-amber-500/30 hover:bg-amber-500/10 text-amber-500 font-bold rounded-xl">
              Fazer Check-in
            </Button>
          </motion.div>
        </div>

        {/* Seção Secundária: Destaques */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass rounded-3xl p-6 space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <CalendarDays className="w-4 h-4" /> 
              Próxima Consulta
            </h4>
            <div className="p-4 bg-muted/50 rounded-2xl border border-border/50 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">Não agendada</p>
                <p className="text-xs text-muted-foreground">Fale com seu profissional</p>
              </div>
              <Button size="sm" variant="ghost" className="text-xs text-primary font-bold" onClick={() => navigate("/chat")}>
                Chamar no Chat
              </Button>
            </div>
          </div>

          <div className="glass rounded-3xl p-6 space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Zap className="w-4 h-4" /> 
              Meta de Hoje
            </h4>
            <div className="p-4 bg-muted/50 rounded-2xl border border-border/50">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-medium">Beba 3L de Água</p>
                <p className="text-xs font-bold">0%</p>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary/40 w-0 transition-all duration-1000" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}