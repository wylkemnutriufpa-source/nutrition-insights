import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, RefreshCw, AlertTriangle, UserCheck, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function InvitationAudit() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [audits, setAudits] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const fetchAudits = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("invitation_audits")
      .select(`
        *,
        professional:profiles!professional_id(full_name)
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!error) setAudits(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAudits();
  }, []);

  const filtered = audits.filter(a => 
    a.code.toLowerCase().includes(search.toLowerCase()) || 
    a.error_type?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-primary" /> Auditoria de Convites
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Monitore falhas de vínculo e redirects em tempo real</p>
          </div>
          <Button variant="outline" onClick={fetchAudits} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por código ou erro..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="pl-10"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Logs Recentes (Últimos 100)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {loading ? (
                <div className="py-20 flex justify-center"><Loader2 className="animate-spin" /></div>
              ) : filtered.length === 0 ? (
                <div className="py-20 text-center text-muted-foreground">Nenhum log encontrado.</div>
              ) : filtered.map(audit => (
                <div key={audit.id} className="p-4 hover:bg-muted/30 transition-colors flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase">{audit.code}</code>
                      <Badge variant="outline" className="text-[10px] uppercase">{audit.stage}</Badge>
                      {audit.status_code && (
                        <Badge variant={audit.status_code >= 400 ? "destructive" : "secondary"} className="text-[10px]">
                          {audit.status_code}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium truncate">
                      Profissional: {audit.professional?.full_name || audit.professional_id || "Não identificado"}
                    </p>
                    {audit.error_type && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {audit.error_type}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground font-mono truncate">
                      {audit.user_agent}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(audit.created_at), "HH:mm:ss", { locale: ptBR })}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(audit.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
