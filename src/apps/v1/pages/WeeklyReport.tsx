import { useState } from "react";
import { useAuth } from "@v1/lib/auth";
import { supabase } from "@v1/integrations/supabase/client";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Badge } from "@v1/components/ui/badge";
import { Progress } from "@v1/components/ui/progress";
import {
  FileText, Users, UtensilsCrossed, CheckCircle2, Calendar,
  MessageSquare, TrendingUp, AlertTriangle, Loader2, RefreshCw,
  Trophy, Star, ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  totalPatients: number;
  activePatients: number;
  mealsLogged: number;
  checklistCompletion: number;
  appointmentsScheduled: number;
  appointmentsCompleted: number;
  newFeedbacks: number;
  topPerformers: { id: string; name: string; streak: number; xp: number }[];
  needsAttention: { id: string; name: string; reason: string }[];
  highlights: string[];
}

export default function WeeklyReportPage() {
  const { session } = useAuth();
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    if (!session?.access_token) {
      toast.error("Sessão inválida");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-weekly-report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao gerar relatório");
      }

      const data = await response.json();
      setReport(data.report);
      toast.success("Relatório gerado com sucesso!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar relatório");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <FileText className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Relatório Semanal</h1>
              <p className="text-sm text-muted-foreground">Resumo da atividade dos seus pacientes</p>
            </div>
          </div>
          <Button onClick={generateReport} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {loading ? "Gerando..." : "Gerar Relatório"}
          </Button>
        </div>

        {!report && !loading && (
          <Card className="glass shadow-card">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="w-16 h-16 text-muted-foreground/50 mb-4" />
              <h2 className="font-display text-lg font-semibold mb-2">Nenhum relatório gerado</h2>
              <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                Clique no botão acima para gerar um relatório semanal com o resumo da atividade dos seus pacientes.
              </p>
            </CardContent>
          </Card>
        )}

        {loading && (
          <Card className="glass shadow-card">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-sm text-muted-foreground">Gerando relatório...</p>
            </CardContent>
          </Card>
        )}

        {report && !loading && (
          <>
            {/* Period */}
            <Card className="glass shadow-card">
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground text-center">
                  Período: <span className="font-semibold text-foreground">{formatDate(report.weekStart)}</span> até{" "}
                  <span className="font-semibold text-foreground">{formatDate(report.weekEnd)}</span>
                </p>
              </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="glass shadow-card">
                <CardContent className="flex items-center gap-3 py-5">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold font-display">{report.activePatients}/{report.totalPatients}</p>
                    <p className="text-xs text-muted-foreground">Pacientes Ativos</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass shadow-card">
                <CardContent className="flex items-center gap-3 py-5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <UtensilsCrossed className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-xl font-bold font-display">{report.mealsLogged}</p>
                    <p className="text-xs text-muted-foreground">Refeições</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass shadow-card">
                <CardContent className="flex items-center gap-3 py-5">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-violet-500" />
                  </div>
                  <div>
                    <p className="text-xl font-bold font-display">{report.appointmentsCompleted}/{report.appointmentsScheduled}</p>
                    <p className="text-xs text-muted-foreground">Consultas</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass shadow-card">
                <CardContent className="flex items-center gap-3 py-5">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xl font-bold font-display">{report.newFeedbacks}</p>
                    <p className="text-xs text-muted-foreground">Feedbacks</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Checklist Progress */}
            <Card className="glass shadow-card">
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Aderência ao Checklist
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Progress value={report.checklistCompletion} className="flex-1 h-3" />
                  <span className="text-xl font-bold font-display text-primary">{report.checklistCompletion}%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {report.checklistCompletion >= 80
                    ? "Excelente! Seus pacientes estão engajados."
                    : report.checklistCompletion >= 50
                    ? "Bom progresso, mas há espaço para melhoria."
                    : "Atenção: aderência baixa. Considere revisar os protocolos."}
                </p>
              </CardContent>
            </Card>

            {/* Two columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Top Performers */}
              <Card className="glass shadow-card">
                <CardHeader>
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Top Performers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {report.topPerformers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
                  ) : (
                    <div className="space-y-3">
                      {report.topPerformers.map((p, i) => (
                        <Link
                          key={p.id}
                          to={`/v1/patients/${p.id}`}
                          className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
                            <span className="text-sm font-bold text-yellow-500">#{i + 1}</span>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.streak} dias de streak • {p.xp} XP</p>
                          </div>
                          <Star className="w-4 h-4 text-yellow-500" />
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Needs Attention */}
              <Card className="glass shadow-card">
                <CardHeader>
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-warning" />
                    Precisam de Atenção
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {report.needsAttention.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Todos os pacientes estão engajados! ✅</p>
                  ) : (
                    <div className="space-y-3">
                      {report.needsAttention.map((p) => (
                        <Link
                          key={p.id}
                          to={`/v1/patients/${p.id}`}
                          className="flex items-center gap-3 p-3 rounded-lg bg-warning/5 border border-warning/20 hover:bg-warning/10 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center">
                            <span className="text-sm font-bold text-warning">{p.name[0]}</span>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{p.name}</p>
                            <Badge variant="outline" className="text-[10px] mt-0.5">{p.reason}</Badge>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Highlights */}
            <Card className="glass shadow-card">
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Destaques da Semana
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {report.highlights.map((h, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      {h}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
