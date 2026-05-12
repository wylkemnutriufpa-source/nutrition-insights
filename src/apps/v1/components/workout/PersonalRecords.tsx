import { useState, useEffect } from "react";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Badge } from "@v1/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import { Trophy, TrendingUp, Dumbbell, Flame } from "lucide-react";

interface Props {
  students: { student_id: string; full_name: string }[];
}

export default function PersonalRecords({ students }: Props) {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Get all exercise logs to compute PRs
      const studentIds = students.map(s => s.student_id);
      if (studentIds.length === 0) { setLoading(false); return; }

      const { data: completions } = await supabase.from("workout_completions")
        .select("id, student_id, completed_at")
        .in("student_id", studentIds)
        .order("completed_at", { ascending: true });

      if (!completions || completions.length === 0) { setLoading(false); return; }

      const completionIds = completions.map(c => c.id);
      const { data: logs } = await supabase.from("workout_exercise_logs")
        .select("*, workout_exercises(name)")
        .in("completion_id", completionIds);

      if (!logs) { setLoading(false); return; }

      // Compute PRs per student per exercise
      const prMap: Record<string, { student_id: string; exercise_name: string; best_load: number; best_volume: number; date: string }> = {};
      
      logs.forEach(log => {
        const completion = completions.find(c => c.id === log.completion_id);
        if (!completion) return;
        const exName = (log.workout_exercises as any)?.name || "Exercício";
        const key = `${completion.student_id}_${exName}`;
        const load = log.load_kg || 0;
        const volume = (log.load_kg || 0) * (log.sets_done || 0) * (parseInt(log.reps_done || "0") || 0);

        if (!prMap[key] || load > prMap[key].best_load) {
          prMap[key] = {
            student_id: completion.student_id,
            exercise_name: exName,
            best_load: load,
            best_volume: volume,
            date: completion.completed_at,
          };
        }
      });

      setRecords(Object.values(prMap).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setLoading(false);
    };
    load();
  }, [user, students]);

  const filtered = selectedStudent === "all" ? records : records.filter(r => r.student_id === selectedStudent);

  if (loading) return <div className="animate-pulse h-32 bg-muted rounded-lg" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h2 className="text-lg font-bold">Records Pessoais</h2>
        </div>
        <Select value={selectedStudent} onValueChange={setSelectedStudent}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os alunos</SelectItem>
            {students.map(s => <SelectItem key={s.student_id} value={s.student_id}>{s.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum record registrado ainda</p>
            <p className="text-xs mt-1">Os PRs são calculados automaticamente dos treinos concluídos</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {filtered.slice(0, 20).map((r, i) => {
            const studentName = students.find(s => s.student_id === r.student_id)?.full_name || "Aluno";
            return (
              <Card key={i} className="hover:border-primary/20 transition-all">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{r.exercise_name}</p>
                      <p className="text-xs text-muted-foreground">{studentName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="gap-1">
                      <Dumbbell className="w-3 h-3" />
                      {r.best_load}kg
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.date).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
