# Craflect - AI Content Intelligence Platform

## Overview
Craflect is a modern SaaS content intelligence platform for AI-powered content repurposing, daily briefs, workspace management, analytics, and admin back-office. Built with a dark-first aesthetic using neon purple (#7C5CFF) branding.

## Stack
- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui + Framer Motion
- **Backend**: Express/Node.js + TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Google OAuth via passport-google-oauth20 + Email OTP verification
- **AI**: OpenAI via Replit AI Integrations (`gpt-4.1-mini` for generation)
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
├── replit_integrations/image/ # AI image generation
├── replit_integrations/audio/ # AI audio/STT/TTS
├── routes.ts         # API routes (workspaces, sources, briefs, AI generation, analytics, admin, events)
├── storage.ts        # IStorage interface + DatabaseStorage implementation
├── db.ts             # Drizzle DB connection
shared/
├── schema.ts         # Drizzle schemas (workspaces, content_sources, generated_content, briefs, performance, events)
├── models/auth.ts    # users (with isAdmin, onboardingCompleted) + sessions + verification_codes tables
├── routes.ts         # API route definitions with Zod validation
```

## Auth
- Google OAuth (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
- Email + Password + Verification Code (signup: email/password/name → code, login: email/password → direct access)
- Passwords hashed with bcryptjs (12 rounds)
- Password field NEVER sent in API responses (sanitizeUser strips it)
- Session stored in PostgreSQL via connect-pg-simple
- User ID from `req.user.id`
- Login: GET /api/login → Google OAuth → /api/auth/google/callback → /dashboard
- Email: POST /api/auth/register (email+password+name), POST /api/auth/login (email+password), POST /api/auth/verify (email+code)
- Logout: GET /api/logout
- Demo accounts: demo@craflect.com / demo1234 (user), admin@craflect.com / admin1234 (admin)

## Theme
- Dark mode by default (`class="dark"` on html element)
- Light/dark toggle via useTheme hook (persisted to localStorage)
- CSS variables in :root (light) and .dark (dark) in index.css
- Logo: logo-transparent.png (dark), logo-light.png (light)

## Features (MVP Phase 1)
- **Onboarding**: Welcome screen with 3-step guided flow (workspace → source → first brief generation), confetti animation
- **Dashboard**: Real data - latest brief, generated content, scheduled items, onboarding progress, workspaces
- **Content Library**: Upload text/link sources, AI repurposing (generates posts/hooks/shorts), status badges
- **Daily Briefs**: AI-generated briefs from sources, generate content from briefs, brief history
- **Analytics**: Real performance data, content pipeline tracking, workspace stats
- **Settings**: Profile editing with save functionality, theme toggle
- **Admin Panel**: KPI cards (users, workspaces, sources, content, briefs), user list, event feed
- **Scheduler**: Schedule generated content with date/time
- **Instrumentation**: Event tracking (content_uploaded, brief_generated, content_generated, analytics_viewed)

## API Routes
- GET/POST /api/workspaces - List/create workspaces
- GET/POST /api/workspaces/:id/sources - List/create content sources
- POST /api/sources/:id/generate - AI repurposing from source
- GET/POST /api/workspaces/:id/briefs - List briefs
- POST /api/workspaces/:id/briefs/generate - AI brief generation
- POST /api/briefs/:id/generate - Generate content from brief
- GET /api/workspaces/:id/generated - All generated content
- PATCH /api/generated-content/:id/status - Update content status
- PATCH /api/generated-content/:id/schedule - Schedule content
- GET /api/workspaces/:id/analytics - Workspace analytics
- POST /api/performance - Add performance data
- POST /api/events - Track event
- PATCH /api/auth/user - Update user profile
- GET /api/admin/stats, /api/admin/users, /api/admin/events - Admin endpoints

## Key Patterns
- Workspaces belong to users (ownerId)
- Content sources belong to workspaces, have status (pending/transcribed/analyzed)
- Generated content belongs to workspaces, optionally to sources or briefs, has status (draft/ready/published/scheduled)
- Briefs belong to workspaces, have status (active/saved/archived)
- Performance tracks views/engagement/retention per generated content
- Events track user actions for instrumentation
- All protected routes use `isAuthenticated` middleware
- Admin routes additionally use `isAdmin` middleware

## Environment Variables
- DATABASE_URL (auto)
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
- SESSION_SECRET
- AI_INTEGRATIONS_OPENAI_API_KEY, AI_INTEGRATIONS_OPENAI_BASE_URL (auto)
