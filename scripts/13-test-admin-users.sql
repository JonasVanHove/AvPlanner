-- Test script voor admin users functionaliteit
-- Zorg ervoor dat je eerst migration-step1.sql hebt gedraaid!

-- 1. Test het toevoegen van een admin user
-- Vervang 'jouw-email@example.com' met je eigen email adres
SELECT grant_admin_access('jouw-email@example.com', 'system');

-- 2. Test het controleren van admin status
SELECT is_user_admin('jouw-email@example.com');

-- 3. Test het ophalen van admin users
SELECT * FROM get_admin_users('jouw-email@example.com');

-- 4. Test het toevoegen van een tweede admin user
-- Vervang 'tweede-admin@example.com' met een ander email adres
SELECT grant_admin_access('tweede-admin@example.com', 'jouw-email@example.com');

-- 5. Test het ophalen van alle admin users opnieuw
SELECT * FROM get_admin_users('jouw-email@example.com');

-- 6. Test het intrekken van admin toegang
SELECT revoke_admin_access('tweede-admin@example.com');

-- 7. Test het ophalen van admin users na intrekking
SELECT * FROM get_admin_users('jouw-email@example.com');

-- 8. Test toegang met een niet-admin user (dit zou moeten falen)
-- Vervang 'niet-admin@example.com' met een email die GEEN admin is
-- SELECT * FROM get_admin_users('niet-admin@example.com');

-- 9. Controleer de admin_users tabel direct
SELECT * FROM admin_users ORDER BY granted_at DESC;

-- 10. Test het behalen van teams via admin functie
SELECT * FROM get_all_teams_admin('jouw-email@example.com');

-- Instructies:
-- 1. Vervang 'jouw-email@example.com' met je eigen email adres
-- 2. Vervang 'tweede-admin@example.com' met een ander email adres dat je wilt testen
-- 3. Zorg ervoor dat deze email adressen bestaan in de auth.users tabel
-- 4. Voer de queries één voor één uit om de functionaliteit te testen
