import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, TrendingUp, Rocket, Link2, BarChart3, Globe,
  Loader2, UserPlus, ArrowRight, MessageSquare
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--info))"];

export default function GrowthDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalProfessionals: 0,
    totalPatients: 0,
    totalPrograms: 0,
    totalLeads: 0,
    totalReferrals: 0,
  });
  const [leads, setLeads] = useState<any[]>([]);
  const [programPopularity, setProgramPopularity] = useState<any[]>([]);
  const [leadsBySource, setLeadsBySource] = useState<any[]>([]);
  const [leadsOverTime, setLeadsOverTime] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [profRes, patientsRes, programsRes, leadsRes, referralsRes, programPatsRes] = await Promise.all([
        supabase.from("professional_profiles").select("id", { count: "exact", head: true }),
        supabase.from("nutritionist_patients").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("programs").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("lead_requests").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("patient_referrals").select("id", { count: "exact", head: true }),
        supabase.from("program_patients").select("program_id, programs(title)").eq("status", "active"),
      ]);

      setMetrics({
        totalProfessionals: profRes.count || 0,
        totalPatients: patientsRes.count || 0,
        totalPrograms: programsRes.count || 0,
        totalLeads: (leadsRes.data || []).length,
        totalReferrals: referralsRes.count || 0,
      });

      const leadsData = leadsRes.data || [];
      setLeads(leadsData.slice(0, 10));

      // Leads by source
      const sourceCounts: Record<string, number> = {};
      leadsData.forEach((l: any) => { sourceCounts[l.source] = (sourceCounts[l.source] || 0) + 1; });
      setLeadsBySource(Object.entries(sourceCounts).map(([name, value]) => ({ name, value })));

      // Leads over time (last 30 days)
      const last30: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
        last30[d] = 0;
      }
      leadsData.forEach((l: any) => {
        const d = l.created_at.split("T")[0];
        if (last30[d] !== undefined) last30[d]++;
      });
      setLeadsOverTime(Object.entries(last30).map(([date, count]) => ({
        date: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        leads: count,
      })));

      // Program popularity
      const progCounts: Record<string, { title: string; count: number }> = {};
      (programPatsRes.data || []).forEach((pp: any) => {
        const title = (pp as any).programs?.title || "Sem título";
        if (!progCounts[pp.program_id]) progCounts[pp.program_id] = { title, count: 0 };
        progCounts[pp.program_id].count++;
      });
      setProgramPopularity(Object.values(progCounts).sort((a, b) => b.count - a.count).slice(0, 8));

      setLoading(false);
    })();
  }, []);

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <Globe className="w-5 h-5 text-primary-foreground" />
            </div>
            Growth Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">FitJourney Network — Métricas de crescimento</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <MetricCard label="Profissionais" value={metrics.totalProfessionals} icon={Users} color="primary" />
          <MetricCard label="Pacientes Ativos" value={metrics.totalPatients} icon={UserPlus} color="success" />
          <MetricCard label="Programas Ativos" value={metrics.totalPrograms} icon={Rocket} color="accent" />
          <MetricCard label="Leads Gerados" value={metrics.totalLeads} icon={MessageSquare} color="info" />
          <MetricCard label="Referrals Ativos" value={metrics.totalReferrals} icon={Link2} color="warning" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Leads over time */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Leads (últimos 30 dias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={leadsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval={6} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="leads" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Leads by source */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-accent" /> Leads por Origem
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leadsBySource.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">Sem dados de leads ainda.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={leadsBySource} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                      {leadsBySource.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Program Popularity */}
        {programPopularity.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Rocket className="w-4 h-4 text-primary" /> Popularidade dos Programas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={programPopularity} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                  <YAxis dataKey="title" type="category" width={150} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Recent Leads */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-info" /> Leads Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum lead registrado ainda.</p>
            ) : (
              <div className="space-y-2">
                {leads.map((lead) => (
                  <div key={lead.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{lead.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{lead.source}</Badge>
                    <Badge variant={lead.status === "new" ? "default" : "secondary"} className="text-[10px]">{lead.status}</Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(lead.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </DashboardLayout>
  );
}

function MetricCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div className="glass rounded-xl p-4 text-center">
      <div className={`w-9 h-9 rounded-lg bg-${color}/10 flex items-center justify-center mx-auto mb-2`}>
        <Icon className={`w-4.5 h-4.5 text-${color}`} />
      </div>
      <p className="font-display font-bold text-2xl">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
