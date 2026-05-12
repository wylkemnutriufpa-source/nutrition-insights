
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  UserCircle, 
  ChevronRight, 
  Search,
  Filter,
  MoreVertical,
  ExternalLink,
  MessageSquare,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface ErrorIncident {
  id: string;
  fingerprint: string;
  message: string;
  category: string;
  route: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  status: 'new' | 'investigating' | 'resolved' | 'ignored';
  assigned_to: string | null;
  action_taken: string | null;
  event_count: number;
  first_occurrence: string;
  last_occurrence: string;
  impact_score: number;
}

const priorityConfig = {
  P0: { label: "Crítico", color: "bg-red-500 text-white animate-pulse" },
  P1: { label: "Alto", color: "bg-orange-500 text-white" },
  P2: { label: "Médio", color: "bg-yellow-500 text-black" },
  P3: { label: "Baixo", color: "bg-blue-500 text-white" },
};

const statusConfig = {
  new: { label: "Novo", color: "bg-zinc-800 text-zinc-400", icon: AlertCircle },
  investigating: { label: "Em Análise", color: "bg-blue-500/20 text-blue-400", icon: Clock },
  resolved: { label: "Resolvido", color: "bg-green-500/20 text-green-400", icon: CheckCircle2 },
  ignored: { label: "Ignorado", color: "bg-zinc-800 text-zinc-600", icon: ShieldAlert },
};

export function IncidentManager() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("");

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ["error-incidents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("error_incidents")
        .select("*")
        .order("priority", { ascending: true })
        .order("last_occurrence", { ascending: false });
      
      if (error) throw error;
      return data as ErrorIncident[];
    },
    refetchInterval: 10000,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, action }: { id: string; status: string; action?: string }) => {
      const { error } = await supabase
        .from("error_incidents")
        .update({ 
          status, 
          action_taken: action || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["error-incidents"] });
      toast.success("Incidente atualizado");
    },
  });

  const filteredIncidents = incidents.filter(i => 
    i.message.toLowerCase().includes(filter.toLowerCase()) ||
    i.route.toLowerCase().includes(filter.toLowerCase()) ||
    i.category.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-zinc-800/50">
        <div>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Governança de Incidentes
          </CardTitle>
          <p className="text-xs text-zinc-500">Gestão do ciclo de vida de erros em produção</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
            <Input 
              placeholder="Buscar erro ou rota..." 
              className="pl-9 bg-zinc-950 border-zinc-800 h-9 w-64 text-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" className="h-9 w-9 border-zinc-800">
            <Filter className="h-4 w-4 text-zinc-500" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[600px]">
          {isLoading ? (
            <div className="p-12 text-center text-zinc-500">Carregando governança...</div>
          ) : filteredIncidents.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500/20 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm">Nenhum incidente ativo</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {filteredIncidents.map((incident) => {
                const priority = priorityConfig[incident.priority];
                const status = statusConfig[incident.status];
                const StatusIcon = status.icon;

                return (
                  <div key={incident.id} className="p-4 hover:bg-zinc-800/30 transition-all group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className={`${priority.color} text-[10px] px-1.5 py-0 border-none font-bold uppercase`}>
                            {priority.label}
                          </Badge>
                          <Badge variant="outline" className={`${status.color} text-[10px] px-1.5 py-0 border-zinc-800`}>
                            <StatusIcon className="h-2.5 w-2.5 mr-1" />
                            {status.label}
                          </Badge>
                          <span className="text-[10px] text-zinc-600 font-mono">
                            {incident.event_count} ocorrências
                          </span>
                        </div>
                        
                        <h4 className="text-sm font-semibold text-zinc-100 leading-tight">
                          {incident.message}
                        </h4>

                        <div className="flex items-center gap-4 text-[10px] text-zinc-500 font-medium">
                          <span className="flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />
                            {incident.route || 'global'}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {incident.category}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Última: {new Date(incident.last_occurrence).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {incident.action_taken && (
                          <div className="bg-zinc-950/50 p-2 rounded border border-zinc-800/30 text-[10px] text-zinc-400 mt-2">
                            <span className="font-bold text-zinc-500 uppercase mr-1">Ação:</span>
                            {incident.action_taken}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-300">
                            <DropdownMenuItem onClick={() => updateStatus.mutate({ id: incident.id, status: 'investigating' })}>
                              <Clock className="h-4 w-4 mr-2" /> Analisar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatus.mutate({ id: incident.id, status: 'resolved', action: 'Bug fix aplicado' })}>
                              <CheckCircle2 className="h-4 w-4 mr-2" /> Resolver
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatus.mutate({ id: incident.id, status: 'ignored' })}>
                              <ShieldAlert className="h-4 w-4 mr-2" /> Ignorar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-primary font-bold">
                              <UserCircle className="h-4 w-4 mr-2" /> Atribuir a mim
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-zinc-600 uppercase font-bold tracking-tighter">Impacto</span>
                          <span className={`text-sm font-black ${incident.impact_score > 50 ? 'text-red-500' : 'text-zinc-400'}`}>
                            {incident.impact_score}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
