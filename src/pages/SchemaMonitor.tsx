import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, FileJson, AlertTriangle, Search, RefreshCw, Diff, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import snapshotData from "@/integrations/supabase/schema-snapshot.json";
import { toast } from "sonner";

interface Violation {
  file: string;
  table: string;
  column: string;
  severity: "high" | "medium";
}

const CRITICAL_COLUMNS: Record<string, string[]> = {
  nutritionist_patients: ["default_meal_plan_id", "patient_id", "nutritionist_id"],
  meal_plans: ["id", "patient_id", "plan_status"],
  profiles: ["id", "user_id"]
};

const STALE_THRESHOLD_DAYS = 7; // Configurable period

export default function SchemaMonitor() {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  
  const [snapshot, setSnapshot] = useState<any>(snapshotData);
  const [dbSchema, setDbSchema] = useState<any>(null);
  const [search, setSearch] = useState(initialSearch);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(false);

  // Sync search state with URL if needed, but here we just use it as initial value
  useEffect(() => {
    if (initialSearch) setSearch(initialSearch);
  }, [initialSearch]);

  const checkDrift = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("schema-action", {
        body: { 
          action: "get-current-schema", 
          targetTables: Object.keys(snapshot.tables) 
        }
      });
      if (error) throw error;
      setDbSchema(data);
      toast.success("Schema atual do banco carregado com sucesso.");
    } catch (err) {
      console.error(err);
      toast.error("Falha ao buscar schema do banco.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkDrift();
  }, []);

  const regenerateSnapshot = () => {
    if (dbSchema) {
      setSnapshot(dbSchema);
      toast.success("Snapshot atualizado localmente (em memória).", {
        description: "Para tornar permanente, o arquivo JSON no repositório precisa ser atualizado."
      });
    }
  };

  const isStale = useMemo(() => {
    if (!snapshot.generatedAt) return true;
    const genDate = new Date(snapshot.generatedAt);
    const diff = Date.now() - genDate.getTime();
    return diff > STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
  }, [snapshot.generatedAt]);

  const drift = useMemo(() => {
    if (!dbSchema) return null;
    const missing: string[] = [];
    const extra: string[] = [];

    Object.keys(dbSchema.tables).forEach(table => {
      const dbCols = dbSchema.tables[table];
      const snapCols = snapshot.tables[table] || [];
      
      dbCols.forEach((c: string) => {
        if (!snapCols.includes(c)) missing.push(`${table}.${c}`);
      });
      
      snapCols.forEach((c: string) => {
        if (!dbCols.includes(c)) extra.push(`${table}.${c}`);
      });
    });

    return { missing, extra };
  }, [dbSchema, snapshot]);

  useEffect(() => {
    // Basic integrity check for critical columns
    const detected: Violation[] = [];
    Object.entries(CRITICAL_COLUMNS).forEach(([table, cols]) => {
      const existing = snapshot.tables[table] || [];
      cols.forEach(col => {
        if (!existing.includes(col)) {
          detected.push({
            file: "Critical Schema Integrity",
            table,
            column: col,
            severity: "high"
          });
        }
      });
    });
    setViolations(detected);
  }, [snapshot]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Monitor de Schema</h1>
            <p className="text-muted-foreground">Validando integridade entre Banco de Dados e Frontend.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={checkDrift} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Verificar Drift
            </Button>
            <Button onClick={regenerateSnapshot} disabled={!dbSchema || loading}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerar Snapshot
            </Button>
          </div>
        </div>

        {isStale && (
          <Alert variant="destructive">
            <Clock className="h-4 w-4" />
            <AlertTitle>Snapshot Obsoleto (Stale)</AlertTitle>
            <AlertDescription>
              O snapshot atual foi gerado em {new Date(snapshot.generatedAt).toLocaleDateString()}. 
              Ele tem mais de {STALE_THRESHOLD_DAYS} dias e pode não refletir as migrações mais recentes.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileJson className="w-4 h-4 text-blue-500" />
                Data de Geração
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{snapshot.generatedAt?.split("T")[0]}</div>
              <p className="text-xs text-muted-foreground">
                {Object.keys(snapshot.tables).length} tabelas monitoradas
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Quebras em Potencial
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{violations.length}</div>
              <p className="text-xs text-muted-foreground">
                Referências a colunas possivelmente ausentes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Diff className="w-4 h-4 text-purple-500" />
                Drift Detectado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {drift ? drift.missing.length + drift.extra.length : "..."}
              </div>
              <p className="text-xs text-muted-foreground">
                Diferenças entre DB Real vs Snapshot
              </p>
            </CardContent>
          </Card>
        </div>

        {drift && (drift.missing.length > 0 || drift.extra.length > 0) && (
          <Card className="border-purple-200 bg-purple-50/10">
            <CardHeader>
              <CardTitle className="text-purple-700 flex items-center gap-2">
                <Diff className="w-5 h-5" />
                Painel de Diff: Migrations vs Snapshot
              </CardTitle>
              <CardDescription>
                Diferenças encontradas entre o estado atual do Banco de Dados e o arquivo de snapshot.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-sm mb-2 text-green-700">Faltando no Snapshot (Novas no DB):</h4>
                  <ul className="space-y-1">
                    {drift.missing.map(item => (
                      <li key={item} className="text-xs font-mono bg-green-100/50 p-1 rounded border border-green-200 flex justify-between">
                        <span>{item}</span>
                        <Badge variant="outline" className="text-[9px] h-4">Impacto: Baixo</Badge>
                      </li>
                    ))}
                    {drift.missing.length === 0 && <li className="text-xs text-muted-foreground">Nenhuma coluna nova.</li>}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-2 text-destructive">Extra no Snapshot (Removidas do DB):</h4>
                  <ul className="space-y-1">
                    {drift.extra.map(item => {
                      const [table, col] = item.split(".");
                      const isImpacted = CRITICAL_COLUMNS[table]?.includes(col);
                      return (
                        <li key={item} className={`text-xs font-mono p-1 rounded border flex justify-between ${isImpacted ? "bg-destructive/10 border-destructive text-destructive" : "bg-amber-50 border-amber-200"}`}>
                          <span>{item}</span>
                          <Badge variant={isImpacted ? "destructive" : "outline"} className="text-[9px] h-4">
                            {isImpacted ? "Impacto: ALTO" : "Impacto: Médio"}
                          </Badge>
                        </li>
                      );
                    })}
                    {drift.extra.length === 0 && <li className="text-xs text-muted-foreground">Nenhuma coluna removida.</li>}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Alertas de Integridade de Queries
            </CardTitle>
            <CardDescription>
              Arquivos frontend que referenciam colunas não encontradas no último snapshot do banco.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Tabela</TableHead>
                  <TableHead>Coluna Ausente</TableHead>
                  <TableHead>Gravidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {violations.map((v, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{v.file}</TableCell>
                    <TableCell>{v.table}</TableCell>
                    <TableCell className="text-destructive font-semibold">{v.column}</TableCell>
                    <TableCell>
                      <Badge variant={v.severity === "high" ? "destructive" : "outline"}>
                        {v.severity === "high" ? "Crítico" : "Aviso"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {violations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                      Nenhuma violação crítica detectada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Snapshot de Colunas</CardTitle>
            <div className="relative w-72 mt-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Filtrar tabelas..." 
                className="pl-8" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(snapshot.tables)
                .filter(([name, cols]: [string, any]) => name.includes(search) || cols.some((c: string) => c.includes(search)))
                .map(([name, cols]: [string, any]) => (
                <div key={name} className="border rounded-lg p-3 bg-muted/30">
                  <h3 className="font-bold text-sm mb-2 text-primary">{name}</h3>
                  <div className="flex flex-wrap gap-1">
                    {cols.map((c: string) => (
                      <span key={c} className={`text-[10px] px-1.5 py-0.5 border rounded font-mono ${search && c.includes(search) ? "bg-yellow-200 border-yellow-400" : "bg-background"}`}>
                        {c}
                      </span>
                    ))}
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

