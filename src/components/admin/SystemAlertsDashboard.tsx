import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { inspectPatientPlans } from "@/lib/planSafeOperations";
import { toast } from "sonner";

export const SystemAlertsDashboard = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDiagnostic, setSelectedDiagnostic] = useState<any>(null);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    const { data } = await supabase
      .from('system_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setAlerts(data || []);
    setLoading(false);
  };

  const handleRunDiagnostic = async (patientId: string) => {
    if (!patientId) return;
    const results = await inspectPatientPlans(patientId);
    setSelectedDiagnostic({ patientId, results });
    toast.success(`Diagnóstico concluído para ${patientId}`);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Alertas de Sistema</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Alertas Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead>Patient ID</TableHead>
                <TableHead>Correlation</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell>
                    <Badge variant={alert.severity === 'critical' ? 'destructive' : 'outline'}>
                      {alert.alert_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{alert.message}</TableCell>
                  <TableCell className="font-mono text-xs">{alert.metadata?.patient_id || 'N/A'}</TableCell>
                  <TableCell className="font-mono text-xs">{alert.correlation_id || 'N/A'}</TableCell>
                  <TableCell>
                    {alert.metadata?.patient_id && (
                      <Button size="sm" onClick={() => handleRunDiagnostic(alert.metadata.patient_id)}>
                        Diagnosticar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedDiagnostic && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle>Resultados: {selectedDiagnostic.patientId}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead>Modo</TableHead>
                  <TableHead>Correlation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedDiagnostic.results?.map((res: any) => (
                  <TableRow key={res.plan_id}>
                    <TableCell className="font-mono text-xs">{res.plan_id}</TableCell>
                    <TableCell>{res.status}</TableCell>
                    <TableCell>{res.is_active ? '✅' : '❌'}</TableCell>
                    <TableCell>{res.plan_mode || 'null'}</TableCell>
                    <TableCell className="font-mono text-xs">{res.correlation_id}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
