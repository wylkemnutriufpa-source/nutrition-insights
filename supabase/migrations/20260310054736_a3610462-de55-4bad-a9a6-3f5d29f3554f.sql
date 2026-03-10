
-- =============================================
-- ADMIN GLOBAL VISIBILITY POLICIES
-- Add SELECT (and where needed ALL) policies for admins
-- on all professional-scoped and patient-data tables
-- =============================================

-- 1. nutritionist_patients
CREATE POLICY "Admins can view all nutritionist_patients"
ON public.nutritionist_patients FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. meal_plans
CREATE POLICY "Admins can view all meal_plans"
ON public.meal_plans FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 3. meal_plan_items
CREATE POLICY "Admins can view all meal_plan_items"
ON public.meal_plan_items FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4. patient_appointments
CREATE POLICY "Admins can view all appointments"
ON public.patient_appointments FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 5. patient_checkins
CREATE POLICY "Admins can view all checkins"
ON public.patient_checkins FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 6. patient_documents
CREATE POLICY "Admins can view all documents"
ON public.patient_documents FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 7. patient_supplements
CREATE POLICY "Admins can view all supplements"
ON public.patient_supplements FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 8. patient_protocols
CREATE POLICY "Admins can view all patient_protocols"
ON public.patient_protocols FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 9. financial_transactions
CREATE POLICY "Admins can view all financial_transactions"
ON public.financial_transactions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 10. programs
CREATE POLICY "Admins can view all programs"
ON public.programs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 11. protocols
CREATE POLICY "Admins can view all protocols"
ON public.protocols FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 12. protocol_tasks
CREATE POLICY "Admins can view all protocol_tasks"
ON public.protocol_tasks FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 13. recipes
CREATE POLICY "Admins can view all recipes"
ON public.recipes FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 14. body_analyses
CREATE POLICY "Admins can view all body_analyses"
ON public.body_analyses FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 15. feedbacks
CREATE POLICY "Admins can view all feedbacks"
ON public.feedbacks FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 16. global_tips
CREATE POLICY "Admins can view all global_tips"
ON public.global_tips FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 17. branding_settings
CREATE POLICY "Admins can view all branding_settings"
ON public.branding_settings FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 18. automation_rules
CREATE POLICY "Admins can view all automation_rules"
ON public.automation_rules FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 19. automation_runs
CREATE POLICY "Admins can view all automation_runs"
ON public.automation_runs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 20. profiles (admin sees all profiles)
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 21. player_stats
CREATE POLICY "Admins can view all player_stats"
ON public.player_stats FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 22. meals
CREATE POLICY "Admins can view all meals"
ON public.meals FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 23. checklist_tasks
CREATE POLICY "Admins can view all checklist_tasks"
ON public.checklist_tasks FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 24. meal_item_completions
CREATE POLICY "Admins can view all meal_item_completions"
ON public.meal_item_completions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 25. patient_anamnesis
CREATE POLICY "Admins can view all patient_anamnesis"
ON public.patient_anamnesis FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 26. anamnesis_ai_insights
CREATE POLICY "Admins can view all anamnesis_insights"
ON public.anamnesis_ai_insights FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 27. patient_timeline
CREATE POLICY "Admins can view all patient_timeline"
ON public.patient_timeline FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 28. patient_tips
CREATE POLICY "Admins can view all patient_tips"
ON public.patient_tips FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 29. patient_recommendations
CREATE POLICY "Admins can view all patient_recommendations"
ON public.patient_recommendations FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 30. notifications
CREATE POLICY "Admins can view all notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 31. chat_messages
CREATE POLICY "Admins can view all chat_messages"
ON public.chat_messages FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 32. shopping_list_items
CREATE POLICY "Admins can view all shopping_list_items"
ON public.shopping_list_items FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 33. supplement_logs
CREATE POLICY "Admins can view all supplement_logs"
ON public.supplement_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 34. patient_favorite_recipes
CREATE POLICY "Admins can view all favorite_recipes"
ON public.patient_favorite_recipes FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 35. program_patients
CREATE POLICY "Admins can view all program_patients"
ON public.program_patients FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 36. program_phases
CREATE POLICY "Admins can view all program_phases"
ON public.program_phases FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 37. program_patient_progress
CREATE POLICY "Admins can view all program_progress"
ON public.program_patient_progress FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 38. program_timeline
CREATE POLICY "Admins can view all program_timeline"
ON public.program_timeline FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 39. plan_schedules
CREATE POLICY "Admins can view all plan_schedules"
ON public.plan_schedules FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 40. saved_meals
CREATE POLICY "Admins can view all saved_meals"
ON public.saved_meals FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 41. saved_plan_templates
CREATE POLICY "Admins can view all plan_templates"
ON public.saved_plan_templates FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 42. physical_assessments
CREATE POLICY "Admins can view all physical_assessments"
ON public.physical_assessments FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 43. patient_checkins (admin needs to see all)
-- Already covered above

-- 44. push_subscriptions
CREATE POLICY "Admins can view all push_subscriptions"
ON public.push_subscriptions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 45. user_roles (admin can view all roles)
CREATE POLICY "Admins can view all user_roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 46. challenges (admin can manage)
CREATE POLICY "Admins can manage challenges"
ON public.challenges FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
