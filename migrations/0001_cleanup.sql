-- ⚠️ NE PAS EXÉCUTER SUR REPLIT — Réservé au déploiement Hetzner
-- SUPPRESSION DATASET LEGACY (740 vidéos Twin)
TRUNCATE TABLE videos CASCADE;
TRUNCATE TABLE patterns CASCADE;
TRUNCATE TABLE video_patterns CASCADE;
TRUNCATE TABLE viral_patterns CASCADE;
DELETE FROM intelligence_events WHERE event_type = 'TWIN_LEGACY';
