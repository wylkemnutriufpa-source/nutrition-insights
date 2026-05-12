import { useState, useEffect } from "react";
import { useAuth } from "@v1/lib/auth";
import { supabase } from "@v1/integrations/supabase/client";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Badge } from "@v1/components/ui/badge";
import { toast } from "sonner";
import { Link2, Copy, Share2, Loader2, Rocket, Users, TrendingUp } from "lucide-react";

export default function MyReferrals() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [refRes, progRes] = await Promise.all([
        supabase.from("patient_referrals").select("*, programs(title)").eq("patient_id", user.id).order("created_at", { ascending: false }),
        supabase.from("program_patients").select("program_id, programs(id, title)").eq("patient_id", user.id).eq("status", "active"),
      ]);
      setReferrals(refRes.data || []);
      setPrograms((progRes.data || []).map((p: any) => p.programs).filter(Boolean));
      setLoading(false);
    })();
  }, [user]);

  const createReferral = async (programId?: string) => {
    if (!user) return;
    setCreating(true);

    // Get nutritionist
    const { data: np } = await supabase.from("nutritionist_patients").select("nutritionist_id").eq("patient_id", user.id).eq("status", "active").limit(1).maybeSingle();

    if (!np) { toast.error("Nenhum nutricionista vinculado."); setCreating(false); return; }

    const { data, error } = await supabase.from("patient_referrals").insert({
      patient_id: user.id,
      nutritionist_id: np.nutritionist_id,
      program_id: programId || null,
    }).select().single();

    setCreating(false);
    if (error) { toast.error("Erro ao criar link."); return; }
    setReferrals(prev => [data, ...prev]);
    toast.success("Link de referência criado!");
  };

  const copyLink = (code: string, programId?: string) => {
    const url = programId
      ? `${window.location.origin}/program/${programId}/public?ref=${code}`
      : `${window.location.origin}/landing?ref=${code}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-3xl">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-3">
            <Share2 className="w-6 h-6 text-primary" /> Minhas Indicações
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Compartilhe sua jornada e ajude outras pessoas</p>
        </div>

        {/* Create new referral */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Criar Link de Indicação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={() => createReferral()} disabled={creating} className="w-full gap-2" variant="outline">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              Link Geral
            </Button>
            {programs.map(prog => (
              <Button key={prog.id} onClick={() => createReferral(prog.id)} disabled={creating} className="w-full gap-2" variant="outline">
                <Rocket className="w-4 h-4" /> Link para: {prog.title}
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Existing referrals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Seus Links ({referrals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {referrals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Crie seu primeiro link de indicação acima!</p>
            ) : (
              <div className="space-y-2">
                {referrals.map(ref => (
                  <div key={ref.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold font-mono">{ref.referral_code}</p>
                      <p className="text-xs text-muted-foreground">
                        {(ref as any).programs?.title || "Link geral"} · {ref.clicks} cliques · {ref.leads_generated} leads
                      </p>
                    </div>
                    <Badge variant={ref.is_active ? "default" : "secondary"} className="text-[10px]">
                      {ref.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                    <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => copyLink(ref.referral_code, ref.program_id)}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
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
