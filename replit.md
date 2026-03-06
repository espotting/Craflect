# Craflect - AI Content Intelligence & Creation Platform

## Overview
Craflect est une plateforme d'intelligence et de création de contenu basée sur l'analyse de vidéos courtes (TikTok, Instagram Reels, YouTube Shorts). Vision : AI Content Operating System — découvrir les patterns viraux, générer des hooks performants, générer des scripts vidéo, créer du contenu prêt à publier.

## User Preferences
- Priorité au développement itératif
- **AUCUNE modification (ajout/suppression de fonctionnalité, données, ou code) sans validation préalable explicite**
- **AUCUNE suppression de données sans validation préalable**
- Toutes les réponses en français
- Dark-first aesthetic, neon purple (#7C5CFF)
- Ne pas modifier `replit_integrations/auth/` et `replit_integrations/chat/` sans approbation

## System Architecture
React + TypeScript + Tailwind CSS + shadcn/ui + Framer Motion frontend, Express/Node.js backend, PostgreSQL + Drizzle ORM, Google OAuth + Email/Password auth. OpenAI (gpt-4.1-mini) pour les intégrations IA.

**Dual Schema (coexistence) :**
- **Legacy tables** (frontend actuel) : `video_primitives`, `niche_patterns`, `niche_statistics`, `niche_profiles`, `workspace_intelligence` — taxonomie 4 dimensions (VP_HOOK_TYPES, FORMAT_TYPES, ANGLE_CATEGORIES, STRUCTURE_MODELS)
- **Craflect Taxonomy v1 tables** (pipeline stable) : `videos`, `viral_patterns` — taxonomie en couches (voir section Taxonomy ci-dessous)
- Les deux coexistent. Les tables legacy alimentent le frontend actuel. La Taxonomy v1 alimente le Pattern Engine.

## Dashboard V2 (Current)

**Architecture :** Sidebar + 6 pages + onboarding + dark mode Linear/Stripe/Vercel inspired

**Pages :**
- `/dashboard` — Hub principal, onglets multi-niches, métriques globales, top hooks/formats
- `/trend-radar` — Daily Viral Opportunities (3-5 cards), trending hooks, formats, top videos, emerging creators
- `/niches` — Grille de cartes par niche, stats, top hooks/formats/créateurs par niche
- `/patterns` — Patterns viraux détectés, filtrable par niche, boutons Create Script/Video
- `/creators` — Table de découverte de créateurs, triable, filtrable par niche
- `/videos` — Browse vidéos classifiées, filtres niche/platform, pagination

**Sidebar (app-sidebar.tsx) :**
- Analyze : Dashboard, Trend Radar, Niches, Patterns, Creators, Videos
- Create : Script Generator, Video Builder
- System : Settings, Plan & Billing, Admin (admin-only), Intelligence (admin-only)

**Composants clés :**
- `TrendScore` — composant 0-100 avec couleurs (emerald 80+, blue 60+, amber 40+, orange 20+, red)
- `DashboardLayout` — wrapper avec auth guard, sidebar, onboarding redirect

**Onboarding (welcome.tsx) :** 4 étapes — Welcome → Select niches (max 3) → User goal → Redirect /dashboard

## Craflect Taxonomy v1 (Stable)

Structure organisée en blocs — champ `taxonomy_version` pour compatibilité future.

**25 Topic Clusters contrôlés (snake_case) :** ai_tools, ai_automation, online_business, entrepreneurship, digital_marketing, ecommerce, saas, real_estate, finance, crypto, productivity, education, tech, personal_branding, coaching, motivation, lifestyle, fitness, health, beauty, food, travel, relationships, entertainment, gaming

**Video Metadata :** id, platform, platform_video_id, video_url, caption, transcript, hashtags, duration_seconds, duration_bucket, creator_name, creator_id, creator_niche, published_at, collected_at, updated_at

**Hook Intelligence :** hook_type, hook_pattern, hook_text, hook_duration, hook_position, hook_mechanism_primary

**Narrative Structure :** structure_type, beats_count, reveal_time, demo_presence, proof_presence, cta_type

**Visual Language :** facecam, screen_recording, broll_usage, text_overlay_density, cut_frequency, visual_switch_rate

**Emotional Trigger :** emotion_primary, emotion_secondary

**Topic Classification :** topic_category, topic_cluster, topic_subcluster

**Performance Metrics :** views, likes, comments, shares

**Derived Metrics :** engagement_rate, view_velocity, virality_score, trend_score_processed_at, pattern_id_ref

**Pipeline :** taxonomy_version, classification_status, classified_at, classified_by, classification_started_at, classification_attempts, pattern_notes

## Twin API (External Agents)

**Auth :** Header `x-api-key` vérifié contre `CLASSIFIER_API_KEY`. Rate limit 100 req/min.

**Endpoints Lecture :**
- `GET /api/videos/unclassified` — vidéos pending
- `GET /api/videos/unscored` — vidéos classifiées sans trend_score (inclut view_velocity, age_hours, niche_averages)
- `GET /api/dataset/quality` — état du dataset
- `GET /api/insights/hooks` — stats par hook mechanism
- `GET /api/insights/formats` — stats par format
- `GET /api/creators/top` — top créateurs par momentum_score
- `GET /api/opportunities` — meilleures opportunités virales

**Endpoints Écriture :**
- `POST /api/videos/ingest` — ingestion batch (max 100)
- `POST /api/videos/classify` — classification d'une vidéo (retry logic, max 3 attempts)
- `POST /api/trends/scores` — push trend scores (max 200, formule: view_velocity 40% + engagement 25% + views_vs_niche 20% + freshness 10% + diversity 5%)
- `POST /api/patterns` — push patterns détectés (upsert par défaut, replace_all protégé)
- `POST /api/trends/alerts` — push alertes (spike, emerging_pattern, new_creator, niche_shift)

**Dashboard V2 Endpoints (auth required) :**
- `GET /api/trends/radar` — métriques globales + trending
- `GET /api/trends/opportunities` — opportunités virales pour dashboard
- `GET /api/creators` — créateurs discovery
- `GET /api/videos/browse` — browse vidéos paginé
- `GET /api/patterns/browse` — patterns browse
- `GET /api/niches/overview` — overview toutes niches
- `PATCH /api/user/preferences` — save niches + goal + onboarding

## Technical Details

- **Authentication:** Google OAuth, Email/Password with bcryptjs, PostgreSQL sessions
- **Stripe Billing:** Plans Starter €29, Pro €69, Studio €199
- **i18n:** EN/FR via useLanguage hook
- **Pattern Engine v1:** Analyse combinatoire multi-dimensions, min 1000 vidéos

## Accounts
- **Demo:** demo@craflect.com / Demo1234! (id: c06b737b)
- **Admin:** admin@craflect.com / Admin1234!
- **Stripe:** Plans Starter €29, Pro €69, Studio €199

## External Dependencies
- OpenAI (gpt-4.1-mini), PostgreSQL, Google OAuth, Stripe, @stripe/react-stripe-js, bcryptjs, connect-pg-simple, wouter, Express, framer-motion
