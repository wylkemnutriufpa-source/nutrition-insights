import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Search, Clock, User, Activity } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AuditLogs() {
  const [search, setSearch] = useState("");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-logs", search],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (search) {
        query = query.or(`action.ilike.%${search}%,resource_type.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const actionColor = (action: string) => {
    if (action.includes("delete")) return "text-destructive";
    if (action.includes("create") || action.includes("insert")) return "text-green-500";
    if (action.includes("update")) return "text-blue-500";
    if (action.includes("login")) return "text-primary";
    return "text-muted-foreground";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Audit Logs</h1>
            <p className="text-sm text-muted-foreground">Registro de ações para conformidade LGPD</p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ação ou recurso..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[60vh]">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !logs?.length ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Nenhum log encontrado</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {logs.map((log: any) => (
                    <div
                      key={log.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-sm"
                    >
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono text-xs font-semibold ${actionColor(log.action)}`}>
                            {log.action}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span className="text-xs text-muted-foreground truncate">
                            {log.resource_type}
                            {log.resource_id && ` #${log.resource_id.slice(0, 8)}`}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground/60 font-mono truncate">
                          {log.user_id?.slice(0, 8)}...
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Clock className="w-3 h-3" />
                        {format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
