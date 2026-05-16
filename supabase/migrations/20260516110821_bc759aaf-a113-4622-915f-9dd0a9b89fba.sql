ALTER TABLE v3_diet_templates ADD COLUMN IF NOT EXISTS sovereign_validated BOOLEAN DEFAULT false;

-- Marcar os templates que já validamos com snapshots de 7 dias e equivalentes
UPDATE v3_diet_templates SET sovereign_validated = true 
WHERE title IN ('Tradicional Brasileiro Fit', 'Tradicional Brasileiro Soberano', 'Emagrecimento Feminino Acelerado');
