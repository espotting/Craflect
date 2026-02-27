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
├── pages/            # landing.tsx, auth.tsx, welcome.tsx, dashboard.tsx, library.tsx, briefs.tsx, analytics.tsx, settings.tsx, admin.tsx
server/
├── replit_integrations/auth/  # replitAuth.ts (Google OAuth), storage.ts, routes.ts
├── replit_integrations/chat/  # AI chat integration
├── routes.ts         # API routes (workspaces, sources, ingestion, analysis, insights, AI generation, analytics, admin, events)
├── storage.ts        # IStorage interface + DatabaseStorage implementation
├── db.ts             # Drizzle DB connection
shared/
├── schema.ts         # Drizzle schemas (workspaces, content_sources, generated_content, briefs, performance, events)
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
2. **Understand**: AI extracts hookType, narrativeStructure, contentAngle, contentFormat, performanceScore, estimated metrics
3. **Recommend**: Pattern analysis across all workspace sources → identifies top hooks, winning formats, optimal structures
4. **Produce**: Generate optimized content recommendations based on niche patterns

## Features
- **Onboarding**: 3-step (workspace → paste URLs → first insights), URL input with platform auto-detection, confetti
- **Intelligence Cockpit (Dashboard)**: Next best action, latest insight, niche overview stats, generated content, onboarding progress
- **Analyzed Content (Library)**: URL ingestion with platform auto-detect, source cards with metrics/AI tags/performance score, filter/sort by platform/score/hook type
- **Insights (Briefs)**: Pattern analysis reports — top hooks, winning formats, content angles, niche patterns, actionable recommendations, generate recommended content
- **Analytics**: Real performance data, content pipeline tracking, workspace stats
- **Settings**: Profile editing with save, theme toggle
- **Admin Panel**: KPI cards, user list, event feed
- **Scheduler**: Schedule generated content with date/time
- **Instrumentation**: Event tracking (content_uploaded, brief_generated, content_generated, analytics_viewed)

## API Routes
- GET/POST /api/workspaces - List/create workspaces
- GET /api/workspaces/:id/sources - List content sources
- POST /api/workspaces/:id/sources/ingest - Batch URL ingestion (auto-detects platform)
- POST /api/sources/:id/analyze - AI analysis (extracts hookType, narrativeStructure, contentAngle, performanceScore, metrics)
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
- Workspaces belong to users (ownerId), verifyWorkspaceOwnership middleware on all workspace routes
- Content sources belong to workspaces, ingestionStatus tracks analysis pipeline
- Generated content belongs to workspaces, optionally to sources or briefs
- Briefs/Insights belong to workspaces, contain pattern analysis data
- All protected routes use `isAuthenticated` middleware
- Admin routes additionally use `isAdmin` middleware

## Environment Variables
- DATABASE_URL (auto)
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
- SESSION_SECRET
- AI_INTEGRATIONS_OPENAI_API_KEY, AI_INTEGRATIONS_OPENAI_BASE_URL (auto)

## Sidebar Labels
- "Analyzed Content" (was "Content"/"Library")
- "Insights" (was "Briefs"/"Daily Briefs")
