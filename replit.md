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

## Product Architecture (V5 — Phase 1 Creator-First UX)

**Dual Interface Layer :**
- **Layer 1 — Creator Mode** (default) : Home, Opportunities, Create, Workspace — orienté action/création
- **Layer 2 — Insight Mode** : Insights — analytics avancées style TradingView (Phase 3)

**Navigation Sidebar :**
- **HOME** → `/home` (LayoutDashboard) — Creator Dashboard : Hero CTA "Create Viral Video", Viral Play of the Day, Trending Opportunities carousel, Create From Image
- **OPPORTUNITIES** → `/opportunities` (Target) — Galerie de cartes vidéo verticales (style Canva/CapCut), 4 par ligne, scroll infini, filtres platform/niche
- **CREATE** → `/create` (Sparkles) — Wizard 4 étapes
- **WORKSPACE** → `/workspace` (FolderKanban) — Bibliothèque personnelle
- **INSIGHTS** → `/insights` (BarChart3) — Placeholder "Coming Soon" (Phase 3)
- **SYSTEM** : Settings, Plan & Billing, Admin (admin-only), Intelligence (admin-only), Founder Dashboard (admin-only)

**Pages :**
- `/home` — Hub créateur : Hero gradient violet "Create Viral Video" (ouvre modal Generate Viral Idea → appel OpenAI → carte idée virale → Save + CTA "Créer la vidéo" → /create), "Viral Opportunity Today" (carte unique combinant données tendances + niches utilisateur depuis daily_viral_play, actions: Create Video / ⭐ Save / Refresh), Trending Opportunities (carousel horizontal de VideoCards compacts), Create From Image (teaser upload). Consomme `GET /api/dashboard`
- `/opportunities` — Galerie cartes verticales (remplace Discover). VideoCard avec thumbnail/placeholder gradient, hook, virality score color-coded (violet 80+, orange 60-80, jaune <60), predicted views, format badge, "Create Video" button, ⭐ Save toggle (save/unsave vers saved_ideas → Workspace Saved Inspirations). Infinite scroll via IntersectionObserver. Filtres platform + topic. Consomme `GET /api/videos/browse`
- `/insights` — Placeholder Coming Soon avec 4 feature cards (Niche Growth Charts, Hook Performance, Format Success Rates, Trend Velocity) + mini SVG charts + lock overlay
- `/create` — Wizard 4 étapes : Step 1 Idea (review/edit hook, format, topic, context) → Step 2 Script (generate structured script: hook_line + scene_1/2/3 + cta + hook_variations) → Step 3 Blueprint (generate video blueprint: hook + 4 scenes with visual suggestions + cta) → Step 4 Export (copy to clipboard / download .txt). Auto-save projet dans content_projects. Params pré-remplis via query string (?hook=&format=&topic=&structure=)
- `/workspace` — 3 onglets : Generated Ideas (projects sans script) | Created Scripts (projects avec script) | Saved Inspirations (saved_ideas)
- `/settings` — Profile, Notifications, Security tabs
- `/plan-billing` — Stripe billing management

**Redirections (anciennes routes) :**
- `/discover` → `/opportunities`
- `/trend-radar` → `/opportunities`
- `/library` → `/opportunities`
- `/ideas` → `/workspace`
- `/script-generator` → `/create`
- `/video-builder` → `/create`
- `/projects` → `/workspace`
- `/viral-templates` → `/workspace`
- `/remix-engine` → `/create`
- `/predicted-views` → `/create`

**Predicted Views (calculées côté client) :**
- Score 80+ → 300K – 1M
- Score 60-80 → 120K – 600K
- Score 40-60 → 50K – 200K
- Score <40 → 10K – 50K

**Composants clés :**
- `VideoCard` (`client/src/components/video-card.tsx`) — Carte vidéo verticale réutilisable (9:16). Props: VideoCardData + compact mode. Gradient placeholder si pas de thumbnail. Hover scale + play overlay
- `getPredictedViews` (`client/src/lib/predicted-views.ts`) — Utilitaire predicted views + getViralityColor + formatCompactNumber
- `AnimatedEmptyState` — Messages rotatifs ("AI scanning videos...", "Detecting viral patterns...", etc.)
- `ContentScorecard` — Scorecard réutilisable avec Viral Score, Predicted Views, Hook Strength, Pattern Match, Trend Strength
- `DashboardLayout` — wrapper avec auth guard, sidebar, onboarding redirect
- Virality Score colors: violet (80-100 High), orange (60-80 Good), jaune (40-60 Medium), gris (<40 Low)

**Onboarding (welcome.tsx) :** 5 étapes — (1) Intro "Créer des vidéos virales avec l'IA" → (2) Sélection niches (max 3) → (3) Profil créateur (Créateur/Marketeur/Entrepreneur/Explorateur) → (4) Analyse IA animée (2-3s, appel OpenAI en parallèle) → (5) Carte idée virale générée (topic, hook, format, virality score animé, predicted views, CTA "Créer la vidéo virale" → /create avec params pré-remplis)
- Endpoint: `POST /api/onboarding/generate-idea` — appelle gpt-4.1-mini, retourne { topic, hook, format, structure, viralityScore }
- Virality Score + Predicted Views calculés côté Craflect (pas OpenAI)

## API Endpoints

**Dashboard Aggregated :**
- `GET /api/dashboard` — Single call retournant trending_videos, daily_viral_play, top_patterns, top_hooks, top_formats, alerts
- `GET /api/admin/founder` — Founder Dashboard métriques (admin only) : users, usage, revenue, engine, system_health, charts

**Viral Opportunity Engine :**
- `GET /api/opportunities/engine` — Calcule Opportunity Score (0-100). Top 5 opportunities.

**Ideas API :**
- `GET /api/ideas` — Idées sauvegardées de l'utilisateur
- `POST /api/ideas/save` — Sauvegarder une idée
- `POST /api/ideas/dismiss` — Rejeter une idée

**AI Credits System :**
- `GET /api/credits` — Current credits count, maxCredits, plan (derived from subscription), costs, resetsAt
- Credits: Free=40/month, Creator=1000/month (any paid plan = creator). Costs: idea=2, script=3, blueprint=3
- Atomic deduction via SQL UPDATE WHERE ai_credits >= cost. Plan derived from subscriptions table (active/trialing = creator)
- Paywall: Export blocked for Free plan in Create Studio. Script + Blueprint visible but export requires paid plan

**AI Generation :**
- `POST /api/generate/script` — Génération de script structuré IA (hook_line, scene_1, scene_2, scene_3, cta, hook_variations[3], structure). Deducts 3 credits after validation
- `POST /api/generate/blueprint` — Génération de blueprint vidéo IA (hook + 4 scenes avec visual_suggestion + cta). Deducts 3 credits after validation
- `POST /api/onboarding/generate-idea` — Génération d'idée virale (topic, hook, format, structure, viralityScore). Deducts 2 credits after validation

**Home Aggregated Endpoints :**
- `GET /api/home/viral-play` — Best daily opportunity with "why it works" via OpenAI
- `GET /api/home/trending-opportunities` — Top 6 opportunities (hook, format, topic, virality, view range)
- `GET /api/home/trending-hooks` — Top 8-10 hooks by virality
- `GET /api/home/trending-niches` — Top 5 niches by activity

**Opportunities Aggregated Endpoints :**
- `GET /api/opportunities/top` — 10-20 top opportunities with format filter support
- `GET /api/opportunities/emerging` — Rising trend classification
- `GET /api/opportunities/trending-formats` — Format distribution
- `GET /api/opportunities/trending-hooks` — Top hooks with scores

**Intelligence Feed :**
- `GET /api/intelligence/feed` — Événements intelligence récents (authentifié)
- `POST /api/intelligence/events` — Push événement (Twin API key)

**Viral Templates :**
- `GET /api/templates` — Liste des templates
- `POST /api/templates/generate` — Auto-génère templates
- `POST /api/templates` — Créer un template (admin only)
- `DELETE /api/templates/:id` — Supprimer un template
- `POST /api/templates/:id/use` — Incrémenter usage_count

**Content Remix :**
- `POST /api/remix` — Analyse + optimise contenu texte via IA

**Predicted Views :**
- `POST /api/predict/views` — Prédit probabilité virale + fourchette de vues
- `POST /api/predict/improve` — Suggestions IA pour améliorer le score

**Projects CRUD :**
- `GET /api/projects` — Liste des projets
- `POST /api/projects` — Créer un projet
- `PATCH /api/projects/:id` — Modifier un projet
- `DELETE /api/projects/:id` — Supprimer un projet

## DB Tables

**`videos`** : id, platform, platform_video_id, video_url, thumbnail_url, caption, transcript, hashtags, duration_seconds, duration_bucket, creator_name, creator_id, creator_niche, published_at, collected_at, updated_at, hook intelligence fields, narrative structure fields, visual language fields, emotional trigger fields, topic classification (3 levels), performance metrics, derived metrics, classification pipeline fields

**`saved_ideas`** : id, user_id, hook, format, topic, opportunity_score, velocity, videos_detected, status (saved/dismissed), created_at

**`content_projects`** : project_id, user_id, title, hook, format, topic, script (JSONB), blueprint (JSONB), status (draft/in_progress/completed), created_at, updated_at

**`viral_templates`** : id, title, description, topic_cluster, hook_mechanism, structure_type, hook_template, scene_structure (JSONB), source (auto/manual), usage_count, created_at

**`intelligence_events`** : id, event_type, title, description, metadata (JSONB), created_at

## Twin API (External Agents)

**Auth :** Header `x-api-key` vérifié contre `CLASSIFIER_API_KEY`. Rate limit 100 req/min.

**Champs classify :** `view_velocity` et `engagement_rate` acceptent string ou number (valeurs non-numériques ignorées). `thumbnail_url` accepté pour les miniatures vidéo.

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
- `POST /api/videos/classify` — classification d'une vidéo (thumbnail_url, view_velocity, engagement_rate supportés)
- `POST /api/videos/reset-incomplete` — reset vidéos incomplètes
- `POST /api/trends/scores` — push trend scores
- `POST /api/patterns` — push patterns détectés (accepte pattern_score, velocity_mid, pattern_novelty, trend_classification)
- `POST /api/patterns/compute` — compute patterns (émet PATTERN_DETECTED)
- `POST /api/intelligence/events` — push intelligence events

## Technical Details

- **Authentication:** Google OAuth, Email/Password with bcryptjs, PostgreSQL sessions
- **Stripe Billing:** Plans Starter €29, Pro €69, Studio €199
- **i18n:** EN/FR via useLanguage hook
- **Pattern Engine v1:** Analyse combinatoire multi-dimensions, min 1000 vidéos
- **niche = topic_cluster** (25 slugs snake_case). `TOPIC_CLUSTER_LABELS` pour labels lisibles.
- **isAdmin check frontend:** `(user as any)?.isAdmin === true`

## Navigation Separation (User vs Admin)
- **User sidebar:** Home, Opportunities, Create, Workspace, Insights + Settings, Plan & Billing
- **Admin sidebar:** Founder Dashboard, Logs, Settings (only 3 items, no user pages)
- **Route protection:** Admin → redirect to `/system/founder` if accessing user routes. User → redirect to `/home` if accessing admin routes.
- **Admin login flow:** login → detect admin → send 6-digit code to pgdtglobal@gmail.com via SMTP (mail.craflect.com:465 SSL) → verify code → access `/system/founder`
- **Admin verification:** 10min expiry, max 5 attempts, table `admin_verification_codes`
- **Email service:** `server/email.ts` using nodemailer, SMTP config: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, ADMIN_VERIFICATION_EMAIL

## Founder Dashboard (admin only)
- Route: `/system/founder` — métriques internes SaaS + moteur
- Route: `/system/logs` — logs système (placeholder)
- Route: `/system/settings` — paramètres système (placeholder)
- Endpoint: `GET /api/admin/founder` — retourne users, usage, revenue, engine, system_health, charts
- 5 sections métriques : Users (7 cartes, blue), Usage (5, green), Revenue (6, violet), Engine (10, orange), System Health (4, gray)
- Section "Engine Intelligence" : 4 graphiques recharts 30j en grille 2x2 (Dataset Growth, Pattern Intelligence Growth, Pattern Reuse Rate, Cross-Platform Pattern Growth)

## Phase 3 — Shareable Insights (À IMPLÉMENTER PLUS TARD)
**Route publique** : `/insight/{id}` — accessible SANS authentification
**Contenu affiché** :
- hook
- pattern_score
- trend_classification (badge rising/stable/declining)
- format_type
- topic_cluster
- total_views_analyzed
- Section "Why this trend matters" — explication basée sur frequency, virality score, cross-platform presence
- CTA "Create with this pattern" → `/create?hook=...&format=...&topic=...`
**Partage** : Share X (Twitter) + Share LinkedIn
**Export visuel** : PNG + SVG (design optimisé pour partage social)
**Objectif** : Partage viral des insights pour acquisition organique. À lancer après accumulation suffisante de patterns et signaux de tendance.

## Accounts
- **Demo:** demo@craflect.com / Demo1234! (id: c06b737b) → redirigé vers /dashboard
- **Admin:** admin@craflect.com / Admin1234! → redirigé vers /system/founder (Founder Dashboard)
- **Stripe:** Plans Starter €29, Pro €69, Studio €199

## External Dependencies
- OpenAI (gpt-4.1-mini), PostgreSQL, Google OAuth, Stripe, @stripe/react-stripe-js, bcryptjs, connect-pg-simple, wouter, Express, framer-motion, nodemailer
