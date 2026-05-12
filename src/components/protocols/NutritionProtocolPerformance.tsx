import { useQuery } from "@tanstack/react-query";
import { supabase } from "@v1/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Badge } from "@v1/components/ui/badge";
import { Skeleton } from "@v1/components/ui/skeleton";
import { Progress } from "@v1/components/ui/progress";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function NutritionProtocolPerformance() {
  const { data, isLoading } = useQuery({
    queryKey: ["protocol-clinical-performance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("protocol_clinical_performance")
        .select("*, nutrition_protocols(protocol_name, protocol_category, protocol_slug)")
        .order("metabolic_success_score", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <p className="text-sm">Ainda não há dados de performance. Os scores serão calculados automaticamente conforme pacientes usam os protocolos.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {data.map((perf: any) => {
        const proto = perf.nutrition_protocols;
        const efficacy = perf.metabolic_success_score || 0;
        const statusColor =
          efficacy >= 70 ? "text-green-400" :
          efficacy >= 40 ? "text-amber-400" : "text-red-400";
        const StatusIcon = efficacy >= 70 ? TrendingUp : efficacy >= 40 ? Minus : TrendingDown;

        return (
          <Card key={perf.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{proto?.protocol_name || "Protocolo"}</CardTitle>
                <div className={`flex items-center gap-1 ${statusColor}`}>
                  <StatusIcon className="w-4 h-4" />
                  <span className="text-lg font-bold">{efficacy.toFixed(0)}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={efficacy} className="h-2" />
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-muted/30 rounded p-2">
                  <p className="text-muted-foreground">Aplicações</p>
                  <p className="font-semibold">{perf.total_applications}</p>
                </div>
                <div className="bg-muted/30 rounded p-2">
                  <p className="text-muted-foreground">Adesão Média</p>
                  <p className="font-semibold">{(perf.avg_adherence || 0).toFixed(0)}%</p>
                </div>
                <div className="bg-muted/30 rounded p-2">
                  <p className="text-muted-foreground">Taxa Estagnação</p>
                  <p className="font-semibold">{(perf.stagnation_rate || 0).toFixed(0)}%</p>
                </div>
                <div className="bg-muted/30 rounded p-2">
                  <p className="text-muted-foreground">Taxa Abandono</p>
                  <p className="font-semibold">{(perf.dropout_rate || 0).toFixed(0)}%</p>
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground">
                Resp. Peso Média: {(perf.avg_weight_response || 0).toFixed(2)} kg/sem · Atualizado: {perf.last_updated ? new Date(perf.last_updated).toLocaleDateString("pt-BR") : "—"}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
