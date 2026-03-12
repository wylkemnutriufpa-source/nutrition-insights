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
import { Copy, Share2, Users, DollarSign, TrendingUp, Award, CheckCircle2, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

  const shareLink = affiliate
    ? `${window.location.origin}/auth?ref=${affiliate.referral_code}`
    : "";

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareNative = () => {
    if (navigator.share) {
      navigator.share({
        title: "Programa de Embaixadores FitJourney",
        text: "Junte-se ao FitJourney com minha indicação!",
        url: shareLink,
      });
    } else {
      copyLink();
    }
  };

  const totalReferrals = referrals.length;
  const payingCustomers = referrals.filter((r: any) => r.status === "paying").length;
  const pendingCommissions = commissions
    .filter((c: any) => c.status === "pending")
    .reduce((sum: number, c: any) => sum + Number(c.commission_amount), 0);
  const approvedCommissions = commissions
    .filter((c: any) => c.status === "approved")
    .reduce((sum: number, c: any) => sum + Number(c.commission_amount), 0);
  const paidCommissions = commissions
    .filter((c: any) => c.status === "paid")
    .reduce((sum: number, c: any) => sum + Number(c.commission_amount), 0);
  const totalGross = commissions
    .reduce((sum: number, c: any) => sum + Number(c.gross_amount), 0);
  const conversionRate = totalReferrals > 0 ? Math.round((payingCustomers / totalReferrals) * 100) : 0;
  const recurringMonthly = commissions
    .filter((c: any) => c.commission_type === "recurring" && c.status !== "reversed" && c.status !== "cancelled")
    .reduce((sum: number, c: any) => sum + Number(c.commission_amount), 0);

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
              Tipo: <Badge variant="outline" className="ml-1 border-amber-500/30 text-amber-400">{affiliate.affiliate_type}</Badge>
              {" · "}Comissão 1ª: {affiliate.first_payment_commission_percent}% · Recorrente: {affiliate.recurring_commission_percent}%
            </p>
          </div>
        </div>

        {/* Share Card */}
        <Card className="border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="flex-1 w-full">
                <p className="text-xs text-muted-foreground mb-1">Seu link de indicação:</p>
                <Input value={shareLink} readOnly className="bg-background/50 font-mono text-sm" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyLink} className="border-amber-500/30">
                  <Copy className="w-4 h-4 mr-1" />
                  {copied ? "Copiado!" : "Copiar"}
                </Button>
                <Button size="sm" onClick={shareNative} className="bg-amber-500 hover:bg-amber-600 text-black">
                  <Share2 className="w-4 h-4 mr-1" />
                  Compartilhar
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
                <p className="text-xs text-muted-foreground">Comissões Pendentes</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-emerald-500/20">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              <div>
                <p className="text-xl font-bold text-emerald-400">R$ {approvedCommissions.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Aprovadas (Aguardando Pagamento)</p>
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
                            <Badge variant="outline" className={refStatusColor[ref.status] || ""}>
                              {ref.status}
                            </Badge>
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
                            <Badge variant="outline" className={statusColor[c.status] || ""}>
                              {c.status}
                            </Badge>
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
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
