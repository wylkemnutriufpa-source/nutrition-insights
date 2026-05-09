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
import { useTenant } from "@/lib/tenantContext";
import { withTenantFilter, getTenantIdForInsert } from "@/lib/tenantQueryHelpers";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Share2, Users, DollarSign, TrendingUp, Award, CheckCircle2, Clock, Trophy, Star, MessageCircle, Send, Instagram, Image, FileText, Sparkles, Target, Zap, Crown, Medal, Flame } from "lucide-react";
import AffiliateRevenueSimulator from "@/components/dashboard/AffiliateRevenueSimulator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { PRODUCTION_URL } from "@/lib/config";
import { copyToClipboard } from "@/utils/clipboard";

const CAREER_TIERS = [
  { name: "Bronze", min: 0, max: 19, first: 20, recurring: 5, badge: "🥉", level: 1, color: "from-amber-700 to-amber-900" },
  { name: "Prata", min: 20, max: 39, first: 22, recurring: 5, badge: "🥈", level: 2, color: "from-slate-300 to-slate-500" },
  { name: "Ouro", min: 40, max: 59, first: 24, recurring: 5, badge: "🥇", level: 3, color: "from-yellow-400 to-amber-500" },
  { name: "Platina", min: 60, max: 79, first: 26, recurring: 6, badge: "💎", level: 4, color: "from-cyan-400 to-blue-500" },
  { name: "Diamante", min: 80, max: 99, first: 28, recurring: 6, badge: "💠", level: 5, color: "from-violet-400 to-purple-600" },
  { name: "Premium", min: 100, max: Infinity, first: 40, recurring: 10, badge: "🏆", level: 6, color: "from-amber-400 to-yellow-600" },
];

const MARKETING_COPIES = [
  { title: "Story — Transformação", text: "Comecei a usar o FitJourney e mudou totalmente minha rotina alimentar. Resultados reais com acompanhamento inteligente! 🚀\n\nTesta aqui 👇", icon: "📱" },
  { title: "Story — Gamificação", text: "Subi de nível no FitJourney! 🏆 Cada dia que sigo meu plano, ganho pontos e medalhas. Nutrição virou um jogo viciante (do bem!).\n\nConhece aqui 👇", icon: "🎮" },
  { title: "Post — Profissional", text: "Se você é nutricionista e quer gerenciar pacientes com inteligência clínica, automação completa e gamificação… precisa conhecer o FitJourney. \n\n✅ Dashboard inteligente\n✅ Protocolos automatizados\n✅ IA para análise de refeições\n\nTeste agora 👇", icon: "🧑‍⚕️" },
  { title: "WhatsApp — Convite Direto", text: "Oi! Tô usando um app incrível pra nutrição chamado FitJourney. Tem gamificação, plano alimentar inteligente e muito mais. Vale conferir!\n\nAcessa aqui 👇", icon: "💬" },
  { title: "Bio / Linktree", text: "🥗 Transforme sua nutrição com tecnologia\n📊 Planos inteligentes + Gamificação\n🏆 Comece sua jornada agora 👇", icon: "🔗" },
  { title: "Depoimento — Resultado", text: "Em 30 dias seguindo meu plano no FitJourney, já vi diferença real. O melhor é que a gamificação me mantém motivado(a) todo dia! 💪\n\nCria tua conta aqui 👇", icon: "⭐" },
];

const MILESTONES = [
  { key: "first_referral", label: "Primeira Indicação", icon: "🎯", check: (refs: number) => refs >= 1 },
  { key: "first_payment", label: "Primeiro Pagamento", icon: "💰", check: (_: number, paying: number) => paying >= 1 },
  { key: "first_100", label: "Primeiros R$100", icon: "🔥", check: (_: number, __: number, earned: number) => earned >= 100 },
  { key: "ten_referrals", label: "10 Indicações", icon: "⚡", check: (refs: number) => refs >= 10 },
  { key: "silver_tier", label: "Nível Prata", icon: "🥈", check: (_: number, paying: number) => paying >= 20 },
  { key: "first_1000", label: "R$1.000 em Comissões", icon: "💎", check: (_: number, __: number, earned: number) => earned >= 1000 },
];

export default function AmbassadorDashboard() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["my-profile-affiliate", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: affiliate, isLoading: loadingAffiliate } = useQuery({
    queryKey: ["my-affiliate", user?.id, tenantId],
    queryFn: async () => {
      const q = supabase.from("affiliates").select("*").eq("user_id", user!.id).eq("is_active", true);
      const { data, error } = await withTenantFilter(q, tenantId).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const activateMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email) throw new Error("Email não disponível");
      const code = (profile?.full_name || "USER").replace(/\s+/g, "").substring(0, 6).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
      const { error } = await supabase.from("affiliates").insert({
        user_id: user.id, email: user.email, full_name: profile?.full_name || user.email,
        referral_code: code, first_payment_commission_percent: 20, recurring_commission_percent: 5,
        affiliate_type: "regular" as any, is_active: true,
        ...getTenantIdForInsert(tenantId),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-affiliate"] });
      toast.success("🎉 Parabéns! Você agora faz parte do programa de crescimento FitJourney!");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao ativar"),
  });

  const { data: tierData } = useQuery({
    queryKey: ["my-affiliate-tier", affiliate?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_affiliate_commission_tier", { _affiliate_id: affiliate!.id });
      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    },
    enabled: !!affiliate,
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ["my-referrals-affiliate", affiliate?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("affiliate_referrals").select("*").eq("affiliate_id", affiliate!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!affiliate,
  });

  const { data: commissions = [] } = useQuery({
    queryKey: ["my-commissions", affiliate?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("affiliate_commissions").select("*").eq("affiliate_id", affiliate!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!affiliate,
  });

  const { data: metricsCache } = useQuery({
    queryKey: ["my-affiliate-metrics", affiliate?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("affiliate_metrics_cache").select("*").eq("affiliate_id", affiliate!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!affiliate,
  });

  const { data: topAffiliates = [] } = useQuery({
    queryKey: ["affiliate-leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase.from("affiliate_metrics_cache").select("*, affiliates(full_name, referral_code)").order("total_earnings", { ascending: false }).limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!affiliate,
  });

  const shareLink = affiliate ? `${PRODUCTION_URL}/auth?ref=${affiliate.referral_code}` : "";

  const copyLink = async () => {
    const success = await copyToClipboard(shareLink);
    if (success) {
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Copie manualmente o link exibido.");
    }
  };

  const shareWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(`Junte-se ao FitJourney! 🚀\n${shareLink}`)}`, "_blank");
  const shareTelegram = () => window.open(`https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent("Conheça o FitJourney! 🚀")}`, "_blank");
  const shareInstagram = async () => { const success = await copyToClipboard(shareLink); toast[success ? "success" : "error"](success ? "Link copiado! Cole na sua bio ou story do Instagram." : "Copie manualmente o link exibido."); };
  const copyMaterial = async (text: string) => { const success = await copyToClipboard(`${text}\n${shareLink}`); toast[success ? "success" : "error"](success ? "Texto + link copiados!" : "Copie manualmente o texto exibido."); };

  // Activation Screen
  if (!affiliate && !loadingAffiliate) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto py-16 text-center space-y-6">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Award className="w-12 h-12 text-black" />
            </div>
          </motion.div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">Programa de Embaixadores FitJourney</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Indique o FitJourney para amigos e profissionais. Ganhe comissões de <strong className="text-amber-400">20%</strong> na primeira venda
            e <strong className="text-emerald-400">5%</strong> todo mês enquanto seu indicado estiver ativo.
          </p>

          <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
            {CAREER_TIERS.slice(0, 3).map((t) => (
              <div key={t.name} className="text-center p-3 rounded-xl bg-muted/30 border border-border/50">
                <span className="text-2xl block">{t.badge}</span>
                <p className="text-xs font-bold mt-1">{t.name}</p>
                <p className="text-xs text-amber-400">{t.first}%</p>
              </div>
            ))}
          </div>

          <Card className="max-w-md mx-auto border-amber-500/20 bg-amber-500/5">
            <CardContent className="pt-4 pb-4 text-left space-y-2">
              <p className="text-sm font-bold text-amber-400">✨ Seu link já está pronto para ativar</p>
              <p className="text-xs text-muted-foreground">Sua primeira comissão pode sair hoje. Basta ativar e compartilhar!</p>
            </CardContent>
          </Card>

          <Button size="lg" onClick={() => activateMutation.mutate()} disabled={activateMutation.isPending}
            className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold px-8 shadow-lg shadow-amber-500/20">
            <Sparkles className="w-5 h-5 mr-2" />
            {activateMutation.isPending ? "Ativando..." : "Ativar Programa de Indicações"}
          </Button>
          <p className="text-xs text-muted-foreground">Meta simples: indique 1 pessoa hoje 🎯</p>
        </div>
      </DashboardLayout>
    );
  }

  if (loadingAffiliate) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const totalReferrals = referrals.length;
  const convertedCount = tierData?.total_converted || 0;
  const payingCustomers = referrals.filter((r: any) => r.status === "paying").length;
  const pendingCommissions = commissions.filter((c: any) => c.status === "pending").reduce((sum: number, c: any) => sum + Number(c.commission_amount), 0);
  const approvedCommissions = commissions.filter((c: any) => c.status === "approved").reduce((sum: number, c: any) => sum + Number(c.commission_amount), 0);
  const paidCommissions = commissions.filter((c: any) => c.status === "paid").reduce((sum: number, c: any) => sum + Number(c.commission_amount), 0);
  const totalEarned = pendingCommissions + approvedCommissions + paidCommissions;
  const totalGross = commissions.reduce((sum: number, c: any) => sum + Number(c.gross_amount), 0);
  const conversionRate = totalReferrals > 0 ? Math.round((payingCustomers / totalReferrals) * 100) : 0;

  const currentTier = CAREER_TIERS.find(t => convertedCount >= t.min && convertedCount <= t.max) || CAREER_TIERS[0];
  const nextTier = CAREER_TIERS.find(t => t.level === currentTier.level + 1);
  const progressToNext = nextTier ? Math.min(((convertedCount - currentTier.min) / (nextTier.min - currentTier.min)) * 100, 100) : 100;

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    paid: "bg-green-500/20 text-green-400 border-green-500/30",
    reversed: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  const refStatusColor: Record<string, string> = {
    lead: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    registered: "bg-violet-500/20 text-violet-400 border-violet-500/30",
    paying: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  // Motivational message
  const getMotivationalMsg = () => {
    if (totalReferrals === 0) return "🚀 Seu link está ativo. Sua primeira comissão pode sair hoje!";
    if (payingCustomers === 0) return `🎯 Falta 1 assinatura para sua primeira comissão cair!`;
    if (nextTier) return `📈 Você está a ${nextTier.min - convertedCount} conversões de chegar ao nível ${nextTier.name}!`;
    return "🔥 Nível máximo! Você é um Embaixador Premium!";
  };

  const myRank = metricsCache?.ranking_position || "—";

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
              {myRank !== "—" && <span className="ml-2">· Ranking: #{myRank}</span>}
            </p>
          </div>
          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 gap-1 self-start">
            <DollarSign className="w-3 h-3" /> Afiliado Ativo
          </Badge>
        </div>

        {/* Motivational Banner */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-transparent">
            <CardContent className="pt-4 pb-4 flex items-center gap-4">
              <span className="text-3xl">{currentTier.badge}</span>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-bold">{tierData?.tier_name || currentTier.name}</p>
                  {nextTier && <p className="text-xs text-muted-foreground">{nextTier.badge} {nextTier.name} ({nextTier.min} indicações)</p>}
                </div>
                <Progress value={progressToNext} className="h-3" />
                <p className="text-xs text-amber-400 font-medium">{getMotivationalMsg()}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Milestones */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {MILESTONES.map((m) => {
            const unlocked = m.check(totalReferrals, payingCustomers, totalEarned);
            return (
              <motion.div key={m.key} whileHover={{ scale: 1.05 }}
                className={`text-center p-3 rounded-xl border ${unlocked ? "border-amber-500/30 bg-amber-500/10" : "border-border/30 bg-muted/10 opacity-50"}`}>
                <span className="text-xl block">{m.icon}</span>
                <p className="text-[10px] font-medium mt-1">{m.label}</p>
                {unlocked && <CheckCircle2 className="w-3 h-3 mx-auto mt-1 text-emerald-400" />}
              </motion.div>
            );
          })}
        </div>

        {/* Share Card */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="flex-1 w-full">
                <p className="text-xs text-muted-foreground mb-1">Seu link de indicação:</p>
                <Input value={shareLink} readOnly className="bg-background/50 font-mono text-sm" />
              </div>
              <Button variant="outline" size="sm" onClick={copyLink} className="border-amber-500/30">
                <Copy className="w-4 h-4 mr-1" /> {copied ? "Copiado!" : "Copiar"}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={shareWhatsApp} className="bg-green-600 hover:bg-green-700 text-white gap-1.5"><MessageCircle className="w-4 h-4" /> WhatsApp</Button>
              <Button size="sm" onClick={shareTelegram} className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5"><Send className="w-4 h-4" /> Telegram</Button>
              <Button size="sm" onClick={shareInstagram} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white gap-1.5"><Instagram className="w-4 h-4" /> Instagram</Button>
              <Button size="sm" variant="outline" onClick={() => { if (navigator.share) { navigator.share({ title: "FitJourney", text: "Conheça o FitJourney!", url: shareLink }); } else { copyLink(); } }} className="gap-1.5"><Share2 className="w-4 h-4" /> Mais</Button>
            </div>
            <p className="text-xs text-muted-foreground">Código: <span className="font-mono font-bold text-amber-400">{affiliate?.referral_code}</span></p>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card><CardContent className="pt-4 pb-4 text-center">
            <Users className="w-6 h-6 mx-auto text-blue-400 mb-1" />
            <p className="text-2xl font-bold">{totalReferrals}</p>
            <p className="text-xs text-muted-foreground">Indicações</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4 text-center">
            <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-400 mb-1" />
            <p className="text-2xl font-bold">{payingCustomers}</p>
            <p className="text-xs text-muted-foreground">Pagantes</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4 text-center">
            <TrendingUp className="w-6 h-6 mx-auto text-cyan-400 mb-1" />
            <p className="text-2xl font-bold">{conversionRate}%</p>
            <p className="text-xs text-muted-foreground">Conversão</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4 text-center">
            <DollarSign className="w-6 h-6 mx-auto text-amber-400 mb-1" />
            <p className="text-2xl font-bold">R$ {totalEarned.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Ganhos Totais</p>
          </CardContent></Card>
          <Card className="border-amber-500/20"><CardContent className="pt-4 pb-4 text-center">
            <Trophy className="w-6 h-6 mx-auto text-amber-400 mb-1" />
            <p className="text-2xl font-bold">#{myRank}</p>
            <p className="text-xs text-muted-foreground">Ranking</p>
          </CardContent></Card>
        </div>

        {/* Commission Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-yellow-500/20"><CardContent className="pt-4 pb-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-yellow-400" />
            <div>
              <p className="text-xl font-bold text-yellow-400">R$ {pendingCommissions.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
          </CardContent></Card>
          <Card className="border-emerald-500/20"><CardContent className="pt-4 pb-4 flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            <div>
              <p className="text-xl font-bold text-emerald-400">R$ {approvedCommissions.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Aprovadas</p>
            </div>
          </CardContent></Card>
          <Card className="border-green-500/20"><CardContent className="pt-4 pb-4 flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-green-400" />
            <div>
              <p className="text-xl font-bold text-green-400">R$ {paidCommissions.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Total Pago</p>
            </div>
          </CardContent></Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="referrals" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="referrals">Indicações ({totalReferrals})</TabsTrigger>
            <TabsTrigger value="commissions">Comissões ({commissions.length})</TabsTrigger>
            <TabsTrigger value="ranking">🏆 Ranking</TabsTrigger>
            <TabsTrigger value="materials">📢 Materiais</TabsTrigger>
            <TabsTrigger value="career">💎 Carreira</TabsTrigger>
            <TabsTrigger value="simulator">📊 Simulador</TabsTrigger>
          </TabsList>

          <TabsContent value="referrals">
            <Card>
              <CardContent className="pt-4">
                {/* Conversion funnel */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-lg font-bold text-blue-400">{referrals.filter((r: any) => r.status === "lead").length}</p>
                    <p className="text-xs text-muted-foreground">Cliques / Leads</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                    <p className="text-lg font-bold text-violet-400">{referrals.filter((r: any) => r.status === "registered").length}</p>
                    <p className="text-xs text-muted-foreground">Cadastros</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-lg font-bold text-emerald-400">{payingCustomers}</p>
                    <p className="text-xs text-muted-foreground">Assinantes</p>
                  </div>
                </div>

                {payingCustomers === 0 && totalReferrals > 0 && (
                  <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                    <p className="text-sm text-amber-400 font-medium">🎯 Falta pouco! Você tem {totalReferrals} indicação(ões). Quando um deles assinar, sua comissão cai automaticamente!</p>
                    <Progress value={Math.min((totalReferrals / 1) * 50, 90)} className="h-2 mt-2" />
                  </div>
                )}

                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Email</TableHead><TableHead>Tipo</TableHead><TableHead>Status</TableHead><TableHead>Data</TableHead><TableHead>Conversão</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {referrals.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma indicação ainda. Compartilhe seu link! 🚀</TableCell></TableRow>
                    ) : referrals.map((ref: any) => (
                      <TableRow key={ref.id}>
                        <TableCell className="font-mono text-sm">{ref.referred_email}</TableCell>
                        <TableCell>{ref.referred_type}</TableCell>
                        <TableCell><Badge variant="outline" className={refStatusColor[ref.status] || ""}>{ref.status}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{format(new Date(ref.created_at), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{ref.converted_at ? format(new Date(ref.converted_at), "dd/MM/yyyy", { locale: ptBR }) : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="commissions">
            <Card>
              <CardContent className="pt-4">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Tipo</TableHead><TableHead>Venda Bruta</TableHead><TableHead>%</TableHead><TableHead>Comissão</TableHead><TableHead>Status</TableHead><TableHead>Data</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {commissions.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma comissão ainda.</TableCell></TableRow>
                    ) : commissions.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <Badge variant="outline" className={c.commission_type === "first_payment" ? "border-amber-500/30 text-amber-400" : "border-cyan-500/30 text-cyan-400"}>
                            {c.commission_type === "first_payment" ? "1ª Venda" : "Recorrente"}
                          </Badge>
                        </TableCell>
                        <TableCell>R$ {Number(c.gross_amount).toFixed(2)}</TableCell>
                        <TableCell>{Number(c.commission_percent).toFixed(0)}%</TableCell>
                        <TableCell className="font-bold">R$ {Number(c.commission_amount).toFixed(2)}</TableCell>
                        <TableCell><Badge variant="outline" className={statusColor[c.status] || ""}>{c.status}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{format(new Date(c.created_at), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ranking Tab */}
          <TabsContent value="ranking">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Crown className="w-5 h-5 text-amber-400" /> Ranking de Embaixadores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topAffiliates.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Ranking em construção...</p>
                  ) : topAffiliates.map((a: any, i: number) => {
                    const isMe = a.affiliate_id === affiliate?.id;
                    const pos = i + 1;
                    const posIcon = pos === 1 ? "🥇" : pos === 2 ? "🥈" : pos === 3 ? "🥉" : `#${pos}`;
                    return (
                      <motion.div key={a.affiliate_id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                        className={`flex items-center gap-4 p-3 rounded-xl border ${isMe ? "border-amber-500/30 bg-amber-500/5" : "border-border/30"}`}>
                        <span className={`text-lg font-bold w-8 text-center ${pos <= 3 ? "text-xl" : "text-muted-foreground"}`}>{posIcon}</span>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{a.affiliates?.full_name || "Embaixador"} {isMe && <Badge className="ml-2 bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">Você</Badge>}</p>
                          <p className="text-xs text-muted-foreground">{a.tier_name || "Bronze"} · {a.total_referrals || 0} indicações</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-amber-400">R$ {Number(a.total_earnings || 0).toFixed(0)}</p>
                          <p className="text-[10px] text-muted-foreground">{Number(a.conversion_rate || 0).toFixed(0)}% conv.</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Materials */}
          <TabsContent value="materials">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg"><FileText className="w-5 h-5 text-amber-400" /> Materiais de Divulgação</CardTitle>
                  <p className="text-sm text-muted-foreground">Copie textos prontos com seu link. Pronto para colar e publicar!</p>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  {MARKETING_COPIES.map((mat, i) => (
                    <div key={i} className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-sm flex items-center gap-2"><span>{mat.icon}</span> {mat.title}</p>
                        <Button size="sm" variant="outline" onClick={() => copyMaterial(mat.text)} className="gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
                          <Copy className="w-3.5 h-3.5" /> Copiar
                        </Button>
                      </div>
                      <div className="bg-background/50 rounded-lg p-3 text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                        {mat.text}{"\n"}<span className="text-amber-400">{shareLink}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Image className="w-5 h-5 text-amber-400" /> Dicas de Divulgação</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  {[
                    { icon: "📱", title: "Stories do Instagram", desc: "Poste seus resultados + link na bio. Use o CTA \"Desliza pra cima\" ou \"Link na bio\"." },
                    { icon: "💬", title: "Grupos de WhatsApp", desc: "Compartilhe em grupos de nutrição, fitness e bem-estar com mensagens personalizadas." },
                    { icon: "🎥", title: "Vídeos curtos (Reels/TikTok)", desc: "Grave mostrando o app, sua evolução e coloque o link na bio." },
                    { icon: "🤝", title: "Boca a boca", desc: "Indique pessoalmente para amigos, familiares e colegas. Conversas reais convertem mais!" },
                  ].map((tip, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20">
                      <span className="text-lg">{tip.icon}</span>
                      <div><p className="font-medium text-foreground">{tip.title}</p><p>{tip.desc}</p></div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Career Tab */}
          <TabsContent value="career">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-400" /> Plano de Carreira — Níveis</CardTitle>
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
                          <p className="text-xs text-muted-foreground">{t.max === Infinity ? `${t.min}+ indicações` : `${t.min}-${t.max} indicações`}</p>
                        </div>
                        <div className="text-right text-sm">
                          <p>1ª Venda: <span className="font-bold text-amber-400">{t.first}%</span></p>
                          <p>Recorrente: <span className="font-bold text-emerald-400">{t.recurring}%</span></p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-4 text-center">💡 Comissões são pagas no mês seguinte após verificação de pagamento real.</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Simulator */}
          <TabsContent value="simulator">
            <AffiliateRevenueSimulator />
          </TabsContent>
        </Tabs>

        {/* Total earnings */}
        <Card className="border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-transparent">
          <CardContent className="pt-6 pb-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">🔥 Você já gerou em comissões</p>
            <p className="text-4xl font-bold text-amber-400">R$ {totalEarned.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-2">Você faz parte do <strong className="text-amber-400">Programa de Embaixadores FitJourney</strong></p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
