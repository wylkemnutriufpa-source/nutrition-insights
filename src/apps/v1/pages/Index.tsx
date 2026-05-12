import { useEffect, useState } from "react";
import { useAuth } from "@v1/lib/auth";
import { supabase } from "@v1/integrations/supabase/client";
import { Card } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { 
  Users, ClipboardList, UtensilsCrossed, MessageSquare, 
  Settings, UserPlus, Calendar, Activity, TrendingUp
} from "lucide-react";
import ProStrategicDashboard from "@v1/components/dashboard/ProStrategicDashboard";
import PatientGridDashboard from "@v1/components/dashboard/PatientGridDashboard";
import { useWorkspaceContext } from "@v1/hooks/useWorkspaceContext";

export default function Index() {
  const { user, isNutritionist, isPersonal, isAdmin } = useAuth();
  const { isProfessionalContext } = useWorkspaceContext();
  const navigate = useNavigate();

  const isProRole = isNutritionist || isPersonal || isAdmin;
  const effectiveProRole = isProRole && isProfessionalContext;

  if (effectiveProRole) {
    return <NutritionistDashboard />;
  }

  return <PatientDashboard />;
}

function NutritionistDashboard() {
  const { user } = useAuth();
  const [patientCount, setPatientCount] = useState(0);
  const [mealPlanCount, setMealPlanCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      try {
        const [patientsRes, plansRes] = await Promise.all([
          supabase.from("nutritionist_patients").select("id", { count: "exact" }).eq("nutritionist_id", user.id).eq("status", "active"),
          supabase.from("meal_plans").select("id", { count: "exact" }).eq("nutritionist_id", user.id).eq("is_active", true),
        ]);
        setPatientCount(patientsRes.count || 0);
        setMealPlanCount(plansRes.count || 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  if (loading) return <div className="p-8">Carregando painel clínico...</div>;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Painel Profissional</h1>
        <p className="text-muted-foreground">Bem-vindo ao seu centro de comando clínico.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl text-primary"><Users className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-muted-foreground">Pacientes</p>
            <h3 className="text-2xl font-bold">{patientCount}</h3>
          </div>
        </Card>
        <Card className="p-6 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600"><ClipboardList className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-muted-foreground">Planos Ativos</p>
            <h3 className="text-2xl font-bold">{mealPlanCount}</h3>
          </div>
        </Card>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Ações Rápidas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/v1/patients">
            <Card className="p-4 h-full flex flex-col items-center justify-center text-center gap-2 border-none bg-primary/5 hover:bg-primary/10 transition-all">
              <UserPlus className="w-6 h-6 text-primary" />
              <span className="text-sm font-semibold">Novo Paciente</span>
            </Card>
          </Link>
          <Link to="/v1/meal-plans">
            <Card className="p-4 h-full flex flex-col items-center justify-center text-center gap-2 border-none bg-blue-500/5 hover:bg-blue-500/10 transition-all">
              <UtensilsCrossed className="w-6 h-6 text-blue-600" />
              <span className="text-sm font-semibold">Criar Plano</span>
            </Card>
          </Link>
          <Link to="/v1/chat">
            <Card className="p-4 h-full flex flex-col items-center justify-center text-center gap-2 border-none bg-emerald-500/5 hover:bg-emerald-500/10 transition-all">
              <MessageSquare className="w-6 h-6 text-emerald-600" />
              <span className="text-sm font-semibold">Chat</span>
            </Card>
          </Link>
          <Link to="/v1/settings">
            <Card className="p-4 h-full flex flex-col items-center justify-center text-center gap-2 border-none bg-gray-100 hover:bg-gray-200 transition-all">
              <Settings className="w-6 h-6 text-gray-700" />
              <span className="text-sm font-semibold">Configurações</span>
            </Card>
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Explorar</h2>
        <ProStrategicDashboard />
      </section>
    </div>
  );
}

function PatientDashboard() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <header className="text-center py-4">
        <h1 className="text-3xl font-bold">Minha Jornada</h1>
        <p className="text-muted-foreground mt-1">Acompanhe seu progresso e plano alimentar.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/v1/patient-meal-plan">
          <Card className="p-6 flex flex-col items-center gap-3 bg-primary/5 hover:bg-primary/10 transition-all border-none">
            <UtensilsCrossed className="w-8 h-8 text-primary" />
            <span className="font-bold">Minha Dieta</span>
          </Card>
        </Link>
        <Link to="/v1/checkin">
          <Card className="p-6 flex flex-col items-center gap-3 bg-blue-500/5 hover:bg-blue-500/10 transition-all border-none">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            <span className="font-bold">Evolução</span>
          </Card>
        </Link>
        <Link to="/v1/chat">
          <Card className="p-6 flex flex-col items-center gap-3 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all border-none">
            <MessageSquare className="w-8 h-8 text-emerald-600" />
            <span className="font-bold">Mensagens</span>
          </Card>
        </Link>
      </div>

      <section className="pt-4 border-t border-border/50">
        <PatientGridDashboard />
      </section>
    </div>
  );
}