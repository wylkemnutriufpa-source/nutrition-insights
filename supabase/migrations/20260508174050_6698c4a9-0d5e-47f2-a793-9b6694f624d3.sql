-- Deactivate dispensable menu items to "slim down" the system
UPDATE menu_items 
SET is_active = false 
WHERE route IN (
  '/ranking',
  '/ambassador',
  '/my-referrals',
  '/curiosidades',
  '/global-tips',
  '/achievements',
  '/challenges',
  '/clinical-orchestration',
  '/clinical-risk',
  '/clinical-predictions',
  '/metabolic-twin',
  '/clinical-simulation',
  '/clinical-lab',
  '/human-performance',
  '/physiological-intelligence',
  '/population-intelligence',
  '/population-nutrition',
  '/clinical-intelligence',
  '/therapeutic-intelligence',
  '/health-quiz',
  '/global-adaptive-intelligence',
  '/clinical-automation',
  '/growth-dashboard',
  '/diagnostic-status',
  '/mission-control',
  '/cockpit-premium',
  '/clinical-health-dashboard',
  '/clinical-enterprise',
  '/clinical-pipeline',
  '/clinical-workspace'
);

-- Ensure core items are active
UPDATE menu_items 
SET is_active = true 
WHERE route IN (
  '/',
  '/patients',
  '/editor-v3',
  '/anamnesis',
  '/appointments',
  '/financial',
  '/chat',
  '/protocols',
  '/recipes',
  '/diet-templates',
  '/food-database',
  '/checklist',
  '/supplements',
  '/weekly-goals'
);