# Craflect - AI Content Intelligence & Creation Platform

## Overview
Craflect est une plateforme d'intelligence et de création de contenu basée sur l'analyse de vidéos courtes (TikTok, Instagram Reels, YouTube Shorts). Vision : Trend → Opportunity → Create Script → Create Video → Publish. Pipeline complète : Viral Opportunity Engine + Library unifiée + Ideas + Script Generator (IA) + Video Builder (IA) + Projects.

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
- **Craflect Taxonomy v1 tables** (pipeline stable) : `videos`, `viral_patterns`, `patterns`, `saved_ideas`, `content_projects` — taxonomie en couches
- Les deux coexistent. Les tables legacy alimentent le frontend actuel. La Taxonomy v1 alimente le Pattern Engine et les nouvelles pages.

## Product Architecture (V3 — Current)

**Navigation Sidebar :**
- **Analyze** : Dashboard, Trend Radar, Library
- **Create** : Ideas, Script Generator, Video Builder, Projects
- **System** : Settings, Plan & Billing, Admin (admin-only), Intelligence (admin-only)

**Pages :**
- `/dashboard` — Hub principal avec 4 KPIs + 3 sections : Viral Opportunities Today (max 5 cards avec Opportunity Score), Fastest Growing Trends, Top Viral Videos Today. Boutons Create Script/Video/Save Idea.
- `/trend-radar` — 3 sections cards : Emerging Trends, Trending Hooks, Trending Formats.
- `/library` — Explorateur unifié avec 3 onglets (Videos, Patterns, Creators). Filtres (platform, topic_cluster, hook_type, structure_type, trend_score, velocity). Infinite scroll pour Videos/Creators.
- `/ideas` — 2 onglets : Discovered (auto-générées par Opportunity Engine) et Saved (idées sauvegardées). Cartes avec hook, format, topic, opportunity_score, velocity, videos_detected.
- `/script-generator` — Formulaire (hook, format, topic, contexte) → Génération IA (OpenAI gpt-4.1-mini) → Script éditable (Hook, Structure, Full Script, CTA). Regenerate, Save to Project, Create Video.
- `/video-builder` — Formulaire (hook, format, topic, script) → Génération IA → Blueprint éditable (Hook, 4 Scènes, CTA). Regenerate, Save to Project.
- `/projects` — Liste des projets utilisateur. Filtrage par statut (draft, in_progress, completed). Détail avec script + blueprint éditables.

**Composants clés :**
- `TrendScore` — composant 0-100 avec couleurs conformes au brief : vert (emerald 75+) = Emerging, jaune (yellow 50+) = Growing, orange (25+) = Peak, gris (zinc <25) = Saturated
- `DashboardLayout` — wrapper avec auth guard, sidebar, onboarding redirect
- Opportunity Score colors: 80-100 High (green), 60-80 Medium (yellow), <60 Low (gray)

**Onboarding (welcome.tsx) :** 4 étapes — Welcome → Select niches (max 3) → User goal → Redirect /dashboard

## New API Endpoints (V3)

**Viral Opportunity Engine :**
- `GET /api/opportunities/engine` — Calcule Opportunity Score (0-100) à partir de virality, engagement, velocity, repetition, cross-platform. Top 5 opportunities.

**Ideas API :**
- `GET /api/ideas` — Idées sauvegardées de l'utilisateur
- `POST /api/ideas/save` — Sauvegarder une idée
- `POST /api/ideas/dismiss` — Rejeter une idée

**AI Generation :**
- `POST /api/generate/script` — Génération de script IA (hook, structure, script, cta)
- `POST /api/generate/blueprint` — Génération de blueprint vidéo IA (hook, 4 scenes, cta)

**Projects CRUD :**
- `GET /api/projects` — Liste des projets
- `POST /api/projects` — Créer un projet
- `PATCH /api/projects/:id` — Modifier un projet
- `DELETE /api/projects/:id` — Supprimer un projet

## DB Tables

**`saved_ideas`** : id, user_id, hook, format, topic, opportunity_score, velocity, videos_detected, status (saved/dismissed), created_at

**`content_projects`** : project_id, user_id, title, hook, format, topic, script (JSONB), blueprint (JSONB), status (draft/in_progress/completed), created_at, updated_at

## Craflect Taxonomy v1 (Stable)

**25 Topic Clusters contrôlés (snake_case) :** ai_tools, ai_automation, online_business, entrepreneurship, digital_marketing, ecommerce, saas, real_estate, finance, crypto, productivity, education, tech, personal_branding, coaching, motivation, lifestyle, fitness, health, beauty, food, travel, relationships, entertainment, gaming

**Video Metadata :** id, platform, platform_video_id, video_url, caption, transcript, hashtags, duration_seconds, duration_bucket, creator_name, creator_id, creator_niche, published_at, collected_at, updated_at

**Hook Intelligence :** hook_type, hook_pattern, hook_text, hook_duration, hook_position, hook_mechanism_primary

**Narrative Structure :** structure_type, beats_count, reveal_time, demo_presence, proof_presence, cta_type

**Visual Language :** facecam, screen_recording, broll_usage, text_overlay_density, cut_frequency, visual_switch_rate

**Emotional Trigger :** emotion_primary, emotion_secondary

**Performance Metrics :** views, likes, comments, shares

**Derived Metrics :** engagement_rate, view_velocity, virality_score, trend_score_processed_at, pattern_id_ref

## Twin API (External Agents)

**Auth :** Header `x-api-key` vérifié contre `CLASSIFIER_API_KEY`. Rate limit 100 req/min.

**Endpoints Lecture :**
- `GET /api/videos/unclassified` — vidéos pending
- `GET /api/videos/unscored` — vidéos classifiées sans trend_score
- `GET /api/dataset/quality` — état du dataset
- `GET /api/insights/hooks` — stats par hook mechanism
- `GET /api/insights/formats` — stats par format
- `GET /api/creators/top` — top créateurs par momentum_score
- `GET /api/opportunities` — meilleures opportunités virales

**Endpoints Écriture :**
- `POST /api/videos/ingest` — ingestion batch (max 100)
- `POST /api/videos/classify` — classification d'une vidéo
- `POST /api/trends/scores` — push trend scores
- `POST /api/patterns` — push patterns détectés
- `POST /api/trends/alerts` — push alertes

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
