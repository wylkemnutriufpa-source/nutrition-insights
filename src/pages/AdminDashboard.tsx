import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Shield, Users, UserCheck, Zap, Star, UserPlus, Settings, Globe, Palette } from "lucide-react";
import { toast } from "sonner";

interface AdminStats {
  totalNutritionists: number;
  totalPatients: number;
  totalMeals: number;
  totalProtocols: number;
}

interface NutritionistInfo {
  user_id: string;
  full_name: string;
  patientCount: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats>({ totalNutritionists: 0, totalPatients: 0, totalMeals: 0, totalProtocols: 0 });
  const [nutritionists, setNutritionists] = useState<NutritionistInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoteEmail, setPromoteEmail] = useState("");

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      // Fetch nutritionist roles
      const { data: nutRoles } = await supabase.from("user_roles").select("user_id").eq("role", "nutritionist");
      const nutIds = nutRoles?.map(r => r.user_id) || [];

      // Fetch patient roles
      const { data: patRoles } = await supabase.from("user_roles").select("user_id").eq("role", "patient");

      // Fetch nutritionist profiles
      const nutProfiles: NutritionistInfo[] = [];
      for (const nutId of nutIds) {
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", nutId).single();
        const { count } = await supabase.from("nutritionist_patients").select("id", { count: "exact", head: true }).eq("nutritionist_id", nutId).eq("status", "active");
        nutProfiles.push({
          user_id: nutId,
          full_name: profile?.full_name || "Nutricionista",
          patientCount: count || 0,
        });
      }

      setStats({
        totalNutritionists: nutIds.length,
        totalPatients: patRoles?.length || 0,
        totalMeals: 0,
        totalProtocols: 0,
      });
      setNutritionists(nutProfiles);
      setLoading(false);
    };
    fetchStats();
  }, [user]);

  const handlePromoteToAdmin = async () => {
    if (!promoteEmail.trim()) {
      toast.error("Digite um email válido");
      return;
    }
    try {
      const { data, error } = await supabase.rpc("promote_to_admin", { _user_email: promoteEmail });
      if (error) throw error;
      toast.success(`Usuário ${promoteEmail} promovido a admin com sucesso!`);
      setPromoteEmail("");
    } catch (error: any) {
      toast.error(error.message || "Erro ao promover usuário");
    }
  };

  const statCards = [
    { label: "Nutricionistas", value: stats.totalNutritionists, icon: UserCheck, color: "text-primary" },
    { label: "Pacientes", value: stats.totalPatients, icon: Users, color: "text-info" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          <div>
            <h1 className="font-display text-2xl font-bold">Painel Admin</h1>
            <p className="text-muted-foreground text-sm">Visão geral da plataforma</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {statCards.map(s => (
                <Card key={s.label} className="glass shadow-card">
                  <CardContent className="flex items-center gap-4 py-6">
                    <div className={`w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center`}>
                      <s.icon className={`w-6 h-6 ${s.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold font-display">{s.value}</p>
                      <p className="text-sm text-muted-foreground">{s.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="glass shadow-card">
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Promover Usuário a Admin
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={promoteEmail}
                    onChange={(e) => setPromoteEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handlePromoteToAdmin} className="shrink-0">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Promover
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Digite o email do usuário que deseja promover a administrador</p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="glass shadow-card cursor-pointer hover:shadow-glow transition-shadow" onClick={() => navigate("/admin/site-editor")}>
                <CardContent className="flex items-center gap-4 py-6">
                  <Settings className="w-8 h-8 text-primary" />
                  <div>
                    <p className="font-display font-semibold">Editor do Site</p>
                    <p className="text-sm text-muted-foreground">Landing page, branding, logo, cores, textos</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass shadow-card cursor-pointer hover:shadow-glow transition-shadow" onClick={() => navigate("/admin/features")}>
                <CardContent className="flex items-center gap-4 py-6">
                  <Zap className="w-8 h-8 text-warning" />
                  <div>
                    <p className="font-display font-semibold">Feature Flags</p>
                    <p className="text-sm text-muted-foreground">Controlar funcionalidades por nutricionista</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass shadow-card cursor-pointer hover:shadow-glow transition-shadow" onClick={() => navigate("/admin/testimonials")}>
                <CardContent className="flex items-center gap-4 py-6">
                  <Star className="w-8 h-8 text-accent" />
                  <div>
                    <p className="font-display font-semibold">Depoimentos</p>
                    <p className="text-sm text-muted-foreground">Moderar depoimentos dos pacientes</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="glass shadow-card">
              <CardHeader>
                <CardTitle className="font-display text-lg">Nutricionistas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {nutritionists.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum nutricionista cadastrado</p>
                ) : nutritionists.map(n => (
                  <div key={n.user_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">{n.full_name[0]?.toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{n.full_name}</p>
                        <p className="text-xs text-muted-foreground">{n.patientCount} pacientes ativos</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
