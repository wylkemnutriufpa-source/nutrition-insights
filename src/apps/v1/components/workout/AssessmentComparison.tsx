import { useState, useEffect } from "react";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import { Badge } from "@v1/components/ui/badge";
import { ArrowRightLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  students: { student_id: string; full_name: string }[];
}

const FIELDS = [
  { key: "weight_kg", label: "Peso (kg)", unit: "kg", lessIsBetter: false },
  { key: "body_fat_percent", label: "% Gordura", unit: "%", lessIsBetter: true },
  { key: "chest_cm", label: "Peitoral", unit: "cm", lessIsBetter: false },
  { key: "waist_cm", label: "Cintura", unit: "cm", lessIsBetter: true },
  { key: "hip_cm", label: "Quadril", unit: "cm", lessIsBetter: false },
  { key: "right_arm_cm", label: "Braço D", unit: "cm", lessIsBetter: false },
  { key: "left_arm_cm", label: "Braço E", unit: "cm", lessIsBetter: false },
  { key: "right_thigh_cm", label: "Coxa D", unit: "cm", lessIsBetter: false },
  { key: "left_thigh_cm", label: "Coxa E", unit: "cm", lessIsBetter: false },
  { key: "right_calf_cm", label: "Panturrilha D", unit: "cm", lessIsBetter: false },
  { key: "left_calf_cm", label: "Panturrilha E", unit: "cm", lessIsBetter: false },
];

export default function AssessmentComparison({ students }: Props) {
  const { user } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [assessments, setAssessments] = useState<any[]>([]);
  const [dateA, setDateA] = useState<string>("");
  const [dateB, setDateB] = useState<string>("");

  useEffect(() => {
    if (!selectedStudent) return;
    loadAssessments();
  }, [selectedStudent]);

  const loadAssessments = async () => {
    const { data } = await (supabase as any)
      .from("physical_assessments")
      .select("*")
      .eq("student_id", selectedStudent)
      .order("assessment_date", { ascending: false });

    setAssessments(data || []);
    if (data && data.length >= 2) {
      setDateA(data[data.length - 1].id);
      setDateB(data[0].id);
    } else if (data?.length === 1) {
      setDateA(data[0].id);
      setDateB("");
    }
  };

  const assessA = assessments.find(a => a.id === dateA);
  const assessB = assessments.find(a => a.id === dateB);

  const getDiff = (field: typeof FIELDS[0]) => {
    if (!assessA || !assessB) return null;
    const valA = assessA.measurements?.[field.key];
    const valB = assessB.measurements?.[field.key];
    if (valA == null || valB == null) return null;
    return Number((valB - valA).toFixed(1));
  };

  const getDiffIcon = (diff: number | null, lessIsBetter: boolean) => {
    if (diff == null || diff === 0) return <Minus className="w-3 h-3 text-muted-foreground" />;
    const isGood = lessIsBetter ? diff < 0 : diff > 0;
    return isGood
      ? <TrendingUp className="w-3 h-3 text-green-500" />
      : <TrendingDown className="w-3 h-3 text-red-500" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ArrowRightLeft className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">Comparativo de Avaliações</h2>
      </div>

      <Select value={selectedStudent} onValueChange={setSelectedStudent}>
        <SelectTrigger className="w-[220px]"><SelectValue placeholder="Selecionar aluno" /></SelectTrigger>
        <SelectContent>
          {students.map(s => (
            <SelectItem key={s.student_id} value={s.student_id}>{s.full_name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {assessments.length >= 2 && (
        <div className="flex gap-2 flex-wrap">
          <Select value={dateA} onValueChange={setDateA}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Data inicial" /></SelectTrigger>
            <SelectContent>
              {assessments.map(a => (
                <SelectItem key={a.id} value={a.id}>
                  {new Date(a.assessment_date).toLocaleDateString("pt-BR")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="flex items-center text-muted-foreground">→</span>
          <Select value={dateB} onValueChange={setDateB}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Data final" /></SelectTrigger>
            <SelectContent>
              {assessments.map(a => (
                <SelectItem key={a.id} value={a.id}>
                  {new Date(a.assessment_date).toLocaleDateString("pt-BR")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {assessA && assessB ? (
        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-4 gap-0 text-xs font-semibold border-b border-border p-3 bg-muted/30">
              <span>Medida</span>
              <span className="text-center">{new Date(assessA.assessment_date).toLocaleDateString("pt-BR")}</span>
              <span className="text-center">{new Date(assessB.assessment_date).toLocaleDateString("pt-BR")}</span>
              <span className="text-center">Diferença</span>
            </div>
            {FIELDS.map(f => {
              const valA = assessA.measurements?.[f.key];
              const valB = assessB.measurements?.[f.key];
              const diff = getDiff(f);
              if (valA == null && valB == null) return null;
              return (
                <div key={f.key} className="grid grid-cols-4 gap-0 text-sm p-3 border-b border-border/50 items-center">
                  <span className="text-muted-foreground">{f.label}</span>
                  <span className="text-center font-medium">{valA != null ? `${valA}${f.unit}` : "—"}</span>
                  <span className="text-center font-medium">{valB != null ? `${valB}${f.unit}` : "—"}</span>
                  <div className="flex items-center justify-center gap-1">
                    {getDiffIcon(diff, f.lessIsBetter)}
                    {diff != null && (
                      <span className={`font-medium ${
                        diff === 0 ? "text-muted-foreground" :
                        (f.lessIsBetter ? diff < 0 : diff > 0) ? "text-green-500" : "text-red-500"
                      }`}>
                        {diff > 0 ? "+" : ""}{diff}{f.unit}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : assessments.length < 2 && selectedStudent ? (
        <div className="text-center py-12 text-muted-foreground">
          <ArrowRightLeft className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Necessário pelo menos 2 avaliações para comparar</p>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <ArrowRightLeft className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Selecione um aluno para comparar avaliações</p>
        </div>
      )}
    </div>
  );
}
