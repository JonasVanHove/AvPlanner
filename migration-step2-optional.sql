-- STAP 5: Update bestaande teams (optioneel)
-- Gebruik dit alleen als je al teams hebt en deze wilt koppelen aan gebruikers

-- Voorbeeld: Stel een specifieke gebruiker in als creator van een team
-- Vervang 'user@example.com' met het echte email adres
-- Vervang 'team-invite-code' met de echte invite code

UPDATE teams 
SET created_by = (
  SELECT id FROM auth.users WHERE email = 'user@example.com'
)
WHERE invite_code = 'team-invite-code';

-- Of update alle teams zonder creator om de eerste member als creator in te stellen
UPDATE teams 
SET created_by = (
  SELECT auth_user_id FROM members 
  WHERE team_id = teams.id 
  AND auth_user_id IS NOT NULL 
  ORDER BY created_at ASC 
  LIMIT 1
)
WHERE created_by IS NULL;
