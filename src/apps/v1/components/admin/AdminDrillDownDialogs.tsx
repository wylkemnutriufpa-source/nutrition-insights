import { useState, useEffect, useMemo } from "react";
import { supabase } from "@v1/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@v1/components/ui/dialog";
import { Badge } from "@v1/components/ui/badge";
import { Input } from "@v1/components/ui/input";
import { ScrollArea } from "@v1/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@v1/components/ui/tabs";
import {
  Users, Search, Loader2, UserCheck, Dumbbell, CreditCard, DollarSign,
  CheckCircle2, XCircle, Crown, Calendar, TrendingUp, Activity
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Professionals Drill-Down ───
export function ProfessionalsDrillDown({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [nutritionists, setNutritionists] = useState<any[]>([]);
  const [personals, setPersonals] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedPatients, setExpandedPatients] = useState<any[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      const [nutRes, persRes] = await Promise.all([
        supabase.from("user_roles").select("user_id").eq("role", "nutritionist"),
        supabase.from("user_roles").select("user_id").eq("role", "personal"),
      ]);
      
      const nutIds = nutRes.data?.map(r => r.user_id) || [];
      const persIds = persRes.data?.map(r => r.user_id) || [];

      const loadProfs = async (ids: string[], type: string) => {
        const results = [];
        for (const id of ids) {
          const [profileRes, countRes] = await Promise.all([
            supabase.from("profiles").select("full_name, avatar_url, created_at").eq("user_id", id).maybeSingle(),
            supabase.from("nutritionist_patients").select("id", { count: "exact", head: true }).eq("nutritionist_id", id).eq("status", "active"),
          ]);
          results.push({
            user_id: id,
            full_name: profileRes.data?.full_name || (type === "nutritionist" ? "Nutricionista" : "Personal"),
            avatar_url: profileRes.data?.avatar_url,
            created_at: profileRes.data?.created_at,
            count: countRes.count || 0,
            type,
          });
        }
        return results;
      };

      const [nutProfs, persProfs] = await Promise.all([
        loadProfs(nutIds, "nutritionist"),
        loadProfs(persIds, "personal"),
      ]);

      setNutritionists(nutProfs);
      setPersonals(persProfs);
      setLoading(false);
    };
    load();
  }, [open]);

  const loadPatientsFor = async (profId: string, type: string) => {
    if (expandedId === profId) { setExpandedId(null); return; }
    setExpandedId(profId);
    setLoadingPatients(true);
    
    let patientIds: string[] = [];
    if (type === "nutritionist") {
      const { data } = await supabase.from("nutritionist_patients").select("patient_id").eq("nutritionist_id", profId).eq("status", "active");
      patientIds = data?.map(d => d.patient_id) || [];
    } else {
      // Personal trainers - use nutritionist_patients as fallback since personal_students may not exist
      const { data } = await supabase.from("nutritionist_patients").select("patient_id").eq("nutritionist_id", profId).eq("status", "active");
      patientIds = data?.map(d => d.patient_id) || [];
    }

    if (patientIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", patientIds);
      setExpandedPatients(profiles || []);
    } else {
      setExpandedPatients([]);
    }
    setLoadingPatients(false);
  };

  const filterProfs = (list: any[]) => {
    if (!search) return list;
    const s = search.toLowerCase();
    return list.filter(p => p.full_name.toLowerCase().includes(s));
  };

  const ProfCard = ({ prof }: { prof: any }) => (
    <div key={prof.user_id}>
      <div
        className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted/80 transition-colors cursor-pointer"
        onClick={() => loadPatientsFor(prof.user_id, prof.type)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">{prof.full_name[0]?.toUpperCase()}</span>
          </div>
          <div>
            <p className="font-medium text-sm">{prof.full_name}</p>
            <p className="text-xs text-muted-foreground">
              {prof.count} {prof.type === "nutritionist" ? "pacientes" : "alunos"} ativos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {prof.type === "nutritionist" ? "🥗 Nutri" : "💪 Personal"}
          </Badge>
          {prof.created_at && (
            <span className="text-[10px] text-muted-foreground">
              desde {format(new Date(prof.created_at), "MM/yyyy")}
            </span>
          )}
        </div>
      </div>
      {expandedId === prof.user_id && (
        <div className="ml-6 mt-1 mb-2 pl-4 border-l-2 border-primary/20 space-y-1">
          {loadingPatients ? (
            <div className="py-3 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
          ) : expandedPatients.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Nenhum paciente/aluno vinculado</p>
          ) : expandedPatients.map(p => (
            <div key={p.user_id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/40 text-sm">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                {p.full_name?.[0]?.toUpperCase() || "?"}
              </div>
              <span className="text-sm">{p.full_name || "Sem nome"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Profissionais da Plataforma
          </DialogTitle>
        </DialogHeader>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar profissional..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <Tabs defaultValue="nutri">
            <TabsList className="w-full">
              <TabsTrigger value="nutri" className="flex-1 gap-1.5">
                🥗 Nutricionistas ({nutritionists.length})
              </TabsTrigger>
              <TabsTrigger value="personal" className="flex-1 gap-1.5">
                💪 Personal Trainers ({personals.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="nutri">
              <ScrollArea className="max-h-[50vh]">
                <div className="space-y-2 pr-2">
                  {filterProfs(nutritionists).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Nenhum nutricionista encontrado</p>
                  ) : filterProfs(nutritionists).map(p => <ProfCard key={p.user_id} prof={p} />)}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="personal">
              <ScrollArea className="max-h-[50vh]">
                <div className="space-y-2 pr-2">
                  {filterProfs(personals).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Nenhum personal encontrado</p>
                  ) : filterProfs(personals).map(p => <ProfCard key={p.user_id} prof={p} />)}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Patients Drill-Down ───
export function PatientsDrillDown({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      const { data: patRoles } = await supabase.from("user_roles").select("user_id").eq("role", "patient");
      const patIds = patRoles?.map(r => r.user_id) || [];
      
      if (patIds.length === 0) { setPatients([]); setLoading(false); return; }
      
      // Batch load profiles
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", patIds.slice(0, 200));
      
      // Check program enrollments
      const { data: enrollments } = await supabase.from("program_enrollments").select("patient_id, status").in("patient_id", patIds.slice(0, 200));
      const enrollMap = new Map<string, string>();
      (enrollments || []).forEach(e => {
        if (e.status === "active") enrollMap.set(e.patient_id, "active");
        else if (!enrollMap.has(e.patient_id)) enrollMap.set(e.patient_id, e.status);
      });

      // Check nutritionist links
      const { data: links } = await supabase.from("nutritionist_patients").select("patient_id, status").in("patient_id", patIds.slice(0, 200)).eq("status", "active");
      const linkedSet = new Set((links || []).map(l => l.patient_id));

      const result = (profiles || []).map(p => ({
        ...p,
        in_program: enrollMap.get(p.user_id) === "active",
        program_status: enrollMap.get(p.user_id) || "none",
        has_professional: linkedSet.has(p.user_id),
      }));

      setPatients(result);
      setLoading(false);
    };
    load();
  }, [open]);

  const filtered = useMemo(() => {
    if (!search) return patients;
    const s = search.toLowerCase();
    return patients.filter(p => (p.full_name || "").toLowerCase().includes(s));
  }, [patients, search]);

  const inProgram = patients.filter(p => p.in_program).length;
  const withPro = patients.filter(p => p.has_professional).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Pacientes ({patients.length})
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center p-2 rounded-lg bg-primary/10">
            <p className="text-lg font-bold text-primary">{patients.length}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-green-500/10">
            <p className="text-lg font-bold text-green-500">{inProgram}</p>
            <p className="text-[10px] text-muted-foreground">Em Programa</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-blue-500/10">
            <p className="text-lg font-bold text-blue-500">{withPro}</p>
            <p className="text-[10px] text-muted-foreground">Com Profissional</p>
          </div>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar paciente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <ScrollArea className="max-h-[50vh]">
            <div className="space-y-1.5 pr-2">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum paciente encontrado</p>
              ) : filtered.map(p => (
                <div key={p.user_id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted/80 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">{(p.full_name || "?")[0]?.toUpperCase()}</span>
                    </div>
                    <span className="text-sm font-medium">{p.full_name || "Sem nome"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {p.in_program && <Badge className="text-[10px] bg-green-500/20 text-green-400 border-green-500/30">Em Programa</Badge>}
                    {p.has_professional ? (
                      <Badge variant="outline" className="text-[10px]">✓ Vinculado</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px]">Sem profissional</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Subscriptions Drill-Down ───
export function SubscriptionsDrillDown({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subs, setSubs] = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      // Get all professionals with their payment info
      const { data: nutRoles } = await supabase.from("user_roles").select("user_id").eq("role", "nutritionist");
      const { data: persRoles } = await supabase.from("user_roles").select("user_id").eq("role", "personal");
      const allProfIds = [
        ...(nutRoles || []).map(r => ({ id: r.user_id, type: "Nutricionista" })),
        ...(persRoles || []).map(r => ({ id: r.user_id, type: "Personal" })),
      ];

      const results = [];
      for (const prof of allProfIds) {
        const [profileRes, paymentRes] = await Promise.all([
          supabase.from("profiles").select("full_name").eq("user_id", prof.id).maybeSingle(),
          supabase.from("payments").select("status, amount, paid_at, metadata").eq("user_id", prof.id).order("paid_at", { ascending: false }).limit(1),
        ]);
        const lastPayment = paymentRes.data?.[0];
        results.push({
          user_id: prof.id,
          full_name: profileRes.data?.full_name || prof.type,
          type: prof.type,
          is_active: lastPayment?.status === "paid",
          amount: lastPayment?.amount || 0,
          paid_at: lastPayment?.paid_at,
          plan: (lastPayment?.metadata as any)?.plan_name || "—",
        });
      }

      setSubs(results);
      setLoading(false);
    };
    load();
  }, [open]);

  const filtered = useMemo(() => {
    if (!search) return subs;
    const s = search.toLowerCase();
    return subs.filter(p => p.full_name.toLowerCase().includes(s));
  }, [subs, search]);

  const activeCount = subs.filter(s => s.is_active).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" /> Assinaturas
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center p-2 rounded-lg bg-primary/10">
            <p className="text-lg font-bold text-primary">{subs.length}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-green-500/10">
            <p className="text-lg font-bold text-green-500">{activeCount}</p>
            <p className="text-[10px] text-muted-foreground">Ativos</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-red-500/10">
            <p className="text-lg font-bold text-red-500">{subs.length - activeCount}</p>
            <p className="text-[10px] text-muted-foreground">Inativos</p>
          </div>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <ScrollArea className="max-h-[50vh]">
            <div className="space-y-1.5 pr-2">
              {filtered.map(s => (
                <div key={s.user_id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted/80 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${s.is_active ? "bg-green-500" : "bg-red-500"}`} />
                    <div>
                      <p className="text-sm font-medium">{s.full_name}</p>
                      <p className="text-[10px] text-muted-foreground">{s.type} • {s.plan}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-right">
                    {s.amount > 0 && (
                      <span className="text-xs font-semibold text-primary">R${Number(s.amount).toFixed(0)}</span>
                    )}
                    {s.paid_at && (
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(s.paid_at), "dd/MM/yy", { locale: ptBR })}
                      </span>
                    )}
                    <Badge variant={s.is_active ? "default" : "destructive"} className="text-[10px]">
                      {s.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Revenue Drill-Down ───
export function RevenueDrillDown({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const { data } = await supabase.from("payments")
        .select("*")
        .eq("status", "paid")
        .gte("paid_at", monthStart.toISOString())
        .order("paid_at", { ascending: false });

      // Enrich with profile names
      const userIds = [...new Set((data || []).map(p => p.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      const profileMap: Record<string, string> = {};
      (profiles || []).forEach(p => { profileMap[p.user_id] = p.full_name || "Sem nome"; });

      const enriched = (data || []).map(p => ({
        ...p,
        full_name: profileMap[p.user_id] || p.user_id.slice(0, 8),
      }));

      setPayments(enriched);
      setLoading(false);
    };
    load();
  }, [open]);

  const total = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" /> Receita do Mês
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="text-center p-3 rounded-lg bg-primary/10">
            <p className="text-xl font-bold text-primary">R${total.toLocaleString("pt-BR")}</p>
            <p className="text-[10px] text-muted-foreground">Total do mês</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted">
            <p className="text-xl font-bold">{payments.length}</p>
            <p className="text-[10px] text-muted-foreground">Pagamentos</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : payments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum pagamento este mês</p>
        ) : (
          <ScrollArea className="max-h-[50vh]">
            <div className="space-y-1.5 pr-2">
              {payments.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{p.full_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {p.paid_at ? format(new Date(p.paid_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-primary">R${Number(p.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
