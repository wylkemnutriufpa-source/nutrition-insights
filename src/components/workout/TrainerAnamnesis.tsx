import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ClipboardList, AlertTriangle, Activity, Dumbbell, Heart,
  Calendar, Save, User, Target
} from "lucide-react";

interface TrainerAnamnesisProps {
  studentId: string;
  studentName: string;
  open: boolean;
  onClose: () => void;
}

const JOINT_PAINS = [
  "Ombro", "Cotovelo", "Punho", "Lombar", "Quadril",
  "Joelho", "Tornozelo", "Cervical", "Nenhuma"
];

const MOVEMENT_RESTRICTIONS = [
  "Agachamento profundo", "Overhead press", "Rotação de tronco",
  "Flexão de quadril", "Extensão lombar", "Nenhuma"
];

const TRAINING_PREFERENCES = [
  "Musculação", "Funcional", "Crossfit", "Calistenia",
  "HIIT", "Cardio", "Yoga/Pilates", "Artes marciais"
];

const EQUIPMENT_LIST = [
  "Academia completa", "Home gym básico", "Apenas peso corporal",
  "Halteres", "Barra e anilhas", "Elásticos", "Kettlebell", "TRX"
];

export default function TrainerAnamnesis({ studentId, studentName, open, onClose }: TrainerAnamnesisProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  // Form fields
  const [jointPains, setJointPains] = useState<string[]>([]);
  const [injuries, setInjuries] = useState("");
  const [surgeries, setSurgeries] = useState("");
  const [movementRestrictions, setMovementRestrictions] = useState<string[]>([]);
  const [trainingExperience, setTrainingExperience] = useState("beginner");
  const [trainingYears, setTrainingYears] = useState("");
  const [weeklyAvailability, setWeeklyAvailability] = useState("3");
  const [sessionDuration, setSessionDuration] = useState("60");
  const [trainingPreferences, setTrainingPreferences] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [medicalClearance, setMedicalClearance] = useState(false);
  const [goals, setGoals] = useState("");
  const [observations, setObservations] = useState("");

  // Pre-fill from patient profile
  const [patientInfo, setPatientInfo] = useState<any>(null);

  useEffect(() => {
    if (!open || !studentId) return;
    loadData();
  }, [open, studentId]);

  const loadData = async () => {
    setLoading(true);
    const [profileRes, assessmentRes] = await Promise.all([
      supabase.from("profiles").select("full_name, height, birth_date").eq("user_id", studentId).single(),
      (supabase as any).from("trainer_assessments").select("*").eq("student_id", studentId).eq("trainer_id", user?.id).order("created_at", { ascending: false }).limit(1),
    ]);

    setPatientInfo(profileRes.data);

    const existing = assessmentRes.data?.[0];
    if (existing) {
      setExistingId(existing.id);
      setJointPains(existing.joint_pains || []);
      setInjuries(existing.injuries || "");
      setSurgeries(existing.surgeries || "");
      setMovementRestrictions(existing.movement_restrictions || []);
      setTrainingExperience(existing.training_experience || "beginner");
      setTrainingYears(existing.training_years?.toString() || "");
      setWeeklyAvailability(existing.weekly_availability?.toString() || "3");
      setSessionDuration(existing.session_duration?.toString() || "60");
      setTrainingPreferences(existing.training_preferences || []);
      setEquipment(existing.equipment_available || []);
      setMedicalClearance(existing.medical_clearance || false);
      setGoals(existing.goals || "");
      setObservations(existing.observations || "");
    }
    setLoading(false);
  };

  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
    if (item === "Nenhuma" || item === "Nenhum") {
      setList([item]);
      return;
    }
    const filtered = list.filter(i => i !== "Nenhuma" && i !== "Nenhum");
    setList(filtered.includes(item) ? filtered.filter(i => i !== item) : [...filtered, item]);
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        student_id: studentId,
        trainer_id: user.id,
        joint_pains: jointPains,
        injuries: injuries || null,
        surgeries: surgeries || null,
        movement_restrictions: movementRestrictions,
        training_experience: trainingExperience,
        training_years: trainingYears ? parseInt(trainingYears) : null,
        weekly_availability: parseInt(weeklyAvailability),
        session_duration: parseInt(sessionDuration),
        training_preferences: trainingPreferences,
        equipment_available: equipment,
        medical_clearance: medicalClearance,
        goals: goals || null,
        observations: observations || null,
      };

      if (existingId) {
        await (supabase as any).from("trainer_assessments").update(payload).eq("id", existingId);
      } else {
        await (supabase as any).from("trainer_assessments").insert(payload);
      }

      toast.success("Avaliação salva com sucesso! ✅");
      onClose();
    } catch {
      toast.error("Erro ao salvar avaliação");
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            Avaliação do Personal — {studentName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Carregando...</div>
        ) : (
          <div className="space-y-5 mt-2">
            {/* Patient info (auto-filled) */}
            {patientInfo && (
              <Card className="bg-muted/30 border-border/50">
                <CardContent className="p-3 flex items-center gap-3">
                  <User className="w-5 h-5 text-primary" />
                  <div className="text-sm">
                    <span className="font-medium">{patientInfo.full_name}</span>
                    {patientInfo.height && <span className="text-muted-foreground ml-2">{patientInfo.height}cm</span>}
                    {patientInfo.birth_date && (
                      <span className="text-muted-foreground ml-2">
                        {Math.floor((Date.now() - new Date(patientInfo.birth_date).getTime()) / 31557600000)} anos
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Goals */}
            <div>
              <label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                <Target className="w-4 h-4 text-primary" /> Objetivo principal
              </label>
              <Textarea
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                placeholder="Ex: Ganho de massa muscular, emagrecimento, reabilitação..."
                rows={2}
              />
            </div>

            {/* Joint Pains */}
            <div>
              <label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-4 h-4 text-warning" /> Dores articulares
              </label>
              <div className="flex flex-wrap gap-1.5">
                {JOINT_PAINS.map(p => (
                  <button
                    key={p}
                    onClick={() => toggleItem(jointPains, setJointPains, p)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      jointPains.includes(p)
                        ? "bg-warning/20 text-warning border border-warning/30"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >{p}</button>
                ))}
              </div>
            </div>

            {/* Injuries & Surgeries */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Lesões anteriores</label>
                <Textarea value={injuries} onChange={(e) => setInjuries(e.target.value)} placeholder="Descreva lesões..." rows={2} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Cirurgias</label>
                <Textarea value={surgeries} onChange={(e) => setSurgeries(e.target.value)} placeholder="Descreva cirurgias..." rows={2} />
              </div>
            </div>

            {/* Movement Restrictions */}
            <div>
              <label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                <Activity className="w-4 h-4 text-destructive" /> Restrições de movimento
              </label>
              <div className="flex flex-wrap gap-1.5">
                {MOVEMENT_RESTRICTIONS.map(r => (
                  <button
                    key={r}
                    onClick={() => toggleItem(movementRestrictions, setMovementRestrictions, r)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      movementRestrictions.includes(r)
                        ? "bg-destructive/20 text-destructive border border-destructive/30"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >{r}</button>
                ))}
              </div>
            </div>

            {/* Training Experience */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Experiência</label>
                <Select value={trainingExperience} onValueChange={setTrainingExperience}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Iniciante</SelectItem>
                    <SelectItem value="intermediate">Intermediário</SelectItem>
                    <SelectItem value="advanced">Avançado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Anos de treino</label>
                <Input type="number" value={trainingYears} onChange={(e) => setTrainingYears(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Dias/semana
                </label>
                <Select value={weeklyAvailability} onValueChange={setWeeklyAvailability}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7].map(n => <SelectItem key={n} value={n.toString()}>{n}x</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Session duration */}
            <div>
              <label className="text-sm font-medium mb-1 block">Duração da sessão (min)</label>
              <Select value={sessionDuration} onValueChange={setSessionDuration}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[30, 45, 60, 75, 90, 120].map(n => <SelectItem key={n} value={n.toString()}>{n} min</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Training Preferences */}
            <div>
              <label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                <Dumbbell className="w-4 h-4 text-primary" /> Preferências de treino
              </label>
              <div className="flex flex-wrap gap-1.5">
                {TRAINING_PREFERENCES.map(p => (
                  <button
                    key={p}
                    onClick={() => toggleItem(trainingPreferences, setTrainingPreferences, p)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      trainingPreferences.includes(p)
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >{p}</button>
                ))}
              </div>
            </div>

            {/* Equipment */}
            <div>
              <label className="text-sm font-medium mb-2 block">Equipamento disponível</label>
              <div className="flex flex-wrap gap-1.5">
                {EQUIPMENT_LIST.map(e => (
                  <button
                    key={e}
                    onClick={() => toggleItem(equipment, setEquipment, e)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      equipment.includes(e)
                        ? "bg-secondary text-secondary-foreground border border-border"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >{e}</button>
                ))}
              </div>
            </div>

            {/* Medical Clearance */}
            <div className="flex items-center gap-2">
              <Checkbox checked={medicalClearance} onCheckedChange={(c) => setMedicalClearance(!!c)} />
              <label className="text-sm flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-destructive" /> Possui liberação médica para atividade física
              </label>
            </div>

            {/* Observations */}
            <div>
              <label className="text-sm font-medium mb-1 block">Observações gerais</label>
              <Textarea value={observations} onChange={(e) => setObservations(e.target.value)} placeholder="Informações adicionais..." rows={3} />
            </div>

            {/* Save */}
            <Button onClick={save} disabled={saving} className="w-full" size="lg">
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Salvando..." : existingId ? "Atualizar Avaliação" : "Salvar Avaliação"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
