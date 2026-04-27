import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DiagnosticStatus() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchStatus = async () => {
    if (!user) return;
    setLoading(true);
    const { data: lifecycle } = await supabase
      .from("patient_lifecycle_states")
      .select("*")
      .eq("patient_id", user.id)
      .maybeSingle();
      
    const { data: nutritionistLink } = await supabase
      .from("nutritionist_patients")
      .select("*")
      .eq("patient_id", user.id)
      .maybeSingle();

    const { data: pipeline } = await supabase
      .from("onboarding_pipelines" as any)
      .select("*")
      .eq("patient_id", user.id)
      .maybeSingle();

    setData({
      lifecycle,
      nutritionistLink,
      pipeline
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchStatus();
  }, [user]);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="text-primary" /> Status do Sistema
        </h1>
        <Button variant="outline" size="sm" onClick={fetchStatus}>
          <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ciclo de Vida (Lifecycle)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span>Estado:</span>
            <Badge variant="outline">{data.lifecycle?.lifecycle_state || "Nenhum"}</Badge>
          </div>
          <div className="flex justify-between">
            <span>Onboarding Pendente:</span>
            <span>{data.lifecycle?.has_pending_onboarding ? "✅ Sim" : "❌ Não"}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vínculo Profissional</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span>Status da Jornada:</span>
            <Badge>{data.nutritionistLink?.journey_status || "—"}</Badge>
          </div>
          <div className="flex justify-between">
            <span>Nutricionista ID:</span>
            <span className="text-xs font-mono">{data.nutritionistLink?.nutritionist_id || "Não vinculado"}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pipeline de Onboarding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span>Status Pipeline:</span>
            <Badge variant="secondary">{data.pipeline?.status || "Inexistente"}</Badge>
          </div>
        </CardContent>
      </Card>
      
      <div className="text-center">
        <Button onClick={() => window.location.href = '/onboarding-pipeline'}>
          Tentar ir para Onboarding
        </Button>
      </div>
    </div>
  );
}
