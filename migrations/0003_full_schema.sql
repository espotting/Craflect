-- ═══════════════════════════════════════════════════════════
-- Craflect — SQL complet basé sur shared/schema.ts
-- Source de vérité : Replit
-- ═══════════════════════════════════════════════════════════

-- ── Auth ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions (expire);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE,
  first_name VARCHAR,
  last_name VARCHAR,
  profile_image_url VARCHAR,
  password VARCHAR,
  email_verified BOOLEAN DEFAULT false,
  auth_provider VARCHAR DEFAULT 'email',
  is_admin BOOLEAN DEFAULT false,
  onboarding_completed BOOLEAN DEFAULT false,
  selected_niches TEXT[],
  user_goal TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  ai_credits INTEGER DEFAULT 40,
  ai_credits_reset_at TIMESTAMP DEFAULT NOW(),
  plan VARCHAR DEFAULT 'free'
);

CREATE TABLE IF NOT EXISTS verification_codes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_verification_codes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR NOT NULL,
  code VARCHAR(6) NOT NULL,
  used BOOLEAN DEFAULT false,
  attempt_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ── Chat ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── Core App ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workspaces (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id VARCHAR NOT NULL,
  name TEXT NOT NULL,
  niche_id VARCHAR,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_sources (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id VARCHAR NOT NULL,
  niche_id VARCHAR,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  file_url TEXT,
  transcript TEXT,
  raw_content TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  url TEXT,
  platform TEXT,
  creator_handle TEXT,
  published_at TIMESTAMP,
  duration INTEGER,
  views INTEGER,
  likes INTEGER,
  comments_count INTEGER,
  description TEXT,
  hashtags TEXT[],
  thumbnail_url TEXT,
  hook_type TEXT,
  narrative_structure TEXT,
  content_angle TEXT,
  content_format TEXT,
  performance_score INTEGER,
  niche_category TEXT,
  ingestion_status TEXT DEFAULT 'pending',
  ingestion_error TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_content_sources_workspace_id ON content_sources (workspace_id);
CREATE INDEX IF NOT EXISTS idx_content_sources_niche_id ON content_sources (niche_id);
CREATE INDEX IF NOT EXISTS idx_content_sources_created_at ON content_sources (created_at);

CREATE TABLE IF NOT EXISTS generated_content (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id VARCHAR,
  workspace_id VARCHAR NOT NULL,
  brief_id VARCHAR,
  format TEXT NOT NULL,
  hook_type TEXT,
  content TEXT NOT NULL,
  platform TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMP,
  video_url TEXT,
  preview_url TEXT,
  duplicated_from VARCHAR,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS video_performance (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  platform_video_url TEXT NOT NULL,
  platform TEXT DEFAULT 'tiktok',
  predicted_views INTEGER,
  actual_views INTEGER,
  actual_likes INTEGER,
  actual_comments INTEGER,
  accuracy_score DOUBLE PRECISION,
  last_fetched_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_video_performance_user ON video_performance (user_id);

CREATE TABLE IF NOT EXISTS briefs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id VARCHAR NOT NULL,
  topic TEXT NOT NULL,
  hook TEXT NOT NULL,
  script TEXT NOT NULL,
  format TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  insights TEXT,
  recommendations TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS performance (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_content_id VARCHAR NOT NULL,
  platform TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  engagement DOUBLE PRECISION NOT NULL DEFAULT 0,
  retention DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  plan TEXT NOT NULL DEFAULT 'starter',
  analyses_used INTEGER NOT NULL DEFAULT 0,
  analyses_limit INTEGER NOT NULL DEFAULT 20,
  niches_count INTEGER NOT NULL DEFAULT 1,
  niches_limit INTEGER NOT NULL DEFAULT 1,
  billing_status TEXT NOT NULL DEFAULT 'trial',
  trial_end_date TIMESTAMP,
  renewal_date TIMESTAMP,
  stripe_customer_id VARCHAR,
  stripe_subscription_id VARCHAR,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  event_name TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── Legacy Intelligence ───────────────────────────────────

CREATE TABLE IF NOT EXISTS niches (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  min_required_videos INTEGER NOT NULL DEFAULT 500,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS creators (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  niche_id VARCHAR NOT NULL,
  platform TEXT NOT NULL,
  username TEXT NOT NULL,
  followers INTEGER,
  views_total INTEGER,
  views_growth DOUBLE PRECISION,
  viral_videos INTEGER,
  niche TEXT,
  seed_score DOUBLE PRECISION,
  discovered_from_creator VARCHAR,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_creators_niche ON creators (niche);
CREATE INDEX IF NOT EXISTS idx_creators_platform ON creators (platform);

CREATE TABLE IF NOT EXISTS video_primitives (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  niche_id VARCHAR NOT NULL,
  creator_id VARCHAR NOT NULL,
  workspace_id VARCHAR,
  source_type TEXT NOT NULL DEFAULT 'admin',
  platform TEXT NOT NULL,
  publish_date TIMESTAMP,
  duration_seconds INTEGER,
  engagement_ratio REAL,
  hook_text TEXT,
  hook_type TEXT NOT NULL,
  hook_length_seconds REAL,
  structure_model TEXT NOT NULL,
  format_type TEXT NOT NULL,
  angle_category TEXT NOT NULL,
  topic_category TEXT,
  topic_cluster TEXT,
  topic_subcluster TEXT,
  cta_present BOOLEAN NOT NULL DEFAULT false,
  pacing_score REAL,
  authority_score REAL,
  emotional_intensity_score REAL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_video_primitives_niche_id ON video_primitives (niche_id);
CREATE INDEX IF NOT EXISTS idx_video_primitives_hook_type ON video_primitives (hook_type);
CREATE INDEX IF NOT EXISTS idx_video_primitives_format_type ON video_primitives (format_type);
CREATE INDEX IF NOT EXISTS idx_video_primitives_angle_category ON video_primitives (angle_category);

CREATE TABLE IF NOT EXISTS niche_patterns (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  niche_id VARCHAR NOT NULL,
  hook_distribution JSONB,
  structure_distribution JSONB,
  angle_distribution JSONB,
  format_distribution JSONB,
  avg_duration REAL,
  median_duration REAL,
  dominant_patterns JSONB,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS niche_statistics (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  niche_id VARCHAR NOT NULL,
  total_videos INTEGER NOT NULL DEFAULT 0,
  sample_size INTEGER NOT NULL DEFAULT 0,
  dominant_hook TEXT,
  dominant_structure TEXT,
  dominant_angle TEXT,
  dominant_format TEXT,
  median_duration REAL,
  pattern_stability_score REAL,
  confidence_score REAL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS niche_profiles (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  niche_id VARCHAR NOT NULL,
  intelligence_summary TEXT,
  strategic_recommendation TEXT,
  dominant_patterns JSONB,
  niche_shift_signal TEXT,
  confidence_score REAL,
  last_updated TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace_intelligence (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id VARCHAR NOT NULL,
  niche_id VARCHAR NOT NULL,
  total_videos INTEGER NOT NULL DEFAULT 0,
  dominant_hook TEXT,
  dominant_structure TEXT,
  dominant_format TEXT,
  dominant_angle TEXT,
  hook_distribution JSONB,
  structure_distribution JSONB,
  format_distribution JSONB,
  angle_distribution JSONB,
  confidence_score REAL,
  signal_strength REAL,
  last_updated TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_workspace_intelligence_workspace_id ON workspace_intelligence (workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_intelligence_niche_id ON workspace_intelligence (niche_id);

-- ── Videos (Pipeline v2) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS videos (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT,
  platform_video_id TEXT UNIQUE,
  video_url TEXT,
  thumbnail_url TEXT,
  caption TEXT,
  transcript TEXT,
  hashtags TEXT[],
  duration_seconds INTEGER,
  duration_bucket TEXT,
  creator_name TEXT,
  creator_url TEXT,
  creator_platform_id TEXT,
  creator_id TEXT,
  creator_niche TEXT,
  published_at TIMESTAMP,
  collected_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Hook Intelligence
  hook_type_v2 TEXT,
  hook_pattern TEXT,
  hook_text TEXT,
  hook_duration REAL,
  hook_position TEXT,

  -- Narrative Structure
  structure_type TEXT,
  beats_count INTEGER,
  reveal_time REAL,
  demo_presence BOOLEAN,
  proof_presence BOOLEAN,
  cta_type_v2 TEXT,

  -- Visual Language
  facecam BOOLEAN,
  screen_recording BOOLEAN,
  broll_usage BOOLEAN,
  text_overlay_density TEXT,
  cut_frequency TEXT,
  visual_switch_rate TEXT,

  -- Emotional Trigger
  emotion_primary TEXT,
  emotion_secondary TEXT,

  -- Topic Classification
  topic_category TEXT,
  topic_cluster TEXT,
  topic_subcluster TEXT,
  niche_cluster TEXT,

  -- Performance Metrics
  views INTEGER,
  likes INTEGER,
  comments INTEGER,
  shares INTEGER,

  -- Derived Fields
  hook_mechanism_primary TEXT,

  -- Derived Metrics
  engagement_rate DOUBLE PRECISION,
  view_velocity DOUBLE PRECISION,
  virality_score DOUBLE PRECISION,
  trend_score_processed_at TIMESTAMP,
  pattern_id_ref TEXT,

  -- Versioning & Pipeline
  taxonomy_version TEXT DEFAULT '1.0',
  classified_at TIMESTAMP,
  classified_by TEXT,
  classification_status TEXT NOT NULL DEFAULT 'pending',
  classification_attempts INTEGER NOT NULL DEFAULT 0,
  classification_started_at TIMESTAMP,
  pattern_notes TEXT,

  -- Deep Selection & Transcription
  content_hash VARCHAR(64),
  views_per_hour DOUBLE PRECISION DEFAULT 0,
  is_deep_selected BOOLEAN DEFAULT false,
  deep_selection_reason VARCHAR(50),
  transcription_status TEXT DEFAULT 'pending',
  transcript_language VARCHAR(10),
  transcript_generated BOOLEAN DEFAULT false,
  audio_url TEXT,

  -- Geo Intelligence
  geo_zone VARCHAR(10),
  geo_country CHAR(2),
  geo_language VARCHAR(5),
  target_markets TEXT[],
  is_us_content BOOLEAN DEFAULT false,
  country_detected VARCHAR(10),
  is_archived BOOLEAN DEFAULT false,
  confidence REAL,

  -- Legacy fields (deprecated)
  hook_mechanism TEXT[],
  hook_format TEXT,
  emotional_trigger TEXT[],
  content_structure TEXT[],
  content_format TEXT,
  visual_style TEXT[],
  storytelling_presence TEXT,
  content_pace TEXT,
  creator_archetype TEXT,
  call_to_action TEXT,
  controversy_level TEXT,
  information_density TEXT,
  hook_topic TEXT,
  content_goal TEXT,
  v2_classified_at TIMESTAMP,
  v2_classified_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_videos_platform ON videos (platform);
CREATE INDEX IF NOT EXISTS idx_videos_classification_status ON videos (classification_status);
CREATE INDEX IF NOT EXISTS idx_videos_collected_at ON videos (collected_at);
CREATE INDEX IF NOT EXISTS idx_videos_hook_type ON videos (hook_type_v2);
CREATE INDEX IF NOT EXISTS idx_videos_structure_type ON videos (structure_type);
CREATE INDEX IF NOT EXISTS idx_videos_emotion_primary ON videos (emotion_primary);
CREATE INDEX IF NOT EXISTS idx_videos_topic_category ON videos (topic_category);
CREATE INDEX IF NOT EXISTS idx_videos_topic_cluster ON videos (topic_cluster);
CREATE INDEX IF NOT EXISTS idx_videos_virality_score ON videos (virality_score);
CREATE INDEX IF NOT EXISTS idx_videos_hook_mechanism_primary ON videos (hook_mechanism_primary);
CREATE INDEX IF NOT EXISTS idx_videos_creator_niche ON videos (creator_niche);
CREATE INDEX IF NOT EXISTS idx_videos_taxonomy_version ON videos (taxonomy_version);
CREATE INDEX IF NOT EXISTS idx_videos_geo_zone ON videos (geo_zone);
CREATE INDEX IF NOT EXISTS idx_videos_geo_language ON videos (geo_language);
CREATE INDEX IF NOT EXISTS idx_videos_niche_cluster ON videos (niche_cluster);
CREATE INDEX IF NOT EXISTS idx_videos_deep_selected ON videos (is_deep_selected);
CREATE INDEX IF NOT EXISTS idx_videos_transcription_status ON videos (transcription_status);

-- ── Geo Zones ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS geo_zones (
  zone_code VARCHAR(10) PRIMARY KEY,
  zone_name TEXT NOT NULL,
  proxy_country_code CHAR(2) NOT NULL,
  languages_priority TEXT[] NOT NULL,
  scraping_hours INTEGER[] NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- ── Viral Patterns (legacy) ──────────────────────────────

CREATE TABLE IF NOT EXISTS viral_patterns (
  pattern_id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  hook_mechanism TEXT[],
  hook_format TEXT,
  hook_topic TEXT,
  content_format TEXT,
  content_pace TEXT,
  content_structure TEXT[],
  content_goal TEXT,
  topic_category TEXT,
  platform TEXT,
  average_performance DOUBLE PRECISION,
  performance_ratio DOUBLE PRECISION,
  frequency DOUBLE PRECISION,
  trend_ratio DOUBLE PRECISION,
  pattern_type TEXT,
  video_count INTEGER,
  last_updated TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_viral_patterns_hook_format ON viral_patterns (hook_format);
CREATE INDEX IF NOT EXISTS idx_viral_patterns_content_format ON viral_patterns (content_format);
CREATE INDEX IF NOT EXISTS idx_viral_patterns_topic_category ON viral_patterns (topic_category);
CREATE INDEX IF NOT EXISTS idx_viral_patterns_pattern_type ON viral_patterns (pattern_type);

-- ── Patterns (Pattern Engine v1) ─────────────────────────

CREATE TABLE IF NOT EXISTS patterns (
  pattern_id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension_keys TEXT[] NOT NULL,
  hook_type TEXT,
  structure_type TEXT,
  emotion_primary TEXT,
  topic_cluster TEXT,
  topic_category TEXT,
  facecam BOOLEAN,
  cut_frequency TEXT,
  text_overlay_density TEXT,
  platform TEXT,
  video_count INTEGER NOT NULL,
  avg_virality_score DOUBLE PRECISION,
  median_virality_score DOUBLE PRECISION,
  avg_engagement_rate DOUBLE PRECISION,
  performance_rank INTEGER,
  pattern_label TEXT,
  pattern_score DOUBLE PRECISION,
  velocity_mid DOUBLE PRECISION,
  pattern_novelty DOUBLE PRECISION,
  geo_zone VARCHAR(10),
  trend_classification TEXT,
  last_updated TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_patterns_geo_zone ON patterns (geo_zone);
CREATE INDEX IF NOT EXISTS idx_patterns_hook_type ON patterns (hook_type);
CREATE INDEX IF NOT EXISTS idx_patterns_structure_type ON patterns (structure_type);
CREATE INDEX IF NOT EXISTS idx_patterns_topic_cluster ON patterns (topic_cluster);
CREATE INDEX IF NOT EXISTS idx_patterns_avg_virality ON patterns (avg_virality_score);
CREATE INDEX IF NOT EXISTS idx_patterns_performance_rank ON patterns (performance_rank);
CREATE INDEX IF NOT EXISTS idx_patterns_video_count ON patterns (video_count);
CREATE INDEX IF NOT EXISTS idx_patterns_pattern_score ON patterns (pattern_score);
CREATE INDEX IF NOT EXISTS idx_patterns_trend_classification ON patterns (trend_classification);

-- ── Video Patterns (liaison videos ↔ patterns) ───────────

CREATE TABLE IF NOT EXISTS video_patterns (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id VARCHAR NOT NULL,
  pattern_id VARCHAR NOT NULL,
  match_score DOUBLE PRECISION,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_video_patterns_video_id ON video_patterns (video_id);
CREATE INDEX IF NOT EXISTS idx_video_patterns_pattern_id ON video_patterns (pattern_id);

-- ── Saved Ideas ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS saved_ideas (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  hook TEXT NOT NULL,
  format TEXT,
  topic TEXT,
  opportunity_score INTEGER,
  velocity REAL,
  videos_detected INTEGER,
  status TEXT NOT NULL DEFAULT 'saved',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_saved_ideas_user_id ON saved_ideas (user_id);
CREATE INDEX IF NOT EXISTS idx_saved_ideas_status ON saved_ideas (status);

-- ── Content Projects ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS content_projects (
  project_id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  title TEXT,
  hook TEXT,
  format TEXT,
  topic TEXT,
  script JSONB,
  blueprint JSONB,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_content_projects_user_id ON content_projects (user_id);
CREATE INDEX IF NOT EXISTS idx_content_projects_status ON content_projects (status);

-- ── Viral Templates ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS viral_templates (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  topic_cluster TEXT,
  hook_mechanism TEXT,
  structure_type TEXT,
  hook_template TEXT,
  scene_structure JSONB,
  source TEXT NOT NULL DEFAULT 'auto',
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_viral_templates_source ON viral_templates (source);
CREATE INDEX IF NOT EXISTS idx_viral_templates_topic ON viral_templates (topic_cluster);

-- ── Intelligence Events ───────────────────────────────────

CREATE TABLE IF NOT EXISTS intelligence_events (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_intelligence_events_type ON intelligence_events (event_type);
CREATE INDEX IF NOT EXISTS idx_intelligence_events_created ON intelligence_events (created_at);

-- ── Video Classification (Content DNA) ───────────────────

CREATE TABLE IF NOT EXISTS video_classification (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id VARCHAR NOT NULL,
  hook_type TEXT,
  structure_type TEXT,
  topic_cluster TEXT,
  emotion_value TEXT,
  format_type TEXT,
  cta_type TEXT,
  visual_style TEXT,
  cut_frequency TEXT,
  niche_cluster TEXT,
  classified_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_video_classification_video_id ON video_classification (video_id);
CREATE INDEX IF NOT EXISTS idx_video_classification_hook_type ON video_classification (hook_type);
CREATE INDEX IF NOT EXISTS idx_video_classification_topic_cluster ON video_classification (topic_cluster);
CREATE INDEX IF NOT EXISTS idx_video_classification_niche_cluster ON video_classification (niche_cluster);

-- ── Pipeline Patterns ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS pipeline_patterns (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type TEXT,
  niche_cluster TEXT,
  description TEXT,
  frequency DOUBLE PRECISION,
  engagement_avg DOUBLE PRECISION,
  creator_diversity DOUBLE PRECISION,
  stability_score DOUBLE PRECISION,
  pattern_score DOUBLE PRECISION,
  trend_velocity DOUBLE PRECISION,
  pattern_confidence_score DOUBLE PRECISION DEFAULT 0,
  human_validation_flag BOOLEAN,
  detected_at TIMESTAMP DEFAULT NOW(),
  video_count INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pipeline_patterns_niche_cluster ON pipeline_patterns (niche_cluster);
CREATE INDEX IF NOT EXISTS idx_pipeline_patterns_pattern_score ON pipeline_patterns (pattern_score);
CREATE INDEX IF NOT EXISTS idx_pipeline_patterns_pattern_type ON pipeline_patterns (pattern_type);

-- ── Pattern Templates ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS pattern_templates (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id VARCHAR NOT NULL,
  template_name TEXT,
  template_description TEXT,
  template_structure JSONB,
  template_formula TEXT,
  hook_type TEXT,
  structure_type TEXT,
  format_type TEXT,
  example_video TEXT,
  confidence_score DOUBLE PRECISION,
  usage_count INTEGER DEFAULT 0,
  niche_id VARCHAR,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pattern_templates_pattern_id ON pattern_templates (pattern_id);
CREATE INDEX IF NOT EXISTS idx_pattern_templates_niche_id ON pattern_templates (niche_id);

-- ── Opportunities ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS opportunities (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_template_id VARCHAR NOT NULL,
  hook TEXT,
  topic TEXT,
  structure TEXT,
  format TEXT,
  generated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_opportunities_pattern_template_id ON opportunities (pattern_template_id);

-- ── Pipeline Logs ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pipeline_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pipeline_logs_job_type ON pipeline_logs (job_type);
CREATE INDEX IF NOT EXISTS idx_pipeline_logs_status ON pipeline_logs (status);
CREATE INDEX IF NOT EXISTS idx_pipeline_logs_created_at ON pipeline_logs (created_at);

-- ── Dataset Batches ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS dataset_batches (
  batch_id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT,
  videos_ingested INTEGER NOT NULL DEFAULT 0,
  videos_classified INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dataset_batches_source ON dataset_batches (source);

-- ── Pattern Engine State ──────────────────────────────────

CREATE TABLE IF NOT EXISTS pattern_engine_state (
  id INTEGER PRIMARY KEY,
  current_phase INTEGER NOT NULL DEFAULT 1,
  phase_1_activated_at TIMESTAMP DEFAULT NOW(),
  phase_2_activated_at TIMESTAMP,
  phase_3_activated_at TIMESTAMP,
  total_deep_videos INTEGER DEFAULT 0,
  total_classified_videos INTEGER DEFAULT 0,
  cluster_count INTEGER DEFAULT 0,
  last_transition_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── Video Embeddings ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS video_embeddings (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id VARCHAR NOT NULL UNIQUE,
  embedding JSONB,
  model_used VARCHAR(50) DEFAULT 'text-embedding-3-small',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_video_embeddings_video_id ON video_embeddings (video_id);

-- ── Content Clusters ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS content_clusters (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_label VARCHAR(100) NOT NULL,
  cluster_description TEXT,
  video_ids TEXT[],
  centroid JSONB,
  pattern_detected TEXT,
  confidence_score DOUBLE PRECISION,
  density_score DOUBLE PRECISION,
  analyzed_by_llm BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_content_clusters_analyzed ON content_clusters (analyzed_by_llm);

-- ── Seed Pattern Engine State ─────────────────────────────

INSERT INTO pattern_engine_state (id, current_phase) VALUES (1, 1)
ON CONFLICT (id) DO NOTHING;
