-- Add multilingual columns to holidays table
-- This is needed for the Holiday Management system to display holidays in multiple languages

-- Add name_nl and name_fr columns to holidays table
ALTER TABLE public.holidays 
ADD COLUMN IF NOT EXISTS name_nl character varying,
ADD COLUMN IF NOT EXISTS name_fr character varying;

-- Update existing holidays with Dutch and French translations (basic examples)
UPDATE public.holidays 
SET 
  name_nl = CASE 
    WHEN LOWER(name) LIKE '%new year%' OR LOWER(name) LIKE '%nieuwjaar%' THEN 'Nieuwjaarsdag'
    WHEN LOWER(name) LIKE '%easter%' OR LOWER(name) LIKE '%pasen%' THEN 'Paasmaandag'
    WHEN LOWER(name) LIKE '%labour%' OR LOWER(name) LIKE '%arbeid%' OR LOWER(name) LIKE '%may day%' THEN 'Dag van de Arbeid'
    WHEN LOWER(name) LIKE '%ascension%' OR LOWER(name) LIKE '%hemelvaart%' THEN 'Onze-Lieve-Heer-Hemelvaart'
    WHEN LOWER(name) LIKE '%whit monday%' OR LOWER(name) LIKE '%pinkster%' THEN 'Pinkstermaandag'
    WHEN LOWER(name) LIKE '%national%' OR LOWER(name) LIKE '%nationale%' THEN 'Nationale Feestdag'
    WHEN LOWER(name) LIKE '%assumption%' OR LOWER(name) LIKE '%maria%' THEN 'Onze-Lieve-Vrouw-Hemelvaart'
    WHEN LOWER(name) LIKE '%all saints%' OR LOWER(name) LIKE '%allerheiligen%' THEN 'Allerheiligen'
    WHEN LOWER(name) LIKE '%armistice%' OR LOWER(name) LIKE '%wapenstilstand%' THEN 'Wapenstilstand'
    WHEN LOWER(name) LIKE '%christmas%' OR LOWER(name) LIKE '%kerst%' THEN 'Kerstmis'
    ELSE name -- fallback to original name
  END,
  name_fr = CASE 
    WHEN LOWER(name) LIKE '%new year%' OR LOWER(name) LIKE '%nieuwjaar%' THEN 'Jour de l''An'
    WHEN LOWER(name) LIKE '%easter%' OR LOWER(name) LIKE '%pasen%' THEN 'Lundi de Pâques'
    WHEN LOWER(name) LIKE '%labour%' OR LOWER(name) LIKE '%arbeid%' OR LOWER(name) LIKE '%may day%' THEN 'Fête du Travail'
    WHEN LOWER(name) LIKE '%ascension%' OR LOWER(name) LIKE '%hemelvaart%' THEN 'Ascension'
    WHEN LOWER(name) LIKE '%whit monday%' OR LOWER(name) LIKE '%pinkster%' THEN 'Lundi de Pentecôte'
    WHEN LOWER(name) LIKE '%national%' OR LOWER(name) LIKE '%nationale%' THEN 'Fête Nationale'
    WHEN LOWER(name) LIKE '%assumption%' OR LOWER(name) LIKE '%maria%' THEN 'Assomption'
    WHEN LOWER(name) LIKE '%all saints%' OR LOWER(name) LIKE '%allerheiligen%' THEN 'Toussaint'
    WHEN LOWER(name) LIKE '%armistice%' OR LOWER(name) LIKE '%wapenstilstand%' THEN 'Armistice'
    WHEN LOWER(name) LIKE '%christmas%' OR LOWER(name) LIKE '%kerst%' THEN 'Noël'
    ELSE name -- fallback to original name
  END
WHERE name_nl IS NULL OR name_fr IS NULL;

-- Verify the update
SELECT name, name_nl, name_fr, date, country_code 
FROM public.holidays 
ORDER BY date
LIMIT 10;