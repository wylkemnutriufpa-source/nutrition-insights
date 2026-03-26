import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Ruler, Plus, TrendingUp, TrendingDown, Minus, Calendar, ChevronDown
} from "lucide-react";

interface Props {
  students: { student_id: string; full_name: string }[];
}

const MEASUREMENT_FIELDS = [
  { key: "weight_kg", label: "Peso (kg)", group: "Geral" },
  { key: "body_fat_percent", label: "% Gordura", group: "Geral" },
  { key: "chest_cm", label: "Peitoral (cm)", group: "Circunferências" },
  { key: "waist_cm", label: "Cintura (cm)", group: "Circunferências" },
  { key: "hip_cm", label: "Quadril (cm)", group: "Circunferências" },
  { key: "right_arm_cm", label: "Braço D (cm)", group: "Circunferências" },
  { key: "left_arm_cm", label: "Braço E (cm)", group: "Circunferências" },
  { key: "right_thigh_cm", label: "Coxa D (cm)", group: "Circunferências" },
  { key: "left_thigh_cm", label: "Coxa E (cm)", group: "Circunferências" },
  { key: "right_calf_cm", label: "Panturrilha D (cm)", group: "Circunferências" },
  { key: "left_calf_cm", label: "Panturrilha E (cm)", group: "Circunferências" },
  { key: "triceps_mm", label: "Tríceps (mm)", group: "Dobras" },
  { key: "subscapular_mm", label: "Subescapular (mm)", group: "Dobras" },
  { key: "suprailiac_mm", label: "Suprailíaca (mm)", group: "Dobras" },
  { key: "abdominal_mm", label: "Abdominal (mm)", group: "Dobras" },
  { key: "flexibility_cm", label: "Flexibilidade (cm)", group: "Testes" },
  { key: "push_ups_count", label: "Flexões", group: "Testes" },
  { key: "sit_ups_count", label: "Abdominais", group: "Testes" },
  { key: "resting_hr", label: "FC Repouso", group: "Testes" },
];

export default function PhysicalAssessment({ students }: Props) {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadAssessments = async () => {
    if (!user) return;
    const query = (supabase as any).from("physical_assessments")
      .select("*")
      .eq("personal_id", user.id)
      .order("assessment_date", { ascending: false })
      .limit(100);
    
    if (selectedStudent) query.eq("student_id", selectedStudent);
    
    const { data } = await query;
    setAssessments(data || []);
  };

  useEffect(() => { loadAssessments(); }, [user, selectedStudent]);

  const handleSave = async () => {
    if (!user || !formData.student_id) { toast.error("Selecione um aluno"); return; }
    setSaving(true);
    const { error } = await (supabase as any).from("physical_assessments").insert({
      ...formData,
      personal_id: user.id,
    });
    if (error) { toast.error("Erro ao salvar"); setSaving(false); return; }
    toast.success("Avaliação salva!");
    setSaving(false);
    setShowForm(false);
    setFormData({});
    loadAssessments();
  };

  const getDelta = (current: number | null, previous: number | null) => {
    if (!current || !previous) return null;
    return Math.round((current - previous) * 10) / 10;
  };

  const groupedByStudent: Record<string, any[]> = {};
  assessments.forEach(a => {
    if (!groupedByStudent[a.student_id]) groupedByStudent[a.student_id] = [];
    groupedByStudent[a.student_id].push(a);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Ruler className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Avaliações Físicas</h2>
        </div>
        <div className="flex gap-2">
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Todos os alunos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {students.map(s => (
                <SelectItem key={s.student_id} value={s.student_id}>{s.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowForm(true)} size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" /> Nova Avaliação
          </Button>
        </div>
      </div>

      {/* Assessment List */}
      {assessments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Ruler className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma avaliação encontrada</p>
          <p className="text-sm mt-1">Clique em "Nova Avaliação" para começar</p>
        </div>
      ) : (
        assessments.map((a, idx) => {
          const studentName = students.find(s => s.student_id === a.student_id)?.full_name || "Aluno";
          const previous = assessments.find((b, j) => j > idx && b.student_id === a.student_id);
          const expanded = expandedId === a.id;

          return (
            <Card key={a.id} className="hover:border-primary/20 transition-all cursor-pointer" onClick={() => setExpandedId(expanded ? null : a.id)}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Ruler className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">{studentName}</CardTitle>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(a.assessment_date).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.weight_kg && <Badge variant="secondary">{a.weight_kg}kg</Badge>}
                    {a.body_fat_percent && <Badge variant="outline">{a.body_fat_percent}%BF</Badge>}
                    <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
                  </div>
                </div>
              </CardHeader>
              {expanded && (
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {MEASUREMENT_FIELDS.map(f => {
                      const val = a[f.key];
                      if (!val) return null;
                      const delta = previous ? getDelta(val, previous[f.key]) : null;
                      return (
                        <div key={f.key} className="bg-muted/30 rounded-lg p-2.5">
                          <p className="text-xs text-muted-foreground">{f.label}</p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold">{val}</span>
                            {delta !== null && delta !== 0 && (
                              <span className={`text-xs flex items-center gap-0.5 ${delta > 0 ? "text-green-500" : "text-red-500"}`}>
                                {delta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {delta > 0 ? "+" : ""}{delta}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {a.notes && <p className="text-xs text-muted-foreground mt-2 italic">{a.notes}</p>}
                </CardContent>
              )}
            </Card>
          );
        })
      )}

      {/* New Assessment Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Avaliação Física</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Aluno</Label>
              <Select value={formData.student_id || ""} onValueChange={v => setFormData({ ...formData, student_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {students.map(s => (
                    <SelectItem key={s.student_id} value={s.student_id}>{s.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {["Geral", "Circunferências", "Dobras", "Testes"].map(group => (
              <div key={group}>
                <p className="text-sm font-semibold mb-2">{group}</p>
                <div className="grid grid-cols-2 gap-2">
                  {MEASUREMENT_FIELDS.filter(f => f.group === group).map(f => (
                    <div key={f.key}>
                      <Label className="text-xs">{f.label}</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData[f.key] || ""}
                        onChange={e => setFormData({ ...formData, [f.key]: e.target.value ? parseFloat(e.target.value) : null })}
                        className="h-8"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div>
              <Label>Observações</Label>
              <Textarea value={formData.notes || ""} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={2} />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Salvando..." : "Salvar Avaliação"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
