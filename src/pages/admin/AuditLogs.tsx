import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Terminal,
  Clock,
  User,
  Shield,
  FileJson,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const ITEMS_PER_PAGE = 20;

export default function AuditLogs() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", page, search, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*", { count: "exact" });

      if (search) {
        query = query.or(`correlation_id.ilike.%${search}%,user_id.text.ilike.%${search}%,action.ilike.%${search}%`);
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { logs: data, total: count || 0 };
    },
  });

  const totalPages = Math.ceil((data?.total || 0) / ITEMS_PER_PAGE);

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "success":
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">SUCCESS</Badge>;
      case "error":
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">ERROR</Badge>;
      case "blocked":
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">BLOCKED</Badge>;
      default:
        return <Badge variant="outline">{status?.toUpperCase() || "UNKNOWN"}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Terminal className="h-6 w-6 text-primary" />
              Explorer de Auditoria
            </h1>
            <p className="text-muted-foreground text-sm">Rastreabilidade completa de eventos críticos e falhas de sincronização.</p>
          </div>
        </div>

        <Card className="border-border/40 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 pb-4">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Busca Rápida (CID, User, Action)</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Filtrar logs..." 
                    className="pl-9 h-11"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  />
                </div>
              </div>
              <div className="w-full md:w-48 space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</label>
                <select 
                  className="w-full h-11 px-3 rounded-md border border-input bg-background text-sm"
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                >
                  <option value="all">Todos os Status</option>
                  <option value="success">Success</option>
                  <option value="error">Error</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Correlation ID</TableHead>
                  <TableHead>User / Tenant</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="animate-pulse">
                      <TableCell colSpan={6}><div className="h-10 bg-muted/50 rounded" /></TableCell>
                    </TableRow>
                  ))
                ) : data?.logs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      Nenhum log encontrado para os filtros aplicados.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.logs?.map((log) => (
                    <TableRow 
                      key={log.id} 
                      className="cursor-pointer hover:bg-muted/30 group"
                      onClick={() => setSelectedLog(log)}
                    >
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {format(new Date(log.created_at), "dd/MM/yy HH:mm:ss", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-sm text-foreground">{log.action}</span>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-tight">{log.resource_type || "SYSTEM"}</p>
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell>
                        <code className="text-[10px] bg-muted px-2 py-0.5 rounded border border-border/50 group-hover:border-primary/30 transition-colors">
                          {log.correlation_id?.substring(0, 15)}...
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-[10px] flex items-center gap-1 text-muted-foreground">
                            <User className="h-2.5 w-2.5" /> {log.user_id?.substring(0, 8)}...
                          </p>
                          <p className="text-[10px] flex items-center gap-1 text-muted-foreground">
                            <Shield className="h-2.5 w-2.5" /> {log.tenant_id?.substring(0, 8)}...
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <FileJson className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
          <div className="p-4 border-t bg-muted/10 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Exibindo {data?.logs?.length || 0} de {data?.total || 0} logs
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto rounded-[2rem] border shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <terminal className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight">Detalhes do Evento</DialogTitle>
                <DialogDescription>Dados estruturados para análise técnica.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-muted/50 border space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Correlation ID</p>
                  <p className="text-xs font-mono break-all">{selectedLog.correlation_id}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/50 border space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Timestamp</p>
                  <p className="text-xs font-medium">{format(new Date(selectedLog.created_at), "PPPPpppp", { locale: ptBR })}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileJson className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-widest">Metadata Payload</span>
                </div>
                <pre className="bg-slate-950 text-emerald-400 p-6 rounded-2xl text-[11px] font-mono overflow-x-auto border border-white/10 shadow-inner">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex gap-3 items-start">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-amber-800">Dica de Auditoria</p>
                  <p className="text-xs text-amber-700/80 leading-relaxed">
                    Use o Correlation ID para rastrear a timeline completa deste erro no Datadog ou Supabase Logs.
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
