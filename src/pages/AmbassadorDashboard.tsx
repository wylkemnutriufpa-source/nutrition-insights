import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Share2, Users, DollarSign, TrendingUp, Award, CheckCircle2, Clock, XCircle, Trophy, Star } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";

const CAREER_TIERS = [
  { name: "Bronze", min: 0, max: 19, first: 20, recurring: 5, badge: "🥉", level: 1 },
  { name: "Prata", min: 20, max: 39, first: 22, recurring: 5, badge: "🥈", level: 2 },
  { name: "Ouro", min: 40, max: 59, first: 24, recurring: 5, badge: "🥇", level: 3 },
  { name: "Platina", min: 60, max: 79, first: 26, recurring: 6, badge: "💎", level: 4 },
  { name: "Diamante", min: 80, max: 99, first: 28, recurring: 6, badge: "💠", level: 5 },
  { name: "Premium", min: 100, max: Infinity, first: 40, recurring: 10, badge: "🏆", level: 6 },
];

export default function AmbassadorDashboard() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const { data: affiliate } = useQuery({
    queryKey: ["my-affiliate", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliates")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: tierData } = useQuery({
    queryKey: ["my-affiliate-tier", affiliate?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_affiliate_commission_tier", {
        _affiliate_id: affiliate!.id,
      });
      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    },
    enabled: !!affiliate,
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ["my-referrals-affiliate", affiliate?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_referrals")
        .select("*")
        .eq("affiliate_id", affiliate!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!affiliate,
  });

  const { data: commissions = [] } = useQuery({
    queryKey: ["my-commissions", affiliate?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_commissions")
        .select("*")
        .eq("affiliate_id", affiliate!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!affiliate,
  });

  const shareLink = affiliate ? `${window.location.origin}/auth?ref=${affiliate.referral_code}` : "";

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareNative = () => {
    if (navigator.share) {
      navigator.share({ title: "Programa de Embaixadores FitJourney", text: "Junte-se ao FitJourney com minha indicação!", url: shareLink });
    } else {
      copyLink();
    }
  };

  const totalReferrals = referrals.length;
  const convertedCount = tierData?.total_converted || 0;
  const payingCustomers = referrals.filter((r: any) => r.status === "paying").length;
  const pendingCommissions = commissions.filter((c: any) => c.status === "pending").reduce((sum: number, c: any) => sum + Number(c.commission_amount), 0);
  const approvedCommissions = commissions.filter((c: any) => c.status === "approved").reduce((sum: number, c: any) => sum + Number(c.commission_amount), 0);
  const paidCommissions = commissions.filter((c: any) => c.status === "paid").reduce((sum: number, c: any) => sum + Number(c.commission_amount), 0);
  const totalGross = commissions.reduce((sum: number, c: any) => sum + Number(c.gross_amount), 0);
  const conversionRate = totalReferrals > 0 ? Math.round((payingCustomers / totalReferrals) * 100) : 0;

  // Current tier info
  const currentTier = CAREER_TIERS.find(t => convertedCount >= t.min && convertedCount <= t.max) || CAREER_TIERS[0];
  const nextTier = CAREER_TIERS.find(t => t.level === currentTier.level + 1);
  const progressToNext = nextTier ? ((convertedCount - currentTier.min) / (nextTier.min - currentTier.min)) * 100 : 100;

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    paid: "bg-green-500/20 text-green-400 border-green-500/30",
    reversed: "bg-red-500/20 text-red-400 border-red-500/30",
    cancelled: "bg-muted text-muted-foreground border-border",
  };

  const refStatusColor: Record<string, string> = {
    lead: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    registered: "bg-violet-500/20 text-violet-400 border-violet-500/30",
    paying: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  if (!affiliate) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto py-20 text-center space-y-4">
          <Award className="w-16 h-16 mx-auto text-amber-500" />
          <h1 className="text-2xl font-bold">Programa de Embaixadores FitJourney</h1>
          <p className="text-muted-foreground">
            Você ainda não faz parte do programa de embaixadores. Entre em contato com a administração para se tornar um embaixador.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
              🏆 Programa de Embaixadores
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Nível: <Badge variant="outline" className="ml-1 border-amber-500/30 text-amber-400">
                {currentTier.badge} {tierData?.tier_name || currentTier.name}
              </Badge>
              {" · "}1ª Venda: {tierData?.first_payment_percent || currentTier.first}% · Recorrente: {tierData?.recurring_percent || currentTier.recurring}%
            </p>
          </div>
        </div>

        {/* Career Progression Card */}
        <Card className="border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-transparent">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{currentTier.badge}</span>
                <div>
                  <p className="font-bold text-lg">{tierData?.tier_name || currentTier.name}</p>
                  <p className="text-xs text-muted-foreground">{convertedCount} indicações convertidas</p>
                </div>
              </div>
              {nextTier && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Próximo nível</p>
                  <p className="font-semibold text-sm">{nextTier.badge} {nextTier.name} ({nextTier.min} indicações)</p>
                </div>
              )}
              {!nextTier && (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">🔥 Nível Máximo</Badge>
              )}
            </div>
            {nextTier && (
              <div className="space-y-1">
                <Progress value={progressToNext} className="h-3" />
                <p className="text-xs text-muted-foreground text-right">{convertedCount}/{nextTier.min} indicações</p>
              </div>
            )}

            {/* Mini tier roadmap */}
            <div className="flex items-center justify-between gap-1 pt-2">
              {CAREER_TIERS.map((t) => (
                <div key={t.name} className={`flex-1 text-center py-2 rounded-lg text-xs ${t.level <= currentTier.level ? "bg-amber-500/10 border border-amber-500/20" : "bg-muted/20 border border-border/30"}`}>
                  <span className="block text-sm">{t.badge}</span>
                  <span className={`block font-medium ${t.level <= currentTier.level ? "text-amber-400" : "text-muted-foreground"}`}>{t.first}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Share Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="flex-1 w-full">
                <p className="text-xs text-muted-foreground mb-1">Seu link de indicação:</p>
                <Input value={shareLink} readOnly className="bg-background/50 font-mono text-sm" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyLink} className="border-amber-500/30">
                  <Copy className="w-4 h-4 mr-1" /> {copied ? "Copiado!" : "Copiar"}
                </Button>
                <Button size="sm" onClick={shareNative} className="bg-amber-500 hover:bg-amber-600 text-black">
                  <Share2 className="w-4 h-4 mr-1" /> Compartilhar
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Código: <span className="font-mono font-bold text-amber-400">{affiliate.referral_code}</span>
            </p>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <Users className="w-6 h-6 mx-auto text-blue-400 mb-1" />
              <p className="text-2xl font-bold">{totalReferrals}</p>
              <p className="text-xs text-muted-foreground">Indicações</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-400 mb-1" />
              <p className="text-2xl font-bold">{payingCustomers}</p>
              <p className="text-xs text-muted-foreground">Pagantes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <TrendingUp className="w-6 h-6 mx-auto text-cyan-400 mb-1" />
              <p className="text-2xl font-bold">{conversionRate}%</p>
              <p className="text-xs text-muted-foreground">Conversão</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <DollarSign className="w-6 h-6 mx-auto text-amber-400 mb-1" />
              <p className="text-2xl font-bold">R$ {totalGross.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Vendas Geradas</p>
            </CardContent>
          </Card>
        </div>

        {/* Commission Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-yellow-500/20">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <Clock className="w-8 h-8 text-yellow-400" />
              <div>
                <p className="text-xl font-bold text-yellow-400">R$ {pendingCommissions.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Pendentes (pago no mês seguinte)</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-emerald-500/20">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              <div>
                <p className="text-xl font-bold text-emerald-400">R$ {approvedCommissions.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Aprovadas</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-500/20">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-xl font-bold text-green-400">R$ {paidCommissions.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Total Pago</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="referrals" className="space-y-4">
          <TabsList>
            <TabsTrigger value="referrals">Indicações ({totalReferrals})</TabsTrigger>
            <TabsTrigger value="commissions">Comissões ({commissions.length})</TabsTrigger>
            <TabsTrigger value="career">Plano de Carreira</TabsTrigger>
          </TabsList>

          <TabsContent value="referrals">
            <Card>
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Conversão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referrals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhuma indicação ainda. Compartilhe seu link!
                        </TableCell>
                      </TableRow>
                    ) : (
                      referrals.map((ref: any) => (
                        <TableRow key={ref.id}>
                          <TableCell className="font-mono text-sm">{ref.referred_email}</TableCell>
                          <TableCell>{ref.referred_type}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={refStatusColor[ref.status] || ""}>{ref.status}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(ref.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {ref.converted_at ? format(new Date(ref.converted_at), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="commissions">
            <Card>
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Venda Bruta</TableHead>
                      <TableHead>%</TableHead>
                      <TableHead>Comissão</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Nenhuma comissão ainda.
                        </TableCell>
                      </TableRow>
                    ) : (
                      commissions.map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell>
                            <Badge variant="outline" className={c.commission_type === "first_payment" ? "border-amber-500/30 text-amber-400" : "border-cyan-500/30 text-cyan-400"}>
                              {c.commission_type === "first_payment" ? "1ª Venda" : "Recorrente"}
                            </Badge>
                          </TableCell>
                          <TableCell>R$ {Number(c.gross_amount).toFixed(2)}</TableCell>
                          <TableCell>{Number(c.commission_percent).toFixed(0)}%</TableCell>
                          <TableCell className="font-bold">R$ {Number(c.commission_amount).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusColor[c.status] || ""}>{c.status}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(c.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="career">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  Plano de Carreira — Níveis de Embaixador
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {CAREER_TIERS.map((t) => {
                    const isCurrent = t.level === currentTier.level;
                    const isUnlocked = t.level <= currentTier.level;
                    return (
                      <div key={t.name} className={`flex items-center gap-4 p-4 rounded-xl border ${isCurrent ? "border-amber-500/30 bg-amber-500/5" : isUnlocked ? "border-emerald-500/20 bg-emerald-500/5" : "border-border/30 bg-muted/10 opacity-60"}`}>
                        <span className="text-2xl">{t.badge}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold">{t.name}</p>
                            {isCurrent && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">Atual</Badge>}
                            {isUnlocked && !isCurrent && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">✓</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {t.max === Infinity ? `${t.min}+ indicações` : `${t.min}-${t.max} indicações`}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <p>1ª Venda: <span className="font-bold text-amber-400">{t.first}%</span></p>
                          <p>Recorrente: <span className="font-bold text-emerald-400">{t.recurring}%</span></p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-4 text-center">
                  💡 Comissões são pagas no mês seguinte após verificação de pagamento real.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
