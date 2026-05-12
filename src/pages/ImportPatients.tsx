import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Check, AlertCircle, Users, Loader2, Search, Filter, UserX, Mail, MailX } from "lucide-react";
import { toast } from "sonner";

interface PatientRow {
  name: string;
  email: string;
  active: boolean;
  birthDate: string;
  sex: string;
}

function parseCsv(text: string): PatientRow[] {
  const lines = text.split("\n").filter(l => l.trim());
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

type FilterType = "all" | "importable" | "no_email" | "inactive" | "no_name";

const filterOptions: { key: FilterType; label: string; icon: typeof Users }[] = [
  { key: "all", label: "Todos", icon: Users },
  { key: "importable", label: "Importáveis", icon: Mail },
  { key: "no_email", label: "Sem Email", icon: MailX },
  { key: "inactive", label: "Inativos", icon: UserX },
  { key: "no_name", label: "Sem Nome", icon: AlertCircle },
];

export default function ImportPatients() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [allPatients, setAllPatients] = useState<PatientRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number; created: number; errors: number } | null>(null);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [tab, setTab] = useState("import");
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [alreadyImported, setAlreadyImported] = useState<Set<string>>(new Set());
  const [checking, setChecking] = useState(false);

  // Load CSV and check which emails are already imported
  useEffect(() => {
    fetch("/data/Pacientes.csv")
      .then(r => r.text())
      .then(async (text) => {
        const parsed = parseCsv(text);
        setAllPatients(parsed);
        setLoaded(true);

        // Check which emails already exist
        const emails = parsed.filter(p => p.email).map(p => p.email.toLowerCase());
        if (emails.length > 0 && user) {
          setChecking(true);
          try {
            const { data, error: checkError } = await supabase.functions.invoke("import-patients", {
              body: { mode: "check", emails },
            });
            if (checkError) throw checkError;
            if (data?.existing) {
              const linkedEmails = new Set<string>(
                data.existing.filter((e: any) => e.already_linked).map((e: any) => e.email)
              );
              setAlreadyImported(linkedEmails);

              // Pre-select only NOT yet imported patients
              const importableIndices = new Set<number>();
              parsed.forEach((p, i) => {
                if (p.active && p.email && !linkedEmails.has(p.email.toLowerCase())) {
                  importableIndices.add(i);
                }
              });
              setSelectedIndices(importableIndices);
            }
          } catch (e) {
            console.error("Check failed:", e);
            // Fallback: select all importable
            const importableIndices = new Set<number>();
            parsed.forEach((p, i) => { if (p.active && p.email) importableIndices.add(i); });
            setSelectedIndices(importableIndices);
          }
          setChecking(false);
        } else {
          const importableIndices = new Set<number>();
          parsed.forEach((p, i) => { if (p.active && p.email) importableIndices.add(i); });
          setSelectedIndices(importableIndices);
        }
      });
  }, [user]);
  const activePatients = useMemo(() => allPatients.filter(p => p.active && p.email), [allPatients]);
  const notYetImported = useMemo(() => activePatients.filter(p => !alreadyImported.has(p.email.toLowerCase())), [activePatients, alreadyImported]);
  const alreadyImportedCount = useMemo(() => activePatients.filter(p => alreadyImported.has(p.email.toLowerCase())).length, [activePatients, alreadyImported]);
  const totalActive = allPatients.filter(p => p.active).length;
  const withEmail = activePatients.length;
  const withoutEmail = allPatients.filter(p => p.active && !p.email).length;
  const inactiveCount = allPatients.filter(p => !p.active).length;
  const noNameCount = allPatients.filter(p => !p.name.trim()).length;

  // Filtered list for the "Filtrar" tab
  const filteredPatients = useMemo(() => {
    let list = allPatients;

    // Apply category filter
    switch (filterType) {
      case "importable":
        list = list.filter(p => p.active && p.email);
        break;
      case "no_email":
        list = list.filter(p => !p.email);
        break;
      case "inactive":
        list = list.filter(p => !p.active);
        break;
      case "no_name":
        list = list.filter(p => !p.name.trim());
        break;
    }

    // Apply search
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.birthDate.includes(q)
      );
    }

    return list;
  }, [allPatients, filterType, search]);

  const filterCounts: Record<FilterType, number> = {
    all: allPatients.length,
    importable: withEmail,
    no_email: allPatients.filter(p => !p.email).length,
    inactive: inactiveCount,
    no_name: noNameCount,
  };

  const togglePatient = (idx: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIndices.size === activePatients.length) {
      setSelectedIndices(new Set());
    } else {
      const all = new Set<number>();
      allPatients.forEach((p, i) => { if (p.active && p.email) all.add(i); });
      setSelectedIndices(all);
    }
  };

  // Select/deselect all importable patients within the current filtered view
  const toggleAllFiltered = () => {
    const importableFiltered = filteredPatients.filter(p => p.email && p.name.trim());
    const importableFilteredIndices = importableFiltered.map(p => allPatients.indexOf(p));
    const allSelected = importableFilteredIndices.every(i => selectedIndices.has(i));

    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (allSelected) {
        importableFilteredIndices.forEach(i => next.delete(i));
      } else {
        importableFilteredIndices.forEach(i => next.add(i));
      }
      return next;
    });
  };

  const selectedPatients = allPatients.filter((p, i) => selectedIndices.has(i) && p.email && p.name.trim());

  const filteredImportableCount = filteredPatients.filter(p => p.email && p.name.trim()).length;
  const filteredSelectedCount = filteredPatients.filter(p => {
    const idx = allPatients.indexOf(p);
    return selectedIndices.has(idx) && p.email && p.name.trim();
  }).length;

  const handleImport = async () => {
    if (!user || selectedPatients.length === 0) return;
    setImporting(true);
    setResult(null);
    setImportProgress({ current: 0, total: selectedPatients.length, created: 0, errors: 0 });

    try {
      const payload = selectedPatients.map(p => ({
        name: p.name,
        email: p.email,
      }));

      const batchSize = 10;
      const totalResults = { created: 0, skipped: 0, errors: [] as string[] };
      let processed = 0;

      for (let i = 0; i < payload.length; i += batchSize) {
        const batch = payload.slice(i, i + batchSize);
        
        // Retry up to 2 times per batch
        let attempts = 0;
        let success = false;
        while (attempts < 2 && !success) {
          attempts++;
          try {
            const { data, error } = await supabase.functions.invoke("import-patients", {
              body: { patients: batch },
            });

            if (error) {
              if (attempts >= 2) {
                totalResults.errors.push(`Lote ${Math.floor(i / batchSize) + 1}: ${error.message}`);
              }
              continue;
            }

            if (data) {
              totalResults.created += data.created || 0;
              totalResults.skipped += data.skipped || 0;
              if (data.errors?.length) totalResults.errors.push(...data.errors);
            }
            success = true;
          } catch (e: any) {
            if (attempts >= 2) {
              totalResults.errors.push(`Lote ${Math.floor(i / batchSize) + 1}: ${e.message}`);
            }
          }
        }

        processed += batch.length;
        setImportProgress({
          current: processed,
          total: payload.length,
          created: totalResults.created,
          errors: totalResults.errors.length,
        });

        // Small delay between batches to avoid throttling
        if (i + batchSize < payload.length) {
          await new Promise(r => setTimeout(r, 500));
        }
      }

      setResult(totalResults);
      
      if (totalResults.created > 0) {
        toast.success(`${totalResults.created} pacientes importados com sucesso!`);
        // Invalidate patients cache so they show immediately
        queryClient.invalidateQueries({ queryKey: ["patients"] });
        // Re-check which emails are now imported
        const emails = allPatients.filter(p => p.email).map(p => p.email.toLowerCase());
        try {
          const { data } = await supabase.functions.invoke("import-patients", {
            body: { mode: "check", emails },
          });
          if (data?.existing) {
            const linkedEmails = new Set<string>(
              data.existing.filter((e: any) => e.already_linked).map((e: any) => e.email)
            );
            setAlreadyImported(linkedEmails);
            setSelectedIndices(new Set());
          }
        } catch {}
      } else {
        toast.info("Nenhum paciente novo importado");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro na importação");
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  };

  const getMissingBadges = (p: PatientRow) => {
    const badges: { label: string; variant: "destructive" | "secondary" | "outline" }[] = [];
    if (!p.email) badges.push({ label: "Sem email", variant: "destructive" });
    if (!p.name.trim()) badges.push({ label: "Sem nome", variant: "destructive" });
    if (!p.active) badges.push({ label: "Inativo", variant: "secondary" });
    if (!p.birthDate) badges.push({ label: "Sem nascimento", variant: "outline" });
    if (!p.sex) badges.push({ label: "Sem sexo", variant: "outline" });
    return badges;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <Upload className="w-8 h-8 text-primary" />
          <div>
            <h1 className="font-display text-2xl font-bold">Importar Pacientes</h1>
            <p className="text-muted-foreground text-sm">Importar e filtrar pacientes do CSV</p>
          </div>
        </div>

        {/* Stats */}
        {loaded && (
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            {[
              { label: "Total CSV", value: allPatients.length, color: "" },
              { label: "Ativos", value: totalActive, color: "text-primary" },
              { label: "Com Email", value: withEmail, color: "text-accent" },
              { label: "Já Importados", value: alreadyImportedCount, color: "text-success" },
              { label: "Faltam", value: notYetImported.length, color: "text-warning" },
              { label: "Sem Email", value: allPatients.filter(p => !p.email).length, color: "text-destructive" },
            ].map((s) => (
              <Card key={s.label} className="glass shadow-card">
                <CardContent className="py-3 text-center">
                  <p className={`text-xl font-bold font-display ${s.color}`}>{s.value}</p>
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {checking && (
          <Card className="glass shadow-card border-primary/30">
            <CardContent className="py-4 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Verificando quais pacientes já foram importados...</p>
            </CardContent>
          </Card>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full max-w-md">
            <TabsTrigger value="import" className="gap-1.5 flex-1">
              <Upload className="w-4 h-4" /> Importar
            </TabsTrigger>
             <TabsTrigger value="filter" className="gap-1.5 flex-1">
               <Filter className="w-4 h-4" /> Filtrar Dados
               {(allPatients.filter(p => !p.email).length > 0) && (
                 <span className="ml-1 text-[10px] px-1.5 py-0 rounded-full bg-destructive text-destructive-foreground font-medium">
                   {allPatients.filter(p => !p.email).length}
                 </span>
               )}
             </TabsTrigger>
          </TabsList>

          {/* ─── TAB: Import ─── */}
          <TabsContent value="import" className="space-y-4 mt-4">
            {withoutEmail > 0 && (
              <Card className="border-warning/30 bg-warning/5">
                <CardContent className="py-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      <strong>{withoutEmail} pacientes ativos</strong> não possuem email e não poderão ser importados.
                    </p>
                    <button
                      onClick={() => { setTab("filter"); setFilterType("no_email"); }}
                      className="text-xs text-primary hover:underline mt-1"
                    >
                      Ver pacientes sem email →
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}

            {!result && (
              <Card className="glass shadow-card">
                <CardHeader>
                  <CardTitle className="font-display text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Faltam Importar ({notYetImported.length})
                    </span>
                    {notYetImported.length > 0 && (
                      <button
                        onClick={toggleAll}
                        className="text-xs text-primary hover:underline font-normal"
                      >
                        {selectedIndices.size === notYetImported.length ? "Desmarcar todos" : "Selecionar faltantes"}
                      </button>
                    )}
                  </CardTitle>
                  {alreadyImportedCount > 0 && (
                    <p className="text-xs text-success flex items-center gap-1">
                      <Check className="w-3 h-3" /> {alreadyImportedCount} pacientes já importados anteriormente
                    </p>
                  )}
                  {selectedPatients.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {selectedPatients.length} selecionado{selectedPatients.length !== 1 ? "s" : ""} para importar
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {notYetImported.length === 0 ? (
                    <div className="text-center py-8">
                      <Check className="w-12 h-12 mx-auto text-success mb-3" />
                      <h3 className="font-display font-semibold text-lg text-success">Todos importados!</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Todos os {alreadyImportedCount} pacientes ativos com email já estão no sistema.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="max-h-72 overflow-y-auto space-y-1">
                        {activePatients.map((p) => {
                          const realIdx = allPatients.indexOf(p);
                          const isSelected = selectedIndices.has(realIdx);
                          const isImported = alreadyImported.has(p.email.toLowerCase());
                          return (
                            <div
                              key={realIdx}
                              onClick={() => !isImported && togglePatient(realIdx)}
                              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                                isImported
                                  ? "bg-success/5 border border-success/20 opacity-60 cursor-default"
                                  : isSelected 
                                    ? "bg-primary/10 border border-primary/30 cursor-pointer" 
                                    : "bg-muted/50 hover:bg-muted border border-transparent cursor-pointer"
                              }`}
                            >
                              {isImported ? (
                                <Check className="w-4 h-4 text-success shrink-0" />
                              ) : (
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => togglePatient(realIdx)}
                                  className="shrink-0"
                                />
                              )}
                              <span className="font-medium truncate flex-1">{p.name}</span>
                              <span className="text-muted-foreground text-xs truncate ml-2">{p.email}</span>
                              {isImported && (
                                <Badge variant="outline" className="text-[10px] border-success/30 text-success shrink-0">
                                  ✓ Importado
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                  {/* Progress Bar */}
                  {importProgress && (
                    <div className="space-y-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Processando {importProgress.current}/{importProgress.total}
                        </span>
                        <span className="font-medium text-primary">
                          {Math.round((importProgress.current / importProgress.total) * 100)}%
                        </span>
                      </div>
                      <Progress value={(importProgress.current / importProgress.total) * 100} className="h-2" />
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span className="text-success">✓ {importProgress.created} criados</span>
                        {importProgress.errors > 0 && (
                          <span className="text-destructive">✗ {importProgress.errors} erros</span>
                        )}
                      </div>
                    </div>
                  )}
                  <Button onClick={handleImport} disabled={importing || selectedPatients.length === 0} className="w-full" size="lg">
                    {importing ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importando {importProgress ? `${importProgress.current}/${importProgress.total}` : "..."}...</>
                    ) : (
                      <><Upload className="w-4 h-4 mr-2" /> Importar {selectedPatients.length} Paciente{selectedPatients.length !== 1 ? "s" : ""} Faltantes</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {result && (
              <Card className="glass shadow-card border-primary/30">
                <CardHeader>
                  <CardTitle className="font-display text-lg flex items-center gap-2 text-primary">
                    <Check className="w-5 h-5" /> Importação Concluída
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
                  <Button onClick={() => setResult(null)} variant="outline" className="w-full">Voltar</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ─── TAB: Filter ─── */}
          <TabsContent value="filter" className="space-y-4 mt-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou data..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter pills */}
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((f) => {
                const Icon = f.icon;
                const count = filterCounts[f.key];
                const isActive = filterType === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setFilterType(f.key)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      isActive
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {f.label}
                    <span className="opacity-70">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Results */}
            <Card className="glass shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    {filteredPatients.length} paciente{filteredPatients.length !== 1 ? "s" : ""} encontrado{filteredPatients.length !== 1 ? "s" : ""}
                  </span>
                  {filterType !== "all" && (
                    <button onClick={() => { setFilterType("all"); setSearch(""); }} className="text-xs text-primary hover:underline">
                      Limpar filtros
                    </button>
                  )}
                  {filteredImportableCount > 0 && (
                    <div className="flex items-center gap-2">
                      <button onClick={toggleAllFiltered} className="text-xs text-primary hover:underline">
                        {filteredSelectedCount === filteredImportableCount ? "Desmarcar" : "Selecionar"} importáveis
                      </button>
                      {filteredSelectedCount > 0 && (
                        <Badge variant="outline" className="text-[10px]">{filteredSelectedCount} selecionados</Badge>
                      )}
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="max-h-[400px] overflow-y-auto space-y-1.5">
                  {filteredPatients.length === 0 ? (
                    <div className="text-center py-8">
                      <Search className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhum paciente encontrado</p>
                    </div>
                  ) : (
                    filteredPatients.map((p) => {
                      const realIdx = allPatients.indexOf(p);
                      const missing = getMissingBadges(p);
                      const canImport = !!(p.email && p.name.trim());
                      const isSelected = selectedIndices.has(realIdx);
                      return (
                        <div
                          key={realIdx}
                          onClick={() => canImport && togglePatient(realIdx)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                            canImport ? "cursor-pointer" : "opacity-60 cursor-not-allowed"
                          } ${
                            isSelected && canImport
                              ? "bg-primary/10 border-primary/30"
                              : "bg-muted/30 border-border/50 hover:bg-muted/50"
                          }`}
                        >
                          {canImport && (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => togglePatient(realIdx)}
                              className="shrink-0"
                            />
                          )}
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-primary">
                              {p.name ? p.name[0].toUpperCase() : "?"}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{p.name || "(sem nome)"}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{p.email || "—"}</span>
                              {p.birthDate && <span>· {p.birthDate}</span>}
                              {p.sex && <span>· {p.sex}</span>}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1 shrink-0">
                            {missing.length === 0 ? (
                              <Badge variant="outline" className="text-[10px] border-success/30 text-success">
                                <Check className="w-3 h-3 mr-0.5" /> Completo
                              </Badge>
                            ) : (
                              missing.map((b, j) => (
                                <Badge key={j} variant={b.variant} className="text-[10px]">
                                  {b.label}
                                </Badge>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Import button for filtered selection */}
                {filteredSelectedCount > 0 && (
                  <Button onClick={handleImport} disabled={importing || selectedPatients.length === 0} className="w-full" size="lg">
                    {importing ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importando...</>
                    ) : (
                      <><Upload className="w-4 h-4 mr-2" /> Importar {selectedPatients.length} Paciente{selectedPatients.length !== 1 ? "s" : ""} Selecionados</>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
