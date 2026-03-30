import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  CreditCard, Users, Search, Loader2, CheckCircle2, XCircle,
  Clock, RefreshCw, Crown, Ban, Power, PowerOff
} from "lucide-react";
import { format } from "date-fns";

interface ProfessionalSub {
  user_id: string;
  full_name: string;
  email: string;
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
  is_trial: boolean;
  trial_end: string | null;
  patient_count: number;
}

export default function AdminSubscriptionMonitor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [professionals, setProfessionals] = useState<ProfessionalSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activating, setActivating] = useState<string | null>(null);
  const [pricingPlans, setPricingPlans] = useState<{ id: string; name: string; slug: string }[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);

    const [nutRolesRes, plansRes] = await Promise.all([
      supabase.from("user_roles").select("user_id").eq("role", "nutritionist"),
      supabase.from("pricing_plans").select("id, name, slug").eq("is_active", true).order("sort_order"),
    ]);

    const nutIds = nutRolesRes.data?.map((r) => r.user_id) || [];
    setPricingPlans(plansRes.data || []);

    const results: ProfessionalSub[] = [];
    for (const nId of nutIds) {
      const [profileRes, countRes, paymentRes] = await Promise.all([
        supabase.from("profiles").select("full_name, email").eq("user_id", nId).maybeSingle(),
        supabase.from("nutritionist_patients").select("id", { count: "exact", head: true }).eq("nutritionist_id", nId).eq("status", "active"),
        supabase.from("payments").select("status, amount, paid_at").eq("user_id", nId).order("paid_at", { ascending: false }).limit(1),
      ]);

      const lastPayment = paymentRes.data?.[0];
      results.push({
        user_id: nId,
        full_name: profileRes.data?.full_name || "Nutricionista",
        email: profileRes.data?.email || "",
        subscribed: lastPayment?.status === "paid",
        subscription_tier: null,
        subscription_end: null,
        is_trial: false,
        trial_end: null,
        patient_count: countRes.count || 0,
      });
    }

    setProfessionals(results);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleActivate = async (prof: ProfessionalSub, planSlug?: string) => {
    setActivating(prof.user_id);
    try {
      // Insert a "paid" record in payments table to activate
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      const { error } = await supabase.from("payments").insert({
        user_id: prof.user_id,
        amount: 0,
        status: "paid",
        gateway: "manual",
        paid_at: new Date().toISOString(),
        metadata: { activated_by: user?.id, plan_slug: planSlug || "manual", type: "admin_manual_activation" },
      });

      if (error) throw error;
      toast.success(`${prof.full_name} ativado(a) com sucesso! ✅`);
      loadData();
    } catch (err: any) {
      toast.error("Erro ao ativar: " + err.message);
    } finally {
      setActivating(null);
    }
  };

  const handleDeactivate = async (prof: ProfessionalSub) => {
    if (!confirm(`Desativar ${prof.full_name}? Isso removerá o acesso ao sistema.`)) return;
    setActivating(prof.user_id);
    try {
      // Mark last payment as cancelled
      const { error } = await supabase.from("payments")
        .update({ status: "cancelled" })
        .eq("user_id", prof.user_id)
        .eq("status", "paid")
        .order("paid_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      toast.success(`${prof.full_name} desativado(a).`);
      loadData();
    } catch (err: any) {
      toast.error("Erro ao desativar: " + err.message);
    } finally {
      setActivating(null);
    }
  };

  const filtered = professionals.filter((p) =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = professionals.filter((p) => p.subscribed).length;
  const inactiveCount = professionals.filter((p) => !p.subscribed).length;
  const trialCount = professionals.filter((p) => p.is_trial).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-primary" />
            <div>
              <h1 className="font-display text-2xl font-bold">Monitor de Assinaturas</h1>
              <p className="text-muted-foreground text-sm">
                Acompanhe e gerencie o status de pagamento dos profissionais
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={loadData} className="gap-1.5">
            <RefreshCw className="w-4 h-4" /> Atualizar
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="glass">
            <CardContent className="flex items-center gap-3 py-5">
              <Users className="w-6 h-6 text-primary" />
              <div>
                <p className="text-xl font-bold">{professionals.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass border-l-4 border-l-green-500">
            <CardContent className="flex items-center gap-3 py-5">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
              <div>
                <p className="text-xl font-bold">{activeCount}</p>
                <p className="text-xs text-muted-foreground">Ativos</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass border-l-4 border-l-red-500">
            <CardContent className="flex items-center gap-3 py-5">
              <XCircle className="w-6 h-6 text-red-500" />
              <div>
                <p className="text-xl font-bold">{inactiveCount}</p>
                <p className="text-xs text-muted-foreground">Inadimplentes</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass border-l-4 border-l-amber-500">
            <CardContent className="flex items-center gap-3 py-5">
              <Clock className="w-6 h-6 text-amber-500" />
              <div>
                <p className="text-xl font-bold">{trialCount}</p>
                <p className="text-xs text-muted-foreground">Em Trial</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="max-h-[55vh]">
            <div className="space-y-2">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum profissional encontrado</p>
              ) : (
                filtered.map((prof) => (
                  <div
                    key={prof.user_id}
                    className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        prof.subscribed ? "bg-green-500/15" : "bg-red-500/15"
                      }`}>
                        {prof.subscribed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <Ban className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{prof.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {prof.email} • {prof.patient_count} pacientes
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {prof.subscription_tier && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Crown className="w-3 h-3" />
                          {prof.subscription_tier}
                        </Badge>
                      )}
                      <Badge
                        variant={prof.subscribed ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {prof.subscribed ? "Ativo" : prof.is_trial ? "Trial" : "Inadimplente"}
                      </Badge>
                      
                      {/* Action Buttons */}
                      {prof.subscribed ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeactivate(prof)}
                          disabled={activating === prof.user_id}
                        >
                          {activating === prof.user_id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <PowerOff className="w-4 h-4" />
                              <span className="hidden sm:inline">Desativar</span>
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          className="gap-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleActivate(prof)}
                          disabled={activating === prof.user_id}
                        >
                          {activating === prof.user_id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Power className="w-4 h-4" />
                              <span className="hidden sm:inline">Ativar</span>
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    </DashboardLayout>
  );
}
