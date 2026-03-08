
-- ============================================
-- ENUM TYPES
-- ============================================
CREATE TYPE public.app_role AS ENUM ('nutritionist', 'patient');
CREATE TYPE public.meal_type AS ENUM ('breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'evening_snack');
CREATE TYPE public.challenge_status AS ENUM ('active', 'completed', 'expired');
CREATE TYPE public.achievement_type AS ENUM ('streak', 'meals_logged', 'challenge_completed', 'xp_milestone', 'consistency', 'variety');

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- USER ROLES TABLE
-- ============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- NUTRITIONIST-PATIENT RELATIONSHIP
-- ============================================
CREATE TABLE public.nutritionist_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(nutritionist_id, patient_id)
);

ALTER TABLE public.nutritionist_patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists can view their patients" ON public.nutritionist_patients FOR SELECT
  USING (auth.uid() = nutritionist_id OR auth.uid() = patient_id);
CREATE POLICY "Nutritionists can add patients" ON public.nutritionist_patients FOR INSERT
  WITH CHECK (auth.uid() = nutritionist_id AND public.has_role(auth.uid(), 'nutritionist'));
CREATE POLICY "Nutritionists can update their patients" ON public.nutritionist_patients FOR UPDATE
  USING (auth.uid() = nutritionist_id);
CREATE POLICY "Nutritionists can remove patients" ON public.nutritionist_patients FOR DELETE
  USING (auth.uid() = nutritionist_id);

-- ============================================
-- MEAL PLANS
-- ============================================
CREATE TABLE public.meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists and patients can view meal plans" ON public.meal_plans FOR SELECT
  USING (auth.uid() = nutritionist_id OR auth.uid() = patient_id);
CREATE POLICY "Nutritionists can create meal plans" ON public.meal_plans FOR INSERT
  WITH CHECK (auth.uid() = nutritionist_id AND public.has_role(auth.uid(), 'nutritionist'));
CREATE POLICY "Nutritionists can update meal plans" ON public.meal_plans FOR UPDATE
  USING (auth.uid() = nutritionist_id);
CREATE POLICY "Nutritionists can delete meal plans" ON public.meal_plans FOR DELETE
  USING (auth.uid() = nutritionist_id);

-- ============================================
-- MEAL PLAN ITEMS
-- ============================================
CREATE TABLE public.meal_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id UUID NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  meal_type meal_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  calories_target INTEGER,
  protein_target NUMERIC(6,1),
  carbs_target NUMERIC(6,1),
  fat_target NUMERIC(6,1),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meal_plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view meal plan items via plan" ON public.meal_plan_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.meal_plans mp WHERE mp.id = meal_plan_id 
    AND (auth.uid() = mp.nutritionist_id OR auth.uid() = mp.patient_id)
  ));
CREATE POLICY "Nutritionists can manage meal plan items" ON public.meal_plan_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.meal_plans mp WHERE mp.id = meal_plan_id AND auth.uid() = mp.nutritionist_id
  ));
CREATE POLICY "Nutritionists can update meal plan items" ON public.meal_plan_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.meal_plans mp WHERE mp.id = meal_plan_id AND auth.uid() = mp.nutritionist_id
  ));
CREATE POLICY "Nutritionists can delete meal plan items" ON public.meal_plan_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.meal_plans mp WHERE mp.id = meal_plan_id AND auth.uid() = mp.nutritionist_id
  ));

-- ============================================
-- MEALS (logged by patients)
-- ============================================
CREATE TABLE public.meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_type meal_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  calories INTEGER,
  protein NUMERIC(6,1),
  carbs NUMERIC(6,1),
  fat NUMERIC(6,1),
  fiber NUMERIC(6,1),
  ai_analyzed BOOLEAN NOT NULL DEFAULT false,
  ai_feedback TEXT,
  ai_score INTEGER CHECK (ai_score BETWEEN 0 AND 100),
  xp_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meals" ON public.meals FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.nutritionist_patients np 
    WHERE np.patient_id = meals.user_id AND np.nutritionist_id = auth.uid() AND np.status = 'active'
  ));
CREATE POLICY "Users can log meals" ON public.meals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meals" ON public.meals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own meals" ON public.meals FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- GAMIFICATION: PLAYER STATS
-- ============================================
CREATE TABLE public.player_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  meals_logged INTEGER NOT NULL DEFAULT 0,
  last_meal_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stats" ON public.player_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own stats" ON public.player_stats FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own stats" ON public.player_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Nutritionists can view patient stats" ON public.player_stats FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.nutritionist_patients np 
    WHERE np.patient_id = player_stats.user_id AND np.nutritionist_id = auth.uid() AND np.status = 'active'
  ));

-- ============================================
-- ACHIEVEMENTS / BADGES
-- ============================================
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏆',
  type achievement_type NOT NULL,
  requirement_value INTEGER NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view achievements" ON public.achievements FOR SELECT USING (true);

CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can earn achievements" ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Nutritionists can view patient achievements" ON public.user_achievements FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.nutritionist_patients np 
    WHERE np.patient_id = user_achievements.user_id AND np.nutritionist_id = auth.uid() AND np.status = 'active'
  ));

-- ============================================
-- CHALLENGES
-- ============================================
CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🎯',
  xp_reward INTEGER NOT NULL DEFAULT 100,
  target_value INTEGER NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('meals_logged', 'streak_days', 'calories_target', 'variety')),
  duration_days INTEGER NOT NULL DEFAULT 7,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_global BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view global challenges" ON public.challenges FOR SELECT USING (is_global = true OR auth.uid() = created_by);
CREATE POLICY "Nutritionists can create challenges" ON public.challenges FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'nutritionist'));

CREATE TABLE public.user_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  status challenge_status NOT NULL DEFAULT 'active',
  progress INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, challenge_id)
);

ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own challenges" ON public.user_challenges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can join challenges" ON public.user_challenges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own challenge progress" ON public.user_challenges FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- STORAGE BUCKET FOR MEAL IMAGES
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('meal-images', 'meal-images', true);

CREATE POLICY "Users can upload meal images" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'meal-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Meal images are publicly accessible" ON storage.objects FOR SELECT
  USING (bucket_id = 'meal-images');
CREATE POLICY "Users can delete own meal images" ON storage.objects FOR DELETE
  USING (bucket_id = 'meal-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- TRIGGER: auto-create profile + stats on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  INSERT INTO public.player_stats (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- TRIGGER: update timestamps
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_meal_plans_updated_at BEFORE UPDATE ON public.meal_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_player_stats_updated_at BEFORE UPDATE ON public.player_stats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- SEED: Default achievements
-- ============================================
INSERT INTO public.achievements (name, description, icon, type, requirement_value, xp_reward) VALUES
  ('Primeira Refeição', 'Registrou sua primeira refeição', '🥗', 'meals_logged', 1, 25),
  ('Maratonista', 'Registrou 10 refeições', '🏃', 'meals_logged', 10, 50),
  ('Centurião', 'Registrou 100 refeições', '💯', 'meals_logged', 100, 200),
  ('Fogo Aceso', 'Manteve streak de 3 dias', '🔥', 'streak', 3, 50),
  ('Semana Perfeita', 'Manteve streak de 7 dias', '⭐', 'streak', 7, 100),
  ('Mês de Ouro', 'Manteve streak de 30 dias', '👑', 'streak', 30, 500),
  ('Primeiro Desafio', 'Completou seu primeiro desafio', '🎯', 'challenge_completed', 1, 75),
  ('Conquistador', 'Completou 5 desafios', '🏆', 'challenge_completed', 5, 200),
  ('Nível 5', 'Alcançou nível 5', '⚡', 'xp_milestone', 5, 100),
  ('Nível 10', 'Alcançou nível 10', '🌟', 'xp_milestone', 10, 250);

-- Seed: Default global challenges
INSERT INTO public.challenges (title, description, icon, xp_reward, target_value, target_type, duration_days, is_global) VALUES
  ('Semana Saudável', 'Registre pelo menos 14 refeições em 7 dias', '🥦', 150, 14, 'meals_logged', 7, true),
  ('Streak de Fogo', 'Mantenha um streak de 5 dias consecutivos', '🔥', 100, 5, 'streak_days', 7, true),
  ('Variedade é Vida', 'Registre todos os tipos de refeição em um dia', '🌈', 200, 6, 'variety', 1, true);
