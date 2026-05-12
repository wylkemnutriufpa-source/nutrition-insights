import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PatientWorkoutView from "@/components/workout/PatientWorkoutView";

export default function PatientWorkouts() {
  return (
    <DashboardLayout>
      <PatientWorkoutView />
    </DashboardLayout>
  );
}
