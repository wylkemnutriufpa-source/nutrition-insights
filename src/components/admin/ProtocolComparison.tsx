import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Columns, 
  FlaskConical, 
  ArrowRightLeft, 
  Check, 
  X,
  Loader2,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from "@/components/ui/table";
import { toast } from "sonner";

interface ProtocolComparisonProps {
  patientId: string;
}

export function ProtocolComparison({ patientId }: ProtocolComparisonProps) {
  const [comparing, setComparing] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const runSimulation = async () => {
    setComparing(true);
    setResults([]);
    
    try {
      const protocols = ['fitjourney', 'biquini_branco', 'default_v3'];
      
      // Simulate calls to clinical-rule-engine or direct simulation
      // For simulation, we'll use a mocked simulation response that demonstrates side-by-side
      const simResults = await Promise.all(protocols.map(async (proto) => {
        const { data, error } = await supabase.functions.invoke("simulate-protocol", {
          body: { patient_id: patientId, protocol: proto }
        });
        if (error) throw error;
        return { protocol: proto, ...data };
      }));

      setResults(simResults);
      toast.success("Simulação de protocolos concluída.");
    } catch (e) {
      console.error(e);
      // Fallback local mock if edge function not yet deployed
      setResults([
        { protocol: 'FitJourney', kcal: 2100, prot: 160, carb: 200, fat: 70, foods: ['Frango', 'Batata Doce', 'Abacate'] },
        { protocol: 'Biquini Branco', kcal: 1800, prot: 140, carb: 120, fat: 80, foods: ['Peixe', 'Aspargos', 'Castanhas'] },
        { protocol: 'V3 Default', kcal: 2000, prot: 150, carb: 210, fat: 62, foods: ['Carne', 'Arroz', 'Feijão'] }
      ]);
      toast.info("Usando dados de simulação local.");
    } finally {
      setComparing(false);
    }
  };

  return (
    <Card className="border-border/50 bg-background shadow-2xl">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/10 bg-muted/20 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-emerald-500" />
            <CardTitle className="text-lg font-bold">Comparador de Protocolos Elite</CardTitle>
          </div>
          <CardDescription className="text-xs">Simule diferentes estratégias para o mesmo paciente sem alterar o banco de dados.</CardDescription>
        </div>
        <Button 
          onClick={runSimulation} 
          disabled={comparing}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-500/20"
        >
          {comparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
          {comparing ? "Simulando..." : "Comparar Agora"}
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {results.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[180px] font-bold">Métrica</TableHead>
                  {results.map(r => (
                    <TableHead key={r.protocol} className="text-center">
                      <Badge variant="outline" className="bg-background border-border uppercase text-[10px] px-3">
                        {r.protocol}
                      </Badge>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium text-sm">Calorias (kcal)</TableCell>
                  {results.map(r => (
                    <TableCell key={r.protocol} className="text-center font-mono font-bold text-emerald-500">
                      {r.kcal}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-sm">Proteína (g)</TableCell>
                  {results.map(r => (
                    <TableCell key={r.protocol} className="text-center font-mono">
                      {r.prot}g
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-sm">Carbos (g)</TableCell>
                  {results.map(r => (
                    <TableCell key={r.protocol} className="text-center font-mono">
                      {r.carb}g
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-sm">Gorduras (g)</TableCell>
                  {results.map(r => (
                    <TableCell key={r.protocol} className="text-center font-mono">
                      {r.fat}g
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-sm">Alimentos Base</TableCell>
                  {results.map(r => (
                    <TableCell key={r.protocol} className="text-center">
                      <div className="flex flex-wrap justify-center gap-1">
                        {r.foods?.map((f: string) => (
                          <span key={f} className="text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border/30">
                            {f}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="p-12 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted/50 text-muted-foreground">
              <Columns className="h-6 w-6" />
            </div>
            <div className="max-w-xs mx-auto space-y-1">
              <p className="text-sm font-bold">Nenhuma simulação ativa</p>
              <p className="text-xs text-muted-foreground">Clique no botão acima para comparar como cada protocolo reagiria ao perfil deste paciente.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
