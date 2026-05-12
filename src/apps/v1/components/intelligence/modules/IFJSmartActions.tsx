/**
 * IFJ Smart Actions — Role-aware quick action panels
 * Shows contextual shortcuts based on user role:
 * - Nutritionist/Admin: patients with anamnesis completed but no active meal plan
 * - Personal: students without active workout plans
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { useNavigate } from "react-router-dom";
import { Badge } from "@v1/components/ui/badge";
import { ScrollArea } from "@v1/components/ui/scroll-area";
import {
  UtensilsCrossed, Dumbbell, AlertCircle, ChevronRight,
  Loader2, UserCheck, ClipboardList
} from "lucide-react";
import type { IFJRole } from "./IFJCommandCenter";

interface SmartActionsProps {
  role: IFJRole;
}

interface PatientNoPlan {
  patient_id: string;
  full_name: string;
  anamnesis_date: string;
}

interface StudentNoWorkout {
  student_id: string;
  full_name: string;
  enrolled_date: string;
}

export default function IFJSmartActions({ role }: SmartActionsProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patientsNoPlan, setPatientsNoPlan] = useState<PatientNoPlan[]>([]);
  const [studentsNoWorkout, setStudentsNoWorkout] = useState<StudentNoWorkout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);

      if (role === "admin" || role === "nutritionist") {
        // 1. Get patients with completed anamnesis
        const { data: anamneses } = await supabase
          .from("patient_anamnesis")
          .select("user_id, created_at")
          .eq("status", "completed");

        if (anamneses && anamneses.length > 0) {
          const anamnesisUserIds = anamneses.map(a => a.user_id);

          // 2. Get active meal plans
          const { data: activePlans } = await supabase
            .from("meal_plans")
            .select("patient_id")
            .eq("is_active", true);

          const activePlanPatientIds = new Set((activePlans || []).map(p => p.patient_id));

          // 3. Filter: has anamnesis but no active plan
          const withoutPlan = anamnesisUserIds.filter(id => !activePlanPatientIds.has(id));

          if (withoutPlan.length > 0) {
            // 4. Get profiles
            const { data: profiles } = await supabase
              .from("profiles")
              .select("user_id, full_name")
              .in("user_id", withoutPlan.slice(0, 20));

            const profileMap: Record<string, string> = {};
            (profiles || []).forEach(p => { profileMap[p.user_id] = p.full_name || "Paciente"; });

            const anamnesisMap: Record<string, string> = {};
            anamneses.forEach(a => { anamnesisMap[a.user_id] = a.created_at; });

            setPatientsNoPlan(
              withoutPlan.slice(0, 10).map(id => ({
                patient_id: id,
                full_name: profileMap[id] || "Paciente",
                anamnesis_date: anamnesisMap[id] || "",
              }))
            );
          }
        }
      }

      if (role === "personal") {
        // 1. Get active students
        const { data: students } = await supabase
          .from("personal_trainer_students")
          .select("student_id, created_at")
          .eq("personal_id", user.id)
          .eq("status", "active");

        if (students && students.length > 0) {
          const studentIds = students.map(s => s.student_id);

          // 2. Get active workout plans
          const { data: activePlans } = await supabase
            .from("workout_plans")
            .select("student_id")
            .eq("personal_id", user.id)
            .eq("is_active", true);

          const activeStudentIds = new Set((activePlans || []).map(p => p.student_id));

          // 3. Filter: enrolled but no active plan
          const withoutPlan = studentIds.filter(id => !activeStudentIds.has(id));

          if (withoutPlan.length > 0) {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("user_id, full_name")
              .in("user_id", withoutPlan.slice(0, 20));

            const profileMap: Record<string, string> = {};
            (profiles || []).forEach(p => { profileMap[p.user_id] = p.full_name || "Aluno"; });

            const enrollMap: Record<string, string> = {};
            students.forEach(s => { enrollMap[s.student_id] = s.created_at; });

            setStudentsNoWorkout(
              withoutPlan.slice(0, 10).map(id => ({
                student_id: id,
                full_name: profileMap[id] || "Aluno",
                enrolled_date: enrollMap[id] || "",
              }))
            );
          }
        }
      }

      setLoading(false);
    };

    load();
  }, [user, role]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-3">
        <Loader2 className="w-4 h-4 animate-spin text-amber-500/50" />
      </div>
    );
  }

  const showNutri = (role === "admin" || role === "nutritionist") && patientsNoPlan.length > 0;
  const showPersonal = role === "personal" && studentsNoWorkout.length > 0;

  if (!showNutri && !showPersonal) return null;

  return (
    <div className="space-y-3 px-2">
      {/* Patients with anamnesis but no plan */}
      {showNutri && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-amber-500/20 rounded-xl bg-amber-500/[0.03] overflow-hidden"
        >
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-amber-500/10">
            <ClipboardList className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold text-amber-500">Anamnese OK, sem plano</span>
            <Badge variant="outline" className="ml-auto text-[10px] border-amber-500/30 text-amber-500">
              {patientsNoPlan.length}
            </Badge>
          </div>
          <ScrollArea className={patientsNoPlan.length > 4 ? "h-[160px]" : ""}>
            <div className="p-2 space-y-1">
              {patientsNoPlan.map((p, i) => (
                <motion.button
                  key={p.patient_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                  onClick={() => navigate(`/clinical-workspace?tab=meal-plans&patient=${p.patient_id}`)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-amber-500/10 transition-all group text-left"
                >
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <UserCheck className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{p.full_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Anamnese em {new Date(p.anamnesis_date).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <UtensilsCrossed className="w-3.5 h-3.5 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                  </div>
                </motion.button>
              ))}
            </div>
          </ScrollArea>
        </motion.div>
      )}

      {/* Students without workout */}
      {showPersonal && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-blue-500/20 rounded-xl bg-blue-500/[0.03] overflow-hidden"
        >
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-blue-500/10">
            <Dumbbell className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-semibold text-blue-500">Alunos sem treino ativo</span>
            <Badge variant="outline" className="ml-auto text-[10px] border-blue-500/30 text-blue-500">
              {studentsNoWorkout.length}
            </Badge>
          </div>
          <ScrollArea className={studentsNoWorkout.length > 4 ? "h-[160px]" : ""}>
            <div className="p-2 space-y-1">
              {studentsNoWorkout.map((s, i) => (
                <motion.button
                  key={s.student_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                  onClick={() => navigate(`/personal/workouts?student=${s.student_id}`)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-blue-500/10 transition-all group text-left"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{s.full_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Matriculado em {new Date(s.enrolled_date).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Dumbbell className="w-3.5 h-3.5 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                  </div>
                </motion.button>
              ))}
            </div>
          </ScrollArea>
        </motion.div>
      )}
    </div>
  );
}
