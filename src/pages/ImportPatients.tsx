import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Check, AlertCircle, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface PatientRow {
  name: string;
  email: string;
  active: boolean;
  birthDate: string;
  sex: string;
}

function parseCsv(text: string): PatientRow[] {
  const lines = text.split("\n").filter(l => l.trim());
  // skip sep= line and header
  const dataLines = lines.slice(2);
  return dataLines.map(line => {
    const cols = line.split("|");
    return {
      name: cols[0]?.trim() || "",
      email: cols[1]?.trim() || "",
      active: cols[2]?.trim() === "Sim",
      birthDate: cols[3]?.trim() || "",
      sex: cols[4]?.trim() || "",
    };
  });
}

export default function ImportPatients() {
  const { user } = useAuth();
  const [allPatients, setAllPatients] = useState<PatientRow[]>([]);
  const [activePatients, setActivePatients] = useState<PatientRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/data/Pacientes.csv")
      .then(r => r.text())
      .then(text => {
        const parsed = parseCsv(text);
        setAllPatients(parsed);
        const active = parsed.filter(p => p.active && p.email);
        setActivePatients(active);
        setLoaded(true);
      });
  }, []);

  const handleImport = async () => {
    if (!user || activePatients.length === 0) return;
    setImporting(true);
    setResult(null);

    try {
      const payload = activePatients.map(p => ({
        name: p.name,
        email: p.email,
      }));

      // Send in batches of 20
      const batchSize = 20;
      const totalResults = { created: 0, skipped: 0, errors: [] as string[] };

      for (let i = 0; i < payload.length; i += batchSize) {
        const batch = payload.slice(i, i + batchSize);
        const { data, error } = await supabase.functions.invoke("import-patients", {
          body: { patients: batch },
        });

        if (error) {
          totalResults.errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        } else if (data) {
          totalResults.created += data.created || 0;
          totalResults.skipped += data.skipped || 0;
          if (data.errors?.length) totalResults.errors.push(...data.errors);
        }
      }

      setResult(totalResults);
      toast.success(`${totalResults.created} pacientes importados com sucesso!`);
    } catch (err: any) {
      toast.error(err.message || "Erro na importação");
    } finally {
      setImporting(false);
    }
  };

  const totalActive = allPatients.filter(p => p.active).length;
  const withEmail = activePatients.length;
  const withoutEmail = totalActive - withEmail;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <Upload className="w-8 h-8 text-primary" />
          <div>
            <h1 className="font-display text-2xl font-bold">Importar Pacientes</h1>
            <p className="text-muted-foreground text-sm">Importar pacientes ativos do CSV</p>
          </div>
        </div>

        {loaded && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="glass shadow-card">
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold font-display">{allPatients.length}</p>
                <p className="text-sm text-muted-foreground">Total no CSV</p>
              </CardContent>
            </Card>
            <Card className="glass shadow-card">
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold font-display text-primary">{totalActive}</p>
                <p className="text-sm text-muted-foreground">Ativos</p>
              </CardContent>
            </Card>
            <Card className="glass shadow-card">
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold font-display text-accent">{withEmail}</p>
                <p className="text-sm text-muted-foreground">Com email (importáveis)</p>
              </CardContent>
            </Card>
          </div>
        )}

        {withoutEmail > 0 && (
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="py-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                <strong>{withoutEmail} pacientes ativos</strong> não possuem email e não poderão ser importados.
              </p>
            </CardContent>
          </Card>
        )}

        {!result && (
          <Card className="glass shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Pacientes Ativos com Email ({withEmail})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="max-h-64 overflow-y-auto space-y-1">
                {activePatients.slice(0, 50).map((p, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 text-sm">
                    <span className="font-medium truncate">{p.name}</span>
                    <span className="text-muted-foreground text-xs truncate ml-2">{p.email}</span>
                  </div>
                ))}
                {activePatients.length > 50 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    ...e mais {activePatients.length - 50} pacientes
                  </p>
                )}
              </div>

              <Button
                onClick={handleImport}
                disabled={importing || withEmail === 0}
                className="w-full"
                size="lg"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Importar {withEmail} Pacientes Ativos
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {result && (
          <Card className="glass shadow-card border-primary/30">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2 text-primary">
                <Check className="w-5 h-5" />
                Importação Concluída
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-lg bg-primary/10">
                  <p className="text-2xl font-bold text-primary">{result.created}</p>
                  <p className="text-sm text-muted-foreground">Criados</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{result.skipped}</p>
                  <p className="text-sm text-muted-foreground">Ignorados</p>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="mt-3 p-3 rounded-lg bg-destructive/10 text-sm">
                  <p className="font-medium text-destructive mb-1">Erros ({result.errors.length}):</p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {result.errors.map((e, i) => (
                      <p key={i} className="text-xs text-muted-foreground">{e}</p>
                    ))}
                  </div>
                </div>
              )}
              <Button onClick={() => setResult(null)} variant="outline" className="w-full">
                Voltar
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
