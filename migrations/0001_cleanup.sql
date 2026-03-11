-- SUPPRESSION DATASET LEGACY (740 vidéos Twin)
-- ⚠️ ATTENTION : Irréversible — NE PAS EXÉCUTER SUR REPLIT
-- Réservé au déploiement Hetzner

TRUNCATE TABLE videos CASCADE;
TRUNCATE TABLE patterns CASCADE;
TRUNCATE TABLE video_patterns CASCADE;
TRUNCATE TABLE viral_patterns CASCADE;
TRUNCATE TABLE niche_patterns CASCADE;
TRUNCATE TABLE niche_statistics CASCADE;

DELETE FROM intelligence_events WHERE event_type = 'TWIN_LEGACY';
DELETE FROM creators WHERE seed_score IS NULL;

ALTER SEQUENCE IF EXISTS videos_id_seq RESTART WITH 1;
