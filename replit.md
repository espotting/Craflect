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
- **Legacy tables** (frontend actuel) : `video_primitives`, `niche_patterns`, `niche_statistics`, `niche_profiles`, `workspace_intelligence` — taxonomie 4 dimensions (HOOK_TYPES, FORMAT_TYPES, ANGLE_CATEGORIES, STRUCTURE_MODELS)
- **Craflect V1 tables** (nouveau pipeline) : `videos`, `viral_patterns` — taxonomie 19 dimensions (hook_mechanism, hook_format, hook_text, hook_topic, emotional_trigger, content_structure, content_format, content_goal, visual_style, storytelling_presence, content_pace, creator_archetype, topic_category, call_to_action, controversy_level, information_density, platform, duration_bucket, pattern_notes)
- Les deux coexistent. Les tables legacy alimentent le frontend actuel. Les tables V1 alimentent le Pattern Engine.

**Technical Implementations:**
- **Authentication:** Google OAuth, Email/Password with OTP, bcryptjs, PostgreSQL sessions
- **Data Model:** Drizzle ORM — workspaces, content_sources, generated_content, briefs, performance, events, niches, creators, video_primitives, niche_patterns, niche_statistics, niche_profiles, workspace_intelligence, **videos** (V1), **viral_patterns** (V1). DB indexes on video_primitives, content_sources, workspace_intelligence, videos, viral_patterns.
- **Craflect V1 Taxonomy (19 dimensions):** HOOK_MECHANISMS, HOOK_FORMATS, HOOK_TOPICS, EMOTIONAL_TRIGGERS, CONTENT_STRUCTURES, CONTENT_FORMATS, CONTENT_GOALS, VISUAL_STYLES, STORYTELLING_PRESENCES, CONTENT_PACES, CREATOR_ARCHETYPES, TOPIC_CATEGORIES, CTA_TYPES, CONTROVERSY_LEVELS, INFORMATION_DENSITIES, DURATION_BUCKETS — all defined in `shared/schema.ts`
- **Intelligence Layer:** Ingestion Pipeline, Pattern Aggregator, Scoring Engine, Profile Generator, **Pattern Engine** (`server/intelligence/pattern-engine.ts`)
- **Hybrid Intelligence:** Global Signal (admin) + Workspace Intelligence (user) via `video_primitives` + `workspace_intelligence`
- **Stripe Billing:** Subscriptions, payment methods (Stripe Elements), Stripe Tax enabled, webhook handling
- **Niche Isolation:** content_sources filtered by niche_id, shared niche selector (Dashboard ↔ Analyzed Content via `useSelectedNiche` hook)

**Key Features:**
- Dashboard (Global Signal / Your Dataset toggle)
- Analyzed Content (Library) with niche filtering
- Insights (Briefs) with data-driven recommendations
- Analytics (Learning Loop)
- Niche Data
- Plan & Billing (Stripe Elements)
- Admin Panel
- 4-step onboarding funnel

**Classifier API (external agent — Twin):**
- `POST /api/videos/ingest` — ingestion de métadonnées vidéo (batch max 100). Status initial `pending`.
- `GET /api/videos/unclassified` — batch de vidéos `pending`, auto-lock `processing`, timeout 10min auto-reset. Param `?limit=` (default 20, max 100)
- `POST /api/videos/classification` — reçoit `video_id` + `classification` JSON (19 dimensions validées dont hook_topic + content_goal), update → `completed`. Vidéos déjà classifiées → 409.
- Sécurité : header `x-api-key` vérifié contre `CLASSIFIER_API_KEY` (env secret). 401 si absent/invalide.

**Pattern Engine** (`server/intelligence/pattern-engine.ts`):
- Dimensions analysées : hook_mechanism, hook_topic, content_format, content_pace, content_structure, content_goal, platform, topic_category
- Seuils configurables (env vars) : `PATTERN_DOMINANT_THRESHOLD` (0.08), `PATTERN_EMERGING_THRESHOLD` (1.8), `TREND_RATIO_THRESHOLD` (1.3)
- **Dominant** : freq ≥ 8%, performance_ratio ≥ 1.2 | **Émergent** : freq < 8%, perf_ratio ≥ 1.8 | **En croissance** : trend_ratio ≥ 1.3
- Activation : ≥ 300 vidéos classifiées
- Endpoints : `GET /api/patterns/status`, `GET /api/patterns`, `POST /api/patterns/compute`

**Development Phases (V1):**
- Phase 1 (done): DB schema, taxonomy 19 dimensions, LLM classification, Classifier API
- Phase 2 (done): Pattern Engine, seuils configurables, viral_patterns population
- Phase 3: Hook Library, insights interface
- Phase 4: Content Generator, Creator Workspace

## Accounts
- **Demo:** demo@craflect.com / Demo1234! (id: c06b737b)
- **Admin:** admin@craflect.com / Admin1234!
- **Stripe:** Plans Starter €29, Pro €69, Studio €199

## External Dependencies
- OpenAI (gpt-4.1-mini), PostgreSQL, Google OAuth, Stripe, @stripe/react-stripe-js, bcryptjs, connect-pg-simple, wouter, Express
