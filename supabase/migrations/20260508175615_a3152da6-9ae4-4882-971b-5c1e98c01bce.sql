-- Reactivate Curiosidades menu item
UPDATE menu_items 
SET is_active = true 
WHERE route = '/curiosidades';

-- Ensure the Conteúdo sidebar section is visible if it contains the item
UPDATE workspace_sections 
SET is_visible = true 
WHERE section_name = 'Conteúdo';