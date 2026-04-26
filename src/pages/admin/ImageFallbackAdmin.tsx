
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { useState } from "react";
import { ImageOff, AlertCircle, AlertTriangle, Filter } from "lucide-react";

export default function ImageFallbackAdmin() {
  const [severityFilter, setSeverityFilter] = useState<string>("all");

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ImageOff className="h-6 w-6 text-primary" />
              Monitor de Fallback de Imagens
            </h1>
            <p className="text-muted-foreground">
              Rastreamento de receitas com imagens ausentes ou quebradas e fallbacks aplicados.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por gravidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="critical">Crítico (URL Quebrada)</SelectItem>
                <SelectItem value="alert">Alerta (URL Ausente)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Fallbacks</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-10 text-muted-foreground">Carregando...</div>
            ) : fallbacks && fallbacks.length > 0 ? (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Receita</TableHead>
                      <TableHead>Template / Refeição</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Gravidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fallbacks.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-xs font-mono">
                          {new Date(item.created_at).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell className="font-medium">{item.recipe_name}</TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <span className="font-semibold">{item.template_name || "N/A"}</span>
                            <br />
                            <span className="text-muted-foreground">{item.meal_name || "N/A"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.original_url ? (
                            <span className="text-xs text-red-500 truncate max-w-[200px] block" title={item.original_url}>
                              {item.original_url}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Ausente</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            Fallback Aplicado
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.severity === "critical" ? (
                            <div className="flex items-center gap-1 text-red-600 font-semibold text-xs">
                              <AlertCircle className="h-3 w-3" /> Crítico
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-amber-600 font-semibold text-xs">
                              <AlertTriangle className="h-3 w-3" /> Alerta
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                Nenhum fallback registrado.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
