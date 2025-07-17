-- Test script voor create_team_with_creator functie
-- Kopieer dit in je Supabase SQL Editor om te testen

-- Test 1: Team aanmaken met ingelogde user
SELECT * FROM create_team_with_creator(
  'Test Team with Creator',
  'test-team-creator',
  FALSE,
  NULL,
  'test@example.com'  -- Vervang met een echte email uit je auth.users tabel
);

-- Test 2: Team aanmaken zonder user (leeg team)
SELECT * FROM create_team_with_creator(
  'Test Team without Creator',
  'test-team-no-creator',
  FALSE,
  NULL,
  NULL
);

-- Test 3: Team aanmaken met password protection
SELECT * FROM create_team_with_creator(
  'Protected Team',
  'protected-team',
  TRUE,
  encode(digest('password123', 'sha256'), 'base64'),
  'test@example.com'  -- Vervang met een echte email uit je auth.users tabel
);

-- Controleer of de members correct zijn toegevoegd
SELECT 
  t.name as team_name,
  t.invite_code,
  m.email,
  m.role,
  m.first_name,
  m.last_name
FROM teams t
LEFT JOIN members m ON t.id = m.team_id
WHERE t.name LIKE 'Test Team%' OR t.name = 'Protected Team'
ORDER BY t.name, m.role;
