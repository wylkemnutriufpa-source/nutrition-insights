-- Reactivate core intelligence menu items
UPDATE menu_items 
SET is_active = true 
WHERE route IN (
  '/clinical-intelligence',
  '/clinical-risk',
  '/physiological-intelligence',
  '/clinical-automation',
  '/therapeutic-intelligence',
  '/intelligence-settings'
);

-- Ensure the Intelligence sidebar section is visible
UPDATE workspace_sections 
SET is_visible = true 
WHERE section_name = 'Inteligência';