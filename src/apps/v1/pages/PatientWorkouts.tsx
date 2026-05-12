import { useEffect, useState } from "react";
import { useAuth } from "@v1/lib/auth";
import { supabase } from "@v1/integrations/supabase/client";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import PatientWorkoutView from "@v1/components/workout/PatientWorkoutView";

export default function PatientWorkouts() {
  return (
    <DashboardLayout>
      <PatientWorkoutView />
    </DashboardLayout>
  );
}
