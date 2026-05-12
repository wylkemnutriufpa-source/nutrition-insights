import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Search, Clock, User, Activity, LogIn, LogOut, UserPlus, UserX, RefreshCw, FileText, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";

const ACTION_META: Record<string, { label: string; icon: typeof Activity; color: string }> = {
  login: { label: "Login", icon: LogIn, color: "text-primary" },
  logout: { label: "Logout", icon: LogOut, color: "text-muted-foreground" },
  create_patient: { label: "Paciente criado", icon: UserPlus, color: "text-success" },
  toggle_patient_status: { label: "Status alterado", icon: RefreshCw, color: "text-warning" },
  update: { label: "Atualização", icon: FileText, color: "text-info" },
  delete: { label: "Exclusão", icon: Trash2, color: "text-destructive" },
  create: { label: "Criação", icon: UserPlus, color: "text-success" },
};

function getActionMeta(action: string) {
  if (ACTION_META[action]) return ACTION_META[action];
  if (action.includes("delete")) return { label: action, icon: Trash2, color: "text-destructive" };
  if (action.includes("create") || action.includes("insert")) return { label: action, icon: UserPlus, color: "text-success" };
  if (action.includes("update")) return { label: action, icon: RefreshCw, color: "text-info" };
  if (action.includes("login")) return { label: action, icon: LogIn, color: "text-primary" };
  return { label: action, icon: Activity, color: "text-muted-foreground" };
}

export default function AuditLogs() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [resourceFilter, setResourceFilter] = useState("all");

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  // Resolve unique user_ids to names
  const userIds = useMemo(() => [...new Set((logs || []).map(l => l.user_id))], [logs]);

  const { data: profileMap } = useQuery({
    queryKey: ["audit-profiles", userIds],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      const map: Record<string, string> = {};
      (data || []).forEach(p => { map[p.user_id] = p.full_name || "Sem nome"; });
      return map;
    },
  });

  const uniqueActions = useMemo(() => [...new Set((logs || []).map(l => l.action))].sort(), [logs]);
  const uniqueResources = useMemo(() => [...new Set((logs || []).map(l => l.resource_type))].sort(), [logs]);

  const filtered = useMemo(() => {
    if (!logs) return [];
    return logs.filter(log => {
      if (actionFilter !== "all" && log.action !== actionFilter) return false;
      if (resourceFilter !== "all" && log.resource_type !== resourceFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const userName = profileMap?.[log.user_id] || "";
        return (
          log.action.toLowerCase().includes(s) ||
          log.resource_type.toLowerCase().includes(s) ||
          userName.toLowerCase().includes(s) ||
          (log.resource_id || "").toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [logs, search, actionFilter, resourceFilter, profileMap]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display">Logs de Auditoria</h1>
              <p className="text-sm text-muted-foreground">
                {filtered.length} registro{filtered.length !== 1 ? "s" : ""} · Conformidade LGPD
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: logs?.length || 0, color: "text-primary" },
            { label: "Logins", value: logs?.filter(l => l.action === "login").length || 0, color: "text-success" },
            { label: "Alterações", value: logs?.filter(l => l.action.includes("update") || l.action.includes("toggle")).length || 0, color: "text-warning" },
            { label: "Exclusões", value: logs?.filter(l => l.action.includes("delete")).length || 0, color: "text-destructive" },
          ].map(s => (
            <Card key={s.label} className="glass-premium">
              <CardContent className="py-3 px-4 text-center">
                <p className={`text-2xl font-bold font-display ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ação, recurso ou usuário..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  {uniqueActions.map(a => (
                    <SelectItem key={a} value={a}>{getActionMeta(a).label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={resourceFilter} onValueChange={setResourceFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Recurso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os recursos</SelectItem>
                  {uniqueResources.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[60vh]">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !filtered.length ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Nenhum log encontrado</p>
                  <p className="text-xs mt-1">Os logs serão registrados automaticamente conforme ações são realizadas</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filtered.map((log: any) => {
                    const meta = getActionMeta(log.action);
                    const ActionIcon = meta.icon;
                    const userName = profileMap?.[log.user_id] || log.user_id?.slice(0, 8) + "...";
                    const metadataEntries = log.metadata && typeof log.metadata === "object" ? Object.entries(log.metadata) : [];

                    return (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-sm border border-transparent hover:border-border"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          meta.color.replace("text-", "bg-") + "/10"
                        }`}>
                          <ActionIcon className={`w-3.5 h-3.5 ${meta.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-semibold text-xs ${meta.color}`}>
                              {meta.label}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {log.resource_type}
                            </Badge>
                            {log.resource_id && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                #{log.resource_id.slice(0, 8)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <User className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{userName}</span>
                          </div>
                          {metadataEntries.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {metadataEntries.slice(0, 4).map(([k, v]) => (
                                <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                                  {k}: {String(v).slice(0, 30)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                          <Clock className="w-3 h-3" />
                          {format(new Date(log.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
