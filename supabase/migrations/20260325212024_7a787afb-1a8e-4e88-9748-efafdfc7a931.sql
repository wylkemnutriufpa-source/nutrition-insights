
-- ============================================
-- EXERCISES LIBRARY (Global + Personal custom)
-- ============================================
CREATE TABLE IF NOT EXISTS public.exercises_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  muscle_group text NOT NULL DEFAULT 'Outro',
  sub_group text,
  equipment text DEFAULT 'peso_livre',
  level text DEFAULT 'intermediario',
  exercise_type text DEFAULT 'peso_livre',
  description text,
  execution_tips text,
  common_mistakes text,
  video_url text,
  thumbnail_url text,
  tags text[] DEFAULT '{}',
  is_system boolean DEFAULT false,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.exercises_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exercises_library_select" ON public.exercises_library FOR SELECT TO authenticated
  USING (is_system = true OR created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "exercises_library_insert" ON public.exercises_library FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "exercises_library_update" ON public.exercises_library FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "exercises_library_delete" ON public.exercises_library FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_exercises_library_muscle ON public.exercises_library(muscle_group);
CREATE INDEX idx_exercises_library_system ON public.exercises_library(is_system);

-- ============================================
-- ADD GROUP COLUMNS TO workout_exercises
-- ============================================
ALTER TABLE public.workout_exercises
  ADD COLUMN IF NOT EXISTS group_id uuid,
  ADD COLUMN IF NOT EXISTS group_type text DEFAULT 'single',
  ADD COLUMN IF NOT EXISTS group_order int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS exercise_library_id uuid REFERENCES public.exercises_library(id),
  ADD COLUMN IF NOT EXISTS rpe numeric,
  ADD COLUMN IF NOT EXISTS cadence text,
  ADD COLUMN IF NOT EXISTS method_label text;

-- ============================================
-- WORKOUT TEMPLATES
-- ============================================
CREATE TABLE IF NOT EXISTS public.workout_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text DEFAULT 'general',
  objective text DEFAULT 'general',
  level text DEFAULT 'intermediario',
  is_system boolean DEFAULT false,
  created_by uuid,
  tags text[] DEFAULT '{}',
  thumbnail_url text,
  routines_json jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wt_select" ON public.workout_templates FOR SELECT TO authenticated
  USING (is_system = true OR created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "wt_insert" ON public.workout_templates FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "wt_update" ON public.workout_templates FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "wt_delete" ON public.workout_templates FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ============================================
-- TRAINER ASSESSMENT (Anamnese do Personal)
-- ============================================
CREATE TABLE IF NOT EXISTS public.trainer_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  trainer_id uuid NOT NULL,
  joint_pain jsonb DEFAULT '[]',
  injuries jsonb DEFAULT '[]',
  surgeries jsonb DEFAULT '[]',
  movement_restrictions text,
  training_experience text DEFAULT 'beginner',
  weekly_availability int DEFAULT 3,
  training_preference text,
  available_equipment text[] DEFAULT '{}',
  medical_clearance boolean DEFAULT false,
  medical_clearance_notes text,
  goals text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(patient_id, trainer_id)
);

ALTER TABLE public.trainer_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ta_select" ON public.trainer_assessments FOR SELECT TO authenticated
  USING (
    trainer_id = auth.uid()
    OR patient_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "ta_insert" ON public.trainer_assessments FOR INSERT TO authenticated
  WITH CHECK (trainer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ta_update" ON public.trainer_assessments FOR UPDATE TO authenticated
  USING (trainer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ============================================
-- TRAINING FEEDBACK (Pain/Discomfort per exercise)
-- ============================================
CREATE TABLE IF NOT EXISTS public.training_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  exercise_id uuid,
  exercise_name text,
  completion_id uuid REFERENCES public.workout_completions(id),
  feedback_type text NOT NULL DEFAULT 'general',
  pain_level int,
  pain_location text,
  difficulty_rating int,
  could_not_execute boolean DEFAULT false,
  substituted_with text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.training_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tf_select" ON public.training_feedback FOR SELECT TO authenticated
  USING (
    patient_id = auth.uid()
    OR public.is_linked_professional(auth.uid(), patient_id)
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "tf_insert" ON public.training_feedback FOR INSERT TO authenticated
  WITH CHECK (patient_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ============================================
-- SEED: System exercise library
-- ============================================
INSERT INTO public.exercises_library (name, muscle_group, sub_group, equipment, level, exercise_type, description, is_system, tags) VALUES
  ('Supino Reto com Barra', 'Peito', 'Peitoral Maior', 'barra', 'intermediario', 'peso_livre', 'Exercício composto para peitoral', true, ARRAY['composto', 'peito', 'push']),
  ('Supino Inclinado com Halteres', 'Peito', 'Peitoral Superior', 'halteres', 'intermediario', 'peso_livre', 'Foco no peitoral superior', true, ARRAY['composto', 'peito', 'push']),
  ('Crucifixo com Halteres', 'Peito', 'Peitoral Maior', 'halteres', 'iniciante', 'peso_livre', 'Isolamento para peitoral', true, ARRAY['isolamento', 'peito']),
  ('Peck Deck', 'Peito', 'Peitoral Maior', 'maquina', 'iniciante', 'maquina', 'Isolamento em máquina', true, ARRAY['isolamento', 'peito', 'maquina']),
  ('Flexão de Braço', 'Peito', 'Peitoral Maior', 'peso_corporal', 'iniciante', 'funcional', 'Exercício funcional para peito e tríceps', true, ARRAY['funcional', 'peito', 'triceps']),
  ('Puxada Frontal', 'Costas', 'Dorsal', 'maquina', 'iniciante', 'maquina', 'Puxada com pegada aberta', true, ARRAY['composto', 'costas', 'pull']),
  ('Remada Curvada', 'Costas', 'Dorsal', 'barra', 'intermediario', 'peso_livre', 'Exercício composto para costas', true, ARRAY['composto', 'costas', 'pull']),
  ('Remada Unilateral', 'Costas', 'Dorsal', 'halteres', 'iniciante', 'peso_livre', 'Remada com um braço', true, ARRAY['composto', 'costas', 'unilateral']),
  ('Pulldown', 'Costas', 'Dorsal', 'maquina', 'iniciante', 'maquina', 'Puxada na polia alta', true, ARRAY['composto', 'costas', 'maquina']),
  ('Barra Fixa', 'Costas', 'Dorsal', 'peso_corporal', 'avancado', 'funcional', 'Pull-up', true, ARRAY['composto', 'costas', 'funcional']),
  ('Desenvolvimento com Halteres', 'Ombros', 'Deltóide Anterior', 'halteres', 'intermediario', 'peso_livre', 'Press para ombros', true, ARRAY['composto', 'ombros', 'push']),
  ('Elevação Lateral', 'Ombros', 'Deltóide Lateral', 'halteres', 'iniciante', 'peso_livre', 'Isolamento lateral do deltóide', true, ARRAY['isolamento', 'ombros']),
  ('Elevação Frontal', 'Ombros', 'Deltóide Anterior', 'halteres', 'iniciante', 'peso_livre', 'Isolamento frontal do deltóide', true, ARRAY['isolamento', 'ombros']),
  ('Rosca Direta', 'Bíceps', 'Bíceps Braquial', 'barra', 'iniciante', 'peso_livre', 'Flexão de cotovelo com barra', true, ARRAY['isolamento', 'biceps']),
  ('Rosca Alternada', 'Bíceps', 'Bíceps Braquial', 'halteres', 'iniciante', 'peso_livre', 'Rosca alternada com halteres', true, ARRAY['isolamento', 'biceps']),
  ('Rosca Martelo', 'Bíceps', 'Braquiorradial', 'halteres', 'iniciante', 'peso_livre', 'Rosca com pegada neutra', true, ARRAY['isolamento', 'biceps']),
  ('Tríceps Testa', 'Tríceps', 'Tríceps Braquial', 'barra', 'intermediario', 'peso_livre', 'Extensão de tríceps deitado', true, ARRAY['isolamento', 'triceps']),
  ('Tríceps Pulley', 'Tríceps', 'Tríceps Braquial', 'maquina', 'iniciante', 'maquina', 'Extensão de tríceps na polia', true, ARRAY['isolamento', 'triceps', 'maquina']),
  ('Tríceps Francês', 'Tríceps', 'Tríceps Braquial', 'halteres', 'intermediario', 'peso_livre', 'Extensão de tríceps atrás da cabeça', true, ARRAY['isolamento', 'triceps']),
  ('Agachamento Livre', 'Pernas', 'Quadríceps', 'barra', 'intermediario', 'peso_livre', 'Exercício rei para pernas', true, ARRAY['composto', 'pernas', 'quadriceps']),
  ('Leg Press 45°', 'Pernas', 'Quadríceps', 'maquina', 'iniciante', 'maquina', 'Press de pernas na máquina', true, ARRAY['composto', 'pernas', 'maquina']),
  ('Cadeira Extensora', 'Pernas', 'Quadríceps', 'maquina', 'iniciante', 'maquina', 'Isolamento de quadríceps', true, ARRAY['isolamento', 'pernas', 'maquina']),
  ('Mesa Flexora', 'Pernas', 'Posterior', 'maquina', 'iniciante', 'maquina', 'Isolamento de posterior de coxa', true, ARRAY['isolamento', 'pernas', 'maquina']),
  ('Stiff', 'Pernas', 'Posterior', 'barra', 'intermediario', 'peso_livre', 'Levantamento terra romeno', true, ARRAY['composto', 'pernas', 'posterior']),
  ('Agachamento Búlgaro', 'Pernas', 'Quadríceps', 'halteres', 'intermediario', 'peso_livre', 'Agachamento unilateral', true, ARRAY['composto', 'pernas', 'unilateral']),
  ('Elevação Pélvica (Hip Thrust)', 'Glúteos', 'Glúteo Máximo', 'barra', 'intermediario', 'peso_livre', 'Exercício principal para glúteos', true, ARRAY['composto', 'gluteos']),
  ('Abdução de Quadril', 'Glúteos', 'Glúteo Médio', 'maquina', 'iniciante', 'maquina', 'Abdução na máquina', true, ARRAY['isolamento', 'gluteos', 'maquina']),
  ('Panturrilha em Pé', 'Panturrilha', 'Gastrocnêmio', 'maquina', 'iniciante', 'maquina', 'Flexão plantar em pé', true, ARRAY['isolamento', 'panturrilha']),
  ('Panturrilha Sentado', 'Panturrilha', 'Sóleo', 'maquina', 'iniciante', 'maquina', 'Flexão plantar sentado', true, ARRAY['isolamento', 'panturrilha']),
  ('Abdominal Crunch', 'Core', 'Reto Abdominal', 'peso_corporal', 'iniciante', 'funcional', 'Flexão de tronco básica', true, ARRAY['isolamento', 'core']),
  ('Prancha', 'Core', 'Transverso', 'peso_corporal', 'iniciante', 'funcional', 'Isometria para core', true, ARRAY['isometria', 'core', 'funcional']),
  ('Russian Twist', 'Core', 'Oblíquos', 'peso_corporal', 'iniciante', 'funcional', 'Rotação com carga', true, ARRAY['funcional', 'core']),
  ('Levantamento Terra', 'Costas', 'Lombar', 'barra', 'avancado', 'peso_livre', 'Exercício composto fundamental', true, ARRAY['composto', 'costas', 'pernas']),
  ('Burpee', 'Cardio', 'Full Body', 'peso_corporal', 'intermediario', 'funcional', 'Exercício funcional cardio', true, ARRAY['cardio', 'funcional', 'full_body']),
  ('Corrida Esteira', 'Cardio', 'Aeróbico', 'maquina', 'iniciante', 'cardio', 'Corrida em esteira', true, ARRAY['cardio', 'aerobico']),
  ('Bicicleta Ergométrica', 'Cardio', 'Aeróbico', 'maquina', 'iniciante', 'cardio', 'Pedalar na bike', true, ARRAY['cardio', 'aerobico']),
  ('Elíptico', 'Cardio', 'Aeróbico', 'maquina', 'iniciante', 'cardio', 'Movimento de elíptico', true, ARRAY['cardio', 'aerobico']),
  ('Passada / Avanço', 'Pernas', 'Quadríceps', 'halteres', 'iniciante', 'peso_livre', 'Lunge / passada', true, ARRAY['composto', 'pernas', 'unilateral']),
  ('Face Pull', 'Ombros', 'Deltóide Posterior', 'maquina', 'iniciante', 'maquina', 'Puxada para face', true, ARRAY['isolamento', 'ombros', 'posterior']),
  ('Remada Cavalinho', 'Costas', 'Dorsal', 'maquina', 'intermediario', 'maquina', 'Remada na máquina', true, ARRAY['composto', 'costas', 'maquina']);
