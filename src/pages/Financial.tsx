import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Users, TrendingUp, Plus, CreditCard } from "lucide-react";
import { toast } from "sonner";

interface PatientSub {
  id: string;
  patientName: string;
  planName: string;
  status: string;
  startedAt: string;
  expiresAt: string | null;
}

export default function Financial() {
  const { user } = useAuth();
  const [subs, setSubs] = useState<PatientSub[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      // Get nutritionist's patients
      const { data: patients } = await supabase
        .from("nutritionist_patients")
        .select("patient_id")
        .eq("nutritionist_id", user.id)
        .eq("status", "active");

      if (!patients?.length) { setLoading(false); return; }

      const patientIds = patients.map((p) => p.patient_id);

      const { data: subscriptions } = await supabase
        .from("subscriptions")
        .select("*")
        .in("user_id", patientIds);

      // Get profiles for names
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", patientIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p.full_name]) || []);

      const mapped: PatientSub[] = (subscriptions || []).map((s) => ({
        id: s.id,
        patientName: profileMap.get(s.user_id) || "Paciente",
        planName: s.plan_name,
        status: s.status,
        startedAt: s.started_at,
        expiresAt: s.expires_at,
      }));

      setSubs(mapped);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const activeSubs = subs.filter((s) => s.status === "active");
  const totalActive = activeSubs.length;

  const statusColors: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-500",
    expired: "bg-red-500/10 text-red-500",
    cancelled: "bg-muted text-muted-foreground",
    trial: "bg-blue-500/10 text-blue-500",
  };

  const statusLabels: Record<string, string> = {
    active: "Ativo",
    expired: "Expirado",
    cancelled: "Cancelado",
    trial: "Trial",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
            <DollarSign className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Financeiro</h1>
            <p className="text-sm text-muted-foreground">Gestão de planos e assinaturas</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="glass shadow-card">
                <CardContent className="flex items-center gap-4 py-6">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-display">{totalActive}</p>
                    <p className="text-sm text-muted-foreground">Assinaturas Ativas</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass shadow-card">
                <CardContent className="flex items-center gap-4 py-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-display">{subs.length}</p>
                    <p className="text-sm text-muted-foreground">Total de Planos</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass shadow-card">
                <CardContent className="flex items-center gap-4 py-6">
                  <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-violet-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-display">
                      {subs.length > 0 ? Math.round((totalActive / subs.length) * 100) : 0}%
                    </p>
                    <p className="text-sm text-muted-foreground">Taxa de Retenção</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="glass shadow-card">
              <CardHeader>
                <CardTitle className="font-display text-lg">Assinaturas dos Pacientes</CardTitle>
              </CardHeader>
              <CardContent>
                {subs.length === 0 ? (
                  <div className="text-center py-8">
                    <DollarSign className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Nenhuma assinatura encontrada</p>
                    <p className="text-xs text-muted-foreground mt-1">As assinaturas dos pacientes aparecerão aqui</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {subs.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-bold text-primary">
                              {sub.patientName[0]?.toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">{sub.patientName}</p>
                            <p className="text-xs text-muted-foreground">{sub.planName}</p>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div>
                            <Badge className={statusColors[sub.status] || "bg-muted text-muted-foreground"}>
                              {statusLabels[sub.status] || sub.status}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              Início: {new Date(sub.startedAt).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
