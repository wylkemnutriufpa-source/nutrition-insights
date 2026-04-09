
-- 1. Add 'lojista' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'lojista';

-- 2. Store products (ingredient inventory with pricing)
CREATE TABLE public.store_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'outros',
  unit TEXT NOT NULL DEFAULT 'kg',
  price_per_unit NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock_quantity NUMERIC(10,3) DEFAULT 0,
  calories_per_100g NUMERIC(7,2) DEFAULT 0,
  protein_per_100g NUMERIC(7,2) DEFAULT 0,
  carbs_per_100g NUMERIC(7,2) DEFAULT 0,
  fat_per_100g NUMERIC(7,2) DEFAULT 0,
  supplier TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage own products" ON public.store_products
  FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Technical sheets (ficha técnica)
CREATE TABLE public.technical_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  portions INTEGER NOT NULL DEFAULT 1,
  total_weight_g NUMERIC(10,2) DEFAULT 0,
  total_calories NUMERIC(10,2) DEFAULT 0,
  total_protein NUMERIC(10,2) DEFAULT 0,
  total_carbs NUMERIC(10,2) DEFAULT 0,
  total_fat NUMERIC(10,2) DEFAULT 0,
  total_cost NUMERIC(10,2) DEFAULT 0,
  cost_per_portion NUMERIC(10,2) DEFAULT 0,
  sale_price NUMERIC(10,2) DEFAULT 0,
  margin_percent NUMERIC(5,2) DEFAULT 0,
  category TEXT DEFAULT 'prato',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.technical_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage own sheets" ON public.technical_sheets
  FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- 4. Technical sheet items (ingredients in a recipe)
CREATE TABLE public.technical_sheet_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES public.technical_sheets(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  quantity_grams NUMERIC(10,2) NOT NULL DEFAULT 0,
  cost NUMERIC(10,2) DEFAULT 0,
  calories NUMERIC(10,2) DEFAULT 0,
  protein NUMERIC(10,2) DEFAULT 0,
  carbs NUMERIC(10,2) DEFAULT 0,
  fat NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.technical_sheet_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage sheet items" ON public.technical_sheet_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.technical_sheets ts
      WHERE ts.id = technical_sheet_items.sheet_id
      AND (ts.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.technical_sheets ts
      WHERE ts.id = technical_sheet_items.sheet_id
      AND (ts.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- 5. Updated_at triggers
CREATE TRIGGER update_store_products_updated_at
  BEFORE UPDATE ON public.store_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_technical_sheets_updated_at
  BEFORE UPDATE ON public.technical_sheets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Indexes
CREATE INDEX idx_store_products_owner ON public.store_products(owner_id);
CREATE INDEX idx_technical_sheets_owner ON public.technical_sheets(owner_id);
CREATE INDEX idx_technical_sheet_items_sheet ON public.technical_sheet_items(sheet_id);
