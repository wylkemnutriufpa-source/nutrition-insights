
-- ═══════════════════════════════════════════
-- NUTRITION PROTOCOL LIBRARY v1.0.0
-- ═══════════════════════════════════════════

-- BLOCO 1: Main protocols table
CREATE TABLE public.nutrition_protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_slug text UNIQUE NOT NULL,
  protocol_name text NOT NULL,
  protocol_category text NOT NULL DEFAULT 'emagrecimento_clinico',
  clinical_goal text NOT NULL,
  metabolic_strategy_type text NOT NULL DEFAULT 'standard',
  behavioral_complexity_level text NOT NULL DEFAULT 'moderate',
  recommended_clusters text[] DEFAULT '{}',
  contraindicated_conditions text[] DEFAULT '{}',
  description text,
  scientific_rationale text,
  is_active boolean DEFAULT true,
  version integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.nutrition_protocols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read protocols" ON public.nutrition_protocols
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage protocols" ON public.nutrition_protocols
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- BLOCO 2: Caloric ranges
CREATE TABLE public.protocol_caloric_ranges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id uuid REFERENCES public.nutrition_protocols(id) ON DELETE CASCADE NOT NULL,
  kcal_min integer NOT NULL DEFAULT 1000,
  kcal_max integer NOT NULL DEFAULT 2800,
  deficit_strategy_type text NOT NULL DEFAULT 'linear',
  refeed_supported boolean DEFAULT false,
  diet_break_supported boolean DEFAULT false,
  adaptation_cycle_days integer DEFAULT 14,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.protocol_caloric_ranges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read caloric ranges" ON public.protocol_caloric_ranges
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage caloric ranges" ON public.protocol_caloric_ranges
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- BLOCO 3: Meal structures
CREATE TABLE public.protocol_meal_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id uuid REFERENCES public.nutrition_protocols(id) ON DELETE CASCADE NOT NULL,
  meals_per_day integer NOT NULL DEFAULT 5,
  macro_distribution_pattern text NOT NULL DEFAULT 'balanced',
  satiety_strategy text DEFAULT 'moderate_volume',
  glycemic_strategy text DEFAULT 'moderate_gi',
  meal_density_level text DEFAULT 'moderate',
  preparation_complexity text DEFAULT 'moderate',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.protocol_meal_structures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read meal structures" ON public.protocol_meal_structures
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage meal structures" ON public.protocol_meal_structures
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- BLOCO 4: Food substitution groups per protocol
CREATE TABLE public.protocol_food_substitution_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id uuid REFERENCES public.nutrition_protocols(id) ON DELETE CASCADE NOT NULL,
  substitution_group text NOT NULL,
  objective text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.protocol_food_substitution_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read substitution groups" ON public.protocol_food_substitution_groups
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage substitution groups" ON public.protocol_food_substitution_groups
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- BLOCO 5: Metabolic tags
CREATE TABLE public.protocol_metabolic_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id uuid REFERENCES public.nutrition_protocols(id) ON DELETE CASCADE NOT NULL,
  tag text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(protocol_id, tag)
);

ALTER TABLE public.protocol_metabolic_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read metabolic tags" ON public.protocol_metabolic_tags
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage metabolic tags" ON public.protocol_metabolic_tags
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- BLOCO 6: Clinical performance tracking
CREATE TABLE public.protocol_clinical_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id uuid REFERENCES public.nutrition_protocols(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_applications integer DEFAULT 0,
  avg_weight_response numeric DEFAULT 0,
  avg_adherence numeric DEFAULT 0,
  stagnation_rate numeric DEFAULT 0,
  dropout_rate numeric DEFAULT 0,
  metabolic_success_score numeric DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.protocol_clinical_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read performance" ON public.protocol_clinical_performance
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage performance" ON public.protocol_clinical_performance
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
