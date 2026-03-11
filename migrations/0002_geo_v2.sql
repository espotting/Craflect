-- Ajout géolocalisation v2.0
-- ⚠️ Déjà exécuté sur Replit — Ce fichier est pour référence Hetzner

ALTER TABLE videos
ADD COLUMN IF NOT EXISTS geo_zone VARCHAR(10),
ADD COLUMN IF NOT EXISTS geo_country CHAR(2),
ADD COLUMN IF NOT EXISTS geo_language VARCHAR(5),
ADD COLUMN IF NOT EXISTS target_markets TEXT[],
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS confidence REAL;

CREATE INDEX IF NOT EXISTS idx_videos_geo_zone ON videos(geo_zone);
CREATE INDEX IF NOT EXISTS idx_videos_geo_language ON videos(geo_language);
CREATE INDEX IF NOT EXISTS idx_videos_target_markets ON videos USING GIN(target_markets);
CREATE INDEX IF NOT EXISTS idx_videos_active ON videos(is_archived) WHERE is_archived = false;

ALTER TABLE patterns
ADD COLUMN IF NOT EXISTS geo_zone VARCHAR(10);

CREATE INDEX IF NOT EXISTS idx_patterns_geo_zone ON patterns(geo_zone);

CREATE TABLE IF NOT EXISTS geo_zones (
    zone_code VARCHAR(10) PRIMARY KEY,
    zone_name VARCHAR(100) NOT NULL,
    proxy_country_code CHAR(2) NOT NULL,
    languages_priority TEXT[] NOT NULL,
    scraping_hours INT[] NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO geo_zones VALUES
('US', 'United States', 'US', ARRAY['EN'], ARRAY[13,14,15,16,17,18,19,20,21,22]),
('UK', 'United Kingdom', 'GB', ARRAY['EN'], ARRAY[9,10,11,12,13,14,15,16,17,18]),
('EU-FR', 'Europe Francophone', 'FR', ARRAY['FR', 'EN'], ARRAY[7,8,9,10,11,12,13,14,15,16]),
('EU-ES', 'Europe Hispanophone', 'ES', ARRAY['ES', 'EN'], ARRAY[7,8,9,10,11,12,13,14,15,16]),
('EU-DE', 'Europe Germanophone', 'DE', ARRAY['DE', 'EN'], ARRAY[7,8,9,10,11,12,13,14,15,16]),
('LATAM', 'Latin America', 'BR', ARRAY['ES', 'PT'], ARRAY[17,18,19,20,21,22,23,0,1,2])
ON CONFLICT (zone_code) DO NOTHING;
