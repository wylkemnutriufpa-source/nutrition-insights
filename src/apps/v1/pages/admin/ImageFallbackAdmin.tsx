
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useState, useMemo } from "react";
import { 
  ImageOff, 
  AlertCircle, 
  AlertTriangle, 
  Filter, 
  Copy, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  BarChart3,
  TrendingUp,
  ExternalLink
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";

export default function ImageFallbackAdmin() {
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: fallbacks, isLoading } = useQuery({
    queryKey: ["recipe-image-fallbacks", severityFilter],
    queryFn: async () => {
      let query = supabase
        .from("recipe_image_fallbacks")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (severityFilter !== "all") {
        query = query.eq("severity", severityFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const revalidateMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { data, error } = await supabase.functions.invoke('revalidate-fallbacks', {
        body: { ids }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Revalidação concluída",
        description: `${data.results?.length || 0} imagens processadas.`,
      });
      queryClient.invalidateQueries({ queryKey: ["recipe-image-fallbacks"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro na revalidação",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const chartData = useMemo(() => {
    if (!fallbacks) return [];
    
    const groups: Record<string, { date: string, critical: number, alert: number }> = {};
    
    // Last 14 days
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toLocaleDateString('pt-BR');
      groups[dateStr] = { date: dateStr, critical: 0, alert: 0 };
    }
    
    fallbacks.forEach(item => {
      const date = new Date(item.created_at).toLocaleDateString('pt-BR');
      if (groups[date]) {
        if (item.severity === 'critical') groups[date].critical++;
        else groups[date].alert++;
      }
    });
    
    return Object.values(groups);
  }, [fallbacks]);

  const templateData = useMemo(() => {
    if (!fallbacks) return [];
    const stats: Record<string, { name: string, critical: number, alert: number, total: number }> = {};
    
    fallbacks.forEach(item => {
      const name = item.template_name || "Sem Template";
      if (!stats[name]) stats[name] = { name, critical: 0, alert: 0, total: 0 };
      if (item.severity === 'critical') stats[name].critical++;
      else stats[name].alert++;
      stats[name].total++;
    });
    
    return Object.values(stats)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [fallbacks]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      description: "URL copiada para a área de transferência.",
    });
  };

  const handleRevalidateAll = () => {
    if (!fallbacks || fallbacks.length === 0) return;
    const ids = fallbacks.map(f => f.id);
    revalidateMutation.mutate(ids);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ImageOff className="h-6 w-6 text-primary" />
              Monitor de Fallback de Imagens
            </h1>
            <p className="text-muted-foreground">
              Tendências de falhas, detalhes HTTP e ferramentas de revalidação automática.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar gravidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="critical">Crítico (URL Quebrada)</SelectItem>
                  <SelectItem value="alert">Alerta (URL Ausente)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              variant="default" 
              onClick={handleRevalidateAll}
              disabled={revalidateMutation.isPending || !fallbacks?.length}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${revalidateMutation.isPending ? 'animate-spin' : ''}`} />
              Revalidar Tudo
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Tendência Diária (Últimos 14 dias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <YAxis 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #eee' }}
                    />
                    <Legend iconType="circle" />
                    <Bar dataKey="critical" name="Crítico" fill="#ef4444" radius={[4, 4, 0, 0]} stackId="a" />
                    <Bar dataKey="alert" name="Alerta" fill="#f59e0b" radius={[4, 4, 0, 0]} stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Falhas por Template (Top 8)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={templateData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                    <XAxis type="number" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      width={100}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #eee' }}
                    />
                    <Bar dataKey="total" name="Total de Falhas" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Histórico e Revalidação</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-10 text-muted-foreground">Carregando...</div>
            ) : fallbacks && fallbacks.length > 0 ? (
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Data / Gravidade</TableHead>
                      <TableHead>Receita / Template</TableHead>
                      <TableHead>URL de Origem (Erro)</TableHead>
                      <TableHead>Status HTTP</TableHead>
                      <TableHead>Última Revalidação</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fallbacks.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-xs font-mono">
                              {new Date(item.created_at).toLocaleString("pt-BR", {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                            {item.severity === "critical" ? (
                              <Badge variant="destructive" className="text-[10px] h-4">Crítico</Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-[10px] h-4">Alerta</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[180px]">
                            <div className="font-semibold text-sm truncate" title={item.recipe_name}>
                              {item.recipe_name}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              {item.template_name || "Sem Template"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.original_url ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1 group">
                                <span className="text-[10px] font-mono text-red-500 truncate max-w-[150px]" title={item.original_url}>
                                  {item.original_url}
                                </span>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => copyToClipboard(item.original_url!)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                              <span className="text-[10px] text-muted-foreground italic">
                                {item.error_message || "Erro desconhecido"}
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] text-muted-foreground italic">Origem Ausente</span>
                              <span className="text-[10px] text-amber-600">ID: {item.recipe_id?.slice(0, 8)}...</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.http_status_code ? (
                            <Badge variant="outline" className={`font-mono text-[10px] ${item.http_status_code >= 400 ? 'border-red-200 text-red-600' : 'border-green-200 text-green-600'}`}>
                              {item.http_status_code}
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {item.revalidated_at ? (
                              <>
                                <div className="text-[10px] font-mono">
                                  {new Date(item.revalidated_at).toLocaleString("pt-BR", {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                                {item.revalidated_status === 'ok' ? (
                                  <div className="flex items-center gap-1 text-[10px] text-green-600 font-medium">
                                    <CheckCircle2 className="h-3 w-3" /> Disponível
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-[10px] text-red-600 font-medium">
                                    <XCircle className="h-3 w-3" /> Falhou
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">Não revalidado</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 text-[10px] px-2"
                              onClick={() => revalidateMutation.mutate([item.id])}
                              disabled={revalidateMutation.isPending}
                            >
                              <RefreshCw className={`h-3 w-3 mr-1 ${revalidateMutation.isPending && revalidateMutation.variables?.includes(item.id) ? 'animate-spin' : ''}`} />
                              Revalidar
                            </Button>
                            {item.original_url && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 w-7 p-0"
                                onClick={() => window.open(item.original_url!, '_blank')}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                Nenhum fallback registrado no momento.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
