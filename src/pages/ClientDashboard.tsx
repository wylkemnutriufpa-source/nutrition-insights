import React, { useEffect, useState, useMemo } from "react";
import { useExperienceMode } from "@/hooks/useExperienceMode";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEngagement } from "@/hooks/useEngagement";

const PatientDailyFocusHero = () => null;
const ClinicalInsightsCard = () => null;

export default function ClientDashboard() {
  const { user, profile, isPatient, isNutritionist, isPersonal, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const isPro = isNutritionist || isPersonal || isAdmin;
    if (isPro && !isPatient) {
      navigate("/dashboard", { replace: true });
    }
  }, [isPatient, isNutritionist, isPersonal, isAdmin, navigate]);

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold">Dashboard do Paciente</h1>
        <p className="mt-4">Bem-vindo, {profile?.full_name}!</p>
      </div>
    </DashboardLayout>
  );
}