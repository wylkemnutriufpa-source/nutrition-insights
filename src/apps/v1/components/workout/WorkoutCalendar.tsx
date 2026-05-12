import { useState, useEffect } from "react";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { Card, CardContent } from "@v1/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import { Badge } from "@v1/components/ui/badge";
import { CalendarDays, CheckCircle2, XCircle, Flame } from "lucide-react";

interface Props {
  students: { student_id: string; full_name: string }[];
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function WorkoutCalendar({ students }: Props) {
  const { user } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [completions, setCompletions] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedStudent) return;
    loadCompletions();
  }, [selectedStudent, month, year]);

  const loadCompletions = async () => {
    const startDate = new Date(year, month, 1).toISOString();
    const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

    const { data } = await supabase
      .from("workout_completions")
      .select("id, completed_at, effort_level, duration_minutes")
      .eq("student_id", selectedStudent)
      .gte("completed_at", startDate)
      .lte("completed_at", endDate);

    setCompletions(data || []);
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const today = new Date();

  const getCompletionsForDay = (day: number) => {
    return completions.filter(c => {
      const d = new Date(c.completed_at);
      return d.getDate() === day;
    });
  };

  const totalDays = daysInMonth;
  const trainedDays = new Set(completions.map(c => new Date(c.completed_at).getDate())).size;
  const adherence = totalDays > 0 ? Math.round((trainedDays / totalDays) * 100) : 0;

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarDays className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">Calendário de Treinos</h2>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <Select value={selectedStudent} onValueChange={setSelectedStudent}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Selecionar aluno" /></SelectTrigger>
          <SelectContent>
            {students.map(s => (
              <SelectItem key={s.student_id} value={s.student_id}>{s.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedStudent && (
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="px-2 py-1 rounded text-xs hover:bg-muted">←</button>
            <span className="text-sm font-semibold min-w-[140px] text-center">{monthNames[month]} {year}</span>
            <button onClick={nextMonth} className="px-2 py-1 rounded text-xs hover:bg-muted">→</button>
          </div>
        )}
      </div>

      {selectedStudent && (
        <>
          <div className="flex gap-2">
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="w-3 h-3" /> {trainedDays} dias treinados
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Flame className="w-3 h-3" /> {adherence}% aderência
            </Badge>
          </div>

          <Card>
            <CardContent className="p-3">
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map(d => (
                  <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
                ))}

                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dayCompletions = getCompletionsForDay(day);
                  const trained = dayCompletions.length > 0;
                  const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
                  const avgEffort = trained
                    ? Math.round(dayCompletions.reduce((s, c) => s + (c.effort_level || 0), 0) / dayCompletions.length)
                    : 0;

                  return (
                    <div
                      key={day}
                      className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-all
                        ${trained ? "bg-primary/15 text-primary font-semibold" : "text-muted-foreground hover:bg-muted/50"}
                        ${isToday ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}
                      `}
                      title={trained ? `${dayCompletions.length} treino(s) • RPE ${avgEffort}` : ""}
                    >
                      <span>{day}</span>
                      {trained && (
                        <div className="flex gap-0.5 mt-0.5">
                          {dayCompletions.map((_, ci) => (
                            <div key={ci} className="w-1 h-1 rounded-full bg-primary" />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!selectedStudent && (
        <div className="text-center py-12 text-muted-foreground">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Selecione um aluno para ver o calendário</p>
        </div>
      )}
    </div>
  );
}
