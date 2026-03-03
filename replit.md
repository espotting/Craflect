# Craflect - Content Performance Intelligence Platform

## Overview
Craflect is a content performance intelligence platform. Core vision: "Show me what works → Tell me what to post → Create it for me." The platform analyzes short-form video content URLs (TikTok, Instagram, YouTube) to identify performance patterns (hooks, formats, structures) in a niche, then generates optimized content recommendations to reproduce what works. MVP uses URL-based ingestion (no OAuth scraping). Built with a dark-first aesthetic using neon purple (#7C5CFF) branding.

## Stack
- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui + Framer Motion
- **Backend**: Express/Node.js + TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Google OAuth via passport-google-oauth20 + Email/password + OTP verification
- **AI**: OpenAI via Replit AI Integrations (`gpt-4.1-mini` with `response_format: { type: "json_object" }`)
- **Routing**: wouter (frontend), Express (backend)

## Architecture
```
client/src/
├── assets/           # logo-light.png, logo-transparent.png
├── components/       # app-sidebar.tsx, layout.tsx, ui/
├── hooks/            # use-auth.ts, use-theme.ts, use-workspaces.ts, use-sources.ts, use-briefs.ts, use-analytics.ts, use-events.ts, use-toast.ts
├── lib/              # queryClient.ts
├── pages/            # landing.tsx, auth.tsx, welcome.tsx, dashboard.tsx, library.tsx, briefs.tsx, analytics.tsx, settings.tsx, admin.tsx, intelligence.tsx, pricing.tsx, legal.tsx, faq.tsx, niche-data.tsx, plan-billing.tsx
server/
├── replit_integrations/auth/  # replitAuth.ts (Google OAuth), storage.ts, routes.ts
├── replit_integrations/chat/  # AI chat integration
├── routes.ts         # API routes (workspaces, sources, ingestion, analysis, insights, AI generation, analytics, admin, events, intelligence)
├── storage.ts        # IStorage interface + DatabaseStorage implementation
├── db.ts             # Drizzle DB connection
├── utils/scraper.ts  # Shared scraping utilities (scrapePublicMetadata, detectPlatform, extractCreatorHandle)
├── intelligence/     # Intelligence Layer
│   ├── ingestion-pipeline.ts   # URL → LLM classification → video_primitive + pattern update
│   ├── pattern-aggregator.ts   # Distribution calculation, stability/confidence scoring
│   ├── scoring.ts              # Confidence, signal strength, intelligence status computation
│   └── profile-generator.ts    # LLM-generated niche intelligence profiles
shared/
├── schema.ts         # Drizzle schemas (workspaces, content_sources, generated_content, briefs, performance, events, niches, creators, video_primitives, niche_patterns, niche_statistics, niche_profiles)
├── models/auth.ts    # users (with password, isAdmin, onboardingCompleted) + sessions + verification_codes tables
├── routes.ts         # API route definitions with Zod validation
```

## Auth
- Google OAuth (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
- Email + Password + Verification Code (signup: email/password/name → code, login: email/password → direct access)
- Passwords hashed with bcryptjs (12 rounds), rules: 8+ chars, 1 uppercase, 1 number, 1 special char
- Password field NEVER sent in API responses (sanitizeUser strips it)
- Session stored in PostgreSQL via connect-pg-simple
- User ID from `req.user.id`
- Demo accounts: demo@craflect.com / Demo1234! (user), admin@craflect.com / Admin1234! (admin)

## Theme
- Dark mode by default (`class="dark"` on html element)
- Light/dark toggle via useTheme hook (persisted to localStorage)
- CSS variables in :root (light) and .dark (dark) in index.css
- Logo: logo-transparent.png (dark), logo-light.png (light)

## Core Intelligence Flow
1. **Observe**: User pastes video URLs (TikTok, Instagram, YouTube)
2. **Scrape**: Lightweight public metadata scraping (og:title, og:description, views, likes, comments, duration, thumbnail — when available from page HTML)
3. **Understand**: AI extracts pattern features ONLY (hookType, narrativeStructure, contentAngle, contentFormat, performanceScore). Metrics are NEVER simulated by AI — only real scraped data or "Metrics unavailable".
4. **Recommend**: Pattern analysis across all workspace sources → identifies top hooks, winning formats, optimal structures
5. **Produce**: Generate optimized content recommendations based on niche patterns

## Intelligence Layer Architecture (V1)
- **Closed Taxonomies**: HOOK_TYPES (15), STRUCTURE_MODELS (10), ANGLE_CATEGORIES (12), FORMAT_TYPES (6) — no free-form categories
- **Tables**: niches, creators, video_primitives, niche_patterns, niche_statistics, niche_profiles
- **Pipeline**: URL → scrape metadata → LLM classification (gpt-4.1-mini) → video_primitive → pattern aggregation → statistics update
- **Pattern Stability Score**: `1 - normalized_entropy(hook_distribution)` — measures how concentrated patterns are
- **Confidence Score**: `min(1, log(total_videos)/log(1000)) * pattern_stability_score`
- **Profile Generation**: LLM generates intelligence_summary + strategic_recommendation from patterns/statistics
- **API Routes**: All under `/api/intelligence/niches/...` (admin-only)
- **No video storage**: Only normalized abstractions (video_primitives)

## Data V1 Architecture
- **Metrics and AI analysis are decoupled**: AI analyzes patterns independently of metrics availability
- **No simulated data**: If scraping fails to retrieve views/likes/etc., they stay null and UI shows "Metrics unavailable"
- **Scraping is non-blocking**: If metadata fetch fails, analysis continues with URL/platform context only
- **Real scraped metadata stored**: title, description, duration, views, likes, comments, thumbnail, creator, publishedAt — all stored even if partial
- **Value proposition**: "Why it works" (patterns) > "How many views" (metrics)

## Features
- **Onboarding**: 4-step (choose niche → paste min 3 URLs → processing animation → results/dashboard), URL input with platform auto-detection, confetti
- **Dashboard (Signal Only)**: Niche Intelligence Status card (status badge, confidence %, signal strength %, videos analyzed), Quick Snapshot (3 cards: dominant hooks/formats/angles with %), CTA to Data Breakdown
- **Analyzed Content (Library)**: URL ingestion with platform auto-detect, source cards with metrics/AI tags/performance score, filter/sort by platform/score/hook type
- **Insights (Briefs)**: Niche Intelligence Profile card, Winning Patterns (3 compact cards), max 3 one-line recommendations, "View Data Behind These Insights" link
- **Analytics (Learning Loop)**: 4 metric cards (Content Created, Content Tracked, Signal Strength, Confidence), signal interpretation
- **Data Breakdown** (`/niche-data`): Full distribution tables (hooks, structures, formats, angles), confidence computation details
- **Plan & Billing** (`/plan-billing`): Current plan, usage progress bars, upgrade CTA
- **Settings**: Profile editing with save, theme toggle
- **Admin Panel**: KPI cards, user list, event feed
- **Instrumentation**: Event tracking (content_uploaded, brief_generated, content_generated, analytics_viewed)

## API Routes
- GET/POST /api/workspaces - List/create workspaces
- GET /api/workspaces/:id/sources - List content sources
- POST /api/workspaces/:id/sources/ingest - Batch URL ingestion (auto-detects platform)
- POST /api/sources/:id/analyze - Scrapes public metadata + AI pattern analysis (hookType, narrativeStructure, contentAngle, performanceScore). Metrics from scraping only, never simulated.
- POST /api/sources/:id/generate - AI content generation from source
- GET/POST /api/workspaces/:id/briefs - List briefs / insights
- POST /api/workspaces/:id/briefs/generate - AI performance insights generation (pattern analysis across all sources)
- POST /api/briefs/:id/generate - Generate recommended content from insight
- GET /api/workspaces/:id/generated - All generated content
- PATCH /api/generated-content/:id/status - Update content status
- PATCH /api/generated-content/:id/schedule - Schedule content
- GET /api/workspaces/:id/analytics - Workspace analytics
- POST /api/performance - Add performance data
- POST /api/events - Track event
- PATCH /api/auth/user - Update user profile
- GET /api/admin/stats, /api/admin/users, /api/admin/events - Admin endpoints

## Key Schema Fields
### content_sources
- id, workspaceId, type (text/link/url), title, transcript, rawContent
- url, platform (tiktok/instagram/youtube/other), creatorHandle
- views, likes, commentsCount, duration, description, hashtags, thumbnailUrl, publishedAt
- hookType, narrativeStructure, contentAngle, contentFormat, performanceScore (0-100), nicheCategory (AI-extracted)
- ingestionStatus (pending/processing/analyzed/failed), ingestionError

### briefs
- id, workspaceId, topic, hook, script, format, status
- insights (JSON: top hooks, winning formats, content angles, niche patterns)
- recommendations (JSON: actionable recommendations with priority)

## Key Patterns
- Workspaces belong to users (ownerId) and optionally link to a niche (nicheId), verifyWorkspaceOwnership middleware on all workspace routes
- Content sources belong to workspaces, ingestionStatus tracks analysis pipeline
- Source-level routes (/api/sources/:id/analyze, /api/sources/:id/generate) verify workspace ownership via source→workspace→ownerId check
- Generated content belongs to workspaces, optionally to sources or briefs
- Briefs/Insights belong to workspaces, contain pattern analysis data
- All protected routes use `isAuthenticated` middleware
- Admin routes additionally use `isAdmin` middleware
- SSRF protection: scraper blocks private/localhost/internal URLs before fetching
- LLM classification validates taxonomy values with null-safe fallbacks

## Environment Variables
- DATABASE_URL (auto)
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
- SESSION_SECRET
- AI_INTEGRATIONS_OPENAI_API_KEY, AI_INTEGRATIONS_OPENAI_BASE_URL (auto)

## Pages
- **Landing** (`/`): Public hero page with "Show me what works → Tell me what to post → Create it for me"
- **Pricing** (`/pricing`): Public pricing page with 3 plans (Starter €29, Pro €69, Studio €199), comparison table, FAQ, "Free trial • No commitment • Cancel anytime" messaging
- **Auth** (`/auth`): Login/signup with email+password or Google OAuth
- **Dashboard** (`/dashboard`): Signal-only — Niche Intelligence Status, Quick Snapshot (hooks/formats/angles), View Data Breakdown CTA
- **Library** (`/library`): Analyzed Content — URL ingestion, source cards with AI tags
- **Briefs** (`/briefs`): Insights — Niche Profile, Winning Patterns, Recommendations, View Data CTA
- **Analytics** (`/analytics`): Learning Loop — Content Created/Tracked, Signal Strength, Confidence
- **Niche Data** (`/niche-data`): Full distribution tables, confidence computation details
- **Plan & Billing** (`/plan-billing`): Subscription management, usage limits, upgrade CTA
- **Settings** (`/settings`): Profile editing
- **Admin** (`/admin`): KPI cards, user list, event feed

## i18n (Internationalization)
- **Languages**: English (default), French
- **Files**: `client/src/i18n/en.ts` (English), `client/src/i18n/fr.ts` (French)
- **Hook**: `useLanguage()` from `@/hooks/use-language` — returns `{ t, language, setLanguage }`
- **Provider**: `LanguageProvider` wraps the entire app in `App.tsx`
- **Switcher**: `<LanguageSwitcher />` from `@/components/language-switcher` — globe icon dropdown, supports `variant="icon"` (default) and `variant="pill"`
- **Persistence**: Language preference saved in `localStorage` as `craflect-lang`
- **Coverage**: All pages (landing, auth, pricing, dashboard, library, insights, analytics, settings, admin, welcome), layout, sidebar, toast messages
- **Adding new text**: Add key to both `en.ts` and `fr.ts`, then use `t.section.key` in components
- **Dynamic text**: Use `.replace("{var}", value)` for variables like `{name}`, `{count}`, `{year}`

## Scoring Engine
- **Confidence**: 0.4 × volume_score + 0.4 × consistency_score + 0.2 × stability_score
  - volume_score: min(totalVideos / 500, 1)
  - consistency_score: avg(dominant_hook%, dominant_structure%, dominant_format%) / 100
  - stability_score: 1 - normalized_variance
- **Signal Strength**: average(dominant_hook%, dominant_structure%, dominant_format%)
- **Intelligence Status**: Building (<100 videos OR conf<0.5), Active (100-500 AND conf≥0.5), Mature (≥500 AND conf≥0.7)
- **API**: `/api/niches/available` and `/api/niches/:nicheId/snapshot` include scoring data

## Sidebar Labels
- "Analyzed Content" (was "Content"/"Library")
- "Insights" (was "Briefs"/"Daily Briefs")
- "Learning Loop" (was "Analytics")
- "Plan & Billing" (new)
