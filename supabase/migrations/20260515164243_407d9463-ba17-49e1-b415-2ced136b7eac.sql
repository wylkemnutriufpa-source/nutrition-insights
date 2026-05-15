DO $$ 
BEGIN 
    -- Adiciona novos valores ao enum meal_type se eles não existirem
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'meal_type' AND e.enumlabel = 'Café da Manhã') THEN
        ALTER TYPE public.meal_type ADD VALUE 'Café da Manhã';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'meal_type' AND e.enumlabel = 'Lanche da Manhã') THEN
        ALTER TYPE public.meal_type ADD VALUE 'Lanche da Manhã';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'meal_type' AND e.enumlabel = 'Almoço') THEN
        ALTER TYPE public.meal_type ADD VALUE 'Almoço';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'meal_type' AND e.enumlabel = 'Lanche da Tarde') THEN
        ALTER TYPE public.meal_type ADD VALUE 'Lanche da Tarde';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'meal_type' AND e.enumlabel = 'Jantar') THEN
        ALTER TYPE public.meal_type ADD VALUE 'Jantar';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'meal_type' AND e.enumlabel = 'Ceia') THEN
        ALTER TYPE public.meal_type ADD VALUE 'Ceia';
    END IF;
END $$;
