import { useState, useEffect } from "react";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Input } from "@v1/components/ui/input";
import { Label } from "@v1/components/ui/label";
import { Textarea } from "@v1/components/ui/textarea";
import { Badge } from "@v1/components/ui/badge";
import { Progress } from "@v1/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@v1/components/ui/dialog";
import { toast } from "sonner";
import { Trophy, Plus, Target, Flame, CheckCircle2, Clock, Users } from "lucide-react";

interface Props {
  students: { student_id: string; full_name: string }[];
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  target_type: string;
  target_value: number;
  duration_days: number;
  student_ids: string[];
  created_at: string;
  status: string;
  xp_reward: number;
}

const TARGET_TYPES = [
  { value: "workouts", label: "Treinos completos", icon: "🏋️" },
  { value: "streak", label: "Dias consecutivos", icon: "🔥" },
  { value: "volume", label: "Volume total (kg)", icon: "💪" },
  { value: "cardio_minutes", label: "Minutos de cardio", icon: "🫀" },
  { value: "calories_burned", label: "Calorias queimadas", icon: "🔥" },
];

export default function PTChallenges({ students }: Props) {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetType, setTargetType] = useState("workouts");
  const [targetValue, setTargetValue] = useState("30");
  const [durationDays, setDurationDays] = useState("60");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadChallenges();
  }, [user]);

  const loadChallenges = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("challenges")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

    setChallenges((data || []).map(c => ({
      ...c,
      student_ids: (c as any).student_ids || [],
      status: (c as any).status || "active",
    })));
    setLoading(false);
  };

  const createChallenge = async () => {
    if (!user || !title.trim()) return;
    setSaving(true);

    const { error } = await supabase.from("challenges").insert({
      title: title.trim(),
      description: description.trim(),
      target_type: targetType,
      target_value: parseInt(targetValue) || 30,
      duration_days: parseInt(durationDays) || 60,
      created_by: user.id,
      is_global: false,
      icon: TARGET_TYPES.find(t => t.value === targetType)?.icon || "🏆",
      xp_reward: Math.round((parseInt(targetValue) || 30) * 10),
    });

    if (error) {
      toast.error("Erro ao criar desafio");
    } else {
      toast.success("Desafio criado com sucesso! 🏆");
      setShowForm(false);
      resetForm();
      loadChallenges();
    }
    setSaving(false);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setTargetType("workouts");
    setTargetValue("30");
    setDurationDays("60");
    setSelectedStudents([]);
  };

  const toggleStudent = (id: string) => {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Desafios & Metas</h2>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-1.5" size="sm">
          <Plus className="w-4 h-4" /> Novo Desafio
        </Button>
      </div>

      {challenges.length === 0 && !loading ? (
        <div className="text-center py-12 text-muted-foreground">
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum desafio criado</p>
          <p className="text-sm mt-1">Crie desafios para motivar seus alunos!</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {challenges.map(c => {
            const targetInfo = TARGET_TYPES.find(t => t.value === c.target_type);
            return (
              <Card key={c.id} className="hover:border-primary/20 transition-all">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{targetInfo?.icon || "🏆"}</span>
                      <div>
                        <h3 className="font-semibold text-sm">{c.title}</h3>
                        <p className="text-xs text-muted-foreground">{c.description}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{c.duration_days} dias</Badge>
                  </div>

                  <div className="flex gap-2 text-xs">
                    <Badge variant="secondary" className="gap-1">
                      <Target className="w-3 h-3" />
                      Meta: {c.target_value} {targetInfo?.label?.toLowerCase()}
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Flame className="w-3 h-3" />
                      {c.xp_reward || 0} XP
                    </Badge>
                  </div>

                  <p className="text-[10px] text-muted-foreground">
                    Criado em {new Date(c.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Challenge Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" /> Novo Desafio
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Desafio</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: 30 treinos em 60 dias" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva o desafio..." rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de Meta</Label>
                <Select value={targetType} onValueChange={setTargetType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TARGET_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor da Meta</Label>
                <Input type="number" value={targetValue} onChange={e => setTargetValue(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Duração (dias)</Label>
              <Input type="number" value={durationDays} onChange={e => setDurationDays(e.target.value)} />
            </div>

            {students.length > 0 && (
              <div>
                <Label className="mb-2 block">Alunos Participantes</Label>
                <div className="flex flex-wrap gap-2">
                  {students.map(s => (
                    <button
                      key={s.student_id}
                      onClick={() => toggleStudent(s.student_id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        selectedStudents.includes(s.student_id)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {s.full_name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={createChallenge} disabled={!title.trim() || saving} className="w-full gap-1.5">
              <Trophy className="w-4 h-4" />
              {saving ? "Criando..." : "Criar Desafio"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
