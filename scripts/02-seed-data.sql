-- Insert sample teams
INSERT INTO teams (name, slug) VALUES 
  ('Development Team', 'dev-team'),
  ('Marketing Team', 'marketing-team')
ON CONFLICT (slug) DO NOTHING;

-- Insert sample members
INSERT INTO members (team_id, name) 
SELECT t.id, m.name 
FROM teams t, (VALUES 
  ('Alice Johnson'),
  ('Bob Smith'),
  ('Carol Davis')
) AS m(name)
WHERE t.slug = 'dev-team'
ON CONFLICT DO NOTHING;

-- Insert sample availability
INSERT INTO availability (member_id, date, status)
SELECT m.id, d.date, 
  CASE 
    WHEN EXTRACT(DOW FROM d.date) IN (0, 6) THEN 'unavailable'
    WHEN random() < 0.7 THEN 'available'
    WHEN random() < 0.8 THEN 'maybe'
    ELSE 'unavailable'
  END
FROM members m
CROSS JOIN generate_series(
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE + INTERVAL '60 days',
  INTERVAL '1 day'
) AS d(date)
WHERE m.id IN (SELECT id FROM members LIMIT 3)
ON CONFLICT (member_id, date) DO NOTHING;
