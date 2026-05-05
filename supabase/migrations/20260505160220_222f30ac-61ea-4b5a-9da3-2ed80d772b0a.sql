-- Add feature column to menu_items if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'menu_items' AND column_name = 'feature') THEN
        ALTER TABLE public.menu_items ADD COLUMN feature TEXT;
    END IF;
END $$;

-- Add created_by column to nutrition_protocols if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nutrition_protocols' AND column_name = 'created_by') THEN
        ALTER TABLE public.nutrition_protocols ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;
END $$;