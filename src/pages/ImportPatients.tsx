import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [allPatients, setAllPatients] = useState<PatientRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [tab, setTab] = useState("import");
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch("/data/Pacientes.csv")
      .then(r => r.text())
      .then(text => {
        const parsed = parseCsv(text);
        setAllPatients(parsed);
        setLoaded(true);
        // Pre-select all importable patients
        const importableIndices = new Set<number>();
        parsed.forEach((p, i) => { if (p.active && p.email) importableIndices.add(i); });
        setSelectedIndices(importableIndices);
      });
  }, []);

  const activePatients = useMemo(() => allPatients.filter(p => p.active && p.email), [allPatients]);
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

    try {
      const payload = selectedPatients.map(p => ({
        name: p.name,
        email: p.email,
      }));

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
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "Total", value: allPatients.length, color: "" },
              { label: "Ativos", value: totalActive, color: "text-primary" },
              { label: "Com Email", value: withEmail, color: "text-accent" },
              { label: "Sem Email", value: allPatients.filter(p => !p.email).length, color: "text-destructive" },
              { label: "Inativos", value: inactiveCount, color: "text-muted-foreground" },
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

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full max-w-md">
            <TabsTrigger value="import" className="gap-1.5 flex-1">
              <Upload className="w-4 h-4" /> Importar
            </TabsTrigger>
            <TabsTrigger value="filter" className="gap-1.5 flex-1">
              <Filter className="w-4 h-4" /> Filtrar Dados
              {(allPatients.filter(p => !p.email).length > 0) && (
                <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0">
                  {allPatients.filter(p => !p.email).length}
                </Badge>
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
                      Pacientes Importáveis ({withEmail})
                    </span>
                    <button
                      onClick={toggleAll}
                      className="text-xs text-primary hover:underline font-normal"
                    >
                      {selectedIndices.size === activePatients.length ? "Desmarcar todos" : "Selecionar todos"}
                    </button>
                  </CardTitle>
                  {selectedPatients.length !== activePatients.length && (
                    <p className="text-xs text-muted-foreground">
                      {selectedPatients.length} de {activePatients.length} selecionados
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="max-h-72 overflow-y-auto space-y-1">
                    {activePatients.map((p, _) => {
                      const realIdx = allPatients.indexOf(p);
                      const isSelected = selectedIndices.has(realIdx);
                      return (
                        <div
                          key={realIdx}
                          onClick={() => togglePatient(realIdx)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                            isSelected ? "bg-primary/10 border border-primary/30" : "bg-muted/50 hover:bg-muted border border-transparent"
                          }`}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => togglePatient(realIdx)}
                            className="shrink-0"
                          />
                          <span className="font-medium truncate flex-1">{p.name}</span>
                          <span className="text-muted-foreground text-xs truncate ml-2">{p.email}</span>
                        </div>
                      );
                    })}
                  </div>
                  <Button onClick={handleImport} disabled={importing || selectedPatients.length === 0} className="w-full" size="lg">
                    {importing ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importando...</>
                    ) : (
                      <><Upload className="w-4 h-4 mr-2" /> Importar {selectedPatients.length} Paciente{selectedPatients.length !== 1 ? "s" : ""}</>
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
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[400px] overflow-y-auto space-y-1.5">
                  {filteredPatients.length === 0 ? (
                    <div className="text-center py-8">
                      <Search className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhum paciente encontrado</p>
                    </div>
                  ) : (
                    filteredPatients.map((p, i) => {
                      const missing = getMissingBadges(p);
                      return (
                        <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/30 border border-border/50 text-sm">
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
