-- Add operational hours column to libraries.
-- Stores a 7-element JSON array (Sun=0 … Sat=6).
-- Each element is either [openHour, closeHour] or null (closed).
ALTER TABLE libraries ADD COLUMN IF NOT EXISTS hours jsonb DEFAULT null;

-- Seed default hours for existing libraries
UPDATE libraries SET hours = '[[0,24],[0,24],[0,24],[0,24],[0,24],[0,24],[0,24]]' WHERE slug = 'walc';
UPDATE libraries SET hours = '[[13,24],[8,24],[8,24],[8,24],[8,24],[8,18],[13,17]]' WHERE slug = 'hsse';
UPDATE libraries SET hours = '[[13,24],[8,24],[8,24],[8,24],[8,24],[8,18],[13,17]]' WHERE slug = 'hicks';
UPDATE libraries SET hours = '[[13,24],[8,24],[8,24],[8,24],[8,24],[8,17],[13,17]]' WHERE slug = 'kran';
UPDATE libraries SET hours = '[null,[8,20],[8,20],[8,20],[8,20],[8,17],null]' WHERE slug = 'math';
UPDATE libraries SET hours = '[null,[8,17],[8,17],[8,17],[8,17],[8,17],null]' WHERE slug = 'vetmed';
