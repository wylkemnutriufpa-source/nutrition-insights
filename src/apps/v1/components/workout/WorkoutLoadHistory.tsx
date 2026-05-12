import { useState, useEffect } from "react";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import { Badge } from "@v1/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, Dumbbell, BarChart3 } from "lucide-react";

interface Props {
  students: { student_id: string; full_name: string }[];
}

export default function WorkoutLoadHistory({ students }: Props) {
  const { user } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [exercises, setExercises] = useState<string[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedStudent) return;
    loadExercises();
  }, [selectedStudent]);

  useEffect(() => {
    if (!selectedStudent || !selectedExercise) return;
    loadHistory();
  }, [selectedStudent, selectedExercise]);

  const loadExercises = async () => {
    const { data: completions } = await supabase
      .from("workout_completions")
      .select("id")
      .eq("student_id", selectedStudent);

    if (!completions?.length) { setExercises([]); return; }

    const { data: logs } = await supabase
      .from("workout_exercise_logs")
      .select("workout_exercises(name)")
      .in("completion_id", completions.map(c => c.id));

    const names = [...new Set((logs || []).map(l => (l.workout_exercises as any)?.name).filter(Boolean))];
    setExercises(names.sort());
    if (names.length > 0 && !selectedExercise) setSelectedExercise(names[0]);
  };

  const loadHistory = async () => {
    setLoading(true);
    const { data: completions } = await supabase
      .from("workout_completions")
      .select("id, completed_at")
      .eq("student_id", selectedStudent)
      .order("completed_at", { ascending: true });

    if (!completions?.length) { setChartData([]); setLoading(false); return; }

    const { data: logs } = await supabase
      .from("workout_exercise_logs")
      .select("*, workout_exercises(name)")
      .in("completion_id", completions.map(c => c.id));

    const points = (logs || [])
      .filter(l => (l.workout_exercises as any)?.name === selectedExercise && l.load_kg)
      .map(l => {
        const comp = completions.find(c => c.id === l.completion_id);
        return {
          date: comp ? new Date(comp.completed_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "",
          carga: l.load_kg || 0,
          volume: (l.load_kg || 0) * (l.sets_done || 0) * (parseInt(l.reps_done || "0") || 0),
          reps: parseInt(l.reps_done || "0") || 0,
        };
      });

    setChartData(points);
    setLoading(false);
  };

  const trend = chartData.length >= 2
    ? chartData[chartData.length - 1].carga - chartData[0].carga
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">Evolução de Carga</h2>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Select value={selectedStudent} onValueChange={setSelectedStudent}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Selecionar aluno" /></SelectTrigger>
          <SelectContent>
            {students.map(s => (
              <SelectItem key={s.student_id} value={s.student_id}>{s.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {exercises.length > 0 && (
          <Select value={selectedExercise} onValueChange={setSelectedExercise}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Exercício" /></SelectTrigger>
            <SelectContent>
              {exercises.map(e => (
                <SelectItem key={e} value={e}>{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {chartData.length > 0 ? (
        <>
          <div className="flex gap-2">
            <Badge variant={trend > 0 ? "default" : trend < 0 ? "destructive" : "secondary"} className="gap-1">
              <TrendingUp className="w-3 h-3" />
              {trend > 0 ? `+${trend}kg` : trend < 0 ? `${trend}kg` : "Estável"}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Dumbbell className="w-3 h-3" />
              Atual: {chartData[chartData.length - 1].carga}kg
            </Badge>
          </div>

          <Card>
            <CardContent className="pt-4">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="carga" stroke="hsl(var(--primary))" strokeWidth={2} name="Carga (kg)" dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="volume" stroke="hsl(var(--accent))" strokeWidth={1.5} name="Volume Total" dot={{ r: 3 }} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      ) : selectedStudent && selectedExercise ? (
        <div className="text-center py-12 text-muted-foreground">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Sem dados de carga registrados</p>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Dumbbell className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Selecione um aluno e exercício</p>
        </div>
      )}
    </div>
  );
}
