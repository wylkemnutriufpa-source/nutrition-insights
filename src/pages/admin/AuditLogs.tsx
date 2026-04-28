import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useSearchParams } from "react-router-dom";
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
  User,
  Shield,
  FileJson,
  Download,
  Link as LinkIcon,
  RefreshCcw,
  AlertTriangle,
  History,
  Activity,
  Layers,
  SearchCode
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
import { AuditTimeline } from "@/components/admin/AuditTimeline";
import { toast } from "sonner";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 20;

export default function AuditLogs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Sync state with URL params
  const page = parseInt(searchParams.get("page") || "1");
  const search = searchParams.get("search") || "";
  const statusFilter = searchParams.get("status") || "all";
  const cidFilter = searchParams.get("cid") || "";

  const updateParam = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== "all") {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    // Reset page on search/filter change
    if (key !== "page") newParams.set("page", "1");
    setSearchParams(newParams);
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["audit-logs", page, search, statusFilter, cidFilter],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*", { count: "exact" });

      if (cidFilter) {
        query = query.eq("correlation_id", cidFilter);
      } else if (search) {
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
    // Keep data while fetching new page for smoother transition
    placeholderData: (previousData) => previousData,
  });

  const totalPages = Math.ceil((data?.total || 0) / ITEMS_PER_PAGE);

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "success":
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold">SUCCESS</Badge>;
      case "error":
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20 font-bold">ERROR</Badge>;
      case "blocked":
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-bold">BLOCKED</Badge>;
      default:
        return <Badge variant="outline">{status?.toUpperCase() || "UNKNOWN"}</Badge>;
    }
  };

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      toast.info("Gerando arquivo CSV...");
      
      const { data: { session } } = await supabase.auth.getSession();
      
      const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audit-export`);
      if (search) url.searchParams.set('search', search);
      if (statusFilter !== 'all') url.searchParams.set('status', statusFilter);
      if (cidFilter) url.searchParams.set('search', cidFilter); // Using search for CID in function logic or cid specifically

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (!response.ok) throw new Error("Erro ao gerar exportação");

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `audit_logs_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success("Download iniciado com sucesso");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Terminal className="h-6 w-6 text-primary" />
              Auditoria Enterprise
            </h1>
            <p className="text-muted-foreground text-sm">Rastreabilidade v5.0 — Timeline visual e correlação hierárquica.</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 border-primary/20 hover:bg-primary/5"
              onClick={handleExportCSV}
              disabled={isExporting}
            >
              <Download className={cn("h-4 w-4", isExporting && "animate-bounce")} />
              {isExporting ? "Gerando..." : "Exportar CSV"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
              <RefreshCcw className="h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="md:col-span-3 border-border/40 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Busca CID (Exato)</label>
                  <div className="relative">
                    <SearchCode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                    <Input 
                      placeholder="Buscar por Correlation ID..." 
                      className="pl-9 h-11 border-primary/20 focus-visible:ring-primary"
                      value={cidFilter}
                      onChange={(e) => updateParam("cid", e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && refetch()}
                    />
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Filtro Amplo (Ação, User)</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Filtrar por ação ou ID..." 
                      className="pl-9 h-11"
                      value={search}
                      onChange={(e) => updateParam("search", e.target.value)}
                    />
                  </div>
                </div>
                <div className="w-full md:w-40 space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</label>
                  <select 
                    className="w-full h-11 px-3 rounded-md border border-input bg-background text-sm"
                    value={statusFilter}
                    onChange={(e) => updateParam("status", e.target.value)}
                  >
                    <option value="all">Todos</option>
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
                  <TableRow className="bg-muted/20 hover:bg-muted/20 border-b">
                    <TableHead className="w-[140px]">Timestamp</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Correlação</TableHead>
                    <TableHead>Contexto</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i} className="animate-pulse">
                        <TableCell colSpan={6}><div className="h-12 bg-muted/50 rounded-lg mx-2 my-1" /></TableCell>
                      </TableRow>
                    ))
                  ) : data?.logs?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center">
                        <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                          <History className="h-10 w-10 opacity-20" />
                          <p>Nenhum registro encontrado.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.logs?.map((log) => (
                      <TableRow 
                        key={log.id} 
                        className="cursor-pointer hover:bg-muted/30 group border-b last:border-0"
                        onClick={() => setSelectedLog(log)}
                      >
                        <TableCell className="text-[10px] font-mono text-muted-foreground">
                          {format(new Date(log.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-foreground">{log.action}</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-tight">{log.resource_type || "SYSTEM"}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-[9px] h-4 bg-blue-500/5 text-blue-600 border-blue-500/20 gap-1 w-fit">
                                    <Layers className="h-2 w-2" /> SESSION
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>ID de Sessão (Pai)</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <code className="text-[10px] font-mono text-muted-foreground truncate max-w-[120px]">
                              {log.correlation_id}
                            </code>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5 text-[10px] text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <User className="h-3 w-3" /> {log.user_id?.substring(0, 8)}...
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Shield className="h-3 w-3" /> {log.tenant_id?.substring(0, 8)}...
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all">
                            <FileJson className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <div className="p-4 border-t bg-muted/10 flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">
                Página <span className="text-foreground">{page}</span> de <span className="text-foreground">{totalPages || 1}</span> ({data?.total || 0} registros)
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 gap-2"
                  onClick={() => updateParam("page", String(page - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-8 gap-2"
                  onClick={() => updateParam("page", String(page + 1))}
                  disabled={page === totalPages || totalPages === 0}
                >
                  Próximo <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>

          <Card className="hidden md:block border-border/40 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Insights Rápidos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Erros Recentes (24h)</p>
                <p className="text-2xl font-black">{data?.logs?.filter(l => l.status === 'error').length || 0}</p>
              </div>
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Bloqueios de Segurança</p>
                <p className="text-2xl font-black">{data?.logs?.filter(l => l.status === 'blocked').length || 0}</p>
              </div>
              <div className="text-[11px] text-muted-foreground leading-relaxed italic border-t pt-4">
                "O correlationId permite rastrear a jornada completa do usuário através dos serviços do FitJourney."
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto rounded-[2rem] border-0 shadow-2xl p-0">
          <div className="p-8 space-y-8">
            <DialogHeader>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Terminal className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-bold tracking-tight">Investigação de Incidente</DialogTitle>
                    <DialogDescription className="text-sm">Análise cronológica de eventos correlacionados.</DialogDescription>
                  </div>
                </div>
                {selectedLog && getStatusBadge(selectedLog.status)}
              </div>
            </DialogHeader>

            {selectedLog && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
                {/* Timeline Column */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-6">
                    <History className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-widest">Timeline de Correlação</span>
                  </div>
                  <div className="p-6 rounded-[2rem] bg-muted/30 border shadow-inner max-h-[500px] overflow-y-auto">
                    <AuditTimeline correlationId={selectedLog.correlation_id} />
                  </div>
                </div>

                {/* Details Column */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <FileJson className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-widest">Metadados & Payload</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-muted/50 border space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Correlation ID</p>
                      <p className="text-xs font-mono truncate">{selectedLog.correlation_id}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-muted/50 border space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Recurso</p>
                      <p className="text-xs font-medium uppercase">{selectedLog.resource_type || "N/A"}</p>
                    </div>
                  </div>

                  <pre className="bg-slate-950 text-emerald-400 p-6 rounded-[1.5rem] text-[11px] font-mono overflow-x-auto border border-white/10 shadow-2xl max-h-[300px]">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>

                  <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex gap-3 items-start">
                    <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-amber-800">Protocolo de Investigação</p>
                      <p className="text-xs text-amber-700/80 leading-relaxed">
                        Este CID foi gerado na camada de transporte. Se houver falha de sincronização, verifique o `parent_correlation_id` para encontrar o início da sessão.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
