# Craflect - AI Content Intelligence & Creation Platform

## Overview
Craflect is an AI-powered content intelligence and creation platform focused on short-form video analysis (TikTok, Instagram Reels, YouTube Shorts). Its vision is to streamline the entire content creation pipeline from trend identification to video publication: Trend → Opportunity → Create Script → Create Video → Publish. Key capabilities include a Viral Opportunity Engine, a unified content library, idea generation, an AI Script Generator, an AI Video Builder, and comprehensive project management. The platform aims to provide a complete solution for creators to capitalize on viral trends.

## User Preferences
- Priorité au développement itératif
- **AUCUNE modification (ajout/suppression de fonctionnalité, données, ou code) sans validation préalable explicite**
- **AUCUNE suppression de données sans validation préalable**
- Toutes les réponses en français
- Dark-first aesthetic, neon purple (#7C5CFF)
- Ne pas modifier `replit_integrations/auth/` et `replit_integrations/chat/` sans approbation

## Landing Page (v2 - March 2026)
- Dark-only design (bg-slate-950), no light/dark toggle in header
- Sections: Hero (with dashboard mockup) → How it Works → See it/Understand it/Use it → Features → Pricing (integrated, yearly default) → FAQ → CTA → Footer
- Header: Logo color + "Craflect" white text, Pricing link (scrolls to #pricing), Language switcher, Sign-in icon, CTA button
- Footer: Product, Company, Legal columns + social icons (Twitter/LinkedIn)
- Pricing integrated in landing page, no dedicated /pricing page (route redirects to /)
- i18n: All strings translated EN + FR

## System Architecture
The application uses a React, TypeScript, Tailwind CSS, shadcn/ui, and Framer Motion frontend. The backend is built with Express/Node.js, using PostgreSQL with Drizzle ORM for data persistence. Authentication is handled via Google OAuth and Email/Password. OpenAI (gpt-4.1-mini) is integrated for AI functionalities.

The system employs a dual schema approach:
- **Legacy tables**: `video_primitives`, `niche_patterns`, `niche_statistics`, `niche_profiles`, `workspace_intelligence` are used by the current frontend. These tables utilize a 4-dimensional taxonomy (VP_HOOK_TYPES, FORMAT_TYPES, ANGLE_CATEGORIES, STRUCTURE_MODELS).
- **Craflect Taxonomy v1 tables**: `videos`, `viral_patterns`, `patterns`, `saved_ideas`, `content_projects` support the stable pipeline, Pattern Engine, and new features, based on a layered taxonomy. Both schema co-exist.
- **Geo Intelligence**: Table `geo_zones` (6 zones: US, UK, EU-FR, EU-ES, EU-DE, LATAM). Table `videos` has geo columns: `geo_zone`, `geo_country`, `geo_language`, `target_markets` (text array with GIN index).

The platform features a dual interface layer:
- **Creator Mode** (default): Focuses on action and creation (Home with Viral Play of the Day + Trending Videos, Opportunities grid, Studio/Create with 5 modes, Workspace).
- **Intelligence Mode**: Stats cards, Top Patterns, Trending Topics, Hook Performance — toggled from Home page header.

Key UI components include:
- `VideoCardV2` (`video-card-v2.tsx`): Hover actions (Create Similar, Analyze, Save), compact mode, virality badge.
- `OpportunityCard` (`opportunity-card.tsx`): Featured (Viral Play) and compact versions.
- `ViralityBadge` (`virality-badge.tsx`): Red 90+, Orange 80+, Yellow 60+, Slate default.
- `StatusBadge` (`status-badge.tsx`): idea/script/blueprint/completed states.
- `GuidedWorkflow` (`guided-workflow.tsx`): Sticky bottom bar, 4 steps (Idea→Script→Blueprint→Export).
- `PaywallModal` (`paywall-modal.tsx`): Dialog-based upgrade prompt for Free users on export.
- `getPredictedViews` utility for calculating virality scores and view ranges.
- `DashboardLayout` for authenticated views with a sidebar.

## Studio / Create Page
5 creation modes: Opportunity (Recommended), Script-to-Video, Viral Templates, AI Avatar, Video Remix (Pro/Coming Soon disabled). Each mode enters the 4-step wizard (Idea→Script→Blueprint→Export). PaywallModal blocks export for Free users.

## AI Credits System
- Credit costs: idea=1, script=1, blueprint=1, template_render=2, avatar=3
- Plan credits: Free=30/month, Creator=250/month, Pro=1500/month
- estimatedVideos = credits / 3
- Credit rollover: max 2 months

## Pricing
- Free: $0, 30 credits, preview only (no export)
- Creator: $24/mo ($19/mo yearly), 250 credits
- Pro: $109/mo ($99/mo yearly), 1500 credits

## Auth Flow (v2 - March 2026)
Auth pages split into individual routes under `client/src/pages/auth/`:
- `/welcome` → Auth Welcome (Google + Email options)
- `/signin` → Sign In (email/password)
- `/signup` → Sign Up (with password rules, terms checkbox)
- `/forgot-password` → Forgot Password (email input)
- `/email-confirmation?email=X&flow=signup|login` → 6-digit code verification
- `/admin-verification?email=X` → Admin 2FA (challengeToken in sessionStorage)
- `/auth` → Legacy redirect to `/welcome`
- `/onboarding` → 5-step onboarding funnel (Role → Topics → Profile → AI Analysis → First Idea)

Logo: `logo-transparent.png` (white) used in auth pages + sidebar. `logo-color.png` for emails only.
All auth pages are dark-only (#0a0a0f) with Framer Motion animations.

The user onboarding process involves 5 steps: intro, niche selection, creator profile setup, AI analysis, and initial viral idea generation.

API endpoints are designed for aggregated dashboard data, viral opportunity engine, idea management, AI credit system, AI generation (script, blueprint, viral idea), aggregated home and opportunities data, intelligence feed, viral templates, content remixing, predicted views, and projects CRUD operations.

An internal Twin API allows external agents to interact with the platform for video ingestion, classification, trend scoring, and pattern detection.

Admin functionalities include a Founder Dashboard v2 with 5 pages under `/system/founder/*`:
- **Overview** (`/system/founder`) — KPI priority bar, Platform Health, Product Usage, SaaS Metrics, Growth Metrics (recharts)
- **Users** (`/system/founder/users`) — User table with search, plan/status badges, actions dropdown
- **Subscriptions** (`/system/founder/subscriptions`) — Subscription table with MRR, billing info, actions
- **System Logs** (`/system/founder/logs`) — Log table with level filters (info/warning/error/success), export
- **Settings** (`/system/founder/settings`) — 4 tabs (General/API/Notifications/Security) with toggles

Dashboard components in `client/src/components/dashboard/`: KPICard, KPIPriorityBar, PlatformHealthSection, ProductUsageSection, SaaSMetricsSection, GrowthMetricsSection.

Old routes `/system/logs` and `/system/settings` redirect to new founder routes. Admin sidebar shows all 5 admin pages. Admin login requires a 6-digit code verification.

## Pipeline Data & Pattern Engine
- **Niche Clusters** (macro-niches): `tech_business`, `creator_economy`, `productivity`, `marketing_growth`, `lifestyle`
- Mapping: 25 topic_clusters → 5 niche_clusters via `TOPIC_TO_NICHE_CLUSTER` + `resolveNicheCluster()`
- **Pipeline tables**: `video_classification` (Content DNA séparée), `pipeline_patterns`, `pattern_templates`, `opportunities`, `pipeline_logs`, `dataset_batches`
- **Phase Engine**: `pattern_engine_state` (phase 1=Rule Based → 2=Clustering → 3=LLM Synthesis)
- **Embeddings**: `video_embeddings` (JSONB on Replit, pgvector on Hetzner)
- **Clusters**: `content_clusters` (grouped by cosine similarity > 0.85)
- **Services**: `server/services/embeddings.ts`, `server/services/clustering.ts`, `server/services/llm-analysis.ts`

## Craflect v2.0 Workers (Hetzner only)
Workers infrastructure prepared for Hetzner deployment (not runnable on Replit — requires Redis + Ollama):
- `server/config/redis.ts` — Redis/BullMQ connection
- `server/config/ollama.ts` — Ollama LLM connection + health check
- `server/workers/ingestion.worker.ts` — Scrapes videos per geo zone, deduplication, quality filter
- `server/workers/classification.worker.ts` — Content DNA extraction (Ollama local → OpenAI fallback)
- `server/workers/scoring.worker.ts` — Virality score, engagement rate, view velocity
- `server/workers/pattern.worker.ts` — Pattern detection + video↔pattern association
- `server/workers/phase-transition.worker.ts` — Phase transition (1→2→3) with thresholds (500/2000 classified videos)
- `server/workers/scheduler.ts` — BullMQ schedules (ingestion 2h, scoring 15min, patterns 6h, phase transition 30min)
- `server/workers/index.ts` — Worker bootstrap
- `docker-compose.yml` — Full stack: app, workers, postgres, redis, ollama
- `migrations/0001_cleanup.sql` — TRUNCATE legacy data (⚠️ Hetzner only, NOT executed on Replit)
- `migrations/0002_geo_v2.sql` — Geo columns + zones (already applied on Replit)

## External Dependencies
- OpenAI (gpt-4.1-mini)
- PostgreSQL
- Google OAuth
- Stripe (@stripe/react-stripe-js)
- BullMQ + ioredis (workers only, Hetzner)
- Ollama (workers only, Hetzner)
- bcryptjs
- connect-pg-simple
- wouter
- Express
- framer-motion
- nodemailer