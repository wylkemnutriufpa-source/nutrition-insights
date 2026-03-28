
-- ═══════════════════════════════════════════════════════
-- FITJOURNEY — HARDENING DE SEGURANÇA RLS (FASE FINAL)
-- ═══════════════════════════════════════════════════════
-- Corrige 14 tabelas com USING(true) ou RLS desabilitado
-- Padrão: paciente=own, nutricionista=scoped, admin=full, logs=admin-only
-- ═══════════════════════════════════════════════════════

-- ╔═══════════════════════════════════════════════════════╗
-- ║ 1. lifecycle_repair_logs (RLS DESABILITADO)          ║
-- ║    Logs internos → apenas admin                      ║
-- ╚═══════════════════════════════════════════════════════╝
ALTER TABLE public.lifecycle_repair_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_select_lifecycle_repair_logs"
ON public.lifecycle_repair_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_insert_lifecycle_repair_logs"
ON public.lifecycle_repair_logs FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_update_lifecycle_repair_logs"
ON public.lifecycle_repair_logs FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_delete_lifecycle_repair_logs"
ON public.lifecycle_repair_logs FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ╔═══════════════════════════════════════════════════════╗
-- ║ 2. patient_clinical_learning_profile                 ║
-- ║    Dados clínicos do paciente → patient/nutri/admin  ║
-- ╚═══════════════════════════════════════════════════════╝
-- Remover policy permissiva de SELECT
DROP POLICY IF EXISTS "Authenticated read learning profile" ON public.patient_clinical_learning_profile;

-- Paciente vê apenas seu próprio perfil
CREATE POLICY "patient_select_own_learning_profile"
ON public.patient_clinical_learning_profile FOR SELECT TO authenticated
USING (patient_id = auth.uid());

-- Admin vê tudo
CREATE POLICY "admin_select_all_learning_profiles"
ON public.patient_clinical_learning_profile FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Nota: policy "Professionals can read learning profiles" já existe e está correta (scoped via nutritionist_patients)

-- INSERT: sistema/admin pode inserir
CREATE POLICY "admin_insert_learning_profile"
ON public.patient_clinical_learning_profile FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- UPDATE: admin ou nutricionista vinculado
CREATE POLICY "admin_update_learning_profile"
ON public.patient_clinical_learning_profile FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "nutri_update_learning_profile"
ON public.patient_clinical_learning_profile FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.nutritionist_patients
    WHERE nutritionist_patients.patient_id = patient_clinical_learning_profile.patient_id
    AND nutritionist_patients.nutritionist_id = auth.uid()
    AND nutritionist_patients.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.nutritionist_patients
    WHERE nutritionist_patients.patient_id = patient_clinical_learning_profile.patient_id
    AND nutritionist_patients.nutritionist_id = auth.uid()
    AND nutritionist_patients.status = 'active'
  )
);

-- ╔═══════════════════════════════════════════════════════╗
-- ║ 3. patient_relationship_scores                       ║
-- ║    Scores de relacionamento → patient/nutri/admin    ║
-- ╚═══════════════════════════════════════════════════════╝
DROP POLICY IF EXISTS "Authenticated read relationship scores" ON public.patient_relationship_scores;

CREATE POLICY "patient_select_own_relationship_scores"
ON public.patient_relationship_scores FOR SELECT TO authenticated
USING (patient_id = auth.uid());

CREATE POLICY "nutri_select_relationship_scores"
ON public.patient_relationship_scores FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.nutritionist_patients
    WHERE nutritionist_patients.patient_id = patient_relationship_scores.patient_id
    AND nutritionist_patients.nutritionist_id = auth.uid()
  )
);

CREATE POLICY "admin_select_all_relationship_scores"
ON public.patient_relationship_scores FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Escrita: admin e nutricionista vinculado
CREATE POLICY "admin_manage_relationship_scores"
ON public.patient_relationship_scores FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "nutri_insert_relationship_scores"
ON public.patient_relationship_scores FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.nutritionist_patients
    WHERE nutritionist_patients.patient_id = patient_relationship_scores.patient_id
    AND nutritionist_patients.nutritionist_id = auth.uid()
  )
);

CREATE POLICY "nutri_update_relationship_scores"
ON public.patient_relationship_scores FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.nutritionist_patients
    WHERE nutritionist_patients.patient_id = patient_relationship_scores.patient_id
    AND nutritionist_patients.nutritionist_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.nutritionist_patients
    WHERE nutritionist_patients.patient_id = patient_relationship_scores.patient_id
    AND nutritionist_patients.nutritionist_id = auth.uid()
  )
);

-- ╔═══════════════════════════════════════════════════════╗
-- ║ 4. clinical_decisions                                ║
-- ║    Decisões clínicas → patient/nutri/admin           ║
-- ╚═══════════════════════════════════════════════════════╝
DROP POLICY IF EXISTS "Authenticated read clinical decisions" ON public.clinical_decisions;
DROP POLICY IF EXISTS "Pro insert clinical decisions" ON public.clinical_decisions;
DROP POLICY IF EXISTS "Pro update clinical decisions" ON public.clinical_decisions;

-- SELECT
CREATE POLICY "patient_select_own_clinical_decisions"
ON public.clinical_decisions FOR SELECT TO authenticated
USING (patient_id = auth.uid());

CREATE POLICY "nutri_select_clinical_decisions"
ON public.clinical_decisions FOR SELECT TO authenticated
USING (nutritionist_id = auth.uid());

CREATE POLICY "admin_select_all_clinical_decisions"
ON public.clinical_decisions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- INSERT: nutricionista vinculado ou admin
CREATE POLICY "nutri_insert_clinical_decisions"
ON public.clinical_decisions FOR INSERT TO authenticated
WITH CHECK (nutritionist_id = auth.uid());

CREATE POLICY "admin_insert_clinical_decisions"
ON public.clinical_decisions FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- UPDATE: nutricionista dono ou admin
CREATE POLICY "nutri_update_clinical_decisions"
ON public.clinical_decisions FOR UPDATE TO authenticated
USING (nutritionist_id = auth.uid())
WITH CHECK (nutritionist_id = auth.uid());

CREATE POLICY "admin_update_clinical_decisions"
ON public.clinical_decisions FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ╔═══════════════════════════════════════════════════════╗
-- ║ 5. relationship_notes                                ║
-- ║    Notas de relacionamento → patient/nutri/admin     ║
-- ╚═══════════════════════════════════════════════════════╝
DROP POLICY IF EXISTS "Pro manage relationship notes" ON public.relationship_notes;

CREATE POLICY "patient_select_own_relationship_notes"
ON public.relationship_notes FOR SELECT TO authenticated
USING (patient_id = auth.uid());

CREATE POLICY "nutri_select_relationship_notes"
ON public.relationship_notes FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.nutritionist_patients
    WHERE nutritionist_patients.patient_id = relationship_notes.patient_id
    AND nutritionist_patients.nutritionist_id = auth.uid()
  )
);

CREATE POLICY "admin_select_relationship_notes"
ON public.relationship_notes FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "nutri_insert_relationship_notes"
ON public.relationship_notes FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.nutritionist_patients
    WHERE nutritionist_patients.patient_id = relationship_notes.patient_id
    AND nutritionist_patients.nutritionist_id = auth.uid()
  )
);

CREATE POLICY "nutri_update_relationship_notes"
ON public.relationship_notes FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.nutritionist_patients
    WHERE nutritionist_patients.patient_id = relationship_notes.patient_id
    AND nutritionist_patients.nutritionist_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.nutritionist_patients
    WHERE nutritionist_patients.patient_id = relationship_notes.patient_id
    AND nutritionist_patients.nutritionist_id = auth.uid()
  )
);

CREATE POLICY "admin_manage_relationship_notes"
ON public.relationship_notes FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ╔═══════════════════════════════════════════════════════╗
-- ║ 6. campaigns                                         ║
-- ║    Campanhas → criador ou admin                      ║
-- ╚═══════════════════════════════════════════════════════╝
DROP POLICY IF EXISTS "Admin manage campaigns" ON public.campaigns;

CREATE POLICY "creator_select_own_campaigns"
ON public.campaigns FOR SELECT TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "admin_select_all_campaigns"
ON public.campaigns FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "creator_insert_campaigns"
ON public.campaigns FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "admin_insert_campaigns"
ON public.campaigns FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "creator_update_campaigns"
ON public.campaigns FOR UPDATE TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "admin_manage_campaigns"
ON public.campaigns FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ╔═══════════════════════════════════════════════════════╗
-- ║ 7. campaign_deliveries                               ║
-- ║    Entregas de campanha → admin only                 ║
-- ╚═══════════════════════════════════════════════════════╝
DROP POLICY IF EXISTS "Admin manage deliveries" ON public.campaign_deliveries;

CREATE POLICY "admin_manage_campaign_deliveries"
ON public.campaign_deliveries FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Nutricionista vê entregas das suas campanhas
CREATE POLICY "creator_select_own_deliveries"
ON public.campaign_deliveries FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = campaign_deliveries.campaign_id
    AND campaigns.created_by = auth.uid()
  )
);

-- ╔═══════════════════════════════════════════════════════╗
-- ║ 8. global_action_logs                                ║
-- ║    Logs internos → apenas admin                      ║
-- ╚═══════════════════════════════════════════════════════╝
DROP POLICY IF EXISTS "Admin manage action logs" ON public.global_action_logs;

CREATE POLICY "admin_select_global_action_logs"
ON public.global_action_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_insert_global_action_logs"
ON public.global_action_logs FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ╔═══════════════════════════════════════════════════════╗
-- ║ 9. workout_student_learning_profile                  ║
-- ║    Perfil de treino → student/personal/admin         ║
-- ╚═══════════════════════════════════════════════════════╝
DROP POLICY IF EXISTS "System can manage profiles" ON public.workout_student_learning_profile;

-- SELECT já existe: "Profiles viewable by linked users" (student_id/personal_id = auth.uid())
-- Adicionar admin
CREATE POLICY "admin_select_all_workout_profiles"
ON public.workout_student_learning_profile FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- INSERT: personal ou admin
CREATE POLICY "personal_insert_workout_profile"
ON public.workout_student_learning_profile FOR INSERT TO authenticated
WITH CHECK (personal_id = auth.uid());

CREATE POLICY "admin_insert_workout_profile"
ON public.workout_student_learning_profile FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- UPDATE: personal vinculado ou admin
CREATE POLICY "personal_update_workout_profile"
ON public.workout_student_learning_profile FOR UPDATE TO authenticated
USING (personal_id = auth.uid())
WITH CHECK (personal_id = auth.uid());

CREATE POLICY "admin_update_workout_profile"
ON public.workout_student_learning_profile FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ╔═══════════════════════════════════════════════════════╗
-- ║ 10. system_diagnostic_entries                        ║
-- ║     Logs de diagnóstico → apenas admin               ║
-- ╚═══════════════════════════════════════════════════════╝
DROP POLICY IF EXISTS "Admins can read diagnostic entries" ON public.system_diagnostic_entries;
DROP POLICY IF EXISTS "Admins can insert diagnostic entries" ON public.system_diagnostic_entries;

CREATE POLICY "admin_select_diagnostic_entries"
ON public.system_diagnostic_entries FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_insert_diagnostic_entries"
ON public.system_diagnostic_entries FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ╔═══════════════════════════════════════════════════════╗
-- ║ 11. silent_failures_monitor                          ║
-- ║     Logs de falhas silenciosas → apenas admin        ║
-- ╚═══════════════════════════════════════════════════════╝
DROP POLICY IF EXISTS "Read silent failures" ON public.silent_failures_monitor;
DROP POLICY IF EXISTS "Insert silent failures auth" ON public.silent_failures_monitor;

CREATE POLICY "admin_select_silent_failures"
ON public.silent_failures_monitor FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_insert_silent_failures"
ON public.silent_failures_monitor FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ╔═══════════════════════════════════════════════════════╗
-- ║ 12. regression_guard_logs                            ║
-- ║     Logs de regressão → apenas admin                 ║
-- ╚═══════════════════════════════════════════════════════╝
DROP POLICY IF EXISTS "Authenticated users can read regression logs" ON public.regression_guard_logs;
DROP POLICY IF EXISTS "Authenticated users can insert regression logs" ON public.regression_guard_logs;

CREATE POLICY "admin_select_regression_guard_logs"
ON public.regression_guard_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_insert_regression_guard_logs"
ON public.regression_guard_logs FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ╔═══════════════════════════════════════════════════════╗
-- ║ 13. system_performance_logs                          ║
-- ║     Logs de performance → apenas admin               ║
-- ╚═══════════════════════════════════════════════════════╝
DROP POLICY IF EXISTS "Read perf logs" ON public.system_performance_logs;
DROP POLICY IF EXISTS "Insert perf logs auth" ON public.system_performance_logs;

CREATE POLICY "admin_select_performance_logs"
ON public.system_performance_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_insert_performance_logs"
ON public.system_performance_logs FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ╔═══════════════════════════════════════════════════════╗
-- ║ 14. system_error_logs                                ║
-- ║     Já tem policies corretas (user_id = auth.uid())  ║
-- ║     Adicionando apenas admin override                ║
-- ╚═══════════════════════════════════════════════════════╝
CREATE POLICY "admin_select_all_error_logs"
ON public.system_error_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_insert_error_logs"
ON public.system_error_logs FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
