
-- ═══════════════════════════════════════════════════════════════
-- IFJ CORE BRAIN — Database-Driven Intelligence System
-- ═══════════════════════════════════════════════════════════════

-- 1. ifj_intent_registry
CREATE TABLE IF NOT EXISTS public.ifj_intent_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_key text UNIQUE NOT NULL,
  label text NOT NULL,
  description text,
  scope text NOT NULL DEFAULT 'all',
  module text NOT NULL DEFAULT 'general',
  action_type text NOT NULL DEFAULT 'query',
  executor_key text,
  requires_context boolean DEFAULT false,
  requires_active_plan boolean DEFAULT false,
  requires_patient_selected boolean DEFAULT false,
  requires_permission_key text,
  fallback_mode text DEFAULT 'error',
  priority_order int DEFAULT 50,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2. ifj_intent_phrases
CREATE TABLE IF NOT EXISTS public.ifj_intent_phrases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_id uuid REFERENCES public.ifj_intent_registry(id) ON DELETE CASCADE NOT NULL,
  phrase text NOT NULL,
  phrase_type text DEFAULT 'synonym',
  weight int DEFAULT 1,
  language text DEFAULT 'pt-BR',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 3. ifj_response_templates
CREATE TABLE IF NOT EXISTS public.ifj_response_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_key text NOT NULL,
  scope text DEFAULT 'all',
  ifj_mode text DEFAULT 'standard',
  template_type text DEFAULT 'default',
  title_template text,
  body_template text,
  footer_template text,
  response_style text DEFAULT 'markdown',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 4. ifj_executor_registry
CREATE TABLE IF NOT EXISTS public.ifj_executor_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_key text NOT NULL,
  executor_key text NOT NULL,
  function_name text,
  route_name text,
  query_dependencies_json jsonb DEFAULT '[]'::jsonb,
  context_dependencies_json jsonb DEFAULT '[]'::jsonb,
  permission_dependencies_json jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 5. Expand ifj_patient_permissions
ALTER TABLE public.ifj_patient_permissions
  ADD COLUMN IF NOT EXISTS ifj_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS smart_recipe_help boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS smart_swap_suggestions boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS smart_meal_context boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_ai_last_resort boolean DEFAULT false;

-- 6. ifj_food_database
CREATE TABLE IF NOT EXISTS public.ifj_food_database (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_name text NOT NULL,
  normalized_name text NOT NULL,
  category text NOT NULL,
  subcategory text,
  portion_reference text,
  unit text DEFAULT 'g',
  calories numeric DEFAULT 0,
  protein numeric DEFAULT 0,
  carbs numeric DEFAULT 0,
  fats numeric DEFAULT 0,
  fiber numeric DEFAULT 0,
  meal_tags_json jsonb DEFAULT '[]'::jsonb,
  goal_tags_json jsonb DEFAULT '[]'::jsonb,
  restriction_tags_json jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 7. ifj_food_equivalents
CREATE TABLE IF NOT EXISTS public.ifj_food_equivalents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_food_id uuid REFERENCES public.ifj_food_database(id) ON DELETE CASCADE NOT NULL,
  target_food_id uuid REFERENCES public.ifj_food_database(id) ON DELETE CASCADE NOT NULL,
  equivalence_type text DEFAULT 'caloric',
  similarity_score numeric DEFAULT 0.8,
  meal_context text,
  notes text,
  is_preferred boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 8. ifj_meal_context_rules
CREATE TABLE IF NOT EXISTS public.ifj_meal_context_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_type text NOT NULL,
  allowed_categories_json jsonb DEFAULT '[]'::jsonb,
  preferred_categories_json jsonb DEFAULT '[]'::jsonb,
  forbidden_combinations_json jsonb DEFAULT '[]'::jsonb,
  goal_adjustments_json jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 9. ifj_goal_rules
CREATE TABLE IF NOT EXISTS public.ifj_goal_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_key text UNIQUE NOT NULL,
  label text NOT NULL,
  macro_bias_json jsonb DEFAULT '{}'::jsonb,
  swap_priority_json jsonb DEFAULT '[]'::jsonb,
  restriction_logic_json jsonb DEFAULT '{}'::jsonb,
  default_guidance text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 10. ifj_guardrails
CREATE TABLE IF NOT EXISTS public.ifj_guardrails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardrail_key text UNIQUE NOT NULL,
  scope text DEFAULT 'all',
  rule_type text NOT NULL,
  condition_json jsonb DEFAULT '{}'::jsonb,
  message_template text,
  severity text DEFAULT 'warning',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 11. ifj_knowledge_articles
CREATE TABLE IF NOT EXISTS public.ifj_knowledge_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  scope text DEFAULT 'all',
  category text,
  content_markdown text,
  summary text,
  tags_json jsonb DEFAULT '[]'::jsonb,
  source_type text DEFAULT 'internal',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 12. ifj_brand_rules
CREATE TABLE IF NOT EXISTS public.ifj_brand_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text UNIQUE NOT NULL,
  rule_group text NOT NULL,
  value_json jsonb DEFAULT '{}'::jsonb,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.ifj_intent_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ifj_intent_phrases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ifj_response_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ifj_executor_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ifj_food_database ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ifj_food_equivalents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ifj_meal_context_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ifj_goal_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ifj_guardrails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ifj_knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ifj_brand_rules ENABLE ROW LEVEL SECURITY;

-- Read-only policies for authenticated users (edge functions use service role)
CREATE POLICY "Authenticated read ifj_intent_registry" ON public.ifj_intent_registry FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read ifj_intent_phrases" ON public.ifj_intent_phrases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read ifj_response_templates" ON public.ifj_response_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read ifj_executor_registry" ON public.ifj_executor_registry FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read ifj_food_database" ON public.ifj_food_database FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read ifj_food_equivalents" ON public.ifj_food_equivalents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read ifj_meal_context_rules" ON public.ifj_meal_context_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read ifj_goal_rules" ON public.ifj_goal_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read ifj_guardrails" ON public.ifj_guardrails FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read ifj_knowledge_articles" ON public.ifj_knowledge_articles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read ifj_brand_rules" ON public.ifj_brand_rules FOR SELECT TO authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ifj_intent_phrases_intent_id ON public.ifj_intent_phrases(intent_id);
CREATE INDEX IF NOT EXISTS idx_ifj_food_database_normalized ON public.ifj_food_database(normalized_name);
CREATE INDEX IF NOT EXISTS idx_ifj_food_database_category ON public.ifj_food_database(category);
CREATE INDEX IF NOT EXISTS idx_ifj_food_equivalents_source ON public.ifj_food_equivalents(source_food_id);
CREATE INDEX IF NOT EXISTS idx_ifj_food_equivalents_target ON public.ifj_food_equivalents(target_food_id);
CREATE INDEX IF NOT EXISTS idx_ifj_response_templates_intent ON public.ifj_response_templates(intent_key);
CREATE INDEX IF NOT EXISTS idx_ifj_executor_registry_intent ON public.ifj_executor_registry(intent_key);
