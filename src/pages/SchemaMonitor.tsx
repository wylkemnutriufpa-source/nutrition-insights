import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, FileJson, AlertTriangle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import snapshotData from "../../scripts/schema-snapshot.json";

interface Violation {
  file: string;
  table: string;
  column: string;
  severity: "high" | "medium";
}

export default function SchemaMonitor() {
  const [snapshot] = useState<any>(snapshotData);
  const [search, setSearch] = useState("");
  const [violations] = useState<Violation[]>([]); // Mocked violations removed as requested

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Monitor de Schema</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileJson className="w-4 h-4 text-blue-500" />
                Snapshot Atual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{snapshot.generatedAt}</div>
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
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Status do Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Ativo</div>
              <p className="text-xs text-muted-foreground">
                Check de schema integrado no build
              </p>
            </CardContent>
          </Card>
        </div>

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
                .filter(([name]) => name.includes(search))
                .map(([name, cols]: [string, any]) => (
                <div key={name} className="border rounded-lg p-3 bg-muted/30">
                  <h3 className="font-bold text-sm mb-2 text-primary">{name}</h3>
                  <div className="flex flex-wrap gap-1">
                    {cols.map((c: string) => (
                      <span key={c} className="text-[10px] px-1.5 py-0.5 bg-background border rounded font-mono">
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
